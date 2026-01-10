/**
 * Token Manager Unit Tests
 * 
 * Tests token counting, budget management, and usage tracking
 */

import { TokenManager } from '@/services/llm/TokenManager';
import { logger } from '@/utils/logger';

describe('Token Manager Tests', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager(logger);
  });

  describe('Token Counting', () => {
    it('should count tokens in simple text', () => {
      const text = 'Hello, world!';
      const count = tokenManager.countTokens(text);

      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });

    it('should count tokens in longer text', () => {
      const shortText = 'Hello';
      const longText = 'Hello '.repeat(100);

      const shortCount = tokenManager.countTokens(shortText);
      const longCount = tokenManager.countTokens(longText);

      expect(longCount).toBeGreaterThan(shortCount);
    });

    it('should count tokens in messages array', () => {
      const messages = [
        { role: 'user' as const, content: 'What is AI?' },
        { role: 'assistant' as const, content: 'AI stands for Artificial Intelligence.' },
      ];

      const count = tokenManager.countMessagesTokens(messages);

      expect(count).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const count = tokenManager.countTokens('');
      expect(count).toBe(0);
    });

    it('should handle unicode characters', () => {
      const text = '你好世界';
      const count = tokenManager.countTokens(text);

      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Budget Management', () => {
    it('should set budget for model', () => {
      tokenManager.setBudget('gpt-4', 10000);

      const budget = tokenManager.getBudget('gpt-4');
      expect(budget).toBe(10000);
    });

    it('should track token usage', () => {
      tokenManager.setBudget('gpt-4', 10000);
      tokenManager.trackUsage('gpt-4', 100);

      const remaining = tokenManager.getRemainingBudget('gpt-4');
      expect(remaining).toBe(9900);
    });

    it('should check if budget is available', () => {
      tokenManager.setBudget('gpt-4', 1000);
      tokenManager.trackUsage('gpt-4', 500);

      expect(tokenManager.hasBudget('gpt-4', 400)).toBe(true);
      expect(tokenManager.hasBudget('gpt-4', 600)).toBe(false);
    });

    it('should prevent usage beyond budget', () => {
      tokenManager.setBudget('gpt-4', 100);

      expect(() => {
        tokenManager.trackUsage('gpt-4', 150);
      }).toThrow('Budget exceeded');
    });

    it('should reset budget', () => {
      tokenManager.setBudget('gpt-4', 1000);
      tokenManager.trackUsage('gpt-4', 500);
      tokenManager.resetBudget('gpt-4');

      const remaining = tokenManager.getRemainingBudget('gpt-4');
      expect(remaining).toBe(1000);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost for GPT-4', () => {
      const inputTokens = 1000;
      const outputTokens = 500;

      const cost = tokenManager.calculateCost('gpt-4', inputTokens, outputTokens);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should calculate cost for GPT-3.5', () => {
      const inputTokens = 1000;
      const outputTokens = 500;

      const cost = tokenManager.calculateCost('gpt-3.5-turbo', inputTokens, outputTokens);

      expect(cost).toBeGreaterThan(0);
      // GPT-3.5 should be cheaper than GPT-4
      const gpt4Cost = tokenManager.calculateCost('gpt-4', inputTokens, outputTokens);
      expect(cost).toBeLessThan(gpt4Cost);
    });

    it('should handle zero tokens', () => {
      const cost = tokenManager.calculateCost('gpt-4', 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('Usage Statistics', () => {
    it('should track total usage', () => {
      tokenManager.trackUsage('gpt-4', 100);
      tokenManager.trackUsage('gpt-4', 200);
      tokenManager.trackUsage('gpt-3.5-turbo', 150);

      const stats = tokenManager.getUsageStats();

      expect(stats['gpt-4']).toBe(300);
      expect(stats['gpt-3.5-turbo']).toBe(150);
    });

    it('should get total tokens used', () => {
      tokenManager.trackUsage('gpt-4', 100);
      tokenManager.trackUsage('gpt-3.5-turbo', 200);

      const total = tokenManager.getTotalTokensUsed();
      expect(total).toBe(300);
    });

    it('should get total cost', () => {
      tokenManager.trackUsage('gpt-4', 1000, 500);
      tokenManager.trackUsage('gpt-3.5-turbo', 1000, 500);

      const totalCost = tokenManager.getTotalCost();
      expect(totalCost).toBeGreaterThan(0);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens for prompt', () => {
      const prompt = 'Generate a summary of this article';
      const estimate = tokenManager.estimatePromptTokens(prompt);

      expect(estimate).toBeGreaterThan(0);
    });

    it('should estimate completion tokens', () => {
      const maxTokens = 500;
      const estimate = tokenManager.estimateCompletionTokens(maxTokens);

      expect(estimate).toBeLessThanOrEqual(maxTokens);
    });

    it('should estimate total cost for request', () => {
      const prompt = 'What is AI?';
      const maxTokens = 500;

      const estimatedCost = tokenManager.estimateRequestCost('gpt-4', prompt, maxTokens);

      expect(estimatedCost).toBeGreaterThan(0);
    });
  });
});
