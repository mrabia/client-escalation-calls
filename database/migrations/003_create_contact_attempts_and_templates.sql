-- Migration 003: Create Contact Attempts and Templates Tables
-- Description: Creates contact_attempts and templates tables for communication tracking
-- Author: Manus AI
-- Date: 2026-01-09

-- Create contact_attempts table
CREATE TABLE IF NOT EXISTS contact_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'phone', 'sms')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'opened', 'answered', 'replied', 'bounced', 'failed')),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    duration INTEGER CHECK (duration >= 0),
    response TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'phone_script')),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'phone', 'sms')),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    html_content TEXT,
    variables TEXT[] DEFAULT '{}',
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1 CHECK (version > 0),
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for contact_attempts
CREATE INDEX idx_contact_attempts_task_id ON contact_attempts(task_id);
CREATE INDEX idx_contact_attempts_agent_id ON contact_attempts(agent_id);
CREATE INDEX idx_contact_attempts_customer_id ON contact_attempts(customer_id);
CREATE INDEX idx_contact_attempts_campaign_id ON contact_attempts(campaign_id);
CREATE INDEX idx_contact_attempts_channel ON contact_attempts(channel);
CREATE INDEX idx_contact_attempts_status ON contact_attempts(status);
CREATE INDEX idx_contact_attempts_timestamp ON contact_attempts(timestamp);
CREATE INDEX idx_contact_attempts_customer_timestamp ON contact_attempts(customer_id, timestamp);

-- Create indexes for templates
CREATE INDEX idx_templates_name ON templates(name);
CREATE INDEX idx_templates_type ON templates(type);
CREATE INDEX idx_templates_channel ON templates(channel);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_is_active ON templates(is_active) WHERE is_active = TRUE;

-- Apply updated_at trigger
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE contact_attempts IS 'Stores all communication attempts with customers across all channels';
COMMENT ON TABLE templates IS 'Stores communication templates for emails, SMS, and phone scripts';
COMMENT ON COLUMN contact_attempts.duration IS 'Duration in seconds, primarily used for phone calls';
COMMENT ON COLUMN contact_attempts.metadata IS 'Channel-specific data such as email_id, call_sid, sms_id, delivery status, etc.';
COMMENT ON COLUMN templates.variables IS 'List of template variables that can be substituted (e.g., contactName, amount, dueDate)';
