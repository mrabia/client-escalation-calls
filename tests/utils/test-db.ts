/**
 * Test Database Utilities
 * 
 * Provides utilities for setting up and tearing down test databases
 */

import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getTestPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'client_escalation_test',
      user: process.env.DB_USER || 'test_user',
      password: process.env.DB_PASSWORD || 'test_password',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

/**
 * Close database connection pool
 */
export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Run migrations on test database
 */
export async function runMigrations(): Promise<void> {
  const pool = getTestPool();
  const migrationDir = path.join(__dirname, '../../database/migrations');
  
  // Get all migration files in order
  const files = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql') && f !== 'run_all_migrations.sql')
    .sort();
  
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    await pool.query(sql);
  }
}

/**
 * Clean all tables (for test isolation)
 */
export async function cleanDatabase(): Promise<void> {
  const pool = getTestPool();
  
  // Disable foreign key checks temporarily
  await pool.query('SET session_replication_role = replica;');
  
  // Get all table names
  const result = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
  `);
  
  // Truncate all tables
  for (const row of result.rows) {
    await pool.query(`TRUNCATE TABLE ${row.tablename} CASCADE`);
  }
  
  // Re-enable foreign key checks
  await pool.query('SET session_replication_role = DEFAULT;');
}

/**
 * Drop all tables (for complete reset)
 */
export async function dropAllTables(): Promise<void> {
  const pool = getTestPool();
  
  await pool.query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
}

/**
 * Execute SQL query
 */
export async function query(sql: string, params?: any[]): Promise<any> {
  const pool = getTestPool();
  return pool.query(sql, params);
}

/**
 * Get a client from the pool (for transactions)
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getTestPool();
  return pool.connect();
}

/**
 * Execute function within a transaction
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Seed test data
 */
export async function seedTestData(): Promise<void> {
  const pool = getTestPool();
  const seedFile = path.join(__dirname, '../../database/seeds/001_seed_test_data.sql');
  
  if (fs.existsSync(seedFile)) {
    const sql = fs.readFileSync(seedFile, 'utf8');
    await pool.query(sql);
  }
}

/**
 * Setup test database (run before all tests)
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    await dropAllTables();
    await runMigrations();
    await seedTestData();
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Teardown test database (run after all tests)
 */
export async function teardownTestDatabase(): Promise<void> {
  try {
    await cleanDatabase();
    await closeTestPool();
  } catch (error) {
    console.error('Failed to teardown test database:', error);
    throw error;
  }
}
