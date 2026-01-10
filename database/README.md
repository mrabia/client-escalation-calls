# Database Documentation

## Overview

This directory contains all database-related files for the Client Escalation Calls system, including migrations, seed data, and documentation.

## Directory Structure

```
database/
├── migrations/          # SQL migration files
│   ├── 001_create_core_tables.sql
│   ├── 002_create_campaigns_and_tasks.sql
│   ├── 003_create_contact_attempts_and_templates.sql
│   ├── 004_create_audit_and_compliance.sql
│   ├── 005_create_system_metrics_and_views.sql
│   └── run_all_migrations.sql
├── seeds/              # Test and development data
│   └── 001_seed_test_data.sql
└── README.md           # This file
```

## Running Migrations

### Using Docker Compose

The database will be automatically initialized when you start the containers:

```bash
docker-compose up -d postgres
```

### Manual Migration

To run migrations manually:

```bash
# Connect to the database
docker exec -it postgres-escalation psql -U postgres -d client_escalation_calls

# Run all migrations
\i /path/to/database/migrations/run_all_migrations.sql
```

### Using psql from Host

```bash
cd database/migrations
psql -h localhost -U postgres -d client_escalation_calls -f run_all_migrations.sql
```

## Seeding Test Data

To populate the database with test data for development:

```bash
# Connect to database
docker exec -it postgres-escalation psql -U postgres -d client_escalation_calls

# Run seed script
\i /path/to/database/seeds/001_seed_test_data.sql
```

Or from host:

```bash
cd database/seeds
psql -h localhost -U postgres -d client_escalation_calls -f 001_seed_test_data.sql
```

## Database Schema

### Core Tables

#### customers
Stores customer and company information.

**Key Fields:**
- `id` (UUID): Primary key
- `company_name`, `contact_name`, `email`: Basic contact info
- `preferred_contact_method`: Communication preference
- `address` (JSONB): Structured address data

#### customer_profiles
Behavioral analysis and risk assessment.

**Key Fields:**
- `risk_level`: low, medium, high, critical
- `risk_score`: 0-100 calculated score
- `average_payment_delay`: Historical payment behavior
- `response_rate`: Communication responsiveness
- `do_not_contact`: Opt-out flag

#### payment_records
Invoice and payment tracking.

**Key Fields:**
- `amount`, `currency`: Payment details
- `due_date`, `paid_date`: Timeline
- `status`: pending, overdue, paid, partial, cancelled
- `invoice_number`: Unique identifier

#### agents
Agent registration and configuration.

**Key Fields:**
- `type`: email, phone, sms, research
- `status`: idle, active, busy, error, offline
- `capabilities`: Array of agent capabilities
- `performance_metrics` (JSONB): Performance data

### Workflow Tables

#### campaigns
Campaign definitions and execution state.

**Key Fields:**
- `escalation_steps` (JSONB): Step definitions
- `current_step`: Current execution position
- `status`: draft, active, paused, completed, cancelled
- `results` (JSONB): Performance metrics

#### tasks
Individual tasks assigned to agents.

**Key Fields:**
- `type`: send_email, make_call, send_sms, etc.
- `priority`: low, medium, high, urgent
- `status`: pending, assigned, in_progress, completed, failed
- `context` (JSONB): Task execution context

#### contact_attempts
Communication history across all channels.

**Key Fields:**
- `channel`: email, phone, sms
- `status`: sent, delivered, opened, answered, replied, bounced, failed
- `duration`: Call duration in seconds
- `metadata` (JSONB): Channel-specific data

### Supporting Tables

#### templates
Communication templates for all channels.

#### audit_logs
Immutable audit trail for compliance.

#### opt_outs
Customer opt-out preferences by channel.

#### compliance_rules
Regulatory compliance rules and restrictions.

#### system_metrics
System performance and business metrics.

## Database Views

### v_active_campaigns
Active and paused campaigns with customer details.

### v_pending_tasks
Pending and assigned tasks with full context.

### v_agent_performance
Agent performance metrics and statistics.

### v_customer_communications
Complete communication history across all channels.

### v_overdue_payments
Overdue payments with customer risk information.

### v_campaign_effectiveness
Campaign performance and effectiveness metrics.

## Utility Functions

### check_opt_out_status(customer_id, channel)
Check if a customer has opted out of a specific channel.

```sql
SELECT check_opt_out_status('customer-uuid', 'email');
```

### log_audit_event(...)
Log audit events consistently.

```sql
SELECT log_audit_event(
    'campaign',
    'campaign-uuid',
    'status_changed',
    'system',
    'campaign_manager',
    '{"before": "draft", "after": "active"}'::jsonb
);
```

### calculate_customer_risk_score(customer_id)
Calculate dynamic risk score for a customer.

```sql
SELECT calculate_customer_risk_score('customer-uuid');
```

## Indexes

All tables have appropriate indexes for:
- Primary key lookups
- Foreign key relationships
- Common query patterns
- Status and timestamp filtering

## Triggers

### updated_at Trigger
Automatically updates `updated_at` timestamp on record modification for all relevant tables.

## Migration Strategy

Migrations are numbered sequentially:
1. **001**: Core tables (customers, profiles, payments, agents)
2. **002**: Campaigns and tasks
3. **003**: Contact attempts and templates
4. **004**: Audit logs and compliance
5. **005**: System metrics and views

## Best Practices

### Adding New Migrations

1. Create a new file: `00X_description.sql`
2. Include rollback instructions in comments
3. Update `run_all_migrations.sql`
4. Test on a clean database
5. Document changes in this README

### Working with JSONB

JSONB columns are used for flexible, structured data:
- `customers.address`: Address components
- `agents.config`: Agent-specific configuration
- `agents.performance_metrics`: Performance data
- `campaigns.escalation_steps`: Step definitions
- `campaigns.results`: Campaign metrics
- `tasks.context`: Task execution context
- `contact_attempts.metadata`: Channel-specific data

Query JSONB fields:
```sql
-- Get specific field
SELECT config->>'smtpHost' FROM agents WHERE type = 'email';

-- Filter by JSONB field
SELECT * FROM agents WHERE (performance_metrics->>'tasksCompleted')::INTEGER > 100;
```

### Performance Considerations

- Use indexes on frequently queried columns
- Leverage JSONB indexes for complex queries
- Use views for common query patterns
- Monitor query performance with `EXPLAIN ANALYZE`
- Consider partitioning for large tables (audit_logs, system_metrics)

## Backup and Recovery

### Backup

```bash
# Full database backup
docker exec postgres-escalation pg_dump -U postgres client_escalation_calls > backup.sql

# Schema only
docker exec postgres-escalation pg_dump -U postgres --schema-only client_escalation_calls > schema.sql

# Data only
docker exec postgres-escalation pg_dump -U postgres --data-only client_escalation_calls > data.sql
```

### Restore

```bash
# Restore from backup
docker exec -i postgres-escalation psql -U postgres client_escalation_calls < backup.sql
```

## Troubleshooting

### Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs postgres-escalation

# Test connection
docker exec -it postgres-escalation psql -U postgres -c "SELECT version();"
```

### Migration Errors

If a migration fails:
1. Check the error message in the output
2. Verify table dependencies
3. Check for duplicate data
4. Rollback if necessary and fix the migration
5. Re-run migrations

### Performance Issues

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

## Support

For questions or issues with the database schema:
1. Check this documentation
2. Review migration files
3. Consult the schema design document in `/docs/database/`
4. Contact the development team
