# API Documentation for Taskade Integration

## Overview

This document provides complete API reference for integrating **Taskade** with the **Client Escalation Calls** backend service via webhooks and HTTP requests.

**Base URL:** `https://your-app.up.railway.app/api/v1`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Making Requests](#making-requests)
3. [Customer Endpoints](#customer-endpoints)
4. [Payment Endpoints](#payment-endpoints)
5. [Campaign Endpoints](#campaign-endpoints)
6. [Task Endpoints](#task-endpoints)
7. [Call Endpoints](#call-endpoints)
8. [SMS Endpoints](#sms-endpoints)
9. [Webhook Configuration](#webhook-configuration)
10. [Error Handling](#error-handling)

---

## Authentication

All API requests require authentication using JWT Bearer tokens.

### Step 1: Get Access Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### Step 2: Use Token in Requests

Add the token to all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Refresh Token (When Expired)

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Making Requests

### Request Format

All requests must include:

```http
Content-Type: application/json
Authorization: Bearer <your-access-token>
```

### Response Format

**Success Response:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**

```json
{
  "error": "Error message",
  "details": "Specific error details"
}
```

**Paginated Response:**

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

---

## Customer Endpoints

### Create Customer

Creates a new customer in the system.

```http
POST /api/v1/customers
```

**Request Body:**

```json
{
  "companyName": "Acme Logistics Inc",
  "contactName": "John Smith",
  "email": "john.smith@acmelogistics.com",
  "phone": "+15551234567",
  "preferredContactMethod": "email",
  "timezone": "America/New_York",
  "metadata": {
    "industry": "logistics",
    "accountManager": "Sarah Jones"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "Acme Logistics Inc",
    "contactName": "John Smith",
    "email": "john.smith@acmelogistics.com",
    "phone": "+15551234567",
    "preferredContactMethod": "email",
    "timezone": "America/New_York",
    "riskLevel": "low",
    "doNotContact": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Taskade Webhook Configuration:**

| Field | Value |
|-------|-------|
| Method | POST |
| URL | `{{BASE_URL}}/api/v1/customers` |
| Headers | `Authorization: Bearer {{TOKEN}}` |
| Body | JSON with customer data |

---

### Get Customer

Retrieves a specific customer by ID.

```http
GET /api/v1/customers/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "Acme Logistics Inc",
    "contactName": "John Smith",
    "email": "john.smith@acmelogistics.com",
    "phone": "+15551234567",
    "preferredContactMethod": "email",
    "timezone": "America/New_York",
    "riskLevel": "medium",
    "doNotContact": false,
    "totalOutstanding": 15000.00,
    "lastContactDate": "2024-01-10T14:30:00Z",
    "createdAt": "2023-06-15T10:30:00Z"
  }
}
```

---

### Update Customer

Updates an existing customer.

```http
PUT /api/v1/customers/:id
```

**Request Body:**

```json
{
  "contactName": "John Smith Jr",
  "phone": "+15559876543",
  "riskLevel": "high",
  "doNotContact": false
}
```

---

### List Customers

Retrieves a paginated list of customers.

```http
GET /api/v1/customers?page=1&limit=20&riskLevel=high
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| riskLevel | string | Filter by risk level (low, medium, high, critical) |
| search | string | Search by name or email |
| sortBy | string | Sort field (createdAt, companyName) |
| sortOrder | string | Sort direction (asc, desc) |

---

### Set Do Not Contact

Marks a customer as do-not-contact (opt-out).

```http
PUT /api/v1/customers/:id/do-not-contact
```

**Request Body:**

```json
{
  "doNotContact": true,
  "reason": "Customer requested opt-out via phone"
}
```

---

## Payment Endpoints

### Create Payment Record

Creates a new payment/invoice record.

```http
POST /api/v1/payments
```

**Request Body:**

```json
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 5000.00,
  "currency": "USD",
  "dueDate": "2024-02-15",
  "invoiceNumber": "INV-2024-001",
  "description": "Shipping services - January 2024",
  "metadata": {
    "poNumber": "PO-12345",
    "serviceDate": "2024-01-31"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 5000.00,
    "currency": "USD",
    "dueDate": "2024-02-15",
    "status": "pending",
    "invoiceNumber": "INV-2024-001",
    "daysOverdue": 0,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Get Payment Record

```http
GET /api/v1/payments/:id
```

---

### Update Payment Status

```http
PUT /api/v1/payments/:id
```

**Request Body:**

```json
{
  "status": "partial",
  "amountPaid": 2500.00,
  "paymentDate": "2024-01-20",
  "paymentMethod": "check",
  "notes": "Partial payment received, remaining $2,500 due Feb 15"
}
```

**Status Values:**

| Status | Description |
|--------|-------------|
| pending | Payment not yet due |
| overdue | Past due date, unpaid |
| partial | Partial payment received |
| paid | Fully paid |
| written_off | Uncollectible |

---

### List Overdue Payments

```http
GET /api/v1/payments/overdue?minDaysOverdue=30
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| minDaysOverdue | number | Minimum days overdue |
| maxAmount | number | Maximum amount filter |
| customerId | string | Filter by customer |

---

## Campaign Endpoints

### Create Campaign

Creates a new collection/outreach campaign.

```http
POST /api/v1/campaigns
```

**Request Body:**

```json
{
  "name": "Q1 Collections - Acme Logistics",
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "paymentRecordId": "660e8400-e29b-41d4-a716-446655440001",
  "escalationSteps": [
    {
      "stepNumber": 1,
      "channel": "email",
      "template": "friendly_reminder",
      "delayHours": 0,
      "subject": "Friendly Reminder: Invoice INV-2024-001"
    },
    {
      "stepNumber": 2,
      "channel": "email",
      "template": "follow_up",
      "delayHours": 72,
      "subject": "Follow-up: Outstanding Invoice"
    },
    {
      "stepNumber": 3,
      "channel": "phone",
      "template": "collection_call",
      "delayHours": 168,
      "script": "Call to discuss payment options"
    },
    {
      "stepNumber": 4,
      "channel": "sms",
      "template": "urgent_reminder",
      "delayHours": 240,
      "message": "Urgent: Please contact us about invoice INV-2024-001"
    }
  ],
  "config": {
    "maxDailyContacts": 3,
    "respectBusinessHours": true,
    "stopOnPayment": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Q1 Collections - Acme Logistics",
    "status": "active",
    "currentStep": 1,
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "startedAt": "2024-01-15T10:30:00Z",
    "nextActionAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Get Campaign Status

```http
GET /api/v1/campaigns/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Q1 Collections - Acme Logistics",
    "status": "active",
    "currentStep": 2,
    "totalSteps": 4,
    "customer": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "companyName": "Acme Logistics Inc"
    },
    "paymentRecord": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "amount": 5000.00,
      "status": "overdue"
    },
    "tasks": [
      {
        "id": "task-1",
        "stepNumber": 1,
        "channel": "email",
        "status": "completed",
        "completedAt": "2024-01-15T10:35:00Z"
      },
      {
        "id": "task-2",
        "stepNumber": 2,
        "channel": "email",
        "status": "pending",
        "scheduledAt": "2024-01-18T10:30:00Z"
      }
    ],
    "startedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Pause Campaign

```http
PUT /api/v1/campaigns/:id/pause
```

---

### Resume Campaign

```http
PUT /api/v1/campaigns/:id/resume
```

---

### Cancel Campaign

```http
PUT /api/v1/campaigns/:id/cancel
```

**Request Body:**

```json
{
  "reason": "Customer made payment"
}
```

---

## Task Endpoints

### Create Task

Creates a one-off task (outside of a campaign).

```http
POST /api/v1/tasks
```

**Request Body:**

```json
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "call",
  "priority": "high",
  "scheduledAt": "2024-01-16T14:00:00Z",
  "context": {
    "reason": "Follow up on payment promise",
    "notes": "Customer promised to pay by Jan 15"
  }
}
```

**Task Types:**

| Type | Description |
|------|-------------|
| email | Send an email |
| call | Make a phone call |
| sms | Send SMS message |

**Priority Levels:**

| Priority | Description |
|----------|-------------|
| low | Can wait |
| normal | Standard priority |
| high | Should be handled soon |
| urgent | Immediate attention |

---

### Get Task

```http
GET /api/v1/tasks/:id
```

---

### Update Task

```http
PUT /api/v1/tasks/:id
```

**Request Body:**

```json
{
  "status": "completed",
  "result": {
    "outcome": "promise_to_pay",
    "promiseDate": "2024-01-20",
    "promiseAmount": 5000.00,
    "notes": "Customer committed to full payment by Jan 20"
  }
}
```

**Task Statuses:**

| Status | Description |
|--------|-------------|
| pending | Waiting to be executed |
| in_progress | Currently being executed |
| completed | Successfully completed |
| failed | Execution failed |
| skipped | Skipped (e.g., customer opted out) |

---

### List Tasks

```http
GET /api/v1/tasks?status=pending&priority=high
```

---

## Call Endpoints

### Initiate Outbound Call

Triggers an outbound phone call to a customer.

```http
POST /api/v1/calls/outbound
```

**Request Body:**

```json
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "phoneNumber": "+15551234567",
  "campaignId": "770e8400-e29b-41d4-a716-446655440002",
  "script": "collection_standard",
  "context": {
    "invoiceNumber": "INV-2024-001",
    "amountDue": 5000.00,
    "daysOverdue": 15
  },
  "callbackUrl": "https://your-taskade-webhook.com/call-completed"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "callId": "880e8400-e29b-41d4-a716-446655440003",
    "twilioSid": "CA1234567890abcdef",
    "status": "initiated",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "phoneNumber": "+15551234567",
    "initiatedAt": "2024-01-15T14:00:00Z"
  }
}
```

---

### Get Call Details

```http
GET /api/v1/calls/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "callId": "880e8400-e29b-41d4-a716-446655440003",
    "twilioSid": "CA1234567890abcdef",
    "status": "completed",
    "duration": 245,
    "outcome": "promise_to_pay",
    "recordingUrl": "https://api.twilio.com/recordings/RE123...",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "initiatedAt": "2024-01-15T14:00:00Z",
    "completedAt": "2024-01-15T14:04:05Z"
  }
}
```

---

### Get Call Transcript

```http
GET /api/v1/calls/:id/transcript
```

**Response:**

```json
{
  "success": true,
  "data": {
    "callId": "880e8400-e29b-41d4-a716-446655440003",
    "transcript": [
      {
        "speaker": "agent",
        "timestamp": "00:00:05",
        "text": "Hello, this is Sarah calling from ABC Collections regarding invoice INV-2024-001."
      },
      {
        "speaker": "customer",
        "timestamp": "00:00:12",
        "text": "Oh yes, I've been meaning to call about that."
      },
      {
        "speaker": "agent",
        "timestamp": "00:00:18",
        "text": "The current balance is $5,000. Would you like to discuss payment options?"
      },
      {
        "speaker": "customer",
        "timestamp": "00:00:25",
        "text": "I can pay the full amount by Friday."
      }
    ],
    "summary": "Customer promised to pay $5,000 in full by Friday, January 20th.",
    "sentiment": "positive",
    "keyOutcomes": [
      "promise_to_pay",
      "full_amount",
      "date_committed"
    ]
  }
}
```

---

### Schedule Call

Schedules a call for a future time.

```http
POST /api/v1/calls/schedule
```

**Request Body:**

```json
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "phoneNumber": "+15551234567",
  "scheduledAt": "2024-01-16T10:00:00Z",
  "timezone": "America/New_York",
  "context": {
    "reason": "Follow-up on payment promise"
  }
}
```

---

### List Call History

```http
GET /api/v1/calls?customerId=550e8400-e29b-41d4-a716-446655440000
```

---

## SMS Endpoints

### Send SMS

Sends an SMS message to a customer.

```http
POST /api/v1/sms/send
```

**Request Body:**

```json
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "phoneNumber": "+15551234567",
  "message": "Reminder: Your invoice INV-2024-001 for $5,000 is now 15 days overdue. Please contact us at 1-800-555-0123 to discuss payment options.",
  "campaignId": "770e8400-e29b-41d4-a716-446655440002"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "messageId": "990e8400-e29b-41d4-a716-446655440004",
    "twilioSid": "SM1234567890abcdef",
    "status": "sent",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "phoneNumber": "+15551234567",
    "sentAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Get SMS Status

```http
GET /api/v1/sms/:id
```

---

### Get SMS Conversation

Retrieves the full SMS conversation thread with a customer.

```http
GET /api/v1/sms/conversation/:customerId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "phoneNumber": "+15551234567",
    "messages": [
      {
        "id": "msg-1",
        "direction": "outbound",
        "message": "Reminder: Invoice INV-2024-001 is overdue.",
        "status": "delivered",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "id": "msg-2",
        "direction": "inbound",
        "message": "I'll pay by Friday",
        "timestamp": "2024-01-15T11:45:00Z"
      }
    ]
  }
}
```

---

## Webhook Configuration

### Receiving Events from the API

Configure your Taskade automation to receive real-time events.

#### Register Webhook

```http
POST /api/v1/webhooks
```

**Request Body:**

```json
{
  "url": "https://your-taskade-webhook-url.com/events",
  "events": [
    "call.completed",
    "call.transcribed",
    "sms.received",
    "payment.received",
    "campaign.completed",
    "customer.opted_out"
  ],
  "secret": "your-webhook-secret-for-verification"
}
```

#### Webhook Event Payloads

**call.completed:**

```json
{
  "event": "call.completed",
  "timestamp": "2024-01-15T14:04:05Z",
  "data": {
    "callId": "880e8400-e29b-41d4-a716-446655440003",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "duration": 245,
    "outcome": "promise_to_pay",
    "summary": "Customer promised to pay $5,000 by Jan 20"
  }
}
```

**call.transcribed:**

```json
{
  "event": "call.transcribed",
  "timestamp": "2024-01-15T14:10:00Z",
  "data": {
    "callId": "880e8400-e29b-41d4-a716-446655440003",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "transcriptUrl": "/api/v1/calls/880e8400.../transcript",
    "summary": "Customer committed to full payment by Friday"
  }
}
```

**sms.received:**

```json
{
  "event": "sms.received",
  "timestamp": "2024-01-15T11:45:00Z",
  "data": {
    "messageId": "msg-inbound-123",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "phoneNumber": "+15551234567",
    "message": "I'll pay by Friday",
    "isOptOut": false
  }
}
```

**payment.received:**

```json
{
  "event": "payment.received",
  "timestamp": "2024-01-20T09:00:00Z",
  "data": {
    "paymentId": "payment-123",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "invoiceNumber": "INV-2024-001",
    "amount": 5000.00,
    "status": "paid"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Resource exists |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error |

### Error Response Format

```json
{
  "error": "Validation error",
  "details": "\"email\" must be a valid email",
  "code": "VALIDATION_ERROR",
  "field": "email"
}
```

### Rate Limiting

- **Standard endpoints:** 100 requests per 15 minutes
- **Auth endpoints:** 10 requests per 15 minutes
- **Bulk operations:** 20 requests per 15 minutes

Check response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312200
```

---

## Quick Reference

### Common Taskade Webhook Patterns

| Action | Method | Endpoint |
|--------|--------|----------|
| Create customer | POST | `/api/v1/customers` |
| Update customer | PUT | `/api/v1/customers/:id` |
| Create invoice | POST | `/api/v1/payments` |
| Start campaign | POST | `/api/v1/campaigns` |
| Make call | POST | `/api/v1/calls/outbound` |
| Schedule call | POST | `/api/v1/calls/schedule` |
| Send SMS | POST | `/api/v1/sms/send` |
| Get transcript | GET | `/api/v1/calls/:id/transcript` |
| Pause campaign | PUT | `/api/v1/campaigns/:id/pause` |
| Mark paid | PUT | `/api/v1/payments/:id` |

### Authentication Header

Always include:

```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```
