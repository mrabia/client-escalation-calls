# Environment Configuration

## Overview

This directory contains environment configuration templates for different deployment environments.

## Files

- `production.env.example` - Production environment template
- `staging.env.example` - Staging environment template

## Environment Setup

### Railway Environments

Railway supports multiple environments per project:

1. **Production**: Main branch deploys
2. **Staging**: Feature/staging branch deploys
3. **Preview**: PR deployments

### Setting Up Staging on Railway

```bash
# In Railway Dashboard:
# 1. Go to Project Settings → Environments
# 2. Create "staging" environment
# 3. Link to "staging" or "develop" branch
# 4. Add environment-specific variables
```

### Environment Differences

| Setting | Production | Staging |
|---------|------------|---------|
| `NODE_ENV` | production | staging |
| `LOG_LEVEL` | warn | debug |
| `DB_POOL_MAX` | 20 | 10 |
| `RATE_LIMIT` | 100/15min | 500/15min |
| `COMPLIANCE` | Enabled | Disabled |
| `DEBUG` | false | true |

## Required Variables by Environment

### All Environments (Required)

- `JWT_SECRET` - Must be unique per environment
- `JWT_REFRESH_SECRET` - Must be unique per environment
- `DATABASE_URL` - Auto-set by Railway
- `REDIS_URL` - Auto-set by Railway

### Production Only

- `ENCRYPTION_KEY` - For PII encryption
- `TWILIO_*` - Real Twilio credentials
- `SMTP_*` - Production email service

### Staging Only

- Use test/sandbox credentials for external services
- Mailtrap for email testing
- Twilio test credentials

## Secrets Rotation

Rotate secrets periodically:

```bash
# Generate new secrets
npm run security:generate-secrets

# Update in Railway Dashboard
# Redeploy to apply changes
```

## Validation

Before deploying, validate configuration:

```bash
# Run security check (locally won't pass, but shows what's needed)
npm run security:check
```
