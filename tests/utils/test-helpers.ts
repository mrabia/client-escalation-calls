/**
 * Test Helpers
 * 
 * Common utilities for testing
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * Generate JWT token for testing
 */
export function generateTestToken(payload: any, expiresIn: string = '1h'): string {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn }
  );
}

/**
 * Generate refresh token for testing
 */
export function generateTestRefreshToken(payload: any): string {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 */
export function verifyTestToken(token: string): any {
  return jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
}

/**
 * Hash password for testing
 */
export async function hashTestPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function compareTestPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate random string
 */
export function randomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random email
 */
export function randomEmail(): string {
  return `test-${randomString(8)}@example.com`;
}

/**
 * Generate random phone number
 */
export function randomPhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${prefix}${lineNumber}`;
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock Date.now() to return fixed timestamp
 */
export function mockDateNow(timestamp: number): void {
  jest.spyOn(Date, 'now').mockReturnValue(timestamp);
}

/**
 * Restore Date.now()
 */
export function restoreDateNow(): void {
  jest.restoreAllMocks();
}

/**
 * Create mock logger
 */
export function createMockLogger() {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
}

/**
 * Assert error thrown
 */
export async function assertThrows(
  fn: () => Promise<any>,
  errorMessage?: string
): Promise<void> {
  let thrown = false;
  try {
    await fn();
  } catch (error) {
    thrown = true;
    if (errorMessage) {
      expect(error instanceof Error ? error.message : String(error)).toContain(errorMessage);
    }
  }
  expect(thrown).toBe(true);
}

/**
 * Assert error not thrown
 */
export async function assertNotThrows(fn: () => Promise<any>): Promise<void> {
  let thrown = false;
  try {
    await fn();
  } catch (error) {
    thrown = true;
    console.error('Unexpected error:', error);
  }
  expect(thrown).toBe(false);
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Create date in past
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Create date in future
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
