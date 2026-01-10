-- Migration 006: Create LLM Usage Tracking Tables
-- Description: Tables for tracking LLM token usage, costs, and budgets
-- Author: Manus AI Agent
-- Date: 2026-01-09

-- LLM Usage Logs Table
CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  customer_id VARCHAR(255),
  agent_id VARCHAR(255),
  campaign_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_llm_usage_timestamp ON llm_usage_logs(timestamp);
CREATE INDEX idx_llm_usage_customer ON llm_usage_logs(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_llm_usage_agent ON llm_usage_logs(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_llm_usage_campaign ON llm_usage_logs(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_llm_usage_provider ON llm_usage_logs(provider, model);
CREATE INDEX idx_llm_usage_cost ON llm_usage_logs(cost DESC);

-- Budget Limits Table
CREATE TABLE IF NOT EXISTS llm_budget_limits (
  id SERIAL PRIMARY KEY,
  scope VARCHAR(50) NOT NULL, -- 'daily_total', 'daily_customer', 'daily_agent', 'monthly_total', 'monthly_campaign'
  identifier VARCHAR(255), -- customer_id, agent_id, campaign_id (NULL for total)
  limit_amount DECIMAL(10, 2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scope, identifier)
);

-- Insert default budget limits
INSERT INTO llm_budget_limits (scope, identifier, limit_amount) VALUES
  ('daily_total', NULL, 100.00),
  ('daily_customer', NULL, 5.00),
  ('daily_agent', NULL, 20.00),
  ('monthly_total', NULL, 2000.00),
  ('monthly_campaign', NULL, 500.00)
ON CONFLICT (scope, identifier) DO NOTHING;

-- LLM Cache Table (for response caching)
CREATE TABLE IF NOT EXISTS llm_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(64) NOT NULL UNIQUE, -- MD5 hash of prompt + model
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_hash VARCHAR(64) NOT NULL,
  response_text TEXT NOT NULL,
  response_metadata JSONB,
  token_usage JSONB NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for cache
CREATE INDEX idx_llm_cache_key ON llm_cache(cache_key);
CREATE INDEX idx_llm_cache_expires ON llm_cache(expires_at);
CREATE INDEX idx_llm_cache_prompt_hash ON llm_cache(prompt_hash);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_llm_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM llm_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE llm_usage_logs IS 'Tracks all LLM API calls with token usage and costs';
COMMENT ON TABLE llm_budget_limits IS 'Defines budget limits for different scopes (daily/monthly, total/per-entity)';
COMMENT ON TABLE llm_cache IS 'Caches LLM responses to reduce API calls and costs';
COMMENT ON FUNCTION clean_expired_llm_cache IS 'Removes expired cache entries (should be called periodically)';

-- Rollback script
-- DROP TABLE IF EXISTS llm_cache CASCADE;
-- DROP TABLE IF EXISTS llm_budget_limits CASCADE;
-- DROP TABLE IF EXISTS llm_usage_logs CASCADE;
-- DROP FUNCTION IF EXISTS clean_expired_llm_cache CASCADE;
