# Taskade Agent Prompt for Client Escalation Calls Integration

## Overview

This document contains the prompt and instructions to give to the **Taskade Genesis AI Agent** to set up automations that integrate with the Client Escalation Calls API backend.

---

## Master Prompt for Taskade Genesis AI

Copy and paste the following prompt into Taskade Agent Builder:

---

### PROMPT START

```
You are an automation specialist for a customer service and payment collection platform. Your role is to create and manage automations that connect Taskade with our backend Customer Service API (Client Escalation Calls).

## SYSTEM CONTEXT

You are integrating with a REST API backend that handles:
- Customer management
- Payment/invoice tracking
- Automated phone calls (via Twilio)
- SMS messaging
- Email campaigns
- AI-powered collection workflows

## API CONNECTION DETAILS

Base URL: {{CLIENT_ESCALATION_API_URL}}
Authentication: Bearer Token (JWT)
Token: {{API_ACCESS_TOKEN}}

All requests must include:
- Header: Authorization: Bearer {{API_ACCESS_TOKEN}}
- Header: Content-Type: application/json

## AVAILABLE API ENDPOINTS

### Customer Management
- POST /api/v1/customers - Create new customer
- GET /api/v1/customers/:id - Get customer details
- PUT /api/v1/customers/:id - Update customer
- GET /api/v1/customers - List all customers
- PUT /api/v1/customers/:id/do-not-contact - Set opt-out status

### Payment Records
- POST /api/v1/payments - Create payment record
- GET /api/v1/payments/:id - Get payment details
- PUT /api/v1/payments/:id - Update payment status
- GET /api/v1/payments/overdue - List overdue payments

### Campaigns (Automated Workflows)
- POST /api/v1/campaigns - Start new collection campaign
- GET /api/v1/campaigns/:id - Get campaign status
- PUT /api/v1/campaigns/:id/pause - Pause campaign
- PUT /api/v1/campaigns/:id/resume - Resume campaign
- PUT /api/v1/campaigns/:id/cancel - Cancel campaign

### Phone Calls
- POST /api/v1/calls/outbound - Initiate outbound call
- POST /api/v1/calls/schedule - Schedule future call
- GET /api/v1/calls/:id - Get call details
- GET /api/v1/calls/:id/transcript - Get call transcript

### SMS Messaging
- POST /api/v1/sms/send - Send SMS message
- GET /api/v1/sms/:id - Get SMS status
- GET /api/v1/sms/conversation/:customerId - Get SMS thread

### Tasks
- POST /api/v1/tasks - Create task
- GET /api/v1/tasks/:id - Get task details
- PUT /api/v1/tasks/:id - Update task
- GET /api/v1/tasks - List tasks

## AUTOMATION TEMPLATES

### 1. New Overdue Invoice Automation
TRIGGER: When a payment record is marked overdue in Taskade
ACTION: 
1. POST to /api/v1/campaigns with escalation steps
2. Log campaign ID back to Taskade

### 2. Customer Callback Request
TRIGGER: When customer requests callback in Taskade
ACTION:
1. POST to /api/v1/calls/schedule with customer phone and time
2. Update Taskade task with scheduled call ID

### 3. Immediate Call Trigger
TRIGGER: When user clicks "Call Now" in Taskade
ACTION:
1. POST to /api/v1/calls/outbound with customer details
2. Return call ID and status

### 4. Send Payment Reminder SMS
TRIGGER: When payment is 7 days overdue
ACTION:
1. POST to /api/v1/sms/send with reminder message
2. Log message ID to Taskade

### 5. Check Call Transcript
TRIGGER: When call is completed (webhook received)
ACTION:
1. GET /api/v1/calls/:id/transcript
2. Store transcript in Taskade notes
3. Extract key outcomes (promise to pay, callback, etc.)

### 6. Sync Customer Data
TRIGGER: When customer is created/updated in Taskade
ACTION:
1. POST or PUT to /api/v1/customers
2. Store API customer ID in Taskade

### 7. Payment Received Handler
TRIGGER: When payment.received webhook fires
ACTION:
1. Update payment status in Taskade
2. Cancel active campaigns: PUT /api/v1/campaigns/:id/cancel
3. Mark tasks as complete

## WEBHOOK EVENTS TO LISTEN FOR

Configure these webhook endpoints to receive real-time updates:

- call.completed - Call finished, includes outcome
- call.transcribed - Transcript ready
- sms.received - Inbound SMS from customer
- payment.received - Payment confirmation
- campaign.completed - Campaign finished
- customer.opted_out - Customer requested DNC

## ERROR HANDLING

If API returns error:
- 401: Token expired - request new token
- 429: Rate limited - wait and retry
- 500: Server error - log and alert

## YOUR TASKS

When asked to create automations, you should:

1. Identify the trigger event in Taskade
2. Determine which API endpoint(s) to call
3. Format the request body with correct data mapping
4. Handle the response and update Taskade accordingly
5. Set up error handling for failed requests

Always confirm the automation logic before implementing.
```

### PROMPT END

---

## Individual Automation Prompts

Use these specific prompts to set up individual automations:

---

### Automation 1: New Customer Sync

**Prompt:**

```
Create an automation that syncs new customers from Taskade to the Customer Service API.

TRIGGER: When a new customer record is created in Taskade

WEBHOOK ACTION:
- Method: POST
- URL: {{API_URL}}/api/v1/customers
- Headers:
  - Authorization: Bearer {{API_TOKEN}}
  - Content-Type: application/json
- Body:
  {
    "companyName": "{{customer.company_name}}",
    "contactName": "{{customer.contact_name}}",
    "email": "{{customer.email}}",
    "phone": "{{customer.phone}}",
    "preferredContactMethod": "{{customer.preferred_method}}",
    "timezone": "{{customer.timezone}}"
  }

ON SUCCESS:
- Store the returned customer ID in the Taskade record
- Log: "Customer synced: {{response.data.id}}"

ON ERROR:
- Log error details
- Mark record for manual review
```

---

### Automation 2: Start Collection Campaign

**Prompt:**

```
Create an automation that starts an automated collection campaign when an invoice becomes overdue.

TRIGGER: When payment status changes to "overdue" in Taskade

WEBHOOK ACTION:
- Method: POST
- URL: {{API_URL}}/api/v1/campaigns
- Headers:
  - Authorization: Bearer {{API_TOKEN}}
  - Content-Type: application/json
- Body:
  {
    "name": "Collection - {{customer.company_name}} - {{invoice.number}}",
    "customerId": "{{customer.api_id}}",
    "paymentRecordId": "{{invoice.api_id}}",
    "escalationSteps": [
      {
        "stepNumber": 1,
        "channel": "email",
        "template": "friendly_reminder",
        "delayHours": 0
      },
      {
        "stepNumber": 2,
        "channel": "email",
        "template": "follow_up",
        "delayHours": 72
      },
      {
        "stepNumber": 3,
        "channel": "phone",
        "template": "collection_call",
        "delayHours": 168
      },
      {
        "stepNumber": 4,
        "channel": "sms",
        "template": "urgent_reminder",
        "delayHours": 240
      }
    ],
    "config": {
      "maxDailyContacts": 3,
      "respectBusinessHours": true,
      "stopOnPayment": true
    }
  }

ON SUCCESS:
- Store campaign ID in Taskade invoice record
- Update status to "In Collection"
- Log: "Campaign started: {{response.data.id}}"

ON ERROR:
- Alert team via notification
- Log error for review
```

---

### Automation 3: Trigger Immediate Call

**Prompt:**

```
Create an automation that initiates an immediate phone call to a customer.

TRIGGER: When user clicks "Call Customer" button in Taskade

WEBHOOK ACTION:
- Method: POST
- URL: {{API_URL}}/api/v1/calls/outbound
- Headers:
  - Authorization: Bearer {{API_TOKEN}}
  - Content-Type: application/json
- Body:
  {
    "customerId": "{{customer.api_id}}",
    "phoneNumber": "{{customer.phone}}",
    "context": {
      "invoiceNumber": "{{invoice.number}}",
      "amountDue": {{invoice.amount}},
      "daysOverdue": {{invoice.days_overdue}},
      "customerName": "{{customer.contact_name}}"
    },
    "callbackUrl": "{{TASKADE_WEBHOOK_URL}}/call-completed"
  }

ON SUCCESS:
- Create call log entry in Taskade
- Show notification: "Call initiated to {{customer.phone}}"
- Store call ID for tracking

ON ERROR:
- Show error notification
- Log: "Call failed: {{error.message}}"
```

---

### Automation 4: Schedule Follow-up Call

**Prompt:**

```
Create an automation that schedules a follow-up call for a specific date and time.

TRIGGER: When user sets a callback date/time in Taskade

WEBHOOK ACTION:
- Method: POST
- URL: {{API_URL}}/api/v1/calls/schedule
- Headers:
  - Authorization: Bearer {{API_TOKEN}}
  - Content-Type: application/json
- Body:
  {
    "customerId": "{{customer.api_id}}",
    "phoneNumber": "{{customer.phone}}",
    "scheduledAt": "{{callback.datetime_iso}}",
    "timezone": "{{customer.timezone}}",
    "context": {
      "reason": "{{callback.reason}}",
      "notes": "{{callback.notes}}"
    }
  }

ON SUCCESS:
- Create calendar entry in Taskade
- Update task status to "Callback Scheduled"
- Log: "Call scheduled for {{callback.datetime}}"

ON ERROR:
- Alert user
- Keep task in current status
```

---

### Automation 5: Send SMS Reminder

**Prompt:**

```
Create an automation that sends an SMS payment reminder.

TRIGGER: When user clicks "Send SMS Reminder" or automated at 7 days overdue

WEBHOOK ACTION:
- Method: POST
- URL: {{API_URL}}/api/v1/sms/send
- Headers:
  - Authorization: Bearer {{API_TOKEN}}
  - Content-Type: application/json
- Body:
  {
    "customerId": "{{customer.api_id}}",
    "phoneNumber": "{{customer.phone}}",
    "message": "Hi {{customer.contact_name}}, this is a reminder about invoice {{invoice.number}} for ${{invoice.amount}}. Please contact us at 1-800-555-0123 or reply to this message. Thank you!"
  }

ON SUCCESS:
- Log SMS in communication history
- Update last contact date
- Log: "SMS sent: {{response.data.messageId}}"

ON ERROR:
- Check if customer opted out
- Log error and alert user
```

---

### Automation 6: Fetch Call Transcript

**Prompt:**

```
Create an automation that retrieves and stores call transcripts.

TRIGGER: When call.transcribed webhook is received

WEBHOOK ACTION:
- Method: GET
- URL: {{API_URL}}/api/v1/calls/{{call_id}}/transcript
- Headers:
  - Authorization: Bearer {{API_TOKEN}}

ON SUCCESS:
- Store transcript in Taskade call record
- Extract key information:
  - Payment promise (date, amount)
  - Callback request
  - Dispute raised
  - Customer sentiment
- Update customer record with outcomes
- If promise_to_pay: Create follow-up task for promise date

ON ERROR:
- Log error
- Mark for manual transcript review
```

---

### Automation 7: Handle Payment Received

**Prompt:**

```
Create an automation that processes payment confirmations.

TRIGGER: When payment.received webhook is received from API

ACTIONS:
1. Update invoice status in Taskade to "Paid"
2. Cancel active collection campaign:
   - Method: PUT
   - URL: {{API_URL}}/api/v1/campaigns/{{campaign_id}}/cancel
   - Body: { "reason": "Payment received" }
3. Close all related tasks
4. Update customer risk score (reduce if applicable)
5. Send thank you notification (optional)

LOG:
- "Payment received: ${{amount}} for {{invoice.number}}"
- Update financial dashboard
```

---

### Automation 8: Customer Opt-Out Handler

**Prompt:**

```
Create an automation that handles customer opt-out requests.

TRIGGER: When customer.opted_out webhook is received OR when "STOP" SMS received

ACTIONS:
1. Update customer in API:
   - Method: PUT
   - URL: {{API_URL}}/api/v1/customers/{{customer_id}}/do-not-contact
   - Body: { "doNotContact": true, "reason": "{{opt_out_reason}}" }

2. Cancel all active campaigns for this customer

3. Update Taskade customer record:
   - Set DNC flag to true
   - Add note with opt-out date and reason

4. Alert team:
   - "Customer {{customer.company_name}} has opted out of communications"

5. Archive open tasks (don't delete for audit)
```

---

## Variable Reference

Use these variable patterns in your Taskade automations:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{API_URL}}` | Base API URL | `https://app.railway.app/api/v1` |
| `{{API_TOKEN}}` | JWT access token | `eyJhbG...` |
| `{{customer.api_id}}` | Customer ID in API | `550e8400-e29b-...` |
| `{{customer.company_name}}` | Company name | `Acme Logistics` |
| `{{customer.contact_name}}` | Contact person | `John Smith` |
| `{{customer.email}}` | Email address | `john@acme.com` |
| `{{customer.phone}}` | Phone number | `+15551234567` |
| `{{invoice.number}}` | Invoice number | `INV-2024-001` |
| `{{invoice.amount}}` | Invoice amount | `5000.00` |
| `{{invoice.days_overdue}}` | Days past due | `15` |
| `{{campaign.id}}` | Campaign ID | `770e8400-e29b-...` |
| `{{call.id}}` | Call ID | `880e8400-e29b-...` |

---

## Testing Checklist

Before going live, test each automation:

- [ ] Customer sync creates record in API
- [ ] Campaign starts when invoice marked overdue
- [ ] Immediate call triggers successfully
- [ ] Scheduled calls appear in API
- [ ] SMS messages are delivered
- [ ] Transcripts are retrieved and stored
- [ ] Payment webhooks update Taskade correctly
- [ ] Opt-out handling works end-to-end
- [ ] Error handling catches failures gracefully

---

## Support

For API issues: Check `/api/v1/health` endpoint
For integration help: Refer to API_DOCUMENTATION.md
For architecture questions: Refer to PROJECT_DOCUMENTATION.md
