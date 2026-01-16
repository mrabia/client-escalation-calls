-- Production Seed Data
-- Description: Default data required for production deployment
-- Author: System
-- Date: 2026-01-15
-- 
-- This script creates essential production data:
-- - Default admin user
-- - System configuration
-- - Default templates
-- - Compliance rules
--
-- NOTE: Change the admin password immediately after first login!

\echo 'Seeding production defaults...'
\echo ''

-- ============================================================================
-- DEFAULT ADMIN USER
-- ============================================================================
\echo 'Creating default admin user...'

-- Password: 'ChangeMe123!' (bcrypt hash with 12 rounds)
-- IMPORTANT: Change this password immediately after deployment!
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    email_verified,
    email_verified_at,
    must_change_password
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@system.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SLmNqyqvqvqvqv',
    'System',
    'Administrator',
    'admin',
    TRUE,
    TRUE,
    NOW(),
    TRUE
) ON CONFLICT (email) DO NOTHING;

\echo 'Default admin user created (email: admin@system.local)'
\echo 'WARNING: Change the default password immediately!'
\echo ''

-- ============================================================================
-- SYSTEM AGENTS
-- ============================================================================
\echo 'Creating system agents...'

INSERT INTO agents (id, type, status, capabilities, max_concurrent_tasks, working_hours_start, working_hours_end, timezone, config, performance_metrics) VALUES
-- Email Agent
('00000000-0000-0000-0001-000000000001', 'email', 'idle', 
 ARRAY['send_email', 'read_email', 'track_opens', 'track_clicks', 'handle_bounces'], 
 20, '00:00', '23:59', 'UTC',
 '{"provider": "smtp", "retryAttempts": 3, "retryDelay": 300}'::jsonb,
 '{"tasksCompleted": 0, "tasksSuccessful": 0, "averageResponseTime": 0}'::jsonb),

-- Phone Agent
('00000000-0000-0000-0001-000000000002', 'phone', 'idle',
 ARRAY['make_call', 'receive_call', 'record_call', 'transcribe', 'sentiment_analysis'],
 5, '09:00', '21:00', 'America/New_York',
 '{"provider": "twilio", "recordCalls": true, "maxCallDuration": 1800}'::jsonb,
 '{"tasksCompleted": 0, "tasksSuccessful": 0, "averageResponseTime": 0}'::jsonb),

-- SMS Agent
('00000000-0000-0000-0001-000000000003', 'sms', 'idle',
 ARRAY['send_sms', 'receive_sms', 'track_delivery'],
 50, '08:00', '21:00', 'UTC',
 '{"provider": "twilio", "maxMessageLength": 160}'::jsonb,
 '{"tasksCompleted": 0, "tasksSuccessful": 0, "averageResponseTime": 0}'::jsonb),

-- Research Agent
('00000000-0000-0000-0001-000000000004', 'research', 'idle',
 ARRAY['web_search', 'company_lookup', 'contact_enrichment', 'risk_analysis'],
 10, '00:00', '23:59', 'UTC',
 '{"llmProvider": "openai", "maxTokensPerRequest": 4000}'::jsonb,
 '{"tasksCompleted": 0, "tasksSuccessful": 0, "averageResponseTime": 0}'::jsonb)

ON CONFLICT (id) DO NOTHING;

\echo 'System agents created: 4'
\echo ''

-- ============================================================================
-- PRODUCTION TEMPLATES
-- ============================================================================
\echo 'Creating production email templates...'

INSERT INTO templates (name, type, channel, subject, content, html_content, variables, category, is_active, version, created_by) VALUES

-- Initial friendly reminder
('prod_reminder_initial', 'email', 'email', 
 'Friendly Reminder: Invoice {{invoiceNumber}} Due Soon',
 'Dear {{contactName}},

I hope this message finds you well. This is a friendly reminder that invoice {{invoiceNumber}} for {{amount}} {{currency}} is approaching its due date of {{dueDate}}.

Invoice Details:
• Invoice Number: {{invoiceNumber}}
• Amount Due: {{amount}} {{currency}}
• Due Date: {{dueDate}}

If you have already processed this payment, please disregard this notice. If you have any questions about this invoice, please don''t hesitate to reach out.

Thank you for your continued business.

Best regards,
{{senderName}}
{{companyName}}
{{senderEmail}}',
 NULL,
 ARRAY['contactName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'senderName', 'companyName', 'senderEmail'],
 'reminder', TRUE, 1, 'system'),

-- First overdue notice
('prod_reminder_overdue_1', 'email', 'email',
 'Payment Reminder: Invoice {{invoiceNumber}} - {{daysOverdue}} Days Past Due',
 'Dear {{contactName}},

We wanted to bring to your attention that invoice {{invoiceNumber}} is now {{daysOverdue}} days past its due date.

Invoice Details:
• Invoice Number: {{invoiceNumber}}
• Original Amount: {{amount}} {{currency}}
• Original Due Date: {{dueDate}}
• Days Overdue: {{daysOverdue}}

We understand that oversights can happen. If you have already sent payment, thank you, and please disregard this notice.

If you are experiencing any difficulties or have questions about this invoice, please contact us so we can work together to find a solution.

Best regards,
{{senderName}}
{{companyName}}
{{senderPhone}}',
 NULL,
 ARRAY['contactName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'daysOverdue', 'senderName', 'companyName', 'senderPhone'],
 'reminder', TRUE, 1, 'system'),

-- Second overdue notice (escalated)
('prod_reminder_overdue_2', 'email', 'email',
 'IMPORTANT: Overdue Invoice {{invoiceNumber}} Requires Immediate Attention',
 'Dear {{contactName}},

This is our second notice regarding the outstanding balance on invoice {{invoiceNumber}}, which is now {{daysOverdue}} days past due.

INVOICE SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Invoice Number: {{invoiceNumber}}
Amount Due: {{amount}} {{currency}}
Original Due Date: {{dueDate}}
Days Overdue: {{daysOverdue}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To avoid any disruption to your account or additional fees, please remit payment within the next 7 business days.

Payment Options:
• Online: {{paymentPortalUrl}}
• Phone: {{senderPhone}}
• Email: {{senderEmail}}

If there are circumstances preventing payment, please contact us immediately to discuss available options.

Regards,
{{senderName}}
{{companyName}}',
 NULL,
 ARRAY['contactName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'daysOverdue', 'paymentPortalUrl', 'senderName', 'companyName', 'senderPhone', 'senderEmail'],
 'escalation', TRUE, 1, 'system'),

-- Final notice
('prod_reminder_final', 'email', 'email',
 'FINAL NOTICE: Invoice {{invoiceNumber}} - Immediate Action Required',
 'Dear {{contactName}},

FINAL NOTICE

Despite our previous communications, we have not received payment for invoice {{invoiceNumber}}.

ACCOUNT STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Invoice Number: {{invoiceNumber}}
Amount Due: {{amount}} {{currency}}
Days Overdue: {{daysOverdue}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is your final notice before we proceed with additional collection measures, which may include:
• Account suspension
• Reporting to credit agencies
• Referral to collections

To resolve this matter immediately:
• Pay online: {{paymentPortalUrl}}
• Call us: {{senderPhone}}

If you believe this notice was sent in error or wish to discuss payment arrangements, please contact us within 48 hours.

{{senderName}}
{{companyName}}
{{senderPhone}}',
 NULL,
 ARRAY['contactName', 'invoiceNumber', 'amount', 'currency', 'daysOverdue', 'paymentPortalUrl', 'senderName', 'companyName', 'senderPhone'],
 'final_notice', TRUE, 1, 'system'),

-- Payment confirmation
('prod_payment_confirmation', 'email', 'email',
 'Payment Received - Invoice {{invoiceNumber}}',
 'Dear {{contactName}},

Thank you! We have received your payment for invoice {{invoiceNumber}}.

Payment Details:
• Invoice Number: {{invoiceNumber}}
• Amount Paid: {{amountPaid}} {{currency}}
• Payment Date: {{paymentDate}}
• Confirmation Number: {{confirmationNumber}}

Your account is now current. We appreciate your prompt attention to this matter.

If you have any questions, please don''t hesitate to contact us.

Thank you for your business!

Best regards,
{{senderName}}
{{companyName}}',
 NULL,
 ARRAY['contactName', 'invoiceNumber', 'amountPaid', 'currency', 'paymentDate', 'confirmationNumber', 'senderName', 'companyName'],
 'confirmation', TRUE, 1, 'system'),

-- SMS reminder
('prod_sms_reminder', 'sms', 'sms', NULL,
 'Reminder: Invoice {{invoiceNumber}} for ${{amount}} is {{daysOverdue}} days overdue. Pay at {{paymentUrl}} or call {{phone}}. Reply STOP to opt out.',
 NULL,
 ARRAY['invoiceNumber', 'amount', 'daysOverdue', 'paymentUrl', 'phone'],
 'reminder', TRUE, 1, 'system'),

-- Phone script
('prod_phone_script', 'phone_script', 'phone', NULL,
 'Hello, this is {{agentName}} from {{companyName}}. May I please speak with {{contactName}}?

[If available]
I''m calling regarding invoice {{invoiceNumber}} for {{amount}} dollars, which was due on {{dueDate}}. 

[Pause for response]

I wanted to check if you received our previous communications about this invoice and if there''s anything I can help you with regarding the payment.

[If they can pay now]
That''s great! I can help you process that payment right now, or I can provide you with our payment portal information.

[If they need time]
I understand. Can we set up a specific date for the payment? What date works best for you?

[If there are issues]
I appreciate you sharing that with me. Let me see what options we have available that might help.',
 NULL,
 ARRAY['agentName', 'companyName', 'contactName', 'invoiceNumber', 'amount', 'dueDate'],
 'reminder', TRUE, 1, 'system')

ON CONFLICT (name) DO NOTHING;

\echo 'Production templates created: 7'
\echo ''

-- ============================================================================
-- COMPLIANCE RULES
-- ============================================================================
\echo 'Creating compliance rules...'

INSERT INTO compliance_rules (name, description, rule_type, condition, action, severity, is_enabled) VALUES
-- TCPA Compliance
('TCPA Morning Restriction', 'No calls before 8:00 AM recipient local time (TCPA)', 'time_restriction', 
 '{"channel": "phone", "beforeTime": "08:00", "useRecipientTimezone": true}'::jsonb, 'block_contact', 'critical', TRUE),

('TCPA Evening Restriction', 'No calls after 9:00 PM recipient local time (TCPA)', 'time_restriction',
 '{"channel": "phone", "afterTime": "21:00", "useRecipientTimezone": true}'::jsonb, 'block_contact', 'critical', TRUE),

('TCPA SMS Time Restriction', 'No SMS before 8 AM or after 9 PM recipient local time', 'time_restriction',
 '{"channel": "sms", "beforeTime": "08:00", "afterTime": "21:00", "useRecipientTimezone": true}'::jsonb, 'block_contact', 'critical', TRUE),

-- Frequency Limits
('Daily Contact Limit', 'Maximum 3 contact attempts per customer per day across all channels', 'frequency_limit',
 '{"maxPerDay": 3, "channels": ["email", "phone", "sms"]}'::jsonb, 'block_contact', 'high', TRUE),

('Weekly Phone Limit', 'Maximum 7 phone calls per customer per week', 'frequency_limit',
 '{"maxPerWeek": 7, "channels": ["phone"]}'::jsonb, 'block_contact', 'medium', TRUE),

('Cooldown Period', 'Minimum 4 hours between contact attempts to same customer', 'frequency_limit',
 '{"cooldownHours": 4}'::jsonb, 'delay_contact', 'medium', TRUE),

-- Opt-Out Handling
('Honor Do Not Contact', 'Respect customer do_not_contact flag - blocks all contact', 'channel_restriction',
 '{"checkDoNotContact": true}'::jsonb, 'block_contact', 'critical', TRUE),

('Honor Channel Opt-Outs', 'Respect channel-specific opt-out preferences', 'channel_restriction',
 '{"checkOptOuts": true}'::jsonb, 'block_contact', 'critical', TRUE),

-- Holiday Restrictions
('Federal Holiday Restriction', 'Warn before contacting on federal holidays', 'time_restriction',
 '{"checkFederalHolidays": true, "country": "US"}'::jsonb, 'log_warning', 'low', TRUE),

-- Amount Thresholds
('Small Balance Skip', 'Skip automated collection for balances under $25', 'amount_restriction',
 '{"minAmount": 25, "action": "skip"}'::jsonb, 'skip_task', 'low', TRUE)

ON CONFLICT (name) DO NOTHING;

\echo 'Compliance rules created: 10'
\echo ''

-- ============================================================================
-- LLM BUDGET LIMITS (Production Values)
-- ============================================================================
\echo 'Setting production LLM budget limits...'

UPDATE llm_budget_limits SET limit_amount = 500.00 WHERE scope = 'daily_total';
UPDATE llm_budget_limits SET limit_amount = 25.00 WHERE scope = 'daily_customer';
UPDATE llm_budget_limits SET limit_amount = 100.00 WHERE scope = 'daily_agent';
UPDATE llm_budget_limits SET limit_amount = 10000.00 WHERE scope = 'monthly_total';
UPDATE llm_budget_limits SET limit_amount = 2000.00 WHERE scope = 'monthly_campaign';

\echo 'LLM budget limits updated for production'
\echo ''

-- ============================================================================
-- SUMMARY
-- ============================================================================
\echo ''
\echo '=============================================='
\echo 'Production seed data completed successfully!'
\echo '=============================================='
\echo ''
\echo 'Created:'
\echo '  - 1 Admin user (admin@system.local)'
\echo '  - 4 System agents (email, phone, sms, research)'
\echo '  - 7 Production templates'
\echo '  - 10 Compliance rules'
\echo '  - Updated LLM budget limits'
\echo ''
\echo 'IMPORTANT POST-DEPLOYMENT STEPS:'
\echo '  1. Change the default admin password immediately'
\echo '  2. Configure SMTP settings for email agent'
\echo '  3. Configure Twilio credentials for phone/SMS agents'
\echo '  4. Review and adjust compliance rules for your jurisdiction'
\echo '  5. Review and customize email templates'
\echo ''
