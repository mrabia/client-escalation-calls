/**
 * Unit Tests for QdrantClient
 */

import { MockQdrantClient } from '../../../mocks/services';

// Mock Qdrant before importing QdrantClient
jest.mock('@qdrant/js-client-rest', () => {
  return {
    QdrantClient: jest.fn().mockImplementation(() => new MockQdrantClient()),
  };
});

describe('QdrantClient', () => {
  let qdrantClient: any;
  let mockClient: MockQdrantClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new MockQdrantClient();
    
    jest.isolateModules(() => {
      const { QdrantClient: QdrantClientClass } = require('../../../../src/services/memory/QdrantClient');
      qdrantClient = new QdrantClientClass();
      (qdrantClient as any).client = mockClient;
    });
  });

  describe('ensureCollection', () => {
    it('should create collection if it does not exist', async () => {
      mockClient.getCollections.mockResolvedValueOnce({ collections: [] });

      await qdrantClient.ensureCollection('test_collection', 1536);

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        'test_collection',
        expect.objectContaining({
          vectors: expect.objectContaining({
            size: 1536,
            distance: 'Cosine',
          }),
        })
      );
    });

    it('should not create collection if it already exists', async () => {
      mockClient.getCollections.mockResolvedValueOnce({
        collections: [{ name: 'test_collection' }],
      });

      await qdrantClient.ensureCollection('test_collection', 1536);

      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });
  });

  describe('upsertPoints', () => {
    it('should upsert points to collection', async () => {
      const points = [
        {
          id: 'point1',
          vector: Array(1536).fill(0),
          payload: { text: 'Test 1' },
        },
        {
          id: 'point2',
          vector: Array(1536).fill(0),
          payload: { text: 'Test 2' },
        },
      ];

      await qdrantClient.upsertPoints('test_collection', points);

      expect(mockClient.upsert).toHaveBeenCalledWith('test_collection', {
        points,
      });
    });

    it('should handle empty points array', async () => {
      await qdrantClient.upsertPoints('test_collection', []);
      expect(mockClient.upsert).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search for similar vectors', async () => {
      const queryVector = Array(1536).fill(0);
      
      const results = await qdrantClient.search(
        'test_collection',
        queryVector,
        5,
        { category: 'payment' }
      );

      expect(mockClient.search).toHaveBeenCalledWith('test_collection', {
        vector: queryVector,
        limit: 5,
        filter: { category: 'payment' },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return results sorted by score', async () => {
      const queryVector = Array(1536).fill(0);
      
      const results = await qdrantClient.search('test_collection', queryVector, 5);

      // Check that results are sorted by score (descending)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should handle no results', async () => {
      mockClient.search.mockResolvedValueOnce([]);
      
      const queryVector = Array(1536).fill(0);
      const results = await qdrantClient.search('test_collection', queryVector, 5);

      expect(results).toEqual([]);
    });
  });

  describe('deletePoints', () => {
    it('should delete points by IDs', async () => {
      const ids = ['point1', 'point2', 'point3'];
      
      await qdrantClient.deletePoints('test_collection', ids);

      expect(mockClient.delete).toHaveBeenCalledWith('test_collection', {
        points: ids,
      });
    });

    it('should handle empty IDs array', async () => {
      await qdrantClient.deletePoints('test_collection', []);
      expect(mockClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('retrievePoints', () => {
    it('should retrieve points by IDs', async () => {
      const ids = ['point1', 'point2'];
      
      const points = await qdrantClient.retrievePoints('test_collection', ids);

      expect(mockClient.retrieve).toHaveBeenCalledWith('test_collection', ids);
      expect(Array.isArray(points)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      mockClient.getCollections.mockRejectedValueOnce(
        new Error('Connection refused')
      );

      await expect(
        qdrantClient.ensureCollection('test_collection', 1536)
      ).rejects.toThrow('Connection refused');
    });

    it('should handle invalid vector dimensions', async () => {
      const points = [
        {
          id: 'point1',
          vector: Array(100).fill(0), // Wrong dimension
          payload: { text: 'Test' },
        },
      ];

      mockClient.upsert.mockRejectedValueOnce(
        new Error('Vector dimension mismatch')
      );

      await expect(
        qdrantClient.upsertPoints('test_collection', points)
      ).rejects.toThrow('Vector dimension mismatch');
    });
  });
});
