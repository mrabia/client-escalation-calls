# API Documentation

## Overview

This directory contains the OpenAPI 3.1 specification for the Client Escalation Calls API.

## Files

- `openapi.yaml` - Complete OpenAPI specification

## Viewing the Documentation

### Option 1: Swagger UI (Built-in)

When the server is running, access the Swagger UI at:

```
http://localhost:3000/api/v1/docs
```

### Option 2: Swagger Editor (Online)

1. Go to [Swagger Editor](https://editor.swagger.io/)
2. Import the `openapi.yaml` file

### Option 3: VS Code Extension

Install the "OpenAPI (Swagger) Editor" extension and open `openapi.yaml`

## API Endpoints Summary

| Category | Endpoints |
|----------|-----------|
| **Health** | `GET /health`, `GET /`, `GET /stats` |
| **Auth** | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/sessions`, `POST /auth/revoke-all-sessions` |
| **Customers** | CRUD + `/payments`, `/campaigns` |
| **Payments** | CRUD + `/overdue` |
| **Campaigns** | CRUD + `/pause`, `/resume` |
| **Tasks** | CRUD |
| **Agents** | CRUD + `/metrics` |

## Authentication

Most endpoints require Bearer token authentication:

```bash
# Login to get tokens
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use access token for authenticated requests
curl http://localhost:3000/api/v1/customers \
  -H "Authorization: Bearer <access_token>"
```

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "error": "Error message",
  "details": "Specific details (optional)"
}
```

## Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per window
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

## Generating Client SDKs

Use OpenAPI Generator to create client libraries:

```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./sdk/typescript

# Generate Python client
openapi-generator-cli generate -i openapi.yaml -g python -o ./sdk/python
```
