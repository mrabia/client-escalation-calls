-- Migration 005: Create System Metrics and Views
-- Description: Creates system_metrics table and useful database views
-- Author: Manus AI
-- Date: 2026-01-09

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC(12,4) NOT NULL,
    dimensions JSONB DEFAULT '{}',
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for system_metrics
CREATE INDEX idx_system_metrics_metric_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_metric_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_system_metrics_type_timestamp ON system_metrics(metric_type, timestamp);

-- Create view for active campaigns with customer details
CREATE OR REPLACE VIEW v_active_campaigns AS
SELECT 
    c.id,
    c.name,
    c.status,
    c.current_step,
    c.start_date,
    c.end_date,
    cust.company_name,
    cust.contact_name,
    cust.email,
    pr.invoice_number,
    pr.amount,
    pr.currency,
    pr.due_date,
    pr.status as payment_status,
    (c.results->>'totalContacts')::INTEGER as total_contacts,
    (c.results->>'successfulContacts')::INTEGER as successful_contacts
FROM campaigns c
JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN payment_records pr ON c.payment_record_id = pr.id
WHERE c.status IN ('active', 'paused')
ORDER BY c.start_date DESC;

-- Create view for pending tasks with details
CREATE OR REPLACE VIEW v_pending_tasks AS
SELECT 
    t.id,
    t.type,
    t.priority,
    t.status,
    t.due_at,
    t.attempts,
    t.max_attempts,
    cust.company_name,
    cust.contact_name,
    cust.email,
    c.name as campaign_name,
    a.type as agent_type,
    a.status as agent_status
FROM tasks t
JOIN customers cust ON t.customer_id = cust.id
LEFT JOIN campaigns c ON t.campaign_id = c.id
LEFT JOIN agents a ON t.assigned_agent_id = a.id
WHERE t.status IN ('pending', 'assigned')
ORDER BY t.priority DESC, t.due_at ASC NULLS LAST;

-- Create view for agent performance
CREATE OR REPLACE VIEW v_agent_performance AS
SELECT 
    a.id,
    a.type,
    a.status,
    a.current_task_count,
    a.max_concurrent_tasks,
    (a.performance_metrics->>'tasksCompleted')::INTEGER as tasks_completed,
    (a.performance_metrics->>'tasksSuccessful')::INTEGER as tasks_successful,
    (a.performance_metrics->>'averageResponseTime')::NUMERIC as avg_response_time,
    (a.performance_metrics->>'customerSatisfactionScore')::NUMERIC as satisfaction_score,
    CASE 
        WHEN (a.performance_metrics->>'tasksCompleted')::INTEGER > 0 
        THEN ROUND(
            (a.performance_metrics->>'tasksSuccessful')::NUMERIC / 
            (a.performance_metrics->>'tasksCompleted')::NUMERIC * 100, 
            2
        )
        ELSE 0 
    END as success_rate_percentage,
    a.last_active_at
FROM agents a
ORDER BY a.type, a.status;

-- Create view for customer communication history
CREATE OR REPLACE VIEW v_customer_communications AS
SELECT 
    ca.id,
    ca.customer_id,
    cust.company_name,
    cust.contact_name,
    ca.channel,
    ca.status,
    ca.timestamp,
    ca.duration,
    ca.response,
    c.name as campaign_name,
    a.type as agent_type,
    t.type as task_type
FROM contact_attempts ca
JOIN customers cust ON ca.customer_id = cust.id
JOIN agents a ON ca.agent_id = a.id
JOIN tasks t ON ca.task_id = t.id
LEFT JOIN campaigns c ON ca.campaign_id = c.id
ORDER BY ca.timestamp DESC;

-- Create view for overdue payments
CREATE OR REPLACE VIEW v_overdue_payments AS
SELECT 
    pr.id,
    pr.invoice_number,
    pr.amount,
    pr.currency,
    pr.due_date,
    pr.status,
    (CURRENT_DATE - pr.due_date) as days_overdue,
    cust.id as customer_id,
    cust.company_name,
    cust.contact_name,
    cust.email,
    cust.phone,
    cp.risk_level,
    cp.average_payment_delay,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM campaigns 
            WHERE customer_id = cust.id 
            AND payment_record_id = pr.id 
            AND status = 'active'
        ) THEN TRUE 
        ELSE FALSE 
    END as has_active_campaign
FROM payment_records pr
JOIN customers cust ON pr.customer_id = cust.id
LEFT JOIN customer_profiles cp ON cust.id = cp.customer_id
WHERE pr.status IN ('overdue', 'partial')
ORDER BY (CURRENT_DATE - pr.due_date) DESC;

-- Create view for campaign effectiveness
CREATE OR REPLACE VIEW v_campaign_effectiveness AS
SELECT 
    c.id,
    c.name,
    c.status,
    cust.company_name,
    (c.results->>'totalContacts')::INTEGER as total_contacts,
    (c.results->>'successfulContacts')::INTEGER as successful_contacts,
    (c.results->>'paymentsReceived')::INTEGER as payments_received,
    (c.results->>'totalAmountCollected')::NUMERIC as amount_collected,
    CASE 
        WHEN (c.results->>'totalContacts')::INTEGER > 0 
        THEN ROUND(
            (c.results->>'successfulContacts')::NUMERIC / 
            (c.results->>'totalContacts')::NUMERIC * 100, 
            2
        )
        ELSE 0 
    END as success_rate_percentage,
    c.start_date,
    c.end_date,
    CASE 
        WHEN c.end_date IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (c.end_date - c.start_date)) / 86400 
        ELSE EXTRACT(EPOCH FROM (NOW() - c.start_date)) / 86400 
    END as duration_days
FROM campaigns c
JOIN customers cust ON c.customer_id = cust.id
WHERE c.status IN ('active', 'completed')
ORDER BY c.start_date DESC;

-- Create function to get customer risk score
CREATE OR REPLACE FUNCTION calculate_customer_risk_score(p_customer_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_risk_score NUMERIC := 50.0; -- Base score
    v_payment_delay INTEGER;
    v_response_rate NUMERIC;
    v_overdue_count INTEGER;
BEGIN
    -- Get customer profile data
    SELECT average_payment_delay, response_rate
    INTO v_payment_delay, v_response_rate
    FROM customer_profiles
    WHERE customer_id = p_customer_id;
    
    -- Count overdue payments
    SELECT COUNT(*)
    INTO v_overdue_count
    FROM payment_records
    WHERE customer_id = p_customer_id
    AND status = 'overdue';
    
    -- Adjust score based on payment delay
    IF v_payment_delay IS NOT NULL THEN
        v_risk_score := v_risk_score + (v_payment_delay * 2);
    END IF;
    
    -- Adjust score based on response rate
    IF v_response_rate IS NOT NULL THEN
        v_risk_score := v_risk_score - (v_response_rate * 20);
    END IF;
    
    -- Adjust score based on overdue count
    v_risk_score := v_risk_score + (v_overdue_count * 10);
    
    -- Ensure score is within bounds
    v_risk_score := GREATEST(0, LEAST(100, v_risk_score));
    
    RETURN v_risk_score;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE system_metrics IS 'Stores system performance and business metrics over time';
COMMENT ON VIEW v_active_campaigns IS 'Active and paused campaigns with customer and payment details';
COMMENT ON VIEW v_pending_tasks IS 'Pending and assigned tasks with full context';
COMMENT ON VIEW v_agent_performance IS 'Agent performance metrics and statistics';
COMMENT ON VIEW v_customer_communications IS 'Complete communication history across all channels';
COMMENT ON VIEW v_overdue_payments IS 'Overdue payments with customer risk information';
COMMENT ON VIEW v_campaign_effectiveness IS 'Campaign performance and effectiveness metrics';
COMMENT ON FUNCTION calculate_customer_risk_score IS 'Calculate dynamic risk score for a customer based on behavior';
