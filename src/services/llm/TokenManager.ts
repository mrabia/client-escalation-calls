/**
 * Token Manager
 * Track and manage LLM token usage and costs
 */

import { logger } from '@/utils/logger';
import {
  TokenUsage,
  CostInfo,
  UsageMetrics,
  BudgetLimit,
  LLMProvider,
} from '@/types/llm';

interface UsageRecord {
  timestamp: Date;
  provider: LLMProvider;
  model: string;
  usage: TokenUsage;
  cost: number;
  customerId?: string;
  agentId?: string;
  campaignId?: string;
}

export class TokenManager {
  private usageRecords: UsageRecord[];
  private budgetLimits: BudgetLimit;
  private dailyUsage: Map<string, number>; // date -> total cost
  private monthlyUsage: Map<string, number>; // month -> total cost
  private customerUsage: Map<string, number>; // customerId -> total cost
  private agentUsage: Map<string, number>; // agentId -> total cost
  private campaignUsage: Map<string, number>; // campaignId -> total cost

  constructor(budgetLimits?: BudgetLimit) {
    this.usageRecords = [];
    this.dailyUsage = new Map();
    this.monthlyUsage = new Map();
    this.customerUsage = new Map();
    this.agentUsage = new Map();
    this.campaignUsage = new Map();

    this.budgetLimits = budgetLimits || {
      daily: {
        total: 100,
        perCustomer: 5,
        perAgent: 20,
      },
      monthly: {
        total: 2000,
        perCampaign: 500,
      },
    };

    logger.info('Token Manager initialized', { budgetLimits: this.budgetLimits });
  }

  /**
   * Record token usage
   */
  recordUsage(
    provider: LLMProvider,
    model: string,
    usage: TokenUsage,
    cost: number,
    metadata?: {
      customerId?: string;
      agentId?: string;
      campaignId?: string;
    }
  ): void {
    const record: UsageRecord = {
      timestamp: new Date(),
      provider,
      model,
      usage,
      cost,
      ...metadata,
    };

    this.usageRecords.push(record);

    // Update daily usage
    const dateKey = this.getDateKey(record.timestamp);
    this.dailyUsage.set(dateKey, (this.dailyUsage.get(dateKey) || 0) + cost);

    // Update monthly usage
    const monthKey = this.getMonthKey(record.timestamp);
    this.monthlyUsage.set(monthKey, (this.monthlyUsage.get(monthKey) || 0) + cost);

    // Update customer usage
    if (metadata?.customerId) {
      this.customerUsage.set(
        metadata.customerId,
        (this.customerUsage.get(metadata.customerId) || 0) + cost
      );
    }

    // Update agent usage
    if (metadata?.agentId) {
      this.agentUsage.set(
        metadata.agentId,
        (this.agentUsage.get(metadata.agentId) || 0) + cost
      );
    }

    // Update campaign usage
    if (metadata?.campaignId) {
      this.campaignUsage.set(
        metadata.campaignId,
        (this.campaignUsage.get(metadata.campaignId) || 0) + cost
      );
    }

    logger.debug('Usage recorded', {
      provider,
      model,
      tokens: usage.totalTokens,
      cost,
      ...metadata,
    });
  }

  /**
   * Check if budget limit would be exceeded
   */
  checkBudgetLimit(
    cost: number,
    metadata?: {
      customerId?: string;
      agentId?: string;
      campaignId?: string;
    }
  ): { allowed: boolean; reason?: string } {
    // Check daily total limit
    const today = this.getDateKey(new Date());
    const dailyTotal = this.dailyUsage.get(today) || 0;
    
    if (dailyTotal + cost > this.budgetLimits.daily.total) {
      return {
        allowed: false,
        reason: `Daily budget limit exceeded: $${dailyTotal.toFixed(2)} + $${cost.toFixed(2)} > $${this.budgetLimits.daily.total}`,
      };
    }

    // Check monthly total limit
    const thisMonth = this.getMonthKey(new Date());
    const monthlyTotal = this.monthlyUsage.get(thisMonth) || 0;
    
    if (monthlyTotal + cost > this.budgetLimits.monthly.total) {
      return {
        allowed: false,
        reason: `Monthly budget limit exceeded: $${monthlyTotal.toFixed(2)} + $${cost.toFixed(2)} > $${this.budgetLimits.monthly.total}`,
      };
    }

    // Check per-customer limit
    if (metadata?.customerId) {
      const customerTotal = this.customerUsage.get(metadata.customerId) || 0;
      
      if (customerTotal + cost > this.budgetLimits.daily.perCustomer) {
        return {
          allowed: false,
          reason: `Customer daily budget limit exceeded: $${customerTotal.toFixed(2)} + $${cost.toFixed(2)} > $${this.budgetLimits.daily.perCustomer}`,
        };
      }
    }

    // Check per-agent limit
    if (metadata?.agentId) {
      const agentTotal = this.agentUsage.get(metadata.agentId) || 0;
      
      if (agentTotal + cost > this.budgetLimits.daily.perAgent) {
        return {
          allowed: false,
          reason: `Agent daily budget limit exceeded: $${agentTotal.toFixed(2)} + $${cost.toFixed(2)} > $${this.budgetLimits.daily.perAgent}`,
        };
      }
    }

    // Check per-campaign limit
    if (metadata?.campaignId) {
      const campaignTotal = this.campaignUsage.get(metadata.campaignId) || 0;
      
      if (campaignTotal + cost > this.budgetLimits.monthly.perCampaign) {
        return {
          allowed: false,
          reason: `Campaign monthly budget limit exceeded: $${campaignTotal.toFixed(2)} + $${cost.toFixed(2)} > $${this.budgetLimits.monthly.perCampaign}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get usage metrics
   */
  getUsageMetrics(
    startDate?: Date,
    endDate?: Date
  ): UsageMetrics {
    const filteredRecords = this.filterRecordsByDate(startDate, endDate);

    if (filteredRecords.length === 0) {
      return {
        requestCount: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatency: 0,
        successRate: 100,
        errorRate: 0,
        cacheHitRate: 0,
      };
    }

    const totalTokens = filteredRecords.reduce((sum, r) => sum + r.usage.totalTokens, 0);
    const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

    return {
      requestCount: filteredRecords.length,
      totalTokens,
      totalCost,
      averageLatency: 0, // Would need to track latency in records
      successRate: 100, // Would need to track success/failure
      errorRate: 0,
      cacheHitRate: 0, // Would need to track cache hits
    };
  }

  /**
   * Get usage by provider
   */
  getUsageByProvider(startDate?: Date, endDate?: Date): Map<LLMProvider, UsageMetrics> {
    const filteredRecords = this.filterRecordsByDate(startDate, endDate);
    const providerMetrics = new Map<LLMProvider, UsageMetrics>();

    for (const provider of Object.values(LLMProvider)) {
      const providerRecords = filteredRecords.filter(r => r.provider === provider);
      
      if (providerRecords.length > 0) {
        const totalTokens = providerRecords.reduce((sum, r) => sum + r.usage.totalTokens, 0);
        const totalCost = providerRecords.reduce((sum, r) => sum + r.cost, 0);

        providerMetrics.set(provider, {
          requestCount: providerRecords.length,
          totalTokens,
          totalCost,
          averageLatency: 0,
          successRate: 100,
          errorRate: 0,
          cacheHitRate: 0,
        });
      }
    }

    return providerMetrics;
  }

  /**
   * Get usage by model
   */
  getUsageByModel(startDate?: Date, endDate?: Date): Map<string, UsageMetrics> {
    const filteredRecords = this.filterRecordsByDate(startDate, endDate);
    const modelMetrics = new Map<string, UsageMetrics>();

    const models = [...new Set(filteredRecords.map(r => r.model))];

    for (const model of models) {
      const modelRecords = filteredRecords.filter(r => r.model === model);
      const totalTokens = modelRecords.reduce((sum, r) => sum + r.usage.totalTokens, 0);
      const totalCost = modelRecords.reduce((sum, r) => sum + r.cost, 0);

      modelMetrics.set(model, {
        requestCount: modelRecords.length,
        totalTokens,
        totalCost,
        averageLatency: 0,
        successRate: 100,
        errorRate: 0,
        cacheHitRate: 0,
      });
    }

    return modelMetrics;
  }

  /**
   * Get customer usage
   */
  getCustomerUsage(customerId: string, startDate?: Date, endDate?: Date): UsageMetrics {
    const filteredRecords = this.filterRecordsByDate(startDate, endDate)
      .filter(r => r.customerId === customerId);

    const totalTokens = filteredRecords.reduce((sum, r) => sum + r.usage.totalTokens, 0);
    const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

    return {
      requestCount: filteredRecords.length,
      totalTokens,
      totalCost,
      averageLatency: 0,
      successRate: 100,
      errorRate: 0,
      cacheHitRate: 0,
    };
  }

  /**
   * Get agent usage
   */
  getAgentUsage(agentId: string, startDate?: Date, endDate?: Date): UsageMetrics {
    const filteredRecords = this.filterRecordsByDate(startDate, endDate)
      .filter(r => r.agentId === agentId);

    const totalTokens = filteredRecords.reduce((sum, r) => sum + r.usage.totalTokens, 0);
    const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

    return {
      requestCount: filteredRecords.length,
      totalTokens,
      totalCost,
      averageLatency: 0,
      successRate: 100,
      errorRate: 0,
      cacheHitRate: 0,
    };
  }

  /**
   * Get campaign usage
   */
  getCampaignUsage(campaignId: string, startDate?: Date, endDate?: Date): UsageMetrics {
    const filteredRecords = this.filterRecordsByDate(startDate, endDate)
      .filter(r => r.campaignId === campaignId);

    const totalTokens = filteredRecords.reduce((sum, r) => sum + r.usage.totalTokens, 0);
    const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

    return {
      requestCount: filteredRecords.length,
      totalTokens,
      totalCost,
      averageLatency: 0,
      successRate: 100,
      errorRate: 0,
      cacheHitRate: 0,
    };
  }

  /**
   * Get daily usage
   */
  getDailyUsage(date?: Date): number {
    const dateKey = this.getDateKey(date || new Date());
    return this.dailyUsage.get(dateKey) || 0;
  }

  /**
   * Get monthly usage
   */
  getMonthlyUsage(date?: Date): number {
    const monthKey = this.getMonthKey(date || new Date());
    return this.monthlyUsage.get(monthKey) || 0;
  }

  /**
   * Get budget status
   */
  getBudgetStatus(): {
    daily: { used: number; limit: number; remaining: number; percentage: number };
    monthly: { used: number; limit: number; remaining: number; percentage: number };
  } {
    const dailyUsed = this.getDailyUsage();
    const monthlyUsed = this.getMonthlyUsage();

    return {
      daily: {
        used: dailyUsed,
        limit: this.budgetLimits.daily.total,
        remaining: this.budgetLimits.daily.total - dailyUsed,
        percentage: (dailyUsed / this.budgetLimits.daily.total) * 100,
      },
      monthly: {
        used: monthlyUsed,
        limit: this.budgetLimits.monthly.total,
        remaining: this.budgetLimits.monthly.total - monthlyUsed,
        percentage: (monthlyUsed / this.budgetLimits.monthly.total) * 100,
      },
    };
  }

  /**
   * Reset daily usage (called at midnight)
   */
  resetDailyUsage(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = this.getDateKey(yesterday);
    
    this.dailyUsage.delete(yesterdayKey);
    this.customerUsage.clear();
    this.agentUsage.clear();
    
    logger.info('Daily usage reset');
  }

  /**
   * Export usage data
   */
  exportUsageData(startDate?: Date, endDate?: Date): UsageRecord[] {
    return this.filterRecordsByDate(startDate, endDate);
  }

  /**
   * Clear old records (keep last 90 days)
   */
  clearOldRecords(daysToKeep: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const before = this.usageRecords.length;
    this.usageRecords = this.usageRecords.filter(r => r.timestamp >= cutoffDate);
    const after = this.usageRecords.length;

    logger.info(`Cleared ${before - after} old usage records`);
  }

  /**
   * Helper: Get date key (YYYY-MM-DD)
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper: Get month key (YYYY-MM)
   */
  private getMonthKey(date: Date): string {
    return date.toISOString().substring(0, 7);
  }

  /**
   * Helper: Filter records by date range
   */
  private filterRecordsByDate(startDate?: Date, endDate?: Date): UsageRecord[] {
    let filtered = this.usageRecords;

    if (startDate) {
      filtered = filtered.filter(r => r.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(r => r.timestamp <= endDate);
    }

    return filtered;
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();
