import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@/utils/logger';
import { Message } from '@/types';

/**
 * Session Context stored in short-term memory
 */
export interface SessionContext {
  sessionId: string;
  customerId: string;
  campaignId: string;
  agentType: 'email' | 'phone' | 'sms';
  conversationHistory: Message[];
  currentState: string;
  metadata: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Short-Term Memory Service
 * 
 * Fast, temporary storage for active sessions using Redis.
 * Data expires after 30 minutes (configurable).
 */
export class ShortTermMemory {
  private client: RedisClientType;
  private logger: Logger;
  private defaultTTL: number = 1800; // 30 minutes in seconds
  private connected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url: redisUrl });
    this.logger = createLogger('ShortTermMemory');

    // Setup error handling
    this.client.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.info('Connected to Redis');
    });

    this.client.on('disconnect', () => {
      this.connected = false;
      this.logger.warn('Disconnected from Redis');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
    }
  }

  /**
   * Store session context
   */
  async storeSession(context: SessionContext, ttl?: number): Promise<void> {
    try {
      const key = `session:${context.sessionId}:context`;
      const value = JSON.stringify(context);
      const expiry = ttl || this.defaultTTL;

      await this.client.setEx(key, expiry, value);
      
      // Also index by customer ID for easy lookup
      await this.client.sAdd(
        `customer:${context.customerId}:sessions`,
        context.sessionId
      );
      await this.client.expire(`customer:${context.customerId}:sessions`, expiry);

      this.logger.debug(`Stored session ${context.sessionId}`);

    } catch (error) {
      this.logger.error('Failed to store session', error);
      throw new Error(`Session storage failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Get session context
   */
  async getSession(sessionId: string): Promise<SessionContext | null> {
    try {
      const key = `session:${sessionId}:context`;
      const value = await this.client.get(key);

      if (!value) {
        return null;
      }

      const context = JSON.parse(value) as SessionContext;
      
      // Convert date strings back to Date objects
      context.createdAt = new Date(context.createdAt);
      context.expiresAt = new Date(context.expiresAt);

      return context;

    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}`, error);
      throw new Error(`Session retrieval failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Update session context
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionContext>
  ): Promise<void> {
    try {
      const existing = await this.getSession(sessionId);
      
      if (!existing) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const updated = { ...existing, ...updates };
      await this.storeSession(updated);

      this.logger.debug(`Updated session ${sessionId}`);

    } catch (error) {
      this.logger.error(`Failed to update session ${sessionId}`, error);
      throw new Error(`Session update failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Add message to conversation history
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      session.conversationHistory.push(message);
      await this.storeSession(session);

      this.logger.debug(`Added message to session ${sessionId}`);

    } catch (error) {
      this.logger.error(`Failed to add message to session ${sessionId}`, error);
      throw new Error(`Message addition failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string): Promise<Message[]> {
    try {
      const session = await this.getSession(sessionId);
      return session?.conversationHistory || [];

    } catch (error) {
      this.logger.error(`Failed to get conversation history for ${sessionId}`, error);
      throw new Error(`Conversation retrieval failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Store temporary data
   */
  async store(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await this.client.setEx(key, expiry, serialized);
      
      this.logger.debug(`Stored key ${key} with TTL ${expiry}s`);

    } catch (error) {
      this.logger.error(`Failed to store key ${key}`, error);
      throw new Error(`Storage failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Retrieve temporary data
   */
  async retrieve(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value);

    } catch (error) {
      this.logger.error(`Failed to retrieve key ${key}`, error);
      throw new Error(`Retrieval failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
      this.logger.debug(`Deleted key ${key}`);

    } catch (error) {
      this.logger.error(`Failed to delete key ${key}`, error);
      throw new Error(`Deletion failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      
      if (session) {
        // Remove from customer's session list
        await this.client.sRem(
          `customer:${session.customerId}:sessions`,
          sessionId
        );
      }

      // Delete session context
      await this.client.del(`session:${sessionId}:context`);
      
      this.logger.debug(`Deleted session ${sessionId}`);

    } catch (error) {
      this.logger.error(`Failed to delete session ${sessionId}`, error);
      throw new Error(`Session deletion failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Get all active sessions for a customer
   */
  async getCustomerSessions(customerId: string): Promise<string[]> {
    try {
      const sessions = await this.client.sMembers(
        `customer:${customerId}:sessions`
      );

      return sessions;

    } catch (error) {
      this.logger.error(`Failed to get sessions for customer ${customerId}`, error);
      throw new Error(`Customer sessions retrieval failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;

    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}`, error);
      throw new Error(`Existence check failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
      this.logger.debug(`Set expiration for key ${key}: ${ttl}s`);

    } catch (error) {
      this.logger.error(`Failed to set expiration for key ${key}`, error);
      throw new Error(`Expiration setting failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    try {
      const ttl = await this.client.ttl(key);
      return ttl;

    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}`, error);
      throw new Error(`TTL retrieval failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Clear all keys matching a pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      
      this.logger.info(`Cleared ${keys.length} keys matching pattern ${pattern}`);
      return keys.length;

    } catch (error) {
      this.logger.error(`Failed to clear pattern ${pattern}`, error);
      throw new Error(`Pattern clearing failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Get memory usage statistics
   */
  async getStats(): Promise<{
    usedMemory: string;
    totalKeys: number;
    activeSessions: number;
  }> {
    try {
      const info = await this.client.info('memory');
      const usedMemory = info.match(/used_memory_human:(.+)/)?.[1]?.trim() || 'unknown';
      
      const totalKeys = await this.client.dbSize();
      
      const sessionKeys = await this.client.keys('session:*:context');
      const activeSessions = sessionKeys.length;

      return {
        usedMemory,
        totalKeys,
        activeSessions
      };

    } catch (error) {
      this.logger.error('Failed to get stats', error);
      throw new Error(`Stats retrieval failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  /**
   * Flush all data (use with caution!)
   */
  async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      this.logger.warn('Flushed all Redis data');

    } catch (error) {
      this.logger.error('Failed to flush all data', error);
      throw new Error(`Flush failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }
}
