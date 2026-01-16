#!/usr/bin/env node

/**
 * Database Migration Runner for Railway
 * Runs SQL migrations in order on deployment
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('⚠️  DATABASE_URL not set, skipping migrations');
    process.exit(0);
  }

  console.log('🚀 Starting database migrations...');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get already executed migrations
    const { rows: executed } = await client.query(
      'SELECT name FROM _migrations ORDER BY id'
    );
    const executedNames = new Set(executed.map(r => r.name));

    // Get migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.match(/^\d{3}_.*\.sql$/))
      .sort();

    console.log(`📁 Found ${files.length} migration files`);

    let migrationsRun = 0;

    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔄 Running ${file}...`);
      
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ ${file} completed`);
        migrationsRun++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log(`\n🎉 Migrations complete! (${migrationsRun} new migrations run)`);

  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
