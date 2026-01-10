/**
 * Memory Manager Integration Tests
 * 
 * Tests short-term and long-term memory integration
 */

import { MemoryManager } from '@/services/memory/MemoryManager';
import { ShortTermMemory } from '@/services/memory/ShortTermMemory';
import { LongTermMemory } from '@/services/memory/LongTermMemory';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '@tests/utils/test-db';
import { flushRedis, closeTestRedisClient } from '@tests/utils/test-redis';
import { generateUUID } from '@tests/utils/test-helpers';
import { logger } from '@/utils/logger';

describe('Memory Manager Integration Tests', () => {
  let memoryManager: MemoryManager;
  let shortTermMemory: ShortTermMemory;
  let longTermMemory: LongTermMemory;

  beforeAll(async () => {
    await setupTestDatabase();
    shortTermMemory = new ShortTermMemory();
    await shortTermMemory.connect();
    longTermMemory = new LongTermMemory(logger);
    await longTermMemory.connect();
    memoryManager = new MemoryManager(shortTermMemory, longTermMemory, logger);
  });

  afterAll(async () => {
    await shortTermMemory.disconnect();
    await longTermMemory.disconnect();
    await teardownTestDatabase();
    await closeTestRedisClient();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await flushRedis();
  });

  describe('Short-Term Memory', () => {
    it('should store session context', async () => {
      const sessionId = generateUUID();
      const customerId = generateUUID();

      const context = {
        sessionId,
        customerId,
        campaignId: generateUUID(),
        agentType: 'email' as const,
        conversationHistory: [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' },
        ],
        currentState: 'active',
        metadata: { source: 'test' },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await memoryManager.storeShortTermMemory(context);

      const retrieved = await memoryManager.getShortTermMemory(sessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved.sessionId).toBe(sessionId);
      expect(retrieved.conversationHistory).toHaveLength(2);
    });

    it('should update session context', async () => {
      const sessionId = generateUUID();
      const customerId = generateUUID();

      const context = {
        sessionId,
        customerId,
        campaignId: generateUUID(),
        agentType: 'email' as const,
        conversationHistory: [],
        currentState: 'active',
        metadata: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await memoryManager.storeShortTermMemory(context);

      // Update with new message
      context.conversationHistory.push({
        role: 'user' as const,
        content: 'New message',
      });

      await memoryManager.updateShortTermMemory(sessionId, context);

      const retrieved = await memoryManager.getShortTermMemory(sessionId);
      expect(retrieved.conversationHistory).toHaveLength(1);
    });

    it('should expire session after TTL', async () => {
      const sessionId = generateUUID();
      const customerId = generateUUID();

      const context = {
        sessionId,
        customerId,
        campaignId: generateUUID(),
        agentType: 'email' as const,
        conversationHistory: [],
        currentState: 'active',
        metadata: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await memoryManager.storeShortTermMemory(context, 1); // 1 second TTL

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      const retrieved = await memoryManager.getShortTermMemory(sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Long-Term Memory', () => {
    it('should store episodic memory', async () => {
      const customerId = generateUUID();

      const episodicMemory = {
        customerId,
        campaignId: generateUUID(),
        agentType: 'email' as const,
        interaction: {
          channel: 'email' as const,
          content: 'Payment reminder sent',
          response: 'Will pay by Friday',
          outcome: 'success' as const,
        },
        timestamp: new Date(),
        metadata: { amount: 5000 },
      };

      const id = await memoryManager.storeLongTermMemory('episodic', episodicMemory);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should store semantic memory', async () => {
      const customerId = generateUUID();

      const semanticMemory = {
        customerId,
        type: 'strategy' as const,
        content: 'Customer responds better to morning emails',
        confidence: 0.85,
        metadata: { sampleSize: 10 },
      };

      const id = await memoryManager.storeLongTermMemory('semantic', semanticMemory);

      expect(id).toBeDefined();
    });

    it('should query episodic memories', async () => {
      const customerId = generateUUID();

      // Store multiple memories
      for (let i = 0; i < 3; i++) {
        await memoryManager.storeLongTermMemory('episodic', {
          customerId,
          campaignId: generateUUID(),
          agentType: 'email' as const,
          interaction: {
            channel: 'email' as const,
            content: `Interaction ${i}`,
            outcome: 'success' as const,
          },
          timestamp: new Date(),
          metadata: {},
        });
      }

      const memories = await memoryManager.queryLongTermMemory({
        query: 'payment interactions',
        customerId,
        includeEpisodic: true,
        includeSemantic: false,
        limit: 10,
      });

      expect(memories.episodicMemories.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Integration', () => {
    it('should query both short-term and long-term memory', async () => {
      const sessionId = generateUUID();
      const customerId = generateUUID();
      const campaignId = generateUUID();

      // Store short-term memory
      await memoryManager.storeShortTermMemory({
        sessionId,
        customerId,
        campaignId,
        agentType: 'email' as const,
        conversationHistory: [
          { role: 'user' as const, content: 'I need more time' },
        ],
        currentState: 'active',
        metadata: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Store long-term memory
      await memoryManager.storeLongTermMemory('episodic', {
        customerId,
        campaignId,
        agentType: 'email' as const,
        interaction: {
          channel: 'email' as const,
          content: 'Previous payment promise',
          outcome: 'success' as const,
        },
        timestamp: new Date(),
        metadata: {},
      });

      // Query combined memory
      const result = await memoryManager.queryMemory({
        query: 'payment history',
        customerId,
        campaignId,
        includeEpisodic: true,
        includeSemantic: true,
        limit: 10,
      });

      expect(result).toHaveProperty('currentSession');
      expect(result).toHaveProperty('episodicMemories');
      expect(result).toHaveProperty('semanticMemories');
    });

    it('should consolidate short-term to long-term memory', async () => {
      const sessionId = generateUUID();
      const customerId = generateUUID();

      // Store session with conversation
      await memoryManager.storeShortTermMemory({
        sessionId,
        customerId,
        campaignId: generateUUID(),
        agentType: 'email' as const,
        conversationHistory: [
          { role: 'user' as const, content: 'I will pay tomorrow' },
          { role: 'assistant' as const, content: 'Thank you for confirming' },
        ],
        currentState: 'completed',
        metadata: { outcome: 'payment_promised' },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Consolidate to long-term
      await memoryManager.consolidateMemory(sessionId);

      // Verify long-term memory was created
      const memories = await memoryManager.queryLongTermMemory({
        query: 'payment promise',
        customerId,
        includeEpisodic: true,
        includeSemantic: false,
        limit: 10,
      });

      expect(memories.episodicMemories.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Statistics', () => {
    it('should get memory statistics', async () => {
      const stats = await memoryManager.getStatistics();

      expect(stats).toHaveProperty('shortTerm');
      expect(stats).toHaveProperty('longTerm');
      expect(stats.shortTerm).toHaveProperty('activeSessions');
      expect(stats.longTerm).toHaveProperty('totalMemories');
    });

    it('should track memory usage', async () => {
      const customerId = generateUUID();

      // Store some memories
      await memoryManager.storeLongTermMemory('episodic', {
        customerId,
        campaignId: generateUUID(),
        agentType: 'email' as const,
        interaction: {
          channel: 'email' as const,
          content: 'Test interaction',
          outcome: 'success' as const,
        },
        timestamp: new Date(),
        metadata: {},
      });

      const stats = await memoryManager.getStatistics();
      expect(stats.longTerm.totalMemories).toBeGreaterThan(0);
    });
  });
});
