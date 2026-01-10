/**
 * Jest Test Setup
 * Global configuration, mocks, and utilities for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.QDRANT_URL = 'http://localhost:6333';
process.env.OPENAI_API_KEY = 'test-key-' + Math.random().toString(36).substring(7);
process.env.ANTHROPIC_API_KEY = 'test-key-' + Math.random().toString(36).substring(7);
process.env.GOOGLE_AI_API_KEY = 'test-key-' + Math.random().toString(36).substring(7);

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
