# Documentation Index

## Overview

Complete documentation for the Client Escalation Calls API - an agentic AI payment collection system.

## Quick Links

### Getting Started

- [User Guide](./guides/USER_GUIDE.md) - API usage and workflows
- [Admin Guide](./guides/ADMIN_GUIDE.md) - System administration
- [Troubleshooting](./guides/TROUBLESHOOTING.md) - Common issues and solutions

### API Reference

- [OpenAPI Specification](./api/openapi.yaml) - Complete API spec
- [API Documentation](./api/README.md) - API overview
- **Live Docs**: `/api/v1/docs` (Swagger UI)

### Deployment

- [Railway Deployment](./deployment/RAILWAY.md) - Deploy to Railway
- [Environment Config](../config/environments/README.md) - Environment setup

### Security

- [Security Audit Checklist](./security/SECURITY_AUDIT.md) - Pre-deployment security

### Operations

- [Monitoring Guide](./operations/MONITORING.md) - Observability and metrics
- [Incident Response](./operations/INCIDENT_RESPONSE.md) - Handling incidents
- [Database Operations](./operations/DATABASE_OPS.md) - DB administration

### Database

- [Schema Documentation](../database/SCHEMA.md) - Database schema
- [Database README](../database/README.md) - Migrations and setup

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│  • Authentication (JWT)                                      │
│  • Rate Limiting                                             │
│  • Request Validation                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Services                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Customer │  │ Campaign │  │   Task   │  │  Agent   │    │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Email   │  │  Phone   │  │   SMS    │  │ Research │    │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data & Integration                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │PostgreSQL│  │  Redis   │  │  Twilio  │  │  OpenAI  │    │
│  │    DB    │  │  Cache   │  │   API    │  │   API    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

- **Multi-channel Communication**: Email, Phone, SMS
- **AI-Powered Agents**: Automated customer interactions
- **Campaign Management**: Configurable escalation workflows
- **Compliance Built-in**: TCPA, Do-Not-Call, audit logging
- **Real-time Monitoring**: Health checks, metrics, alerting

## NPM Scripts Reference

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server

# Testing
npm test                 # Run tests
npm run test:coverage    # Run with coverage

# Database
npm run db:migrate       # Run database migrations

# Security
npm run security:check           # Validate security config
npm run security:generate-secrets # Generate production secrets
npm run security:audit           # Run npm audit

# Docker
npm run docker:build     # Build Docker image
npm run docker:run       # Run Docker container
```

## Environment Variables

See [Environment Configuration](../config/environments/README.md) for complete list.

### Required (Production)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` |
| `JWT_SECRET` | JWT signing key (32+ chars) |
| `JWT_REFRESH_SECRET` | Refresh token key |
| `DATABASE_URL` | PostgreSQL connection (auto-set by Railway) |
| `REDIS_URL` | Redis connection (auto-set by Railway) |

## Support

- **API Docs**: `/api/v1/docs`
- **Health Check**: `/api/v1/health`
- **Issues**: GitHub Issues
