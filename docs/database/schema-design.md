# Database Schema Design

## Overview
This document describes the complete PostgreSQL database schema for the Client Escalation Calls system.

## Design Principles
1. **Normalization**: 3NF (Third Normal Form) for transactional data
2. **JSONB for flexibility**: Use JSONB for complex nested objects
3. **Audit trails**: Track created_at, updated_at for all tables
4. **Soft deletes**: Use deleted_at for important records
5. **Indexes**: Proper indexing for performance
6. **Foreign keys**: Enforce referential integrity

## Tables

### 1. customers
Stores customer/company information.

```sql
- id: UUID PRIMARY KEY
- company_name: VARCHAR(255) NOT NULL
- contact_name: VARCHAR(255) NOT NULL
- email: VARCHAR(255) NOT NULL UNIQUE
- phone: VARCHAR(50)
- mobile: VARCHAR(50)
- address: JSONB (street, city, state, zipCode, country)
- preferred_contact_method: VARCHAR(20) (email, phone, sms)
- tags: TEXT[] (array of tags)
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMP NOT NULL DEFAULT NOW()
- deleted_at: TIMESTAMP
```

### 2. customer_profiles
Stores behavioral analysis and risk assessment for customers.

```sql
- id: UUID PRIMARY KEY
- customer_id: UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE
- risk_level: VARCHAR(20) (low, medium, high, critical)
- risk_score: NUMERIC(5,2) (0-100)
- average_payment_delay: INTEGER (days)
- response_rate: NUMERIC(3,2) (0-1)
- preferred_contact_time_start: TIME
- preferred_contact_time_end: TIME
- timezone: VARCHAR(50)
- communication_style: VARCHAR(20) (formal, casual, direct, diplomatic)
- do_not_contact: BOOLEAN DEFAULT FALSE
- contact_restrictions: TEXT[] (channels to avoid)
- notes: TEXT[]
- last_contact_date: TIMESTAMP
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMP NOT NULL DEFAULT NOW()
```

### 3. payment_records
Stores invoice and payment information.

```sql
- id: UUID PRIMARY KEY
- customer_id: UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE
- amount: NUMERIC(12,2) NOT NULL
- currency: VARCHAR(3) NOT NULL DEFAULT 'USD'
- due_date: DATE NOT NULL
- paid_date: DATE
- status: VARCHAR(20) NOT NULL (pending, overdue, paid, partial, cancelled)
- invoice_number: VARCHAR(100) NOT NULL UNIQUE
- description: TEXT
- metadata: JSONB (additional invoice details)
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMP NOT NULL DEFAULT NOW()
```

### 4. agents
Stores agent registration and configuration.

```sql
- id: UUID PRIMARY KEY
- type: VARCHAR(20) NOT NULL (email, phone, sms, research)
- status: VARCHAR(20) NOT NULL (idle, active, busy, error, offline)
- capabilities: TEXT[] NOT NULL
- current_task_count: INTEGER DEFAULT 0
- max_concurrent_tasks: INTEGER NOT NULL DEFAULT 5
- working_hours_start: TIME
- working_hours_end: TIME
- timezone: VARCHAR(50) DEFAULT 'UTC'
- config: JSONB (agent-specific configuration)
- performance_metrics: JSONB (tasks_completed, success_rate, avg_response_time, etc.)
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMP NOT NULL DEFAULT NOW()
- last_active_at: TIMESTAMP
```

### 5. campaigns
Stores campaign definitions and execution state.

```sql
- id: UUID PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- description: TEXT
- customer_id: UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE
- payment_record_id: UUID REFERENCES payment_records(id) ON DELETE SET NULL
- status: VARCHAR(20) NOT NULL (draft, active, paused, completed, cancelled)
- escalation_steps: JSONB NOT NULL (array of escalation step definitions)
- current_step: INTEGER NOT NULL DEFAULT 0
- start_date: TIMESTAMP NOT NULL
- end_date: TIMESTAMP
- paused_until: TIMESTAMP
- results: JSONB (campaign performance metrics)
- config: JSONB (campaign configuration)
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMP NOT NULL DEFAULT NOW()
```

### 6. tasks
Stores individual tasks assigned to agents.

```sql
- id: UUID PRIMARY KEY
- type: VARCHAR(50) NOT NULL (send_email, make_call, send_sms, research_customer, escalate, follow_up)
- priority: VARCHAR(20) NOT NULL (low, medium, high, urgent)
- customer_id: UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE
- campaign_id: UUID REFERENCES campaigns(id) ON DELETE CASCADE
- payment_record_id: UUID REFERENCES payment_records(id) ON DELETE SET NULL
- status: VARCHAR(20) NOT NULL (pending, assigned, in_progress, completed, failed, cancelled)
- assigned_agent_id: UUID REFERENCES agents(id) ON DELETE SET NULL
- context: JSONB NOT NULL (task context and metadata)
- attempts: INTEGER DEFAULT 0
- max_attempts: INTEGER DEFAULT 3
- due_at: TIMESTAMP
- started_at: TIMESTAMP
- completed_at: TIMESTAMP
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMP NOT NULL DEFAULT NOW()
```

### 7. contact_attempts
Stores all communication attempts with customers.

```sql
- id: UUID PRIMARY KEY
- task_id: UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
- agent_id: UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE
- customer_id: UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE
- campaign_id: UUID REFERENCES campaigns(id) ON DELETE SET NULL
- channel: VARCHAR(20) NOT NULL (email, phone, sms)
- status: VARCHAR(20) NOT NULL (sent, delivered, opened, answered, replied, bounced, failed)
- timestamp: TIMESTAMP NOT NULL DEFAULT NOW()
- duration: INTEGER (seconds, for phone calls)
- response: TEXT (customer response if any)
- metadata: JSONB (channel-specific data: email_id, call_sid, sms_id, etc.)
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
```

### 8. templates
Stores communication templates.

```sql
- id: UUID PRIMARY KEY
- name: VARCHAR(100) NOT NULL UNIQUE
- type: VARCHAR(20) NOT NULL (email, sms, phone_script)
- channel: VARCHAR(20) NOT NULL (email, phone, sms)
- subject: VARCHAR(255) (for emails)
- content: TEXT NOT NULL
- html_content: TEXT (for emails)
- variables: TEXT[] (template variables)
- category: VARCHAR(50) (reminder, escalation, final_notice, etc.)
- is_active: BOOLEAN DEFAULT TRUE
- version: INTEGER DEFAULT 1
- created_by: VARCHAR(100)
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMP NOT NULL DEFAULT NOW()
```

### 9. audit_logs
Stores audit trail for compliance.

```sql
- id: UUID PRIMARY KEY
- entity_type: VARCHAR(50) NOT NULL (customer, campaign, task, agent, etc.)
- entity_id: UUID NOT NULL
- action: VARCHAR(50) NOT NULL (created, updated, deleted, status_changed, etc.)
- actor_type: VARCHAR(50) (agent, user, system)
- actor_id: VARCHAR(100)
- changes: JSONB (before/after values)
- metadata: JSONB (additional context)
- ip_address: INET
- user_agent: TEXT
- timestamp: TIMESTAMP NOT NULL DEFAULT NOW()
```

### 10. opt_outs
Stores customer opt-out preferences.

```sql
- id: UUID PRIMARY KEY
- customer_id: UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE
- channel: VARCHAR(20) NOT NULL (email, phone, sms, all)
- reason: TEXT
- opted_out_at: TIMESTAMP NOT NULL DEFAULT NOW()
- expires_at: TIMESTAMP (for temporary opt-outs)
- metadata: JSONB
- UNIQUE(customer_id, channel)
```

### 11. compliance_rules
Stores compliance rules and regulations.

```sql
- id: UUID PRIMARY KEY
- name: VARCHAR(100) NOT NULL UNIQUE
- description: TEXT
- rule_type: VARCHAR(50) NOT NULL (time_restriction, frequency_limit, channel_restriction, etc.)
- condition: JSONB NOT NULL (rule condition definition)
- action: VARCHAR(50) NOT NULL (block_contact, require_approval, log_warning, escalate)
- severity: VARCHAR(20) (low, medium, high, critical)
- is_enabled: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMP NOT NULL DEFAULT NOW()
```

### 12. system_metrics
Stores system performance metrics.

```sql
- id: UUID PRIMARY KEY
- metric_type: VARCHAR(50) NOT NULL (agent_utilization, task_throughput, success_rate, etc.)
- metric_name: VARCHAR(100) NOT NULL
- value: NUMERIC(12,4) NOT NULL
- dimensions: JSONB (tags/dimensions for grouping)
- timestamp: TIMESTAMP NOT NULL DEFAULT NOW()
```

## Indexes

### Performance Indexes
```sql
-- Customers
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_company_name ON customers(company_name);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at) WHERE deleted_at IS NULL;

-- Payment Records
CREATE INDEX idx_payment_records_customer_id ON payment_records(customer_id);
CREATE INDEX idx_payment_records_status ON payment_records(status);
CREATE INDEX idx_payment_records_due_date ON payment_records(due_date);
CREATE INDEX idx_payment_records_invoice_number ON payment_records(invoice_number);

-- Campaigns
CREATE INDEX idx_campaigns_customer_id ON campaigns(customer_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);

-- Tasks
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX idx_tasks_campaign_id ON tasks(campaign_id);
CREATE INDEX idx_tasks_assigned_agent_id ON tasks(assigned_agent_id);
CREATE INDEX idx_tasks_due_at ON tasks(due_at);
CREATE INDEX idx_tasks_type_status ON tasks(type, status);

-- Contact Attempts
CREATE INDEX idx_contact_attempts_customer_id ON contact_attempts(customer_id);
CREATE INDEX idx_contact_attempts_campaign_id ON contact_attempts(campaign_id);
CREATE INDEX idx_contact_attempts_timestamp ON contact_attempts(timestamp);
CREATE INDEX idx_contact_attempts_channel ON contact_attempts(channel);

-- Agents
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_status ON agents(status);

-- Audit Logs
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Opt Outs
CREATE INDEX idx_opt_outs_customer_id ON opt_outs(customer_id);

-- System Metrics
CREATE INDEX idx_system_metrics_type_timestamp ON system_metrics(metric_type, timestamp);
```

## Triggers

### Updated At Trigger
Automatically update `updated_at` timestamp on record modification.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_profiles_updated_at BEFORE UPDATE ON customer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (apply to all relevant tables)
```

## Migration Strategy

1. **Version 001**: Core tables (customers, payment_records, agents)
2. **Version 002**: Campaign and task tables
3. **Version 003**: Contact attempts and templates
4. **Version 004**: Audit logs and compliance
5. **Version 005**: System metrics and indexes
