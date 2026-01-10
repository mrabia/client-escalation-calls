/**
 * Unit Tests for EmbeddingService
 */

import { MockOpenAIClient } from '../../../mocks/services';

// Mock OpenAI before importing EmbeddingService
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => new MockOpenAIClient()),
  };
});

describe('EmbeddingService', () => {
  let embeddingService: any;
  let mockOpenAI: MockOpenAIClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAI = new MockOpenAIClient();
    
    // Dynamically import to get fresh instance
    jest.isolateModules(() => {
      const { EmbeddingService } = require('../../../../src/services/memory/EmbeddingService');
      embeddingService = new EmbeddingService();
      // Replace the OpenAI client with our mock
      (embeddingService as any).client = mockOpenAI;
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      const text = 'Customer agreed to payment plan';
      const embedding = await embeddingService.generateEmbedding(text);

      expect(embedding).toHaveLength(1536);
      expect(embedding.every((val: number) => typeof val === 'number')).toBe(true);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: text,
      });
    });

    it('should use cache for repeated text', async () => {
      const text = 'Same text for caching';
      
      const embedding1 = await embeddingService.generateEmbedding(text);
      const embedding2 = await embeddingService.generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
      // Should only call API once due to caching
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(1);
    });

    it('should handle empty text', async () => {
      await expect(embeddingService.generateEmbedding('')).rejects.toThrow();
    });

    it('should handle very long text', async () => {
      const longText = 'word '.repeat(10000);
      const embedding = await embeddingService.generateEmbedding(longText);

      expect(embedding).toHaveLength(1536);
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'Customer agreed to payment plan',
        'Customer requested extension',
        'Payment received',
      ];

      const embeddings = await embeddingService.generateBatchEmbeddings(texts);

      expect(embeddings).toHaveLength(3);
      embeddings.forEach((embedding: number[]) => {
        expect(embedding).toHaveLength(1536);
      });
    });

    it('should handle empty array', async () => {
      const embeddings = await embeddingService.generateBatchEmbeddings([]);
      expect(embeddings).toEqual([]);
    });

    it('should use cache for duplicate texts in batch', async () => {
      const texts = ['Same text', 'Same text', 'Different text'];
      
      await embeddingService.generateBatchEmbeddings(texts);

      // Should only generate 2 unique embeddings
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      await embeddingService.generateEmbedding('Test 1');
      await embeddingService.generateEmbedding('Test 1'); // Cache hit
      await embeddingService.generateEmbedding('Test 2');

      const stats = embeddingService.getCacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear the embedding cache', async () => {
      await embeddingService.generateEmbedding('Test');
      
      const statsBefore = embeddingService.getCacheStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      embeddingService.clearCache();

      const statsAfter = embeddingService.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockOpenAI.embeddings.create.mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );

      await expect(
        embeddingService.generateEmbedding('Test')
      ).rejects.toThrow('API rate limit exceeded');
    });

    it('should retry on transient errors', async () => {
      mockOpenAI.embeddings.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          object: 'list',
          data: [
            {
              object: 'embedding',
              embedding: Array(1536).fill(0).map(() => Math.random()),
              index: 0,
            },
          ],
          model: 'text-embedding-3-small',
          usage: { prompt_tokens: 8, total_tokens: 8 },
        });

      const embedding = await embeddingService.generateEmbedding('Test');
      expect(embedding).toHaveLength(1536);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);
    });
  });
});
