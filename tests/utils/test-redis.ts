/**
 * Test Redis Utilities
 * 
 * Provides utilities for managing Redis in tests
 */

import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

/**
 * Get or create Redis client for tests
 */
export async function getTestRedisClient(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379/1'
    });
    
    client.on('error', (err) => {
      console.error('Redis test client error:', err);
    });
    
    await client.connect();
  }
  return client;
}

/**
 * Close Redis client
 */
export async function closeTestRedisClient(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

/**
 * Flush all Redis data (for test isolation)
 */
export async function flushRedis(): Promise<void> {
  const redis = await getTestRedisClient();
  await redis.flushDb();
}

/**
 * Get all keys matching pattern
 */
export async function getKeys(pattern: string = '*'): Promise<string[]> {
  const redis = await getTestRedisClient();
  return redis.keys(pattern);
}

/**
 * Get value by key
 */
export async function getValue(key: string): Promise<string | null> {
  const redis = await getTestRedisClient();
  return redis.get(key);
}

/**
 * Set value
 */
export async function setValue(key: string, value: string, ttl?: number): Promise<void> {
  const redis = await getTestRedisClient();
  if (ttl) {
    await redis.setEx(key, ttl, value);
  } else {
    await redis.set(key, value);
  }
}

/**
 * Delete key
 */
export async function deleteKey(key: string): Promise<void> {
  const redis = await getTestRedisClient();
  await redis.del(key);
}

/**
 * Check if key exists
 */
export async function keyExists(key: string): Promise<boolean> {
  const redis = await getTestRedisClient();
  const result = await redis.exists(key);
  return result === 1;
}

/**
 * Get TTL for key
 */
export async function getTTL(key: string): Promise<number> {
  const redis = await getTestRedisClient();
  return redis.ttl(key);
}
