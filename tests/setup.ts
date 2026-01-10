/**
 * Jest Setup File
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Database
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'client_escalation_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Redis
process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use DB 1 for tests

// JWT
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';

// Encryption
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars = 32 bytes

// LLM API Keys (mock values for testing)
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.GOOGLE_API_KEY = 'test-google-key';

// Qdrant
process.env.QDRANT_URL = 'http://localhost:6333';
process.env.QDRANT_API_KEY = 'test-qdrant-key';

// Twilio (mock)
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
process.env.TWILIO_PHONE_NUMBER = '+15555555555';

// Email (mock)
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025'; // MailHog default
process.env.SMTP_USER = 'test';
process.env.SMTP_PASSWORD = 'test';
process.env.SMTP_FROM = 'test@example.com';

// Extend Jest timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Global test utilities
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockDate = (date: Date) => {
  jest.useFakeTimers();
  jest.setSystemTime(date);
};

export const restoreDate = () => {
  jest.useRealTimers();
};
