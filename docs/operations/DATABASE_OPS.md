# Database Operations Runbook

## Connection

### Railway CLI

```bash
# Connect to database
railway run psql $DATABASE_URL

# Or use connection string directly
psql "postgresql://user:pass@host:port/db?sslmode=require"
```

## Common Operations

### Check Database Health

```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Active queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Kill Long-Running Queries

```sql
-- Find queries running > 5 minutes
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle' 
  AND now() - pg_stat_activity.query_start > interval '5 minutes';

-- Terminate specific query
SELECT pg_terminate_backend(<pid>);

-- Terminate all idle transactions > 10 min
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
  AND query_start < now() - interval '10 minutes';
```

### Backup Operations

```bash
# Export full database
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Export specific table
railway run pg_dump $DATABASE_URL -t customers > customers_backup.sql

# Restore from backup
railway run psql $DATABASE_URL < backup.sql
```

## Migrations

### Run Migrations

```bash
# Via npm script
npm run db:migrate

# Manual migration
railway run psql $DATABASE_URL -f database/migrations/001_create_core_tables.sql
```

### Rollback Migration

```sql
-- Check migration history
SELECT * FROM _migrations ORDER BY executed_at DESC;

-- Remove migration record (then restore from backup or run down migration)
DELETE FROM _migrations WHERE name = '008_xxx.sql';
```

### Check Migration Status

```sql
SELECT name, executed_at 
FROM _migrations 
ORDER BY executed_at;
```

## Performance

### Index Analysis

```sql
-- Missing indexes (slow queries)
SELECT relname, seq_scan, seq_tup_read, 
       idx_scan, idx_tup_fetch,
       seq_tup_read / NULLIF(seq_scan, 0) AS avg_seq_tuples
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;

-- Unused indexes
SELECT indexrelid::regclass AS index,
       relid::regclass AS table,
       idx_scan AS index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (SELECT conindid FROM pg_constraint);
```

### Query Performance

```sql
-- Enable query stats (if not enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Vacuum and Analyze

```sql
-- Check when last vacuum/analyze ran
SELECT relname, last_vacuum, last_autovacuum, 
       last_analyze, last_autoanalyze
FROM pg_stat_user_tables;

-- Manual vacuum (if needed)
VACUUM ANALYZE customers;

-- Full vacuum (locks table - use carefully)
VACUUM FULL customers;
```

## Data Operations

### Customer Data

```sql
-- Find customer by email
SELECT * FROM customers WHERE email = 'test@example.com';

-- Count customers by risk level
SELECT risk_level, count(*) 
FROM customer_profiles 
GROUP BY risk_level;
```

### Campaign Data

```sql
-- Active campaigns
SELECT c.id, c.name, c.status, cu.company_name
FROM campaigns c
JOIN customers cu ON c.customer_id = cu.id
WHERE c.status = 'active';

-- Campaign task summary
SELECT campaign_id, status, count(*)
FROM tasks
GROUP BY campaign_id, status;
```

### Audit Log

```sql
-- Recent audit entries
SELECT * FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;

-- Audit by user
SELECT user_id, action, count(*)
FROM audit_logs
WHERE created_at > now() - interval '7 days'
GROUP BY user_id, action;
```

## Emergency Procedures

### Connection Pool Exhausted

```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < now() - interval '30 minutes';
```

### Table Lock Issues

```sql
-- Find blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_query,
       blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocked_activity 
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity 
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Disk Space Issues

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

-- Delete old audit logs (if needed)
DELETE FROM audit_logs WHERE created_at < now() - interval '90 days';
```
