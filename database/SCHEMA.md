# Database Schema Overview

## Entity Relationship Diagram (Text-based)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     users       │     │    customers     │     │     agents      │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)          │     │ id (PK)         │
│ email           │     │ company_name     │     │ type            │
│ password_hash   │     │ contact_name     │     │ status          │
│ role            │     │ email            │     │ capabilities[]  │
│ is_active       │     │ phone            │     │ config (JSONB)  │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │              ┌────────┴─────────┐              │
         │              │                  │              │
         ▼              ▼                  ▼              ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│ user_sessions   │  │ customer_profiles│  │      tasks          │
├─────────────────┤  ├──────────────────┤  ├─────────────────────┤
│ id (PK)         │  │ id (PK)          │  │ id (PK)             │
│ user_id (FK)    │  │ customer_id (FK) │  │ customer_id (FK)    │
│ session_token   │  │ risk_level       │  │ campaign_id (FK)    │
│ expires_at      │  │ risk_score       │  │ assigned_agent (FK) │
└─────────────────┘  │ do_not_contact   │  │ status              │
                     └──────────────────┘  │ type                │
                              │            └──────────┬──────────┘
                              │                       │
                              ▼                       ▼
                     ┌──────────────────┐  ┌─────────────────────┐
                     │ payment_records  │  │  contact_attempts   │
                     ├──────────────────┤  ├─────────────────────┤
                     │ id (PK)          │  │ id (PK)             │
                     │ customer_id (FK) │  │ task_id (FK)        │
                     │ amount           │  │ agent_id (FK)       │
                     │ status           │  │ customer_id (FK)    │
                     │ invoice_number   │  │ channel             │
                     └────────┬─────────┘  │ status              │
                              │            └─────────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │    campaigns     │
                     ├──────────────────┤
                     │ id (PK)          │
                     │ customer_id (FK) │
                     │ payment_id (FK)  │
                     │ status           │
                     │ escalation_steps │
                     └──────────────────┘
```

## Table Categories

### Authentication & Authorization
| Table | Description | Key Fields |
|-------|-------------|------------|
| `users` | System users | email, role, is_active |
| `user_sessions` | Active sessions | user_id, session_token, expires_at |
| `password_reset_tokens` | Reset tokens | user_id, token, expires_at |
| `api_keys` | API access keys | key_hash, scopes, rate_limit |
| `role_permissions` | RBAC permissions | role, resource, action |

### Customer Management
| Table | Description | Key Fields |
|-------|-------------|------------|
| `customers` | Customer records | company_name, email, phone |
| `customer_profiles` | Risk & behavior | risk_level, risk_score, do_not_contact |
| `payment_records` | Invoices/payments | amount, due_date, status |
| `opt_outs` | Channel preferences | customer_id, channel, reason |

### Workflow & Tasks
| Table | Description | Key Fields |
|-------|-------------|------------|
| `campaigns` | Collection campaigns | customer_id, status, escalation_steps |
| `tasks` | Agent tasks | type, priority, status, assigned_agent_id |
| `agents` | AI agents | type, status, capabilities |

### Communication
| Table | Description | Key Fields |
|-------|-------------|------------|
| `contact_attempts` | Contact history | channel, status, timestamp |
| `templates` | Message templates | type, channel, content, variables |
| `email_deliveries` | Email tracking | message_id, status, opened_at |
| `email_bounces` | Bounce records | bounce_type, email_address |
| `email_suppressions` | Blocked emails | email_address, reason |
| `email_links` | Link tracking | tracking_url, click_count |

### Compliance & Audit
| Table | Description | Key Fields |
|-------|-------------|------------|
| `audit_logs` | Audit trail | entity_type, action, actor_id |
| `compliance_rules` | Regulatory rules | rule_type, condition, action |

### Analytics & Metrics
| Table | Description | Key Fields |
|-------|-------------|------------|
| `system_metrics` | Performance metrics | metric_type, value, dimensions |
| `llm_usage_logs` | LLM API usage | provider, tokens, cost |
| `llm_budget_limits` | Budget controls | scope, limit_amount |
| `llm_cache` | Response cache | cache_key, response_text |
| `campaign_email_stats` | Email analytics | campaign_id, open_rate, click_rate |

## Key Relationships

```sql
-- Customer → Profile (1:1)
customer_profiles.customer_id → customers.id

-- Customer → Payments (1:N)
payment_records.customer_id → customers.id

-- Customer → Campaigns (1:N)
campaigns.customer_id → customers.id

-- Campaign → Tasks (1:N)
tasks.campaign_id → campaigns.id

-- Task → Agent (N:1)
tasks.assigned_agent_id → agents.id

-- Task → Contact Attempts (1:N)
contact_attempts.task_id → tasks.id

-- User → Sessions (1:N)
user_sessions.user_id → users.id

-- Email Delivery → Campaign (N:1)
email_deliveries.campaign_id → campaigns.id
```

## Indexes Summary

### High-Priority Indexes (Query Performance)
- `customers(email)` - Login/lookup
- `payment_records(status, due_date)` - Overdue queries
- `tasks(status, due_at)` - Task queue
- `campaigns(status)` - Active campaigns
- `email_deliveries(status, next_retry_at)` - Retry queue

### Foreign Key Indexes
All foreign keys are indexed for JOIN performance.

### Partial Indexes
- `users(is_active) WHERE is_active = TRUE`
- `tasks(status, due_at) WHERE status IN ('pending', 'assigned')`
- `email_deliveries(next_retry_at) WHERE status IN ('failed', 'soft_bounce')`

## Database Functions

| Function | Purpose |
|----------|---------|
| `update_updated_at_column()` | Auto-update timestamps |
| `check_opt_out_status(customer, channel)` | Check opt-out |
| `log_audit_event(...)` | Create audit entry |
| `calculate_customer_risk_score(customer)` | Dynamic risk |
| `check_permission(role, resource, action)` | RBAC check |
| `clean_expired_sessions()` | Session cleanup |
| `clean_expired_llm_cache()` | Cache cleanup |
| `is_email_suppressed(email)` | Suppression check |
| `update_campaign_email_stats(campaign, date)` | Stats refresh |

## Production Considerations

### Partitioning Candidates
- `audit_logs` - Partition by month
- `system_metrics` - Partition by week
- `email_deliveries` - Partition by month
- `llm_usage_logs` - Partition by month

### Archival Strategy
```sql
-- Archive old audit logs (>1 year)
-- Archive completed campaigns (>6 months)
-- Archive email deliveries (>3 months)
```

### Backup Priority
1. **Critical**: users, customers, payment_records
2. **Important**: campaigns, tasks, templates
3. **Recoverable**: metrics, cache, logs
