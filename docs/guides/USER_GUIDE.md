# User Guide

## Overview

The Client Escalation Calls API is an agentic AI system for automated payment collection. This guide covers how to use the API effectively.

## Getting Started

### Authentication

All API requests require authentication via JWT tokens.

```bash
# Login to get tokens
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your-password"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "expiresIn": 900
  }
}
```

Use the access token in subsequent requests:
```bash
curl https://api.example.com/api/v1/customers \
  -H "Authorization: Bearer <accessToken>"
```

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh token to get a new one:

```bash
curl -X POST https://api.example.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbG..."}'
```

## Core Workflows

### 1. Customer Management

#### Create a Customer

```bash
curl -X POST https://api.example.com/api/v1/customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Logistics",
    "contactName": "John Smith",
    "email": "john@acme.com",
    "phone": "+1-555-123-4567",
    "preferredContactMethod": "email"
  }'
```

#### List Customers

```bash
# Basic list
curl https://api.example.com/api/v1/customers \
  -H "Authorization: Bearer <token>"

# With filters
curl "https://api.example.com/api/v1/customers?riskLevel=high&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

#### Get Customer Details

```bash
curl https://api.example.com/api/v1/customers/<customer-id> \
  -H "Authorization: Bearer <token>"
```

### 2. Payment Records

#### Create Payment Record

```bash
curl -X POST https://api.example.com/api/v1/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<customer-uuid>",
    "amount": 5000.00,
    "currency": "USD",
    "dueDate": "2024-02-15",
    "invoiceNumber": "INV-2024-001",
    "description": "Shipping services - January 2024"
  }'
```

#### View Overdue Payments

```bash
curl https://api.example.com/api/v1/payments/overdue \
  -H "Authorization: Bearer <token>"
```

### 3. Collection Campaigns

#### Create Campaign

```bash
curl -X POST https://api.example.com/api/v1/campaigns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 Collections - Acme",
    "customerId": "<customer-uuid>",
    "paymentRecordId": "<payment-uuid>",
    "escalationSteps": [
      {
        "stepNumber": 1,
        "channel": "email",
        "template": "friendly_reminder",
        "delayHours": 0
      },
      {
        "stepNumber": 2,
        "channel": "phone",
        "template": "follow_up_call",
        "delayHours": 72
      },
      {
        "stepNumber": 3,
        "channel": "email",
        "template": "final_notice",
        "delayHours": 168
      }
    ],
    "config": {
      "maxDailyContacts": 3,
      "respectDoNotContact": true
    }
  }'
```

#### Monitor Campaign Progress

```bash
# Get campaign details
curl https://api.example.com/api/v1/campaigns/<campaign-id> \
  -H "Authorization: Bearer <token>"

# List campaign tasks
curl "https://api.example.com/api/v1/tasks?campaignId=<campaign-id>" \
  -H "Authorization: Bearer <token>"
```

#### Pause/Resume Campaign

```bash
# Pause
curl -X PUT https://api.example.com/api/v1/campaigns/<campaign-id>/pause \
  -H "Authorization: Bearer <token>"

# Resume
curl -X PUT https://api.example.com/api/v1/campaigns/<campaign-id>/resume \
  -H "Authorization: Bearer <token>"
```

### 4. Tasks

Tasks are automatically created by campaigns and executed by AI agents.

#### View Tasks

```bash
# All pending tasks
curl "https://api.example.com/api/v1/tasks?status=pending" \
  -H "Authorization: Bearer <token>"

# Tasks by priority
curl "https://api.example.com/api/v1/tasks?priority=urgent" \
  -H "Authorization: Bearer <token>"
```

#### Manual Task Update

```bash
curl -X PUT https://api.example.com/api/v1/tasks/<task-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "priority": "high"
  }'
```

## API Response Format

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
    "totalCount": 150,
    "totalPages": 8
  }
}
```

### Error Response

```json
{
  "error": "Error message",
  "details": "Specific error details"
}
```

## Common Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Contact support |

## Best Practices

### Rate Limiting

- Default: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes
- Monitor `X-RateLimit-Remaining` header

### Pagination

Always use pagination for list endpoints:
```
?page=1&limit=50
```

Maximum limit is 100 items per page.

### Filtering

Use query parameters to filter results:
- `status` - Filter by status
- `customerId` - Filter by customer
- `sortBy` - Sort field
- `sortOrder` - asc or desc

### Webhooks

Configure webhooks to receive real-time updates (coming soon).

## Support

- API Documentation: `/api/v1/docs`
- Health Status: `/api/v1/health`
- Contact: support@example.com
