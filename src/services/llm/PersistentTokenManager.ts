/**
 * Persistent Token Manager
 * Production-ready token tracking with Redis and PostgreSQL persistence
 */

import { Redis } from 'ioredis';
import { Pool } from 'pg';
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

export class PersistentTokenManager {
  private redis: Redis;
  private db: Pool;
  private budgetLimits: BudgetLimit;

  constructor(redis: Redis, db: Pool, budgetLimits?: BudgetLimit) {
    this.redis = redis;
    this.db = db;

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

    logger.info('Persistent Token Manager initialized', { budgetLimits: this.budgetLimits });
  }

  /**
   * Record token usage (persisted to both Redis and PostgreSQL)
   */
  async recordUsage(
    provider: LLMProvider,
    model: string,
    usage: TokenUsage,
    cost: number,
    metadata?: {
      customerId?: string;
      agentId?: string;
      campaignId?: string;
    }
  ): Promise<void> {
    try {
      const timestamp = new Date();
      const record: UsageRecord = {
        timestamp,
        provider,
        model,
        usage,
        cost,
        ...metadata,
      };

      // Store in PostgreSQL for long-term tracking
      await this.storeInDatabase(record);

      // Update Redis counters for real-time tracking
      await this.updateRedisCounters(record);

      logger.debug('Token usage recorded', { provider, model, cost, metadata });
    } catch (error) {
      logger.error('Failed to record token usage', { error, provider, model });
      throw error;
    }
  }

  /**
   * Store usage record in PostgreSQL
   */
  private async storeInDatabase(record: UsageRecord): Promise<void> {
    const query = `
      INSERT INTO llm_usage_logs (
        timestamp, provider, model, 
        prompt_tokens, completion_tokens, total_tokens,
        cost, customer_id, agent_id, campaign_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    await this.db.query(query, [
      record.timestamp,
      record.provider,
      record.model,
      record.usage.promptTokens,
      record.usage.completionTokens,
      record.usage.totalTokens,
      record.cost,
      record.customerId || null,
      record.agentId || null,
      record.campaignId || null,
    ]);
  }

  /**
   * Update Redis counters for real-time tracking
   */
  private async updateRedisCounters(record: UsageRecord): Promise<void> {
    const dateKey = this.getDateKey(record.timestamp);
    const monthKey = this.getMonthKey(record.timestamp);

    // Use Redis pipeline for atomic updates
    const pipeline = this.redis.pipeline();

    // Daily usage
    pipeline.incrbyfloat(`usage:daily:${dateKey}`, record.cost);
    pipeline.expire(`usage:daily:${dateKey}`, 86400 * 7); // 7 days TTL

    // Monthly usage
    pipeline.incrbyfloat(`usage:monthly:${monthKey}`, record.cost);
    pipeline.expire(`usage:monthly:${monthKey}`, 86400 * 60); // 60 days TTL

    // Customer usage
    if (record.customerId) {
      pipeline.incrbyfloat(`usage:customer:${record.customerId}`, record.cost);
      pipeline.expire(`usage:customer:${record.customerId}`, 86400 * 30); // 30 days TTL
    }

    // Agent usage
    if (record.agentId) {
      pipeline.incrbyfloat(`usage:agent:${record.agentId}`, record.cost);
      pipeline.expire(`usage:agent:${record.agentId}`, 86400 * 30); // 30 days TTL
    }

    // Campaign usage
    if (record.campaignId) {
      pipeline.incrbyfloat(`usage:campaign:${record.campaignId}`, record.cost);
      pipeline.expire(`usage:campaign:${record.campaignId}`, 86400 * 90); // 90 days TTL
    }

    await pipeline.exec();
  }

  /**
   * Check if budget limit is exceeded
   */
  async checkBudgetLimit(
    type: 'daily' | 'monthly',
    scope: 'total' | 'customer' | 'agent' | 'campaign',
    identifier?: string
  ): Promise<{ exceeded: boolean; current: number; limit: number }> {
    try {
      let current = 0;
      let limit = 0;

      if (type === 'daily') {
        const dateKey = this.getDateKey(new Date());
        
        if (scope === 'total') {
          current = parseFloat(await this.redis.get(`usage:daily:${dateKey}`) || '0');
          limit = this.budgetLimits.daily.total;
        } else if (scope === 'customer' && identifier) {
          current = parseFloat(await this.redis.get(`usage:customer:${identifier}`) || '0');
          limit = this.budgetLimits.daily.perCustomer;
        } else if (scope === 'agent' && identifier) {
          current = parseFloat(await this.redis.get(`usage:agent:${identifier}`) || '0');
          limit = this.budgetLimits.daily.perAgent;
        }
      } else if (type === 'monthly') {
        const monthKey = this.getMonthKey(new Date());
        
        if (scope === 'total') {
          current = parseFloat(await this.redis.get(`usage:monthly:${monthKey}`) || '0');
          limit = this.budgetLimits.monthly.total;
        } else if (scope === 'campaign' && identifier) {
          current = parseFloat(await this.redis.get(`usage:campaign:${identifier}`) || '0');
          limit = this.budgetLimits.monthly.perCampaign;
        }
      }

      return {
        exceeded: current >= limit,
        current,
        limit,
      };
    } catch (error) {
      logger.error('Failed to check budget limit', { error, type, scope, identifier });
      // Fail open to avoid blocking operations
      return { exceeded: false, current: 0, limit: 0 };
    }
  }

  /**
   * Get usage metrics
   */
  async getUsageMetrics(
    startDate: Date,
    endDate: Date,
    filters?: {
      provider?: LLMProvider;
      customerId?: string;
      agentId?: string;
      campaignId?: string;
    }
  ): Promise<UsageMetrics> {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_requests,
          SUM(prompt_tokens) as total_prompt_tokens,
          SUM(completion_tokens) as total_completion_tokens,
          SUM(total_tokens) as total_tokens,
          SUM(cost) as total_cost,
          AVG(cost) as avg_cost_per_request,
          provider,
          model
        FROM llm_usage_logs
        WHERE timestamp >= $1 AND timestamp <= $2
      `;

      const params: any[] = [startDate, endDate];
      let paramIndex = 3;

      if (filters?.provider) {
        query += ` AND provider = $${paramIndex}`;
        params.push(filters.provider);
        paramIndex++;
      }

      if (filters?.customerId) {
        query += ` AND customer_id = $${paramIndex}`;
        params.push(filters.customerId);
        paramIndex++;
      }

      if (filters?.agentId) {
        query += ` AND agent_id = $${paramIndex}`;
        params.push(filters.agentId);
        paramIndex++;
      }

      if (filters?.campaignId) {
        query += ` AND campaign_id = $${paramIndex}`;
        params.push(filters.campaignId);
        paramIndex++;
      }

      query += ` GROUP BY provider, model ORDER BY total_cost DESC`;

      const result = await this.db.query(query, params);

      // Aggregate results
      const totalCost = result.rows.reduce((sum, row) => sum + parseFloat(row.total_cost), 0);
      const totalRequests = result.rows.reduce((sum, row) => sum + parseInt(row.total_requests), 0);
      const totalTokens = result.rows.reduce((sum, row) => sum + parseInt(row.total_tokens), 0);

      return {
        totalCost,
        totalRequests,
        totalTokens,
        avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        byProvider: result.rows.map(row => ({
          provider: row.provider,
          model: row.model,
          requests: parseInt(row.total_requests),
          cost: parseFloat(row.total_cost),
          tokens: parseInt(row.total_tokens),
        })),
        period: {
          start: startDate,
          end: endDate,
        },
      };
    } catch (error) {
      logger.error('Failed to get usage metrics', { error, startDate, endDate, filters });
      throw error;
    }
  }

  /**
   * Get current daily usage
   */
  async getDailyUsage(): Promise<number> {
    const dateKey = this.getDateKey(new Date());
    return parseFloat(await this.redis.get(`usage:daily:${dateKey}`) || '0');
  }

  /**
   * Get current monthly usage
   */
  async getMonthlyUsage(): Promise<number> {
    const monthKey = this.getMonthKey(new Date());
    return parseFloat(await this.redis.get(`usage:monthly:${monthKey}`) || '0');
  }

  /**
   * Reset daily usage (for testing or manual reset)
   */
  async resetDailyUsage(): Promise<void> {
    const dateKey = this.getDateKey(new Date());
    await this.redis.del(`usage:daily:${dateKey}`);
    logger.info('Daily usage reset', { date: dateKey });
  }

  /**
   * Get date key for daily tracking (YYYY-MM-DD)
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get month key for monthly tracking (YYYY-MM)
   */
  private getMonthKey(date: Date): string {
    return date.toISOString().slice(0, 7);
  }

  /**
   * Calculate cost based on token usage and model
   */
  calculateCost(provider: LLMProvider, model: string, usage: TokenUsage): CostInfo {
    // Pricing per 1M tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
      'gemini-2.0-pro-exp': { input: 1.25, output: 5 },
      'gemini-2.0-flash-exp': { input: 0.075, output: 0.3 },
    };

    const modelPricing = pricing[model] || { input: 1, output: 2 }; // Default fallback

    const inputCost = (usage.promptTokens / 1_000_000) * modelPricing.input;
    const outputCost = (usage.completionTokens / 1_000_000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      currency: 'USD',
    };
  }
}

/**
 * Create database migration for llm_usage_logs table
 * 
 * SQL:
 * CREATE TABLE IF NOT EXISTS llm_usage_logs (
 *   id SERIAL PRIMARY KEY,
 *   timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   provider VARCHAR(50) NOT NULL,
 *   model VARCHAR(100) NOT NULL,
 *   prompt_tokens INTEGER NOT NULL,
 *   completion_tokens INTEGER NOT NULL,
 *   total_tokens INTEGER NOT NULL,
 *   cost DECIMAL(10, 6) NOT NULL,
 *   customer_id VARCHAR(255),
 *   agent_id VARCHAR(255),
 *   campaign_id VARCHAR(255),
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_llm_usage_timestamp ON llm_usage_logs(timestamp);
 * CREATE INDEX idx_llm_usage_customer ON llm_usage_logs(customer_id);
 * CREATE INDEX idx_llm_usage_agent ON llm_usage_logs(agent_id);
 * CREATE INDEX idx_llm_usage_campaign ON llm_usage_logs(campaign_id);
 * CREATE INDEX idx_llm_usage_provider ON llm_usage_logs(provider, model);
 */
