# Database Quick Start Guide

This guide will help you set up and test the database for the Client Escalation Calls system.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL client tools (psql) installed (optional, for manual testing)

## Quick Setup (Recommended)

### Step 1: Start PostgreSQL Container

```bash
docker-compose up -d postgres
```

Wait for PostgreSQL to be ready (about 10-15 seconds):

```bash
docker-compose logs -f postgres
```

Look for: `database system is ready to accept connections`

### Step 2: Run Migrations

```bash
./scripts/test-migrations.sh
```

This script will:
- ✅ Test database connection
- ✅ Run all migrations in order
- ✅ Verify tables and views are created
- ✅ Load seed data
- ✅ Run sample queries to verify everything works

### Step 3: Verify Setup

Connect to the database:

```bash
docker exec -it postgres-escalation psql -U postgres -d client_escalation_calls
```

Run some queries:

```sql
-- Check tables
\dt

-- Check views
\dv

-- Check functions
\df

-- View active campaigns
SELECT * FROM v_active_campaigns;

-- View agent performance
SELECT * FROM v_agent_performance;

-- Exit
\q
```

## Manual Setup (Alternative)

If you prefer to run migrations manually:

### Step 1: Start PostgreSQL

```bash
docker-compose up -d postgres
```

### Step 2: Run Migrations Manually

```bash
docker exec -it postgres-escalation psql -U postgres -d client_escalation_calls
```

Inside psql:

```sql
-- Run all migrations
\i /path/to/database/migrations/run_all_migrations.sql

-- Or run individually
\i /path/to/database/migrations/001_create_core_tables.sql
\i /path/to/database/migrations/002_create_campaigns_and_tasks.sql
\i /path/to/database/migrations/003_create_contact_attempts_and_templates.sql
\i /path/to/database/migrations/004_create_audit_and_compliance.sql
\i /path/to/database/migrations/005_create_system_metrics_and_views.sql
```

### Step 3: Load Seed Data

```sql
\i /path/to/database/seeds/001_seed_test_data.sql
```

## What Gets Created

### Tables (12)
1. **customers** - Customer and company information
2. **customer_profiles** - Behavioral analysis and risk assessment
3. **payment_records** - Invoice and payment tracking
4. **agents** - Agent registration and configuration
5. **campaigns** - Campaign definitions and execution
6. **tasks** - Individual tasks for agents
7. **contact_attempts** - Communication history
8. **templates** - Communication templates
9. **audit_logs** - Audit trail for compliance
10. **opt_outs** - Customer opt-out preferences
11. **compliance_rules** - Regulatory compliance rules
12. **system_metrics** - Performance and business metrics

### Views (6)
1. **v_active_campaigns** - Active campaigns with customer details
2. **v_pending_tasks** - Pending tasks with full context
3. **v_agent_performance** - Agent performance metrics
4. **v_customer_communications** - Complete communication history
5. **v_overdue_payments** - Overdue payments with risk info
6. **v_campaign_effectiveness** - Campaign performance metrics

### Functions (3)
1. **check_opt_out_status()** - Check customer opt-out status
2. **log_audit_event()** - Log audit events consistently
3. **calculate_customer_risk_score()** - Calculate customer risk score

### Seed Data
- 5 customers with profiles
- 7 payment records (5 overdue, 2 paid)
- 4 agents (2 email, 1 phone, 1 SMS)
- 4 templates (email, SMS, phone)
- 5 compliance rules
- 2 active campaigns
- 3 tasks (1 completed, 2 pending)
- 2 contact attempts
- Sample audit logs and metrics

## Testing the Database

### Sample Queries

```sql
-- View all customers
SELECT * FROM customers;

-- View overdue payments
SELECT * FROM v_overdue_payments;

-- View agent performance
SELECT * FROM v_agent_performance;

-- Check if customer opted out of email
SELECT check_opt_out_status('11111111-1111-1111-1111-111111111111'::uuid, 'email');

-- Calculate customer risk score
SELECT calculate_customer_risk_score('11111111-1111-1111-1111-111111111111'::uuid);

-- View active campaigns with details
SELECT 
    name,
    company_name,
    total_contacts,
    successful_contacts,
    payment_status
FROM v_active_campaigns;

-- View pending tasks by priority
SELECT 
    type,
    priority,
    company_name,
    due_at
FROM v_pending_tasks
ORDER BY priority DESC, due_at;
```

## Troubleshooting

### Container Won't Start

```bash
# Check container status
docker ps -a | grep postgres

# View logs
docker-compose logs postgres

# Restart container
docker-compose restart postgres
```

### Connection Refused

```bash
# Wait a bit longer - PostgreSQL takes 10-15 seconds to start
docker-compose logs -f postgres

# Check if port is exposed
docker port postgres-escalation
```

### Migration Errors

```bash
# Check which tables exist
docker exec -it postgres-escalation psql -U postgres -d client_escalation_calls -c "\dt"

# Drop all tables and start fresh (CAUTION: destroys data)
docker exec -it postgres-escalation psql -U postgres -d client_escalation_calls -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run migrations
./scripts/test-migrations.sh
```

### Permission Denied on Script

```bash
chmod +x ./scripts/test-migrations.sh
```

## Environment Variables

You can customize database connection in `.env`:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/client_escalation_calls
DB_HOST=localhost
DB_PORT=5432
DB_NAME=client_escalation_calls
DB_USER=postgres
DB_PASSWORD=password
```

## Next Steps

After database setup:

1. **Start the application**: `npm run dev`
2. **Run tests**: `npm test`
3. **View API docs**: http://localhost:3000/api/v1
4. **Access Grafana**: http://localhost:3001 (admin/admin)

## Backup and Restore

### Backup

```bash
# Full backup
docker exec postgres-escalation pg_dump -U postgres client_escalation_calls > backup_$(date +%Y%m%d).sql

# Schema only
docker exec postgres-escalation pg_dump -U postgres --schema-only client_escalation_calls > schema.sql
```

### Restore

```bash
# Restore from backup
docker exec -i postgres-escalation psql -U postgres client_escalation_calls < backup_20260109.sql
```

## Production Considerations

Before deploying to production:

1. **Change default passwords** in docker-compose.yml
2. **Enable SSL/TLS** for database connections
3. **Set up automated backups**
4. **Configure connection pooling**
5. **Enable query logging** for monitoring
6. **Set up replication** for high availability
7. **Configure resource limits** (memory, CPU)
8. **Enable audit logging**

## Support

For issues or questions:
- Check `/database/README.md` for detailed documentation
- Review migration files in `/database/migrations/`
- Consult schema design in `/docs/database/schema-design.md`
