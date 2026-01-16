#!/usr/bin/env node

/**
 * Secrets Generator
 * 
 * Generates secure random secrets for production deployment
 * Run: node scripts/generate-secrets.js
 */

const crypto = require('node:crypto');

console.log('\n🔐 Generating Secure Secrets\n');
console.log('='.repeat(60));
console.log('Copy these values to your Railway environment variables:\n');

// JWT Secret (256-bit)
const jwtSecret = crypto.randomBytes(32).toString('base64');
console.log(`JWT_SECRET=${jwtSecret}`);

// JWT Refresh Secret (256-bit)
const jwtRefreshSecret = crypto.randomBytes(32).toString('base64');
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);

// Encryption Key (256-bit hex)
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log(`ENCRYPTION_KEY=${encryptionKey}`);

// Session Secret
const sessionSecret = crypto.randomBytes(32).toString('base64');
console.log(`SESSION_SECRET=${sessionSecret}`);

// API Key (for internal services)
const apiKey = crypto.randomBytes(24).toString('base64url');
console.log(`INTERNAL_API_KEY=${apiKey}`);

console.log('\n' + '='.repeat(60));
console.log('\n⚠️  IMPORTANT:');
console.log('   - Never commit these values to version control');
console.log('   - Store them securely in Railway environment variables');
console.log('   - Generate new secrets for each environment\n');
