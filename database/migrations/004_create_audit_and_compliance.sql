-- Migration 004: Create Audit and Compliance Tables
-- Description: Creates audit_logs, opt_outs, and compliance_rules tables
-- Author: Manus AI
-- Date: 2026-01-09

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_type VARCHAR(50),
    actor_id VARCHAR(100),
    changes JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create opt_outs table
CREATE TABLE IF NOT EXISTS opt_outs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'phone', 'sms', 'all')),
    reason TEXT,
    opted_out_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    UNIQUE(customer_id, channel)
);

-- Create compliance_rules table
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('time_restriction', 'frequency_limit', 'channel_restriction', 'do_not_call', 'consent_required')),
    condition JSONB NOT NULL DEFAULT '{}',
    action VARCHAR(50) NOT NULL CHECK (action IN ('block_contact', 'require_approval', 'log_warning', 'escalate')),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);

-- Create indexes for opt_outs
CREATE INDEX idx_opt_outs_customer_id ON opt_outs(customer_id);
CREATE INDEX idx_opt_outs_channel ON opt_outs(channel);
CREATE INDEX idx_opt_outs_opted_out_at ON opt_outs(opted_out_at);
CREATE INDEX idx_opt_outs_expires_at ON opt_outs(expires_at) WHERE expires_at IS NOT NULL;

-- Create indexes for compliance_rules
CREATE INDEX idx_compliance_rules_name ON compliance_rules(name);
CREATE INDEX idx_compliance_rules_rule_type ON compliance_rules(rule_type);
CREATE INDEX idx_compliance_rules_is_enabled ON compliance_rules(is_enabled) WHERE is_enabled = TRUE;

-- Apply updated_at trigger
CREATE TRIGGER update_compliance_rules_updated_at 
    BEFORE UPDATE ON compliance_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check opt-out status
CREATE OR REPLACE FUNCTION check_opt_out_status(
    p_customer_id UUID,
    p_channel VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_opted_out BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM opt_outs
        WHERE customer_id = p_customer_id
        AND (channel = p_channel OR channel = 'all')
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO v_opted_out;
    
    RETURN v_opted_out;
END;
$$ LANGUAGE plpgsql;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_action VARCHAR(50),
    p_actor_type VARCHAR(50) DEFAULT NULL,
    p_actor_id VARCHAR(100) DEFAULT NULL,
    p_changes JSONB DEFAULT '{}',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        actor_type,
        actor_id,
        changes,
        metadata
    ) VALUES (
        p_entity_type,
        p_entity_id,
        p_action,
        p_actor_type,
        p_actor_id,
        p_changes,
        p_metadata
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all system actions and changes';
COMMENT ON TABLE opt_outs IS 'Customer opt-out preferences by channel';
COMMENT ON TABLE compliance_rules IS 'Compliance rules and regulations for contact restrictions';
COMMENT ON FUNCTION check_opt_out_status IS 'Check if a customer has opted out of a specific channel';
COMMENT ON FUNCTION log_audit_event IS 'Helper function to log audit events consistently';
