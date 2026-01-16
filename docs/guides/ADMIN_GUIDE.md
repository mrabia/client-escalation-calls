# Administrator Guide

## Overview

This guide is for system administrators managing the Client Escalation Calls platform.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Railway                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   API       │  │  PostgreSQL │  │    Redis    │          │
│  │   Server    │◄─┤  Database   │  │    Cache    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────┐            │
│  │              AI Agent Services               │            │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │            │
│  │  │  Email  │ │  Phone  │ │   SMS   │       │            │
│  │  │  Agent  │ │  Agent  │ │  Agent  │       │            │
│  │  └─────────┘ └─────────┘ └─────────┘       │            │
│  └─────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
           │              │              │
           ▼              ▼              ▼
      ┌─────────┐   ┌─────────┐   ┌─────────┐
      │  SMTP   │   │ Twilio  │   │ OpenAI  │
      │ Server  │   │   API   │   │   API   │
      └─────────┘   └─────────┘   └─────────┘
```

## User Management

### User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access, user management, system config |
| `manager` | Campaign management, reporting, agent config |
| `agent` | View customers, execute tasks, update records |
| `viewer` | Read-only access to dashboards |

### Creating Users

Users are created via database seed or admin API:

```sql
INSERT INTO users (email, password_hash, role, is_active)
VALUES ('admin@example.com', '<bcrypt-hash>', 'admin', true);
```

### Password Reset

```bash
# Generate password reset (via API or direct DB)
curl -X POST https://api.example.com/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

## Configuration Management

### Environment Variables

Critical settings managed via Railway environment variables:

#### Required for Production

```bash
NODE_ENV=production
JWT_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret>
ENCRYPTION_KEY=<64 char hex key>
```

#### Database (Auto-configured by Railway)

```bash
DATABASE_URL=postgresql://...
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
```

#### External Services

```bash
# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASSWORD=SG...

# AI (Optional)
OPENAI_API_KEY=sk-...
```

### Feature Flags

Enable/disable features without code changes:

```bash
ENABLE_EMAIL_AGENT=true
ENABLE_PHONE_AGENT=true
ENABLE_SMS_AGENT=true
ENABLE_AI_GENERATION=false
```

## Database Administration

### Connection

```bash
# Via Railway CLI
railway run psql $DATABASE_URL

# Direct connection
psql "postgresql://user:pass@host:5432/db?sslmode=require"
```

### Migrations

```bash
# Run all migrations
npm run db:migrate

# Check migration status
railway run psql $DATABASE_URL -c "SELECT * FROM _migrations"
```

### Backup & Restore

```bash
# Backup
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
railway run psql $DATABASE_URL < backup.sql
```

### Maintenance Tasks

```sql
-- Cleanup old audit logs (> 90 days)
DELETE FROM audit_logs WHERE created_at < now() - interval '90 days';

-- Vacuum tables
VACUUM ANALYZE customers;
VACUUM ANALYZE campaigns;
VACUUM ANALYZE tasks;

-- Reindex if needed
REINDEX TABLE customers;
```

## Monitoring

### Health Checks

```bash
# API health
curl https://api.example.com/api/v1/health

# Expected response
{
  "status": "ok",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Metrics

```bash
# Prometheus metrics
curl https://api.example.com/api/v1/metrics
```

### Log Analysis

```bash
# Via Railway CLI
railway logs -n 100
railway logs --filter "level=error"
```

### Key Metrics to Monitor

1. **Error Rate**: Should be < 1%
2. **Response Time**: P95 < 500ms
3. **Database Connections**: < 80% of pool
4. **Memory Usage**: < 80% of allocation
5. **Active Campaigns**: Track growth

## Security Administration

### Secret Rotation

```bash
# Generate new secrets
npm run security:generate-secrets

# Update in Railway
# 1. Go to Railway Dashboard
# 2. Select service → Variables
# 3. Update JWT_SECRET, JWT_REFRESH_SECRET
# 4. Redeploy
```

### Security Audit

```bash
# Run security check
npm run security:check

# Dependency audit
npm audit
```

### Access Control

1. Use least-privilege principle for user roles
2. Rotate API keys quarterly
3. Review audit logs weekly
4. Monitor failed login attempts

## Compliance

### TCPA Compliance

- Do-Not-Call list checking: `ENABLE_DO_NOT_CALL_CHECK=true`
- Time restrictions enforced automatically
- Opt-out mechanism functional

### Audit Logging

All sensitive operations are logged:
- User authentication events
- Customer data access
- Campaign modifications
- Payment updates

```sql
-- View recent audit logs
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 100;
```

### Data Retention

| Data Type | Retention |
|-----------|-----------|
| Audit Logs | 1 year |
| Call Recordings | 90 days |
| Email History | 1 year |
| Customer Data | Until deletion requested |

## Scaling

### Vertical Scaling (Railway)

1. Go to Service → Settings
2. Adjust Memory/CPU allocation
3. Apply changes

### Horizontal Scaling

Edit `railway.toml`:

```toml
[deploy]
numReplicas = 3
```

### Database Scaling

1. Upgrade PostgreSQL plan in Railway
2. Adjust connection pool settings
3. Add read replicas if needed

## Backup & Recovery

### Automated Backups

Railway PostgreSQL includes automated backups:
- Point-in-time recovery
- Daily snapshots
- 7-day retention (varies by plan)

### Manual Backup Procedure

```bash
# Full backup
railway run pg_dump $DATABASE_URL --format=custom > backup.dump

# Upload to secure storage
aws s3 cp backup.dump s3://backups/$(date +%Y%m%d)/
```

### Recovery Procedure

1. Stop application traffic (maintenance mode)
2. Restore database from backup
3. Run pending migrations
4. Verify data integrity
5. Resume traffic

## Troubleshooting

### Common Issues

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed guidance.

### Support Escalation

1. Check system status and logs
2. Review recent changes/deployments
3. Consult troubleshooting guide
4. Contact development team
5. Escalate to vendor support if needed
