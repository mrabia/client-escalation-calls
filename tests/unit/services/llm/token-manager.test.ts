/**
 * Token Manager Unit Tests
 * 
 * Tests budget management and usage tracking
 */

import { TokenManager } from '../../../../src/services/llm/TokenManager';
import { LLMProvider } from '../../../../src/types/llm';

describe('TokenManager', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager();
  });

  describe('constructor', () => {
    it('should initialize with default budget limits', () => {
      const status = tokenManager.getBudgetStatus();
      
      expect(status.daily.limit).toBe(100);
      expect(status.monthly.limit).toBe(2000);
    });

    it('should accept custom budget limits', () => {
      const customManager = new TokenManager({
        daily: { total: 50, perCustomer: 2, perAgent: 10 },
        monthly: { total: 1000, perCampaign: 200 },
      });

      const status = customManager.getBudgetStatus();
      expect(status.daily.limit).toBe(50);
      expect(status.monthly.limit).toBe(1000);
    });
  });

  describe('recordUsage', () => {
    it('should record token usage', () => {
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        0.01
      );

      const metrics = tokenManager.getUsageMetrics();
      expect(metrics.totalTokens).toBe(150);
      expect(metrics.totalCost).toBe(0.01);
    });

    it('should accumulate multiple usage records', () => {
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        0.01
      );
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        0.02
      );

      const metrics = tokenManager.getUsageMetrics();
      expect(metrics.totalTokens).toBe(450);
      expect(metrics.totalCost).toBe(0.03);
    });

    it('should track customer usage when provided', () => {
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        0.01,
        { customerId: 'cust-123' }
      );

      const customerMetrics = tokenManager.getCustomerUsage('cust-123');
      expect(customerMetrics.totalTokens).toBe(150);
    });
  });

  describe('checkBudgetLimit', () => {
    it('should return allowed when under budget', () => {
      const result = tokenManager.checkBudgetLimit(10);
      expect(result.allowed).toBe(true);
    });

    it('should return not allowed when exceeding daily limit', () => {
      // Record usage up to daily limit
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
        95 // Close to daily limit of 100
      );

      const result = tokenManager.checkBudgetLimit(10);
      expect(result.allowed).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('daily');
    });
  });

  describe('getBudgetStatus', () => {
    it('should return current budget status', () => {
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        10
      );

      const status = tokenManager.getBudgetStatus();
      
      expect(status.daily.used).toBe(10);
      expect(status.daily.remaining).toBe(90);
      expect(status.daily.percentage).toBe(10);
    });
  });

  describe('getUsageByProvider', () => {
    it('should return usage grouped by provider', () => {
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        0.01
      );
      tokenManager.recordUsage(
        LLMProvider.ANTHROPIC,
        'claude-3',
        { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        0.02
      );

      const byProvider = tokenManager.getUsageByProvider();
      
      expect(byProvider.get(LLMProvider.OPENAI)?.totalTokens).toBe(150);
      expect(byProvider.get(LLMProvider.ANTHROPIC)?.totalTokens).toBe(300);
    });
  });

  describe('getUsageByModel', () => {
    it('should return usage grouped by model', () => {
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        0.03
      );
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-3.5-turbo',
        { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        0.01
      );

      const byModel = tokenManager.getUsageByModel();
      
      expect(byModel.get('gpt-4')?.totalTokens).toBe(150);
      expect(byModel.get('gpt-3.5-turbo')?.totalTokens).toBe(300);
    });
  });

  describe('getDailyUsage', () => {
    it('should return daily usage', () => {
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        0.01
      );

      const daily = tokenManager.getDailyUsage();
      expect(daily).toBe(0.01);
    });
  });

  describe('exportUsageData', () => {
    it('should export all usage records', () => {
      tokenManager.recordUsage(
        LLMProvider.OPENAI,
        'gpt-4',
        { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        0.01
      );

      const data = tokenManager.exportUsageData();
      expect(data.length).toBe(1);
      expect(data[0].model).toBe('gpt-4');
    });
  });
});
