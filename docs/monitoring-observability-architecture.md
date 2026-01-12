# Monitoring & Observability Architecture

## Overview

This document outlines a comprehensive monitoring and observability strategy for the client-escalation-calls application. The goal is to achieve **full visibility** into system health, performance, and business metrics with proactive alerting and debugging capabilities.

---

## Current State Analysis

### Existing Infrastructure
- ✅ Docker Compose includes Prometheus and Grafana
- ✅ Application exposes metrics port (9090)
- ⚠️ **No Prometheus configuration exists**
- ⚠️ **No Grafana dashboards configured**
- ⚠️ **No metrics instrumentation in code**
- ⚠️ **No alerting rules defined**
- ⚠️ **No log aggregation setup**
- ⚠️ **No distributed tracing**

### Monitoring Gaps
1. **Application Metrics**: Request rates, latency, errors
2. **Business Metrics**: Campaign success, payment collection, agent performance
3. **AI/LLM Metrics**: Token usage, costs, response times, quality
4. **Infrastructure Metrics**: CPU, memory, disk, network
5. **Database Metrics**: Query performance, connection pool, deadlocks
6. **Security Metrics**: Failed logins, rate limit hits, suspicious activity
7. **Compliance Metrics**: TCPA violations, opt-out requests, consent tracking

---

## Observability Stack

### The Three Pillars

```
┌─────────────────────────────────────────────────────┐
│                  OBSERVABILITY                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   METRICS   │  │    LOGS     │  │   TRACES   │ │
│  │             │  │             │  │            │ │
│  │ Prometheus  │  │ Elasticsearch│ │  Jaeger    │ │
│  │  Grafana    │  │   Kibana    │  │            │ │
│  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Metrics Collection** | Prometheus | Time-series metrics storage |
| **Metrics Visualization** | Grafana | Dashboards and alerts |
| **Application Metrics** | prom-client | Node.js Prometheus client |
| **Log Aggregation** | Elasticsearch | Centralized log storage |
| **Log Visualization** | Kibana | Log search and analysis |
| **Log Shipping** | Winston + Elasticsearch transport | Application logging |
| **Distributed Tracing** | Jaeger | Request tracing across services |
| **Tracing SDK** | OpenTelemetry | Instrumentation library |
| **Uptime Monitoring** | Uptime Kuma | Service availability checks |
| **Error Tracking** | Sentry | Error aggregation and alerting |

---

## Metrics Architecture

### Metrics Categories

#### 1. Application Metrics (RED Method)

**Rate**: Requests per second
```typescript
// HTTP request rate by endpoint and method
http_requests_total{method="POST", endpoint="/api/v1/campaigns", status="200"}

// HTTP request duration histogram
http_request_duration_seconds{method="POST", endpoint="/api/v1/campaigns"}
```

**Errors**: Error rate
```typescript
// HTTP errors by status code
http_errors_total{method="POST", endpoint="/api/v1/campaigns", status="500"}

// Application errors by type
app_errors_total{type="DatabaseError", severity="error"}
```

**Duration**: Response time
```typescript
// Request duration percentiles
http_request_duration_seconds{quantile="0.5"}  // p50
http_request_duration_seconds{quantile="0.95"} // p95
http_request_duration_seconds{quantile="0.99"} // p99
```

---

#### 2. Business Metrics (USE Method)

**Campaigns**
```typescript
// Campaign metrics
campaigns_total{status="active"}
campaigns_total{status="completed"}
campaigns_success_rate
campaigns_avg_duration_hours

// Task metrics
tasks_total{status="pending"}
tasks_total{status="in_progress"}
tasks_total{status="completed"}
tasks_completion_rate
```

**Payment Collection**
```typescript
// Payment metrics
payments_collected_total
payments_collected_amount_usd
payments_promised_total
payments_failed_total
payment_collection_rate

// Customer metrics
customers_contacted_total{channel="email"}
customers_contacted_total{channel="phone"}
customers_contacted_total{channel="sms"}
customers_responded_total
customer_response_rate
```

**Agent Performance**
```typescript
// Agent metrics
agent_tasks_completed_total{agent_id="123"}
agent_success_rate{agent_id="123"}
agent_avg_handling_time_seconds{agent_id="123"}
agent_utilization_rate{agent_id="123"}
```

---

#### 3. AI/LLM Metrics

**Token Usage**
```typescript
// Token consumption
llm_tokens_used_total{provider="openai", model="gpt-4"}
llm_tokens_used_total{provider="anthropic", model="claude-3.5-sonnet"}
llm_cost_usd_total{provider="openai"}
llm_cost_usd_total{provider="anthropic"}

// Budget tracking
llm_budget_remaining_usd
llm_budget_utilization_percent
```

**Performance**
```typescript
// LLM request metrics
llm_requests_total{provider="openai", status="success"}
llm_requests_total{provider="openai", status="error"}
llm_request_duration_seconds{provider="openai"}
llm_fallback_total{from="openai", to="anthropic"}
```

**Quality**
```typescript
// Response quality
llm_response_length_chars{provider="openai"}
llm_response_quality_score{provider="openai"}
llm_hallucination_detected_total
llm_retry_total{provider="openai", reason="rate_limit"}
```

---

#### 4. Memory System Metrics

**Embeddings**
```typescript
// Embedding generation
embeddings_generated_total
embeddings_cache_hits_total
embeddings_cache_misses_total
embeddings_generation_duration_seconds
```

**Vector Database (Qdrant)**
```typescript
// Qdrant operations
qdrant_vectors_stored_total
qdrant_search_requests_total
qdrant_search_duration_seconds
qdrant_search_results_count{quantile="0.95"}
```

**Memory Operations**
```typescript
// Short-term memory (Redis)
memory_short_term_sessions_active
memory_short_term_operations_total{operation="get"}
memory_short_term_operations_total{operation="set"}

// Long-term memory (PostgreSQL + Qdrant)
memory_long_term_episodes_stored_total
memory_long_term_semantic_memories_total
memory_consolidation_runs_total
memory_consolidation_duration_seconds
```

**Agentic RAG**
```typescript
// RAG operations
rag_queries_total
rag_retrieval_duration_seconds
rag_reasoning_steps_total{step="query_understanding"}
rag_reasoning_steps_total{step="synthesis"}
rag_accuracy_score
rag_learning_events_total
```

---

#### 5. Infrastructure Metrics (USE Method)

**Utilization**: How busy is the resource?
```typescript
// CPU utilization
process_cpu_usage_percent
node_cpu_seconds_total

// Memory utilization
process_resident_memory_bytes
node_memory_usage_bytes
```

**Saturation**: How much extra work is queued?
```typescript
// Event loop lag
nodejs_eventloop_lag_seconds

// Queue depth
queue_depth{queue="tasks"}
queue_depth{queue="emails"}
```

**Errors**: Error rate
```typescript
// System errors
system_errors_total{type="OutOfMemory"}
system_errors_total{type="DiskFull"}
```

---

#### 6. Database Metrics

**PostgreSQL**
```typescript
// Connection pool
db_connections_active
db_connections_idle
db_connections_waiting
db_pool_utilization_percent

// Query performance
db_query_duration_seconds{query="select_customer"}
db_query_duration_seconds{query="insert_payment"}
db_queries_total{status="success"}
db_queries_total{status="error"}

// Database health
db_deadlocks_total
db_slow_queries_total
db_table_size_bytes{table="customers"}
```

**Redis**
```typescript
// Redis operations
redis_commands_total{command="GET"}
redis_commands_total{command="SET"}
redis_command_duration_seconds{command="GET"}

// Redis health
redis_connected_clients
redis_memory_usage_bytes
redis_evicted_keys_total
redis_keyspace_hits_total
redis_keyspace_misses_total
```

**Qdrant**
```typescript
// Qdrant health
qdrant_collections_total
qdrant_vectors_total{collection="customer_interactions"}
qdrant_memory_usage_bytes
```

---

#### 7. Security Metrics

**Authentication**
```typescript
// Auth events
auth_login_attempts_total{status="success"}
auth_login_attempts_total{status="failed"}
auth_login_failures_by_user{user_id="123"}
auth_account_lockouts_total
auth_token_refreshes_total
auth_sessions_active
```

**Authorization**
```typescript
// Access control
authz_permission_checks_total{result="allowed"}
authz_permission_checks_total{result="denied"}
authz_permission_violations_total{resource="campaigns"}
```

**Rate Limiting**
```typescript
// Rate limit hits
rate_limit_hits_total{endpoint="/api/v1/campaigns"}
rate_limit_violations_total{ip="1.2.3.4"}
rate_limit_blocks_total
```

**Security Events**
```typescript
// Suspicious activity
security_suspicious_activity_total{type="brute_force"}
security_suspicious_activity_total{type="sql_injection"}
security_blocked_requests_total{reason="malicious_input"}
```

---

#### 8. TCPA Compliance Metrics

**Compliance Checks**
```typescript
// TCPA enforcement
tcpa_checks_total{result="allowed"}
tcpa_checks_total{result="blocked"}
tcpa_violations_prevented_total{reason="time_restriction"}
tcpa_violations_prevented_total{reason="frequency_limit"}
tcpa_violations_prevented_total{reason="opt_out"}
```

**Opt-Outs**
```typescript
// Opt-out tracking
tcpa_opt_outs_total{channel="phone"}
tcpa_opt_outs_total{channel="email"}
tcpa_opt_outs_total{channel="sms"}
tcpa_opt_out_requests_pending
```

**Contact Frequency**
```typescript
// Frequency tracking
tcpa_contact_attempts_today{customer_id="123", channel="phone"}
tcpa_frequency_limit_hits_total
```

---

## Prometheus Configuration

### File: `/config/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'client-escalation-calls'
    environment: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Load rules once and periodically evaluate them
rule_files:
  - '/etc/prometheus/rules/*.yml'

# Scrape configurations
scrape_configs:
  # Application metrics
  - job_name: 'client-escalation-calls'
    static_configs:
      - targets: ['client-escalation-calls:9090']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # PostgreSQL metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis metrics
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Node exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

---

## Alert Rules

### File: `/config/prometheus/rules/alerts.yml`

```yaml
groups:
  # Application alerts
  - name: application
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "P95 response time is {{ $value }}s (threshold: 2s)"

      # Service down
      - alert: ServiceDown
        expr: up{job="client-escalation-calls"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "The application has been down for more than 1 minute"

  # Business alerts
  - name: business
    interval: 1m
    rules:
      # Low campaign success rate
      - alert: LowCampaignSuccessRate
        expr: campaigns_success_rate < 0.3
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Low campaign success rate"
          description: "Campaign success rate is {{ $value | humanizePercentage }} (threshold: 30%)"

      # Low payment collection rate
      - alert: LowPaymentCollectionRate
        expr: payment_collection_rate < 0.2
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "Low payment collection rate"
          description: "Payment collection rate is {{ $value | humanizePercentage }} (threshold: 20%)"

  # LLM alerts
  - name: llm
    interval: 1m
    rules:
      # High LLM cost
      - alert: HighLLMCost
        expr: rate(llm_cost_usd_total[1h]) > 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High LLM costs detected"
          description: "LLM costs are ${{ $value }}/hour (threshold: $10/hour)"

      # LLM budget exceeded
      - alert: LLMBudgetExceeded
        expr: llm_budget_utilization_percent > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "LLM budget nearly exceeded"
          description: "LLM budget utilization is {{ $value }}% (threshold: 90%)"

      # High LLM error rate
      - alert: HighLLMErrorRate
        expr: rate(llm_requests_total{status="error"}[5m]) / rate(llm_requests_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High LLM error rate"
          description: "LLM error rate is {{ $value | humanizePercentage }} (threshold: 10%)"

  # Database alerts
  - name: database
    interval: 30s
    rules:
      # High connection pool utilization
      - alert: HighDatabaseConnectionPoolUtilization
        expr: db_pool_utilization_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection pool utilization"
          description: "Connection pool is {{ $value }}% full (threshold: 80%)"

      # Slow queries
      - alert: SlowQueries
        expr: rate(db_slow_queries_total[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "{{ $value }} slow queries per second (threshold: 1/s)"

      # Database deadlocks
      - alert: DatabaseDeadlocks
        expr: rate(db_deadlocks_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database deadlocks detected"
          description: "{{ $value }} deadlocks per second"

  # Security alerts
  - name: security
    interval: 1m
    rules:
      # Brute force attack
      - alert: BruteForceAttack
        expr: rate(auth_login_attempts_total{status="failed"}[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Potential brute force attack"
          description: "{{ $value }} failed login attempts per second (threshold: 10/s)"

      # High rate limit violations
      - alert: HighRateLimitViolations
        expr: rate(rate_limit_violations_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate limit violations"
          description: "{{ $value }} rate limit violations per second (threshold: 100/s)"

      # Suspicious activity
      - alert: SuspiciousActivity
        expr: rate(security_suspicious_activity_total[5m]) > 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Suspicious activity detected"
          description: "{{ $value }} suspicious events per second"

  # TCPA compliance alerts
  - name: compliance
    interval: 1m
    rules:
      # TCPA violations prevented
      - alert: TCPAViolationsPrevented
        expr: rate(tcpa_violations_prevented_total[1h]) > 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High number of TCPA violations prevented"
          description: "{{ $value }} TCPA violations prevented per hour (threshold: 10/hour)"

      # High opt-out rate
      - alert: HighOptOutRate
        expr: rate(tcpa_opt_outs_total[24h]) > 50
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "High opt-out rate"
          description: "{{ $value }} opt-outs in last 24 hours (threshold: 50)"

  # Infrastructure alerts
  - name: infrastructure
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: process_cpu_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}% (threshold: 80%)"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (process_resident_memory_bytes / node_memory_total_bytes) > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }} (threshold: 85%)"

      # Event loop lag
      - alert: HighEventLoopLag
        expr: nodejs_eventloop_lag_seconds > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High event loop lag"
          description: "Event loop lag is {{ $value }}s (threshold: 0.1s)"
```

---

## Grafana Dashboards

### Dashboard 1: Application Overview

**Panels**:
1. **Request Rate** (Graph)
   - Metric: `rate(http_requests_total[5m])`
   - Grouped by: endpoint, method

2. **Error Rate** (Graph)
   - Metric: `rate(http_errors_total[5m])`
   - Grouped by: endpoint, status

3. **Response Time** (Graph)
   - Metrics: P50, P95, P99
   - `histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))`

4. **Active Users** (Stat)
   - Metric: `auth_sessions_active`

5. **Uptime** (Stat)
   - Metric: `up{job="client-escalation-calls"}`

6. **Recent Errors** (Table)
   - Query: Recent error logs from Elasticsearch

---

### Dashboard 2: Business Metrics

**Panels**:
1. **Active Campaigns** (Stat)
   - Metric: `campaigns_total{status="active"}`

2. **Campaign Success Rate** (Gauge)
   - Metric: `campaigns_success_rate`

3. **Payments Collected Today** (Stat)
   - Metric: `increase(payments_collected_total[24h])`

4. **Payment Collection Rate** (Gauge)
   - Metric: `payment_collection_rate`

5. **Customer Contacts by Channel** (Pie Chart)
   - Metric: `customers_contacted_total`
   - Grouped by: channel

6. **Agent Performance** (Table)
   - Metrics: Tasks completed, success rate, avg handling time
   - Grouped by: agent_id

---

### Dashboard 3: AI/LLM Metrics

**Panels**:
1. **Token Usage by Provider** (Graph)
   - Metric: `rate(llm_tokens_used_total[5m])`
   - Grouped by: provider

2. **LLM Costs** (Graph)
   - Metric: `rate(llm_cost_usd_total[1h])`
   - Grouped by: provider

3. **Budget Utilization** (Gauge)
   - Metric: `llm_budget_utilization_percent`

4. **LLM Request Duration** (Graph)
   - Metric: `llm_request_duration_seconds`
   - Grouped by: provider

5. **LLM Error Rate** (Graph)
   - Metric: `rate(llm_requests_total{status="error"}[5m])`

6. **Provider Fallbacks** (Graph)
   - Metric: `rate(llm_fallback_total[5m])`

---

### Dashboard 4: Memory & RAG

**Panels**:
1. **Embeddings Generated** (Graph)
   - Metric: `rate(embeddings_generated_total[5m])`

2. **Embedding Cache Hit Rate** (Gauge)
   - Metric: `embeddings_cache_hits_total / (embeddings_cache_hits_total + embeddings_cache_misses_total)`

3. **Qdrant Search Performance** (Graph)
   - Metric: `qdrant_search_duration_seconds`

4. **Active Sessions** (Stat)
   - Metric: `memory_short_term_sessions_active`

5. **RAG Query Performance** (Graph)
   - Metric: `rag_retrieval_duration_seconds`

6. **Memory Consolidation** (Graph)
   - Metric: `rate(memory_consolidation_runs_total[1h])`

---

### Dashboard 5: Security & Compliance

**Panels**:
1. **Failed Login Attempts** (Graph)
   - Metric: `rate(auth_login_attempts_total{status="failed"}[5m])`

2. **Rate Limit Violations** (Graph)
   - Metric: `rate(rate_limit_violations_total[5m])`

3. **TCPA Violations Prevented** (Graph)
   - Metric: `rate(tcpa_violations_prevented_total[5m])`
   - Grouped by: reason

4. **Opt-Outs by Channel** (Bar Chart)
   - Metric: `tcpa_opt_outs_total`
   - Grouped by: channel

5. **Suspicious Activity** (Graph)
   - Metric: `rate(security_suspicious_activity_total[5m])`

6. **Permission Violations** (Table)
   - Recent authorization failures

---

### Dashboard 6: Infrastructure

**Panels**:
1. **CPU Usage** (Graph)
   - Metric: `process_cpu_usage_percent`

2. **Memory Usage** (Graph)
   - Metric: `process_resident_memory_bytes`

3. **Event Loop Lag** (Graph)
   - Metric: `nodejs_eventloop_lag_seconds`

4. **Database Connections** (Graph)
   - Metrics: Active, idle, waiting

5. **Redis Operations** (Graph)
   - Metric: `rate(redis_commands_total[5m])`
   - Grouped by: command

6. **Disk Usage** (Gauge)
   - Metric: `node_filesystem_usage_percent`

---

## Logging Strategy

### Log Levels

```typescript
enum LogLevel {
  ERROR = 'error',   // System errors, exceptions
  WARN = 'warn',     // Warning conditions
  INFO = 'info',     // Informational messages
  HTTP = 'http',     // HTTP requests
  DEBUG = 'debug',   // Debug information
}
```

### Log Structure (JSON)

```json
{
  "timestamp": "2026-01-09T12:34:56.789Z",
  "level": "info",
  "message": "Campaign created successfully",
  "context": {
    "service": "campaign-service",
    "userId": "user_123",
    "campaignId": "campaign_456",
    "action": "create_campaign"
  },
  "metadata": {
    "requestId": "req_789",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "duration": 145
  }
}
```

### Winston Configuration

```typescript
// src/utils/logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esTransport = new ElasticsearchTransport({
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL,
  },
  index: 'client-escalation-calls',
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'client-escalation-calls',
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // File output
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
    // Elasticsearch
    esTransport,
  ],
});
```

### Log Categories

1. **HTTP Requests**: All API requests/responses
2. **Database Operations**: Queries, transactions, errors
3. **LLM Interactions**: Requests, responses, costs
4. **Agent Actions**: Email sent, call made, SMS sent
5. **Security Events**: Auth failures, suspicious activity
6. **TCPA Events**: Opt-outs, violations prevented
7. **Errors**: All exceptions and errors
8. **Business Events**: Campaign created, payment collected

---

## Distributed Tracing

### OpenTelemetry Setup

```typescript
// src/utils/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-redis': {
        enabled: true,
      },
    }),
  ],
});

sdk.start();
```

### Trace Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('client-escalation-calls');

async function processPayment(paymentId: string) {
  const span = tracer.startSpan('process_payment');
  
  try {
    span.setAttribute('payment.id', paymentId);
    
    // Business logic
    const result = await paymentService.process(paymentId);
    
    span.setAttribute('payment.status', result.status);
    span.setStatus({ code: SpanStatusCode.OK });
    
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

---

## Error Tracking (Sentry)

### Sentry Configuration

```typescript
// src/utils/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
});

// Error handler middleware
export const sentryErrorHandler = Sentry.Handlers.errorHandler();
```

### Error Context

```typescript
Sentry.captureException(error, {
  user: {
    id: userId,
    email: userEmail,
  },
  tags: {
    campaign_id: campaignId,
    agent_type: 'email',
  },
  extra: {
    customer_id: customerId,
    payment_amount: amount,
  },
});
```

---

## Uptime Monitoring

### Uptime Kuma Setup

**Monitors**:
1. **Application Health** - `https://api.example.com/health`
2. **Database** - PostgreSQL connection check
3. **Redis** - Redis ping check
4. **Qdrant** - Qdrant health check
5. **External APIs** - Twilio, OpenAI, etc.

**Check Intervals**: 60 seconds  
**Notification Channels**: Email, Slack, PagerDuty

---

## Implementation Plan

### Phase 1: Metrics Instrumentation (Week 1)

**Day 1-2: Setup**
- Install dependencies (`prom-client`, `winston`, `@opentelemetry/sdk-node`)
- Create metrics registry
- Configure Prometheus client
- Set up Winston logger

**Day 3-4: Application Metrics**
- HTTP request metrics (RED)
- Error tracking
- Response time histograms
- Custom business metrics

**Day 5: Infrastructure Metrics**
- Node.js metrics (CPU, memory, event loop)
- Database metrics (PostgreSQL, Redis)
- Qdrant metrics

---

### Phase 2: Dashboards & Alerts (Week 2)

**Day 1-2: Prometheus Configuration**
- Write `prometheus.yml`
- Define scrape configs
- Create alert rules
- Test metric collection

**Day 3-5: Grafana Dashboards**
- Create 6 core dashboards
- Configure data sources
- Set up dashboard variables
- Add annotations

---

### Phase 3: Logging & Tracing (Week 3)

**Day 1-2: Centralized Logging**
- Configure Elasticsearch
- Set up Winston transports
- Implement structured logging
- Create log retention policies

**Day 3-4: Distributed Tracing**
- Set up Jaeger
- Configure OpenTelemetry
- Add custom spans
- Test trace propagation

**Day 5: Error Tracking**
- Set up Sentry
- Configure error handlers
- Add context to errors
- Test error reporting

---

### Phase 4: Uptime & Alerting (Week 4)

**Day 1-2: Uptime Monitoring**
- Deploy Uptime Kuma
- Configure monitors
- Set up notification channels
- Test alerts

**Day 3-5: Alert Refinement**
- Test all alert rules
- Adjust thresholds
- Configure escalation policies
- Document runbooks

---

## Success Metrics

### Observability Goals
- ✅ **100% service visibility** - All critical paths instrumented
- ✅ **< 5 minute MTTD** (Mean Time To Detect)
- ✅ **< 15 minute MTTR** (Mean Time To Resolve)
- ✅ **99.9% uptime** monitoring
- ✅ **< 1% false positive** alert rate

### Monitoring Coverage
- ✅ **Application**: 100% of endpoints
- ✅ **Business**: 100% of critical metrics
- ✅ **Infrastructure**: 100% of resources
- ✅ **Security**: 100% of security events
- ✅ **Compliance**: 100% of TCPA events

---

## Best Practices

### Metrics
1. **Use consistent naming** (e.g., `component_metric_unit`)
2. **Add labels** for dimensions (e.g., endpoint, method, status)
3. **Use histograms** for latency metrics
4. **Use counters** for event counts
5. **Use gauges** for current values

### Logging
1. **Use structured logging** (JSON format)
2. **Include context** (user ID, request ID, etc.)
3. **Mask sensitive data** (PII, passwords, tokens)
4. **Use appropriate log levels**
5. **Correlate logs with traces**

### Alerting
1. **Alert on symptoms**, not causes
2. **Set realistic thresholds**
3. **Include actionable information**
4. **Avoid alert fatigue**
5. **Document runbooks**

---

## Cost Estimation

### Monthly Costs (Medium Scale)

| Service | Cost | Notes |
|---------|------|-------|
| Prometheus | $0 | Self-hosted |
| Grafana | $0 | Self-hosted |
| Elasticsearch | $50-100 | Self-hosted (storage) |
| Jaeger | $0 | Self-hosted |
| Sentry | $26-99 | SaaS (10K-100K events/month) |
| Uptime Kuma | $0 | Self-hosted |
| **Total** | **$76-199/month** | |

**vs. Managed Services**: $500-2,000/month (70-90% savings)

---

## Next Steps

1. **Week 1**: Implement metrics instrumentation
2. **Week 2**: Create Prometheus config and Grafana dashboards
3. **Week 3**: Set up logging and tracing
4. **Week 4**: Configure uptime monitoring and alerts
5. **Week 5**: Test, refine, and document

---

**Status**: 📋 Planning Complete  
**Next Action**: Begin implementation with metrics instrumentation  
**Estimated Completion**: 4-5 weeks from start
