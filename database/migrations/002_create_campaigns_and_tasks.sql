-- Migration 002: Create Campaigns and Tasks Tables
-- Description: Creates campaigns and tasks tables for workflow management
-- Author: Manus AI
-- Date: 2026-01-09

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    payment_record_id UUID REFERENCES payment_records(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    escalation_steps JSONB NOT NULL DEFAULT '[]',
    current_step INTEGER NOT NULL DEFAULT 0 CHECK (current_step >= 0),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    paused_until TIMESTAMP,
    results JSONB DEFAULT '{"totalContacts": 0, "successfulContacts": 0, "paymentsReceived": 0, "totalAmountCollected": 0, "averageCollectionTime": 0, "channelPerformance": []}',
    config JSONB DEFAULT '{"businessHours": {"start": "09:00", "end": "17:00"}, "timezone": "UTC", "respectDoNotContact": true, "maxDailyContacts": 3, "cooldownPeriod": 4, "complianceRules": []}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('send_email', 'make_call', 'send_sms', 'research_customer', 'escalate', 'follow_up')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    payment_record_id UUID REFERENCES payment_records(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled')),
    assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    context JSONB NOT NULL DEFAULT '{}',
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER DEFAULT 3 CHECK (max_attempts > 0),
    due_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for campaigns
CREATE INDEX idx_campaigns_customer_id ON campaigns(customer_id);
CREATE INDEX idx_campaigns_payment_record_id ON campaigns(payment_record_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);
CREATE INDEX idx_campaigns_current_step ON campaigns(current_step);

-- Create indexes for tasks
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX idx_tasks_campaign_id ON tasks(campaign_id);
CREATE INDEX idx_tasks_assigned_agent_id ON tasks(assigned_agent_id);
CREATE INDEX idx_tasks_due_at ON tasks(due_at);
CREATE INDEX idx_tasks_type_status ON tasks(type, status);
CREATE INDEX idx_tasks_status_due_at ON tasks(status, due_at) WHERE status IN ('pending', 'assigned');

-- Apply updated_at triggers
CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE campaigns IS 'Stores campaign definitions and execution state';
COMMENT ON TABLE tasks IS 'Stores individual tasks assigned to agents';
COMMENT ON COLUMN campaigns.escalation_steps IS 'Array of escalation step definitions with channel, template, delay, and conditions';
COMMENT ON COLUMN campaigns.results IS 'Campaign performance metrics including contacts, payments, and channel performance';
COMMENT ON COLUMN tasks.context IS 'Task context including customer data, previous attempts, and metadata';
