-- Master Migration Script
-- Description: Runs all migrations in order
-- Author: Manus AI
-- Date: 2026-01-09
-- Updated: 2026-01-15

\echo 'Starting database migrations...'
\echo ''

\echo 'Running Migration 001: Core Tables...'
\i 001_create_core_tables.sql
\echo 'Migration 001 completed.'
\echo ''

\echo 'Running Migration 002: Campaigns and Tasks...'
\i 002_create_campaigns_and_tasks.sql
\echo 'Migration 002 completed.'
\echo ''

\echo 'Running Migration 003: Contact Attempts and Templates...'
\i 003_create_contact_attempts_and_templates.sql
\echo 'Migration 003 completed.'
\echo ''

\echo 'Running Migration 004: Audit and Compliance...'
\i 004_create_audit_and_compliance.sql
\echo 'Migration 004 completed.'
\echo ''

\echo 'Running Migration 005: System Metrics and Views...'
\i 005_create_system_metrics_and_views.sql
\echo 'Migration 005 completed.'
\echo ''

\echo 'Running Migration 006: LLM Usage Tracking...'
\i 006_create_llm_usage_tracking.sql
\echo 'Migration 006 completed.'
\echo ''

\echo 'Running Migration 007: Users and Sessions...'
\i 007_create_users_and_sessions.sql
\echo 'Migration 007 completed.'
\echo ''

\echo 'Running Migration 008: Email Delivery Tracking...'
\i 008_create_email_delivery_tracking.sql
\echo 'Migration 008 completed.'
\echo ''

\echo 'All migrations completed successfully!'
\echo ''
\echo 'Database schema is ready.'
\echo ''
\echo 'Tables created:'
\echo '  - Core: customers, customer_profiles, payment_records, agents'
\echo '  - Workflow: campaigns, tasks'
\echo '  - Communication: contact_attempts, templates, email_deliveries'
\echo '  - Auth: users, user_sessions, api_keys, role_permissions'
\echo '  - Compliance: audit_logs, opt_outs, compliance_rules'
\echo '  - Analytics: system_metrics, llm_usage_logs, campaign_email_stats'
