# Client Escalation Calls - Project Documentation

## Executive Summary

**Client Escalation Calls** is an enterprise-grade, AI-powered customer service and payment collection platform. It provides automated multi-channel communication (Email, Phone, SMS) through intelligent AI agents that handle customer outreach, payment reminders, and escalation workflows.

This backend service is designed to integrate seamlessly with **Taskade** for UI, workflow management, and business data storage, while handling all communication logic, call management, and AI-driven customer interactions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [AI Agents](#ai-agents)
5. [Automation Flows](#automation-flows)
6. [Data Models](#data-models)
7. [Integration Points](#integration-points)
8. [Security & Compliance](#security--compliance)
9. [Deployment](#deployment)

---

## Project Overview

### Purpose

The platform solves the challenge of efficient, compliant, and personalized customer outreach for payment collection and customer service. It replaces manual calling and emailing with intelligent automation that:

- **Reduces operational costs** by 60-80%
- **Increases contact rates** through optimal timing
- **Ensures compliance** with TCPA and Do-Not-Call regulations
- **Scales infinitely** without adding headcount

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Automated Calling** | AI-powered outbound calls with natural conversation |
| **SMS Campaigns** | Automated text message sequences |
| **Email Automation** | Personalized email campaigns with tracking |
| **Escalation Workflows** | Multi-step, multi-channel contact sequences |
| **Real-time Transcription** | Call recording and transcription storage |
| **Payment Processing** | Track and update payment statuses |
| **Compliance Engine** | TCPA, business hours, opt-out enforcement |

### Target Users

- **Collection Agencies** - Automated payment reminders
- **Customer Service Teams** - Proactive customer outreach
- **Sales Organizations** - Follow-up automation
- **Healthcare Providers** - Appointment reminders and billing

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TASKADE                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │     UI      │  │  Workflows  │  │  Customer   │  │  AI Agent   │        │
│  │  Dashboard  │  │ Automations │  │    Data     │  │  Builder    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          │         WEBHOOKS / API CALLS    │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLIENT ESCALATION CALLS API                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API GATEWAY                                  │   │
│  │  • JWT Authentication    • Rate Limiting    • Request Validation    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐ │
│  │                         CORE SERVICES                                 │ │
│  │                                                                       │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │ │
│  │  │  Customer  │  │  Campaign  │  │    Task    │  │   Agent    │     │ │
│  │  │  Service   │  │  Service   │  │  Service   │  │  Service   │     │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │ │
│  │                                                                       │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │ │
│  │  │  Payment   │  │    Auth    │  │ Compliance │  │  Analytics │     │ │
│  │  │  Service   │  │  Service   │  │  Service   │  │  Service   │     │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐ │
│  │                         AI AGENT LAYER                                │ │
│  │                                                                       │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │ │
│  │  │   EMAIL    │  │   PHONE    │  │    SMS     │  │  RESEARCH  │     │ │
│  │  │   AGENT    │  │   AGENT    │  │   AGENT    │  │   AGENT    │     │ │
│  │  │            │  │            │  │            │  │            │     │ │
│  │  │ • Compose  │  │ • Dial     │  │ • Send     │  │ • Enrich   │     │ │
│  │  │ • Send     │  │ • Converse │  │ • Track    │  │ • Analyze  │     │ │
│  │  │ • Track    │  │ • Record   │  │ • Respond  │  │ • Score    │     │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   POSTGRESQL    │      │     REDIS       │      │    TWILIO       │
│                 │      │                 │      │                 │
│ • Customers     │      │ • Sessions      │      │ • Voice Calls   │
│ • Campaigns     │      │ • Rate Limits   │      │ • SMS Messages  │
│ • Tasks         │      │ • Cache         │      │ • Recordings    │
│ • Call Logs     │      │ • Queues        │      │ • Transcripts   │
│ • Transcripts   │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js 18+ | Server runtime |
| **Framework** | Express.js | API framework |
| **Language** | TypeScript | Type-safe development |
| **Database** | PostgreSQL | Primary data store |
| **Cache** | Redis | Sessions, caching, queues |
| **Voice/SMS** | Twilio | Phone calls and SMS |
| **Email** | SendGrid/SMTP | Email delivery |
| **AI** | OpenAI GPT-4 | Conversation AI |
| **Hosting** | Railway | Cloud deployment |

---

## Core Components

### 1. Customer Management

Stores and manages all customer data, contact preferences, and history.

```
Customer
├── id (UUID)
├── company_name
├── contact_name
├── email
├── phone
├── preferred_contact_method (email|phone|sms)
├── timezone
├── do_not_contact (boolean)
├── risk_level (low|medium|high|critical)
└── metadata (JSON)
```

**Key Operations:**
- Create/Update customer profiles
- Track contact preferences
- Manage opt-out status
- Calculate risk scores

### 2. Payment Records

Tracks invoices, payments, and collection status.

```
PaymentRecord
├── id (UUID)
├── customer_id (FK)
├── amount
├── currency
├── due_date
├── status (pending|partial|paid|overdue|written_off)
├── invoice_number
├── days_overdue
└── payment_history (JSON)
```

**Key Operations:**
- Record new invoices
- Update payment status
- Track partial payments
- Calculate aging reports

### 3. Campaign Engine

Orchestrates multi-step, multi-channel outreach campaigns.

```
Campaign
├── id (UUID)
├── name
├── customer_id (FK)
├── payment_record_id (FK)
├── status (draft|active|paused|completed|cancelled)
├── escalation_steps (JSON Array)
│   ├── step_number
│   ├── channel (email|phone|sms)
│   ├── template
│   └── delay_hours
├── current_step
├── started_at
└── completed_at
```

**Key Operations:**
- Create escalation workflows
- Execute campaign steps
- Track progress
- Handle responses

### 4. Task Scheduler

Manages individual contact tasks within campaigns.

```
Task
├── id (UUID)
├── campaign_id (FK)
├── type (email|call|sms)
├── status (pending|in_progress|completed|failed|skipped)
├── priority (low|normal|high|urgent)
├── scheduled_at
├── assigned_agent_id
├── attempts
├── result (JSON)
└── context (JSON)
```

**Key Operations:**
- Schedule tasks
- Assign to agents
- Track execution
- Handle retries

---

## AI Agents

### Email Agent

**Purpose:** Compose and send personalized collection emails.

**Capabilities:**
- Generate personalized email content using AI
- Select appropriate templates based on escalation level
- Track delivery, opens, and clicks
- Handle replies and bounce processing

**Workflow:**
```
1. Receive task from Campaign Engine
2. Load customer context and payment data
3. Select or generate email template
4. Personalize content with AI
5. Send via SMTP/SendGrid
6. Track delivery status
7. Update task with results
```

### Phone Agent

**Purpose:** Make outbound calls and conduct AI-powered conversations.

**Capabilities:**
- Initiate outbound calls via Twilio
- Conduct natural conversations using AI
- Record calls and generate transcriptions
- Detect payment commitments
- Handle voicemail detection

**Workflow:**
```
1. Receive call task
2. Check compliance (time, DNC)
3. Initiate call via Twilio
4. AI conducts conversation
5. Record and transcribe
6. Extract outcomes (promise to pay, callback, etc.)
7. Update customer record and task
```

**Call Flow:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Dial      │────▶│  Connect    │────▶│  Greet      │
│   Number    │     │  or VM      │     │  Customer   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Update    │◀────│  Wrap Up    │◀────│  Discuss    │
│   Records   │     │  Call       │     │  Payment    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### SMS Agent

**Purpose:** Send and receive SMS messages.

**Capabilities:**
- Send templated SMS messages
- Handle two-way conversations
- Process opt-out requests (STOP)
- Track delivery status

**Workflow:**
```
1. Receive SMS task
2. Check opt-out status
3. Format message (160 char limit)
4. Send via Twilio
5. Handle responses
6. Update conversation thread
```

### Research Agent

**Purpose:** Enrich customer data and provide context.

**Capabilities:**
- Look up company information
- Find alternate contacts
- Calculate risk scores
- Analyze payment history patterns

---

## Automation Flows

### Flow 1: New Overdue Payment

**Trigger:** Payment becomes overdue

```
┌─────────────────┐
│  Payment Due    │
│  Date Passed    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Campaign │
│ for Collection  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Day 1: Send    │────▶│  Day 3: Follow  │
│  Friendly Email │     │  Up Email       │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Day 7: Phone   │────▶│  Day 14: Final  │
                        │  Call Attempt   │     │  Notice Email   │
                        └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Day 21: SMS    │
                                                │  + Phone Call   │
                                                └─────────────────┘
```

### Flow 2: Inbound Call Handling

**Trigger:** Customer calls in

```
┌─────────────────┐
│  Incoming Call  │
│  via Twilio     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Identify       │
│  Customer       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Load Context   │
│  & History      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Handles     │
│  Conversation   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Log Call &     │
│  Update Status  │
└─────────────────┘
```

### Flow 3: Payment Promise Follow-up

**Trigger:** Customer promises to pay

```
┌─────────────────┐
│  Promise to Pay │
│  Recorded       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Schedule       │
│  Reminder       │
└────────┬────────┘
         │
    Promise Date
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────┐
│ Paid  │  │ Not   │
│       │  │ Paid  │
└───┬───┘  └───┬───┘
    │          │
    ▼          ▼
┌───────┐  ┌───────┐
│ Close │  │ Esc.  │
│ Task  │  │ Call  │
└───────┘  └───────┘
```

### Flow 4: Opt-Out Processing

**Trigger:** Customer requests opt-out

```
┌─────────────────┐
│  STOP Received  │
│  or Verbal Opt  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update DNC     │
│  Status         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cancel Active  │
│  Campaigns      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Confirm   │
│  (if allowed)   │
└─────────────────┘
```

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│    CUSTOMERS    │       │  PAYMENT_RECORDS│
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │
│ company_name    │  │    │ customer_id(FK) │──┐
│ contact_name    │  │    │ amount          │  │
│ email           │  │    │ due_date        │  │
│ phone           │  │    │ status          │  │
│ risk_level      │  │    │ invoice_number  │  │
│ do_not_contact  │  │    └─────────────────┘  │
└─────────────────┘  │                         │
         │           │    ┌─────────────────┐  │
         │           └───▶│   CAMPAIGNS     │◀─┘
         │                ├─────────────────┤
         │                │ id (PK)         │
         │                │ customer_id(FK) │
         │                │ payment_id (FK) │
         │                │ status          │
         │                │ escalation_steps│
         │                └────────┬────────┘
         │                         │
         │                         ▼
         │                ┌─────────────────┐
         │                │     TASKS       │
         │                ├─────────────────┤
         │                │ id (PK)         │
         │                │ campaign_id(FK) │
         │                │ type            │
         │                │ status          │
         │                │ scheduled_at    │
         │                └────────┬────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│ CONTACT_ATTEMPTS│       │   CALL_LOGS     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ customer_id(FK) │       │ task_id (FK)    │
│ channel         │       │ twilio_sid      │
│ outcome         │       │ duration        │
│ notes           │       │ recording_url   │
└─────────────────┘       │ transcript      │
                          └─────────────────┘
```

---

## Integration Points

### Taskade Integration

The API is designed for seamless Taskade integration via webhooks:

| Taskade Action | API Endpoint | Method |
|----------------|--------------|--------|
| Create Customer | `/api/v1/customers` | POST |
| Update Customer | `/api/v1/customers/:id` | PUT |
| Create Payment | `/api/v1/payments` | POST |
| Start Campaign | `/api/v1/campaigns` | POST |
| Trigger Call | `/api/v1/calls/outbound` | POST |
| Send SMS | `/api/v1/sms/send` | POST |
| Get Transcript | `/api/v1/calls/:id/transcript` | GET |
| Schedule Task | `/api/v1/tasks` | POST |

### Webhook Events (Outbound to Taskade)

Configure webhooks to receive real-time updates:

| Event | Payload |
|-------|---------|
| `call.completed` | Call details, duration, outcome |
| `call.transcribed` | Full transcription text |
| `sms.received` | Inbound SMS content |
| `payment.received` | Payment confirmation |
| `campaign.completed` | Campaign summary |
| `customer.opted_out` | Opt-out notification |

---

## Security & Compliance

### Authentication

- **JWT Tokens** - 15-minute access tokens
- **Refresh Tokens** - 7-day refresh cycle
- **API Keys** - For service-to-service calls

### Compliance Features

| Regulation | Implementation |
|------------|----------------|
| **TCPA** | Time-of-day restrictions, consent tracking |
| **Do-Not-Call** | DNC list checking before every contact |
| **Call Recording** | Disclosure and consent management |
| **Data Privacy** | PII encryption, audit logging |

### Data Security

- AES-256 encryption for sensitive data
- TLS 1.2+ for all connections
- Field-level encryption for PII
- Audit trail for all data access

---

## Deployment

### Railway Deployment

```bash
# Deploy to Railway
railway login
railway init
railway add postgresql
railway add redis
railway up
```

### Environment Variables

```bash
# Required
NODE_ENV=production
JWT_SECRET=<generated-secret>
DATABASE_URL=<auto-set-by-railway>
REDIS_URL=<auto-set-by-railway>

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Optional
OPENAI_API_KEY=sk-...
```

### Health Monitoring

- **Health Check:** `GET /api/v1/health`
- **Metrics:** `GET /api/v1/metrics`
- **Logs:** Railway dashboard

---

## Summary

Client Escalation Calls provides a complete backend infrastructure for AI-powered customer service and collection automation. When integrated with Taskade:

- **Taskade** handles: UI, workflows, business data, planning
- **This API** handles: Calls, SMS, emails, AI conversations, compliance

The combination creates a powerful, scalable customer outreach platform.
