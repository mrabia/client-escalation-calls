import { createClient, RedisClientType } from 'redis';
import { logger } from '@/utils/logger';

export class RedisService {
  private client: RedisClientType;
  private isInitialized = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectDelay: 1000,
        connectTimeout: 5000
      }
    });

    this.client.on('connect', () => {
      logger.debug('Redis client connecting');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    this.client.on('end', () => {
      logger.debug('Redis client connection ended');
    });

    this.client.on('reconnecting', () => {
      logger.warn('Redis client reconnecting');
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      
      this.isInitialized = true;
      logger.info('Redis service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error:', { key, ttlSeconds, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Redis JSON parse error:', { key, value, error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Failed to parse JSON for key: ${key}`);
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      logger.error('Redis JSON stringify error:', { key, error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Failed to stringify JSON for key: ${key}`);
    }
  }

  async del(key: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result;
    } catch (error) {
      logger.error('Redis EXPIRE error:', { key, ttlSeconds, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis INCR error:', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async hGet(key: string, field: string): Promise<string | undefined> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      logger.error('Redis HGET error:', { key, field, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async hSet(key: string, field: string, value: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      logger.error('Redis HSET error:', { key, field, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error('Redis HGETALL error:', { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis KEYS error:', { pattern, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      return await this.client.publish(channel, message);
    } catch (error) {
      logger.error('Redis PUBLISH error:', { channel, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      await this.client.subscribe(channel, callback);
    } catch (error) {
      logger.error('Redis SUBSCRIBE error:', { channel, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async flushAll(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized');
    }

    try {
      await this.client.flushAll();
      logger.info('Redis cache cleared');
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.client && this.isInitialized) {
      await this.client.quit();
      logger.info('Redis connection closed');
    }
  }
}