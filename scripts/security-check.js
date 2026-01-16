#!/usr/bin/env node

/**
 * Security Check Script
 * 
 * Validates security configuration before deployment
 * Run: node scripts/security-check.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHECKS = [];
let passed = 0;
let failed = 0;
let warnings = 0;

function check(name, condition, severity = 'error') {
  CHECKS.push({ name, passed: condition, severity });
  if (condition) {
    passed++;
    console.log(`✅ ${name}`);
  } else if (severity === 'warning') {
    warnings++;
    console.log(`⚠️  ${name} (warning)`);
  } else {
    failed++;
    console.log(`❌ ${name}`);
  }
}

function checkEnvVar(name, minLength = 1, severity = 'error') {
  const value = process.env[name];
  const exists = value && value.length >= minLength;
  check(`${name} is set (min ${minLength} chars)`, exists, severity);
  return exists;
}

console.log('\n🔒 Security Configuration Check\n');
console.log('='.repeat(50));

// ============================================================================
// Environment & Secrets
// ============================================================================
console.log('\n📋 Environment & Secrets\n');

check('NODE_ENV is set', !!process.env.NODE_ENV);
check('NODE_ENV is production', process.env.NODE_ENV === 'production', 'warning');

checkEnvVar('JWT_SECRET', 32);
checkEnvVar('JWT_REFRESH_SECRET', 32);

// Check JWT secrets are different
if (process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET) {
  check(
    'JWT_SECRET and JWT_REFRESH_SECRET are different',
    process.env.JWT_SECRET !== process.env.JWT_REFRESH_SECRET
  );
}

checkEnvVar('DATABASE_URL', 10);
checkEnvVar('ENCRYPTION_KEY', 32, 'warning');

// ============================================================================
// Password & Auth Configuration
// ============================================================================
console.log('\n🔐 Authentication Configuration\n');

const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
check('BCRYPT_ROUNDS >= 12', bcryptRounds >= 12, 'warning');

const jwtExpiry = process.env.JWT_EXPIRES_IN || '24h';
check('JWT expiry is reasonable', !jwtExpiry.includes('d') || parseInt(jwtExpiry) <= 1, 'warning');

// ============================================================================
// Rate Limiting
// ============================================================================
console.log('\n🚦 Rate Limiting\n');

const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
check('Rate limit configured', rateLimitMax > 0 && rateLimitMax <= 1000);

// ============================================================================
// CORS Configuration
// ============================================================================
console.log('\n🌐 CORS Configuration\n');

const corsOrigin = process.env.CORS_ORIGIN || '';
check('CORS_ORIGIN is not wildcard (*)', !corsOrigin.includes('*'), 'warning');
check('CORS_ORIGIN is set', corsOrigin.length > 0, 'warning');

// ============================================================================
// SSL/TLS
// ============================================================================
console.log('\n🔒 SSL/TLS Configuration\n');

// Railway handles SSL, but check for custom cert paths
const hasSslCert = process.env.SSL_CERT_PATH || process.env.RAILWAY_ENVIRONMENT;
check('SSL configured (Railway or custom)', !!hasSslCert, 'warning');

// ============================================================================
// File Security
// ============================================================================
console.log('\n📁 File Security\n');

// Check for .env file (should not exist in production)
const envExists = fs.existsSync(path.join(process.cwd(), '.env'));
check('.env file not present (use env vars)', !envExists || process.env.NODE_ENV !== 'production', 'warning');

// Check .gitignore includes sensitive files
const gitignorePath = path.join(process.cwd(), '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  check('.gitignore includes .env', gitignore.includes('.env'));
  check('.gitignore includes node_modules', gitignore.includes('node_modules'));
}

// ============================================================================
// Dependency Security
// ============================================================================
console.log('\n📦 Dependencies\n');

const packageLockExists = fs.existsSync(path.join(process.cwd(), 'package-lock.json'));
check('package-lock.json exists', packageLockExists);

// ============================================================================
// Summary
// ============================================================================
console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary\n');
console.log(`   ✅ Passed:   ${passed}`);
console.log(`   ❌ Failed:   ${failed}`);
console.log(`   ⚠️  Warnings: ${warnings}`);
console.log('');

if (failed > 0) {
  console.log('❌ Security check FAILED - fix issues before deploying\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️  Security check passed with WARNINGS - review before deploying\n');
  process.exit(0);
} else {
  console.log('✅ All security checks PASSED\n');
  process.exit(0);
}
