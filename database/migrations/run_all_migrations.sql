-- Master Migration Script
-- Description: Runs all migrations in order
-- Author: Manus AI
-- Date: 2026-01-09

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

\echo 'All migrations completed successfully!'
\echo ''
\echo 'Database schema is ready.'
