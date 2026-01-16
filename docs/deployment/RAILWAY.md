# Railway Deployment Guide

## Overview

This guide covers deploying the Client Escalation Calls API to [Railway](https://railway.app).

## Prerequisites

- Railway account ([sign up](https://railway.app/login))
- Railway CLI (optional): `npm install -g @railway/cli`
- GitHub repository connected to Railway

## Quick Deploy

### Option 1: Deploy via GitHub

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `client-escalation-calls` repository
5. Railway auto-detects the configuration

### Option 2: Deploy via CLI

```bash
# Login to Railway
railway login

# Initialize project (if new)
railway init

# Link to existing project
railway link

# Deploy
railway up
```

## Required Services

Create these services in your Railway project:

### 1. PostgreSQL Database

```bash
# Via CLI
railway add postgresql

# Or use Railway Dashboard: Add Service → Database → PostgreSQL
```

Railway automatically sets `DATABASE_URL` for you.

### 2. Redis

```bash
# Via CLI
railway add redis

# Or use Railway Dashboard: Add Service → Database → Redis
```

Railway automatically sets `REDIS_URL` for you.

### 3. Main Application

The app service is created when you deploy from GitHub.

## Environment Variables

Set these in Railway Dashboard → Your Service → Variables:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `JWT_SECRET` | JWT signing key (32+ chars) | `your-super-secret-key...` |
| `JWT_REFRESH_SECRET` | Refresh token key | `your-refresh-secret...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` (Railway sets this) |
| `LOG_LEVEL` | Logging level | `info` |
| `BCRYPT_ROUNDS` | Password hashing | `12` |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit | `100` |

### External Service Variables

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Phone number |
| `SMTP_HOST` | Email server |
| `SMTP_USER` | Email username |
| `SMTP_PASSWORD` | Email password |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |

### Reference Variables (Auto-set by Railway)

These are automatically configured when you add PostgreSQL and Redis:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `REDISHOST`, `REDISPORT`, `REDISPASSWORD`

## Database Setup

### Run Migrations

After deployment, run migrations via Railway CLI:

```bash
# Connect to Railway shell
railway run bash

# Run migrations (if using psql)
psql $DATABASE_URL -f database/migrations/run_all_migrations.sql

# Or run each migration individually
for f in database/migrations/0*.sql; do
  psql $DATABASE_URL -f $f
done
```

### Seed Data (Optional)

```bash
# Production defaults
railway run psql $DATABASE_URL -f database/seeds/002_seed_production_defaults.sql
```

## Project Structure

```
Railway Project
├── client-escalation-calls (Web Service)
│   └── GitHub: your-repo/client-escalation-calls
├── PostgreSQL (Database)
│   └── Auto-provisioned
└── Redis (Cache/Sessions)
    └── Auto-provisioned
```

## Networking

### Internal Networking

Services communicate via internal hostnames:
- PostgreSQL: `postgres.railway.internal:5432`
- Redis: `redis.railway.internal:6379`

Railway handles this automatically via environment variables.

### Public Access

Your API will be available at:
- `https://your-project.up.railway.app`

Custom domain setup:
1. Go to Service → Settings → Domains
2. Add your custom domain
3. Configure DNS CNAME to Railway

## Scaling

### Vertical Scaling

Adjust resources in Railway Dashboard:
- **Starter**: 512MB RAM, 0.5 vCPU
- **Pro**: Up to 32GB RAM, 8 vCPU

### Horizontal Scaling

Edit `railway.toml`:

```toml
[deploy]
numReplicas = 3
```

Or use Railway Dashboard → Service → Settings → Replicas

## Monitoring

### Health Checks

The API exposes `/api/v1/health` for monitoring.

Railway automatically monitors this endpoint based on `railway.toml` config.

### Logs

```bash
# View logs via CLI
railway logs

# Or use Railway Dashboard → Service → Logs
```

### Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network I/O
- Request count

## CI/CD

### Automatic Deployments

Railway auto-deploys on push to your default branch.

Configure in Railway Dashboard → Service → Settings → Deploys:
- **Branch**: `main` or `production`
- **Auto-deploy**: Enabled

### Preview Environments

Railway creates preview environments for PRs:
1. Enable in Project Settings → Environments
2. PRs get isolated deployments
3. Environment variables are inherited

## Troubleshooting

### Build Failures

```bash
# Check build logs
railway logs --build

# Common issues:
# - Missing dependencies: Check package.json
# - TypeScript errors: Run `npm run typecheck` locally
# - Memory issues: Increase build resources
```

### Runtime Errors

```bash
# Check runtime logs
railway logs

# Connect to shell for debugging
railway shell
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is set
railway variables

# Test connection
railway run psql $DATABASE_URL -c "SELECT 1"
```

### Common Fixes

| Issue | Solution |
|-------|----------|
| Port binding | Use `process.env.PORT` |
| DB connection | Use `DATABASE_URL` env var |
| Build timeout | Increase build resources |
| Memory OOM | Increase service RAM |

## Cost Estimation

Railway pricing (as of 2024):

| Plan | Included | Overage |
|------|----------|---------|
| **Hobby** | $5/month | $0.000463/min |
| **Pro** | $20/month | Usage-based |
| **Team** | Custom | Volume discounts |

Typical costs for this app:
- **Development**: ~$5-10/month
- **Production**: ~$20-50/month (depends on traffic)

## Security Checklist

- [ ] Set strong `JWT_SECRET` (32+ random characters)
- [ ] Set strong `JWT_REFRESH_SECRET`
- [ ] Enable HTTPS only (Railway default)
- [ ] Configure `CORS_ORIGIN` for your domains
- [ ] Set `NODE_ENV=production`
- [ ] Review and minimize exposed ports
- [ ] Enable audit logging (`ENABLE_AUDIT_LOGGING=true`)

## Support

- [Railway Docs](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app/)
