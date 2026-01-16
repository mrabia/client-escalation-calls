# Troubleshooting Guide

## Quick Diagnostics

### Check System Health

```bash
curl https://api.example.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### View Recent Logs

```bash
# Via Railway CLI
railway logs -n 100

# Filter errors only
railway logs --filter "level=error"
```

## Common Issues

### Authentication Issues

#### "Invalid credentials" on login

**Cause**: Wrong email/password combination

**Solution**:
1. Verify email is correct
2. Reset password if forgotten
3. Check if account is active

```sql
-- Check user status
SELECT email, is_active, failed_login_attempts 
FROM users 
WHERE email = 'user@example.com';
```

#### "Token expired" or "Invalid token"

**Cause**: Access token has expired (15 min default)

**Solution**:
1. Use refresh token to get new access token
2. If refresh token also expired, re-login

```bash
# Refresh token
curl -X POST https://api.example.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token"}'
```

#### "Account is disabled"

**Cause**: Account deactivated by admin

**Solution**:
1. Contact administrator
2. Admin can reactivate:

```sql
UPDATE users SET is_active = true WHERE email = 'user@example.com';
```

### API Errors

#### 400 Bad Request

**Cause**: Invalid request body or parameters

**Solution**:
1. Check request body format (JSON)
2. Verify required fields are present
3. Check field types match schema

**Example error**:
```json
{
  "error": "Validation error",
  "details": "\"email\" must be a valid email"
}
```

#### 401 Unauthorized

**Cause**: Missing or invalid authentication

**Solution**:
1. Include `Authorization: Bearer <token>` header
2. Check token hasn't expired
3. Verify token is correct (no extra spaces)

#### 403 Forbidden

**Cause**: User lacks permission for this action

**Solution**:
1. Check user role has required permissions
2. Contact admin to adjust role if needed

#### 404 Not Found

**Cause**: Resource doesn't exist

**Solution**:
1. Verify the ID/path is correct
2. Check if resource was deleted
3. Ensure you have access to the resource

#### 429 Too Many Requests

**Cause**: Rate limit exceeded

**Solution**:
1. Wait for rate limit window to reset (15 min)
2. Check `X-RateLimit-Reset` header for reset time
3. Reduce request frequency
4. Contact admin if higher limits needed

#### 500 Internal Server Error

**Cause**: Server-side error

**Solution**:
1. Check server logs for details
2. Retry the request
3. If persistent, contact support

### Database Issues

#### "Connection pool exhausted"

**Symptoms**: Slow responses, connection errors

**Diagnosis**:
```sql
SELECT count(*) FROM pg_stat_activity;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

**Solution**:
1. Kill idle connections:
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND query_start < now() - interval '30 minutes';
```

2. Increase pool size (temporary):
```bash
DATABASE_POOL_MAX=30
```

3. Fix connection leaks in code

#### "Database connection refused"

**Symptoms**: 500 errors, health check failing

**Diagnosis**:
```bash
railway run psql $DATABASE_URL -c "SELECT 1"
```

**Solution**:
1. Check Railway PostgreSQL service status
2. Verify `DATABASE_URL` environment variable
3. Check if IP is whitelisted (if applicable)
4. Restart database service

#### Slow Queries

**Symptoms**: High latency, timeouts

**Diagnosis**:
```sql
-- Find slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT relname, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_scan DESC;
```

**Solution**:
1. Add missing indexes
2. Optimize query structure
3. Increase database resources

### Redis Issues

#### "Redis connection failed"

**Diagnosis**:
```bash
railway run redis-cli -u $REDIS_URL PING
```

**Solution**:
1. Check Railway Redis service status
2. Verify `REDIS_URL` environment variable
3. Check memory usage:
```bash
railway run redis-cli -u $REDIS_URL INFO memory
```

#### Cache Invalidation Issues

**Symptoms**: Stale data, inconsistent responses

**Solution**:
```bash
# Clear all cache
railway run redis-cli -u $REDIS_URL FLUSHDB

# Clear specific key pattern
railway run redis-cli -u $REDIS_URL KEYS "session:*" | xargs redis-cli DEL
```

### External Service Issues

#### Twilio Errors

**"Authentication Error"**:
- Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
- Check Twilio dashboard for account status

**"Invalid phone number"**:
- Verify phone number format (+1XXXXXXXXXX)
- Check if number is in Do-Not-Call list

**"Rate limit exceeded"**:
- Reduce call/SMS frequency
- Contact Twilio for higher limits

#### Email Delivery Issues

**"SMTP connection failed"**:
- Verify SMTP credentials
- Check SMTP host and port
- Verify SSL/TLS settings

**"Emails not being delivered"**:
- Check spam folder
- Verify sender domain SPF/DKIM
- Check email service dashboard for bounces

#### OpenAI API Errors

**"Rate limit exceeded"**:
- Reduce request frequency
- Implement exponential backoff
- Upgrade API plan if needed

**"Invalid API key"**:
- Verify `OPENAI_API_KEY` environment variable
- Check key hasn't been revoked

### Campaign Issues

#### Campaign Not Starting

**Cause**: Missing required data or invalid configuration

**Check**:
1. Customer exists and is active
2. Payment record exists
3. Escalation steps are valid
4. Start date is in the future (if scheduled)

```sql
SELECT c.*, cu.company_name, cu.is_active as customer_active
FROM campaigns c
JOIN customers cu ON c.customer_id = cu.id
WHERE c.id = '<campaign-id>';
```

#### Tasks Not Executing

**Cause**: Agent service issues or task stuck

**Check**:
1. Agent service is running
2. Task status and assigned agent

```sql
SELECT t.*, a.status as agent_status
FROM tasks t
LEFT JOIN agents a ON t.assigned_agent_id = a.id
WHERE t.campaign_id = '<campaign-id>';
```

**Solution**:
1. Reset stuck tasks:
```sql
UPDATE tasks 
SET status = 'pending', assigned_agent_id = NULL 
WHERE status = 'in_progress' 
  AND updated_at < now() - interval '1 hour';
```

### Performance Issues

#### High Memory Usage

**Diagnosis**:
- Check Railway metrics dashboard
- Review logs for memory warnings

**Solution**:
1. Increase service memory allocation
2. Check for memory leaks
3. Implement pagination for large queries
4. Add caching where appropriate

#### High CPU Usage

**Diagnosis**:
- Check Railway metrics dashboard
- Review slow query logs

**Solution**:
1. Optimize database queries
2. Add missing indexes
3. Implement request caching
4. Scale horizontally if needed

#### High Latency

**Diagnosis**:
```bash
# Check average response time in logs
railway logs --filter "duration"
```

**Solution**:
1. Add database indexes
2. Implement caching
3. Optimize N+1 queries
4. Use connection pooling efficiently

## Diagnostic Commands

### Quick Health Check

```bash
# All services
curl -s https://api.example.com/api/v1/health | jq

# Database
railway run psql $DATABASE_URL -c "SELECT 1"

# Redis
railway run redis-cli -u $REDIS_URL PING
```

### Log Analysis

```bash
# Recent errors
railway logs -n 500 | grep -i error

# Specific endpoint issues
railway logs --filter "path=/api/v1/customers"

# Slow requests
railway logs --filter "duration>1000"
```

### Database Status

```bash
railway run psql $DATABASE_URL << 'EOF'
SELECT 'Connections' as metric, count(*)::text as value FROM pg_stat_activity
UNION ALL
SELECT 'Database Size', pg_size_pretty(pg_database_size(current_database()))
UNION ALL
SELECT 'Active Queries', count(*)::text FROM pg_stat_activity WHERE state = 'active';
EOF
```

## Getting Help

1. **Check Documentation**: Review API docs at `/api/v1/docs`
2. **Search Logs**: Use Railway log search
3. **Check Status**: Review Railway service status
4. **Contact Support**: support@example.com

When reporting issues, include:
- Request ID (from `X-Request-ID` header)
- Timestamp of the issue
- Steps to reproduce
- Expected vs actual behavior
