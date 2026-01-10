-- Seed Data Script
-- Description: Creates test data for development and testing
-- Author: Manus AI
-- Date: 2026-01-09

\echo 'Seeding test data...'
\echo ''

-- Clear existing data (for development only)
TRUNCATE TABLE 
    system_metrics,
    audit_logs,
    contact_attempts,
    tasks,
    campaigns,
    opt_outs,
    compliance_rules,
    templates,
    payment_records,
    customer_profiles,
    agents,
    customers
CASCADE;

\echo 'Existing data cleared.'
\echo ''

-- Insert test customers
\echo 'Inserting customers...'
INSERT INTO customers (id, company_name, contact_name, email, phone, mobile, address, preferred_contact_method, tags) VALUES
('11111111-1111-1111-1111-111111111111', 'Acme Logistics', 'John Smith', 'john@acmelogistics.com', '+1-555-0100', '+1-555-0101', '{"street": "123 Main St", "city": "New York", "state": "NY", "zipCode": "10001", "country": "USA"}'::jsonb, 'email', ARRAY['vip', 'logistics']),
('22222222-2222-2222-2222-222222222222', 'Beta Transport', 'Jane Doe', 'jane@betatransport.com', '+1-555-0200', '+1-555-0201', '{"street": "456 Oak Ave", "city": "Los Angeles", "state": "CA", "zipCode": "90001", "country": "USA"}'::jsonb, 'phone', ARRAY['standard', 'transport']),
('33333333-3333-3333-3333-333333333333', 'Premium Freight Inc', 'Robert Johnson', 'robert@premiumfreight.com', '+1-555-0300', NULL, '{"street": "789 Pine Rd", "city": "Chicago", "state": "IL", "zipCode": "60601", "country": "USA"}'::jsonb, 'email', ARRAY['premium', 'freight']),
('44444444-4444-4444-4444-444444444444', 'Quick Ship LLC', 'Sarah Williams', 'sarah@quickship.com', '+1-555-0400', '+1-555-0401', '{"street": "321 Elm St", "city": "Houston", "state": "TX", "zipCode": "77001", "country": "USA"}'::jsonb, 'sms', ARRAY['standard', 'shipping']),
('55555555-5555-5555-5555-555555555555', 'Global Cargo Co', 'Michael Brown', 'michael@globalcargo.com', '+1-555-0500', '+1-555-0501', '{"street": "654 Maple Dr", "city": "Phoenix", "state": "AZ", "zipCode": "85001", "country": "USA"}'::jsonb, 'email', ARRAY['international', 'cargo']);

\echo 'Customers inserted: 5'

-- Insert customer profiles
\echo 'Inserting customer profiles...'
INSERT INTO customer_profiles (customer_id, risk_level, risk_score, average_payment_delay, response_rate, preferred_contact_time_start, preferred_contact_time_end, timezone, communication_style, do_not_contact, contact_restrictions) VALUES
('11111111-1111-1111-1111-111111111111', 'low', 25.50, 3, 0.95, '09:00', '11:00', 'America/New_York', 'formal', FALSE, ARRAY[]::TEXT[]),
('22222222-2222-2222-2222-222222222222', 'medium', 55.00, 10, 0.70, '14:00', '16:00', 'America/Los_Angeles', 'casual', FALSE, ARRAY[]::TEXT[]),
('33333333-3333-3333-3333-333333333333', 'low', 20.00, 2, 0.98, '09:00', '17:00', 'America/Chicago', 'formal', FALSE, ARRAY[]::TEXT[]),
('44444444-4444-4444-4444-444444444444', 'high', 75.00, 20, 0.40, '10:00', '12:00', 'America/Chicago', 'direct', TRUE, ARRAY['phone', 'sms']),
('55555555-5555-5555-5555-555555555555', 'medium', 45.00, 7, 0.85, '08:00', '18:00', 'America/Phoenix', 'diplomatic', FALSE, ARRAY[]::TEXT[]);

\echo 'Customer profiles inserted: 5'

-- Insert payment records
\echo 'Inserting payment records...'
INSERT INTO payment_records (id, customer_id, amount, currency, due_date, paid_date, status, invoice_number, description) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 5000.00, 'USD', '2026-01-01', NULL, 'overdue', 'INV-2026-001', 'Logistics services for December 2025'),
('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 12000.00, 'USD', '2025-12-15', NULL, 'overdue', 'INV-2025-456', 'Transport services Q4 2025'),
('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 25000.00, 'USD', '2026-01-05', NULL, 'overdue', 'INV-2026-789', 'Premium freight services'),
('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 3000.00, 'USD', '2025-12-30', NULL, 'overdue', 'INV-2025-999', 'Quick shipping services'),
('a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 18000.00, 'USD', '2026-01-10', NULL, 'pending', 'INV-2026-100', 'International cargo services'),
('a6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 4500.00, 'USD', '2025-11-15', '2025-11-18', 'paid', 'INV-2025-800', 'Logistics services for October 2025'),
('a7777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 22000.00, 'USD', '2025-12-01', '2025-12-03', 'paid', 'INV-2025-900', 'Premium freight services');

\echo 'Payment records inserted: 7'

-- Insert agents
\echo 'Inserting agents...'
INSERT INTO agents (id, type, status, capabilities, current_task_count, max_concurrent_tasks, working_hours_start, working_hours_end, timezone, config, performance_metrics) VALUES
('e1111111-1111-1111-1111-111111111111', 'email', 'idle', ARRAY['send_email', 'read_email', 'track_opens'], 0, 10, '00:00', '23:59', 'UTC', '{"smtpHost": "smtp.gmail.com", "imapHost": "imap.gmail.com"}'::jsonb, '{"tasksCompleted": 150, "tasksSuccessful": 135, "averageResponseTime": 1200, "customerSatisfactionScore": 8.5, "escalationRate": 0.1}'::jsonb),
('e2222222-2222-2222-2222-222222222222', 'email', 'active', ARRAY['send_email', 'read_email', 'track_opens'], 2, 10, '00:00', '23:59', 'UTC', '{"smtpHost": "smtp.gmail.com", "imapHost": "imap.gmail.com"}'::jsonb, '{"tasksCompleted": 200, "tasksSuccessful": 170, "averageResponseTime": 1500, "customerSatisfactionScore": 8.0, "escalationRate": 0.15}'::jsonb),
('p1111111-1111-1111-1111-111111111111', 'phone', 'idle', ARRAY['make_call', 'receive_call', 'record_call'], 0, 5, '09:00', '17:00', 'America/New_York', '{"twilioAccountSid": "test_sid", "twilioPhoneNumber": "+15551234567"}'::jsonb, '{"tasksCompleted": 80, "tasksSuccessful": 65, "averageResponseTime": 300, "customerSatisfactionScore": 7.5, "escalationRate": 0.2}'::jsonb),
('s1111111-1111-1111-1111-111111111111', 'sms', 'idle', ARRAY['send_sms', 'track_delivery'], 0, 20, '00:00', '23:59', 'UTC', '{"twilioAccountSid": "test_sid", "twilioPhoneNumber": "+15551234567"}'::jsonb, '{"tasksCompleted": 300, "tasksSuccessful": 285, "averageResponseTime": 500, "customerSatisfactionScore": 8.8, "escalationRate": 0.05}'::jsonb);

\echo 'Agents inserted: 4'

-- Insert templates
\echo 'Inserting templates...'
INSERT INTO templates (name, type, channel, subject, content, html_content, variables, category, is_active, version, created_by) VALUES
('payment_reminder_1', 'email', 'email', 'Payment Reminder - Invoice {{invoiceNumber}}', 
'Dear {{contactName}},

We hope this email finds you well. We wanted to remind you that payment for invoice {{invoiceNumber}} in the amount of ${{amount}} {{currency}} was due on {{dueDate}}.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Amount: ${{amount}} {{currency}}
- Due Date: {{dueDate}}
- Days Overdue: {{daysOverdue}}

Please process this payment at your earliest convenience.

Best regards,
{{senderName}}
{{companyName}}',
'<div><h2>Payment Reminder</h2><p>Dear {{contactName}},</p><p>Invoice {{invoiceNumber}} for ${{amount}} {{currency}} was due on {{dueDate}}.</p></div>',
ARRAY['contactName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'daysOverdue', 'senderName', 'companyName'],
'reminder', TRUE, 1, 'system'),

('payment_reminder_2', 'email', 'email', 'Final Notice - Payment Required for Invoice {{invoiceNumber}}',
'FINAL PAYMENT NOTICE

Dear {{contactName}},

This is a FINAL NOTICE regarding the overdue payment for invoice {{invoiceNumber}}.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Amount: ${{amount}} {{currency}}
- Original Due Date: {{dueDate}}
- Days Overdue: {{daysOverdue}}

IMMEDIATE ACTION REQUIRED: Please remit payment within the next 5 business days.

Best regards,
{{senderName}}
{{companyName}}
{{senderPhone}}',
'<div style="background-color: #fff3cd;"><h2>Final Payment Notice</h2><p>Dear {{contactName}},</p><p>This is a FINAL NOTICE for invoice {{invoiceNumber}}.</p></div>',
ARRAY['contactName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'daysOverdue', 'senderName', 'companyName', 'senderPhone'],
'final_notice', TRUE, 1, 'system'),

('payment_reminder_sms', 'sms', 'sms', NULL,
'Payment reminder: Invoice {{invoiceNumber}} for ${{amount}} is {{daysOverdue}} days overdue. Please contact us to arrange payment. {{companyName}}',
NULL,
ARRAY['invoiceNumber', 'amount', 'daysOverdue', 'companyName'],
'reminder', TRUE, 1, 'system'),

('payment_reminder_call', 'phone_script', 'phone', NULL,
'Hello, this is {{agentName}} from {{companyName}}. May I speak with {{contactName}}? I''m calling regarding invoice {{invoiceNumber}} for {{amount}} dollars, which was due on {{dueDate}}. We wanted to check if you need any assistance with this payment.',
NULL,
ARRAY['agentName', 'companyName', 'contactName', 'invoiceNumber', 'amount', 'dueDate'],
'reminder', TRUE, 1, 'system');

\echo 'Templates inserted: 4'

-- Insert compliance rules
\echo 'Inserting compliance rules...'
INSERT INTO compliance_rules (name, description, rule_type, condition, action, severity, is_enabled) VALUES
('No Calls Before 8 AM', 'Prohibit phone calls before 8:00 AM local time', 'time_restriction', '{"channel": "phone", "beforeTime": "08:00"}'::jsonb, 'block_contact', 'high', TRUE),
('No Calls After 9 PM', 'Prohibit phone calls after 9:00 PM local time', 'time_restriction', '{"channel": "phone", "afterTime": "21:00"}'::jsonb, 'block_contact', 'high', TRUE),
('Max 3 Contacts Per Day', 'Limit contact attempts to 3 per customer per day', 'frequency_limit', '{"maxPerDay": 3}'::jsonb, 'block_contact', 'medium', TRUE),
('Respect Do Not Contact', 'Block all contact for customers with do_not_contact flag', 'channel_restriction', '{"checkDoNotContact": true}'::jsonb, 'block_contact', 'critical', TRUE),
('Weekend Call Restriction', 'Warn before making calls on weekends', 'time_restriction', '{"channel": "phone", "excludeDays": ["Saturday", "Sunday"]}'::jsonb, 'log_warning', 'low', TRUE);

\echo 'Compliance rules inserted: 5'

-- Insert a test opt-out
\echo 'Inserting opt-outs...'
INSERT INTO opt_outs (customer_id, channel, reason, opted_out_at) VALUES
('44444444-4444-4444-4444-444444444444', 'phone', 'Customer requested no phone calls', NOW()),
('44444444-4444-4444-4444-444444444444', 'sms', 'Customer requested no SMS messages', NOW());

\echo 'Opt-outs inserted: 2'

-- Insert test campaigns
\echo 'Inserting campaigns...'
INSERT INTO campaigns (id, name, description, customer_id, payment_record_id, status, escalation_steps, current_step, start_date) VALUES
('c1111111-1111-1111-1111-111111111111', 'Acme Logistics Collection Campaign', 'Standard collection for overdue invoice', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'active', 
'[
  {"stepNumber": 1, "channel": "email", "template": "payment_reminder_1", "delayHours": 0, "maxAttempts": 2},
  {"stepNumber": 2, "channel": "phone", "template": "payment_reminder_call", "delayHours": 72, "maxAttempts": 3},
  {"stepNumber": 3, "channel": "sms", "template": "payment_reminder_sms", "delayHours": 48, "maxAttempts": 2}
]'::jsonb, 0, NOW() - INTERVAL '2 days'),

('c2222222-2222-2222-2222-222222222222', 'Beta Transport Collection Campaign', 'High-value collection campaign', '22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'active',
'[
  {"stepNumber": 1, "channel": "phone", "template": "payment_reminder_call", "delayHours": 0, "maxAttempts": 3},
  {"stepNumber": 2, "channel": "email", "template": "payment_reminder_1", "delayHours": 24, "maxAttempts": 2}
]'::jsonb, 1, NOW() - INTERVAL '5 days');

\echo 'Campaigns inserted: 2'

-- Insert test tasks
\echo 'Inserting tasks...'
INSERT INTO tasks (id, type, priority, customer_id, campaign_id, payment_record_id, status, assigned_agent_id, context, attempts, max_attempts, due_at) VALUES
('t1111111-1111-1111-1111-111111111111', 'send_email', 'high', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'completed', 'e1111111-1111-1111-1111-111111111111', 
'{"template": "payment_reminder_1", "variables": {"contactName": "John Smith", "invoiceNumber": "INV-2026-001", "amount": "5000.00", "currency": "USD", "dueDate": "2026-01-01", "daysOverdue": "8"}}'::jsonb, 1, 2, NOW() - INTERVAL '1 day'),

('t2222222-2222-2222-2222-222222222222', 'make_call', 'urgent', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'pending', NULL,
'{"template": "payment_reminder_call", "variables": {"contactName": "Jane Doe", "invoiceNumber": "INV-2025-456", "amount": "12000.00", "dueDate": "2025-12-15"}}'::jsonb, 0, 3, NOW() + INTERVAL '2 hours'),

('t3333333-3333-3333-3333-333333333333', 'send_email', 'medium', '33333333-3333-3333-3333-333333333333', NULL, 'a3333333-3333-3333-3333-333333333333', 'pending', NULL,
'{"template": "payment_reminder_1", "variables": {"contactName": "Robert Johnson", "invoiceNumber": "INV-2026-789", "amount": "25000.00", "currency": "USD", "dueDate": "2026-01-05", "daysOverdue": "4"}}'::jsonb, 0, 2, NOW() + INTERVAL '1 hour');

\echo 'Tasks inserted: 3'

-- Insert test contact attempts
\echo 'Inserting contact attempts...'
INSERT INTO contact_attempts (task_id, agent_id, customer_id, campaign_id, channel, status, timestamp, duration, response, metadata) VALUES
('t1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'email', 'delivered', NOW() - INTERVAL '1 day', NULL, NULL, '{"messageId": "msg_12345", "emailProvider": "gmail"}'::jsonb),

('t1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'email', 'opened', NOW() - INTERVAL '20 hours', NULL, NULL, '{"messageId": "msg_12345", "openedAt": "2026-01-08T14:30:00Z"}'::jsonb);

\echo 'Contact attempts inserted: 2'

-- Insert sample audit logs
\echo 'Inserting audit logs...'
INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, changes, metadata) VALUES
('campaign', 'c1111111-1111-1111-1111-111111111111', 'created', 'system', 'campaign_manager', '{"status": "active"}'::jsonb, '{"source": "api"}'::jsonb),
('task', 't1111111-1111-1111-1111-111111111111', 'status_changed', 'agent', 'e1111111-1111-1111-1111-111111111111', '{"before": "pending", "after": "completed"}'::jsonb, '{"duration": 1200}'::jsonb),
('customer', '44444444-4444-4444-4444-444444444444', 'opted_out', 'customer', '44444444-4444-4444-4444-444444444444', '{"channel": "phone"}'::jsonb, '{"reason": "customer_request"}'::jsonb);

\echo 'Audit logs inserted: 3'

-- Insert sample system metrics
\echo 'Inserting system metrics...'
INSERT INTO system_metrics (metric_type, metric_name, value, dimensions, timestamp) VALUES
('agent_performance', 'task_completion_rate', 0.87, '{"agent_type": "email"}'::jsonb, NOW() - INTERVAL '1 hour'),
('agent_performance', 'average_response_time', 1350.00, '{"agent_type": "email"}'::jsonb, NOW() - INTERVAL '1 hour'),
('campaign_performance', 'success_rate', 0.72, '{"campaign_type": "standard_collection"}'::jsonb, NOW() - INTERVAL '30 minutes'),
('system_health', 'active_agents', 4.00, '{}'::jsonb, NOW()),
('system_health', 'pending_tasks', 2.00, '{}'::jsonb, NOW());

\echo 'System metrics inserted: 5'

\echo ''
\echo 'Test data seeding completed successfully!'
\echo ''
\echo 'Summary:'
\echo '- Customers: 5'
\echo '- Customer Profiles: 5'
\echo '- Payment Records: 7'
\echo '- Agents: 4'
\echo '- Templates: 4'
\echo '- Compliance Rules: 5'
\echo '- Opt-outs: 2'
\echo '- Campaigns: 2'
\echo '- Tasks: 3'
\echo '- Contact Attempts: 2'
\echo '- Audit Logs: 3'
\echo '- System Metrics: 5'
