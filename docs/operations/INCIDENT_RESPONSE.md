# Incident Response Runbook

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV1** | Complete outage | 15 min | Service down, data loss |
| **SEV2** | Major degradation | 1 hour | High error rate, slow response |
| **SEV3** | Minor issue | 4 hours | Single feature broken |
| **SEV4** | Low impact | 24 hours | Cosmetic issues |

## Quick Actions

### Service Down (SEV1)

```bash
# 1. Check Railway status
railway status

# 2. View recent logs
railway logs -n 100

# 3. Check recent deploys
railway deployments

# 4. Rollback if needed
railway rollback
```

### Database Issues

```bash
# Check connection
railway run psql $DATABASE_URL -c "SELECT 1"

# Check connection count
railway run psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# Kill stuck queries (if needed)
railway run psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND query_start < now() - interval '10 minutes'"
```

### Redis Issues

```bash
# Check connection
railway run redis-cli -u $REDIS_URL PING

# Check memory
railway run redis-cli -u $REDIS_URL INFO memory

# Flush cache if corrupted (caution!)
railway run redis-cli -u $REDIS_URL FLUSHDB
```

## Common Issues

### 1. High Error Rate

**Symptoms**: 5xx errors increasing

**Steps**:
1. Check logs for error patterns
2. Identify affected endpoints
3. Check external dependencies (DB, Redis, Twilio)
4. Review recent code changes
5. Rollback if necessary

### 2. High Latency

**Symptoms**: Response times > 2 seconds

**Steps**:
1. Check database query performance
2. Verify Redis connectivity
3. Check for resource exhaustion
4. Scale up if needed (Railway dashboard)

### 3. Memory Exhaustion

**Symptoms**: OOM errors, restarts

**Steps**:
1. Check memory metrics in Railway
2. Review logs for memory warnings
3. Increase memory allocation
4. Identify memory leaks

### 4. Database Connection Pool Exhausted

**Symptoms**: "Connection pool exhausted" errors

**Steps**:
1. Check active connections
2. Identify long-running queries
3. Increase pool size (temporary)
4. Fix leaky connections in code

### 5. Rate Limiting Errors

**Symptoms**: 429 Too Many Requests

**Steps**:
1. Identify source of high traffic
2. Check for bot/abuse patterns
3. Temporarily increase limits if legitimate
4. Implement caching if needed

## Rollback Procedure

### Via Railway CLI

```bash
# List recent deployments
railway deployments

# Rollback to previous
railway rollback

# Or rollback to specific deployment
railway rollback <deployment-id>
```

### Via Dashboard

1. Go to Railway Dashboard
2. Select your service
3. Go to Deployments tab
4. Click "Rollback" on previous deployment

## Communication

### Status Updates

Update stakeholders at:
- Incident start
- Every 30 minutes during SEV1/SEV2
- Resolution
- Post-mortem (within 48 hours)

### Template

```
[INCIDENT] Service Name - Brief Description

Status: Investigating / Identified / Monitoring / Resolved
Impact: [Description of user impact]
Started: [Time]
Current Action: [What's being done]
Next Update: [Time]
```

## Post-Incident

### Checklist

- [ ] Incident documented
- [ ] Root cause identified
- [ ] Fix implemented and tested
- [ ] Monitoring/alerts updated
- [ ] Post-mortem scheduled
- [ ] Action items assigned

### Post-Mortem Template

1. **Summary**: What happened?
2. **Timeline**: Sequence of events
3. **Impact**: Users/revenue affected
4. **Root Cause**: Why did it happen?
5. **Resolution**: How was it fixed?
6. **Prevention**: How to prevent recurrence?
7. **Action Items**: Specific follow-ups

## Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | (as scheduled) |
| Engineering Lead | @lead |
| DevOps | @devops |
| Product | @product |
