/**
 * Unit Tests for ShortTermMemory
 */

import { MockRedisClient } from '../../../mocks/services';

// Mock Redis before importing ShortTermMemory
jest.mock('redis', () => {
  return {
    createClient: jest.fn().mockImplementation(() => {
      const client = new MockRedisClient();
      return {
        ...client,
        connect: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
    }),
  };
});

describe('ShortTermMemory', () => {
  let shortTermMemory: any;
  let mockRedis: MockRedisClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis = new MockRedisClient();
    
    jest.isolateModules(() => {
      const { ShortTermMemory } = require('../../../../src/services/memory/ShortTermMemory');
      shortTermMemory = new ShortTermMemory();
      (shortTermMemory as any).client = mockRedis;
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const customerId = 'cust_123';
      const context = {
        customerName: 'John Doe',
        amountOwed: 5000,
        daysOverdue: 30,
      };

      const sessionId = await shortTermMemory.createSession(customerId, context);

      expect(sessionId).toMatch(/^session_/);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should set TTL on session', async () => {
      const customerId = 'cust_123';
      const context = { test: 'data' };

      await shortTermMemory.createSession(customerId, context);

      expect(mockRedis.expire).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session', async () => {
      const sessionId = 'session_123';
      const sessionData = {
        customerId: 'cust_123',
        context: { test: 'data' },
        history: [],
        createdAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(sessionData));

      const session = await shortTermMemory.getSession(sessionId);

      expect(session).toEqual(sessionData);
      expect(mockRedis.get).toHaveBeenCalledWith(`session:${sessionId}`);
    });

    it('should return null for non-existent session', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const session = await shortTermMemory.getSession('non_existent');

      expect(session).toBeNull();
    });

    it('should handle corrupted session data', async () => {
      mockRedis.get.mockResolvedValueOnce('invalid json{');

      await expect(
        shortTermMemory.getSession('session_123')
      ).rejects.toThrow();
    });
  });

  describe('updateSession', () => {
    it('should update existing session', async () => {
      const sessionId = 'session_123';
      const existingSession = {
        customerId: 'cust_123',
        context: { test: 'data' },
        history: [],
        createdAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(existingSession));

      await shortTermMemory.updateSession(sessionId, {
        context: { updated: 'data' },
      });

      expect(mockRedis.set).toHaveBeenCalled();
      const setCall = mockRedis.set.mock.calls[0];
      const updatedData = JSON.parse(setCall[1]);
      expect(updatedData.context).toEqual({ updated: 'data' });
    });

    it('should throw error for non-existent session', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await expect(
        shortTermMemory.updateSession('non_existent', {})
      ).rejects.toThrow('Session not found');
    });
  });

  describe('addToHistory', () => {
    it('should add interaction to session history', async () => {
      const sessionId = 'session_123';
      const existingSession = {
        customerId: 'cust_123',
        context: {},
        history: [],
        createdAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(existingSession));

      const interaction = {
        type: 'email',
        content: 'Payment reminder sent',
        timestamp: new Date(),
      };

      await shortTermMemory.addToHistory(sessionId, interaction);

      expect(mockRedis.set).toHaveBeenCalled();
      const setCall = mockRedis.set.mock.calls[0];
      const updatedData = JSON.parse(setCall[1]);
      expect(updatedData.history).toHaveLength(1);
      expect(updatedData.history[0]).toMatchObject(interaction);
    });

    it('should maintain history order', async () => {
      const sessionId = 'session_123';
      const existingSession = {
        customerId: 'cust_123',
        context: {},
        history: [{ type: 'email', content: 'First', timestamp: new Date() }],
        createdAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(existingSession));

      await shortTermMemory.addToHistory(sessionId, {
        type: 'phone',
        content: 'Second',
        timestamp: new Date(),
      });

      const setCall = mockRedis.set.mock.calls[0];
      const updatedData = JSON.parse(setCall[1]);
      expect(updatedData.history).toHaveLength(2);
      expect(updatedData.history[1].type).toBe('phone');
    });
  });

  describe('deleteSession', () => {
    it('should delete session', async () => {
      const sessionId = 'session_123';

      await shortTermMemory.deleteSession(sessionId);

      expect(mockRedis.del).toHaveBeenCalledWith(`session:${sessionId}`);
    });
  });

  describe('getCustomerSessions', () => {
    it('should retrieve all sessions for a customer', async () => {
      const customerId = 'cust_123';
      
      mockRedis.keys.mockResolvedValueOnce([
        'session:session_1',
        'session:session_2',
      ]);

      const session1 = {
        customerId,
        context: {},
        history: [],
        createdAt: new Date().toISOString(),
      };
      const session2 = {
        customerId,
        context: {},
        history: [],
        createdAt: new Date().toISOString(),
      };

      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(session1))
        .mockResolvedValueOnce(JSON.stringify(session2));

      const sessions = await shortTermMemory.getCustomerSessions(customerId);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].customerId).toBe(customerId);
      expect(sessions[1].customerId).toBe(customerId);
    });

    it('should return empty array if no sessions found', async () => {
      mockRedis.keys.mockResolvedValueOnce([]);

      const sessions = await shortTermMemory.getCustomerSessions('cust_123');

      expect(sessions).toEqual([]);
    });
  });

  describe('extendSessionTTL', () => {
    it('should extend session expiration time', async () => {
      const sessionId = 'session_123';
      const ttlSeconds = 3600;

      await shortTermMemory.extendSessionTTL(sessionId, ttlSeconds);

      expect(mockRedis.expire).toHaveBeenCalledWith(
        `session:${sessionId}`,
        ttlSeconds
      );
    });
  });

  describe('error handling', () => {
    it('should handle Redis connection errors', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection failed'));

      await expect(
        shortTermMemory.getSession('session_123')
      ).rejects.toThrow('Redis connection failed');
    });

    it('should handle set operation failures', async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('Write failed'));

      await expect(
        shortTermMemory.createSession('cust_123', {})
      ).rejects.toThrow('Write failed');
    });
  });
});
