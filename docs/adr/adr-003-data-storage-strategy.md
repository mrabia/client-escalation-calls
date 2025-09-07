# ADR-003: Data Storage Strategy for Multi-Agent Payment Collection System

## Status
**ACCEPTED** - January 15, 2024

## Context
The agentic AI payment collection system requires a comprehensive data storage strategy to handle:

- **Customer profiles and interaction history** with strong consistency requirements
- **High-volume communication logs** from email, phone, and SMS channels  
- **Real-time analytics and reporting** for business intelligence
- **Full-text search** across customer communications and documents
- **File storage** for contracts, recordings, and attachments
- **Compliance and audit requirements** with long-term retention
- **Multi-tenant architecture** with data isolation

The system must support:
- 100,000+ active customers per tenant
- 1M+ communications per day
- Real-time queries with sub-second response times
- 7+ year retention for compliance
- Global deployment with regional data residency

## Decision
We will implement a **polyglot persistence strategy** with specialized databases for different data patterns:

### 1. Primary Transactional Database: PostgreSQL 15+
- **Customer profiles, campaigns, and core business data**
- **Strong consistency and ACID compliance**
- **Row-level security for multi-tenancy**
- **JSON columns for flexible customer attributes**

### 2. Analytics Database: ClickHouse
- **High-volume communication events and metrics**
- **Columnar storage for analytical queries**
- **Real-time data ingestion and processing**
- **Time-series performance optimization**

### 3. Search Engine: Elasticsearch 8.x
- **Full-text search across communications**
- **Customer document indexing**
- **Real-time search and aggregations**
- **Multi-language search capabilities**

### 4. Cache Layer: Redis Cluster
- **Session storage and real-time state**
- **Frequently accessed customer contexts**
- **Rate limiting and throttling**
- **Message queues for agent coordination**

### 5. File Storage: S3-Compatible (MinIO)
- **Call recordings and email attachments**
- **Contract documents and invoices**
- **Template files and media assets**
- **Database backups and archives**

## Alternatives Considered

### Alternative 1: Single PostgreSQL Database
**Rejected** because:
- Poor performance for analytical queries on large datasets
- Limited scalability for time-series data
- Full-text search capabilities are insufficient
- Single point of failure for all data operations

### Alternative 2: MongoDB as Primary Database
**Rejected** because:
- Eventual consistency model unsuitable for financial data
- Complex transaction handling across collections
- Limited analytical query capabilities
- Less mature ecosystem for compliance and audit tools

### Alternative 3: Pure Cloud-Native (AWS RDS/DynamoDB)
**Rejected** because:
- Vendor lock-in concerns for global deployment
- Higher costs for high-volume scenarios
- Limited control over performance tuning
- Compliance requirements for on-premise deployment options

### Alternative 4: NewSQL Database (CockroachDB/TiDB)
**Rejected** because:
- Additional complexity without clear benefits for our use case
- Limited ecosystem and tooling maturity
- Higher operational overhead
- Overkill for current scale requirements

## Consequences

### Positive Consequences
✅ **Performance Optimization**: Each database optimized for its specific workload
✅ **Scalability**: Independent scaling of different data layers
✅ **Flexibility**: Freedom to choose best technology for each data pattern
✅ **Fault Isolation**: Failure in one system doesn't affect others
✅ **Cost Efficiency**: Optimized storage costs for different data types
✅ **Compliance**: Specialized tools for audit and retention management

### Negative Consequences
❌ **Operational Complexity**: Multiple database systems to manage
❌ **Data Consistency**: Complex synchronization between systems
❌ **Query Complexity**: Cross-system joins and data correlation
❌ **Monitoring Overhead**: Multiple systems to monitor and alert on
❌ **Backup Complexity**: Coordinated backup and recovery procedures

## Implementation Details

### PostgreSQL Configuration

#### Database Schema Design
```sql
-- Multi-tenant customer profiles with JSON attributes
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(255),
    profile_data JSONB NOT NULL DEFAULT '{}',
    payment_history JSONB NOT NULL DEFAULT '{}',
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Campaigns with escalation rules
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    configuration JSONB NOT NULL,
    escalation_rules JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Communication history with partitioning
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    campaign_id UUID REFERENCES campaigns(id),
    channel VARCHAR(50) NOT NULL, -- email, phone, sms
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    content JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions for communications
CREATE TABLE communications_y2024m01 
    PARTITION OF communications 
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### Performance Optimization
```sql
-- Optimized indexes for common queries
CREATE INDEX CONCURRENTLY idx_customers_tenant_email 
    ON customers (tenant_id, email) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_communications_customer_created 
    ON communications (customer_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_communications_campaign_status 
    ON communications (campaign_id, status, created_at DESC);

-- JSON indexes for flexible queries
CREATE INDEX CONCURRENTLY idx_customers_profile_data_gin 
    ON customers USING GIN (profile_data);

CREATE INDEX CONCURRENTLY idx_communications_content_gin 
    ON communications USING GIN (content);
```

#### Row-Level Security (RLS)
```sql
-- Enable RLS for multi-tenancy
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_customers ON customers
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_campaigns ON campaigns
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_communications ON communications
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### ClickHouse Configuration

#### Schema Design for Analytics
```sql
-- High-volume communication events
CREATE TABLE communication_events (
    event_id UUID,
    tenant_id UUID,
    customer_id UUID,
    campaign_id UUID,
    agent_id String,
    channel LowCardinality(String),
    event_type LowCardinality(String),
    timestamp DateTime64(3),
    duration_ms UInt32,
    success Boolean,
    error_code LowCardinality(String),
    metadata String,
    created_date Date MATERIALIZED toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY created_date
ORDER BY (tenant_id, customer_id, timestamp)
SETTINGS index_granularity = 8192;

-- Agent performance metrics
CREATE TABLE agent_metrics (
    tenant_id UUID,
    agent_id String,
    agent_type LowCardinality(String),
    metric_name LowCardinality(String),
    metric_value Float64,
    timestamp DateTime64(3),
    created_date Date MATERIALIZED toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY created_date
ORDER BY (tenant_id, agent_id, timestamp)
SETTINGS index_granularity = 8192;

-- Materialized views for real-time aggregations
CREATE MATERIALIZED VIEW campaign_performance_mv
TO campaign_performance
AS SELECT
    tenant_id,
    campaign_id,
    channel,
    toStartOfHour(timestamp) as hour,
    count() as total_events,
    countIf(success = true) as successful_events,
    avg(duration_ms) as avg_duration,
    quantile(0.95)(duration_ms) as p95_duration
FROM communication_events
GROUP BY tenant_id, campaign_id, channel, hour;
```

#### Data Pipeline Configuration
```yaml
Kafka to ClickHouse Pipeline:
  Connector: kafka-connect-clickhouse
  Topics: 
    - communication-events
    - agent-metrics
    - customer-interactions
  
  Batch Settings:
    - Batch Size: 10000 records
    - Batch Timeout: 30 seconds
    - Max Memory: 256MB
  
  Error Handling:
    - Dead Letter Queue: clickhouse-errors
    - Retry Count: 3
    - Backoff: Exponential
```

### Elasticsearch Configuration

#### Index Templates and Mappings
```json
{
  "index_patterns": ["communications-*"],
  "template": {
    "mappings": {
      "properties": {
        "tenant_id": {"type": "keyword"},
        "customer_id": {"type": "keyword"},
        "campaign_id": {"type": "keyword"},
        "channel": {"type": "keyword"},
        "direction": {"type": "keyword"},
        "subject": {
          "type": "text",
          "analyzer": "standard",
          "fields": {
            "keyword": {"type": "keyword"}
          }
        },
        "content": {
          "type": "text",
          "analyzer": "standard"
        },
        "timestamp": {"type": "date"},
        "metadata": {"type": "object"},
        "sentiment": {"type": "keyword"},
        "intent": {"type": "keyword"}
      }
    },
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "refresh_interval": "30s",
      "index.lifecycle.name": "communications-policy"
    }
  }
}
```

#### Index Lifecycle Management (ILM)
```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "10GB",
            "max_age": "7d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "searchable_snapshot": {
            "snapshot_repository": "cold-repository"
          }
        }
      },
      "delete": {
        "min_age": "2555d"
      }
    }
  }
}
```

### Redis Configuration

#### Cluster Setup
```yaml
Redis Cluster Configuration:
  Nodes: 6 (3 masters, 3 replicas)
  Memory per Node: 32GB
  Persistence: RDB + AOF
  Eviction Policy: allkeys-lru
  
Keyspace Design:
  Sessions: "session:{user_id}"
  Customer Context: "ctx:{customer_id}"
  Rate Limiting: "rate:{service}:{key}"
  Agent State: "agent:{agent_id}:state"
  
TTL Settings:
  Sessions: 24 hours
  Customer Context: 1 hour
  Rate Limiting: 1 minute
  Agent State: 5 minutes
```

#### Redis Modules
```yaml
RedisJSON:
  Use Case: Complex customer context objects
  Commands: JSON.GET, JSON.SET, JSON.DEL
  
RediSearch:
  Use Case: Real-time customer search
  Indexes: Customer profiles, recent communications
  
RedisTimeSeries:
  Use Case: Real-time metrics and monitoring
  Retention: 24 hours for detailed metrics
```

### MinIO File Storage Configuration

#### Bucket Strategy
```yaml
Bucket Organization:
  customer-documents:
    Purpose: Contracts, invoices, statements
    Encryption: Server-side (SSE-S3)
    Retention: 7 years
    Access: Private with signed URLs
  
  audio-recordings:
    Purpose: Phone call recordings
    Encryption: Server-side with customer keys
    Retention: 7 years (compliance)
    Access: Strict access controls
  
  email-attachments:
    Purpose: Email attachments with virus scanning
    Encryption: Server-side (SSE-S3)
    Retention: 3 years
    Access: Private with virus scanning
  
  templates:
    Purpose: Message templates and media
    Encryption: None (public templates)
    Retention: Indefinite
    Access: CDN distribution
```

#### Lifecycle Policies
```yaml
Lifecycle Rules:
  Hot Storage (0-90 days):
    Storage Class: Standard
    Access Pattern: Frequent
    
  Warm Storage (90-365 days):
    Storage Class: Infrequent Access
    Access Pattern: Occasional
    
  Cold Storage (365+ days):
    Storage Class: Glacier
    Access Pattern: Archive only
    
  Compliance Archive (7+ years):
    Storage Class: Deep Archive
    Access Pattern: Legal holds only
```

## Data Synchronization Strategy

### Real-time Synchronization
```yaml
PostgreSQL → ClickHouse:
  Method: CDC with Debezium
  Latency: < 5 seconds
  Tables: communications, customers, campaigns
  
PostgreSQL → Elasticsearch:
  Method: Logstash with JDBC input
  Latency: < 30 seconds
  Data: Communication content for search
  
Redis Cache Updates:
  Method: Application-level cache invalidation
  Triggers: Customer profile updates, preferences
  TTL: Dynamic based on usage patterns
```

### Batch Synchronization
```yaml
Analytics Pipeline:
  Schedule: Every 15 minutes
  Source: PostgreSQL transaction logs
  Destination: ClickHouse analytics tables
  
Search Index Updates:
  Schedule: Every hour
  Source: PostgreSQL communications
  Destination: Elasticsearch indexes
  Processing: Text extraction and NLP
```

## Backup and Recovery Strategy

### Backup Schedule
```yaml
PostgreSQL:
  Full Backup: Daily at 2 AM UTC
  Incremental: Every 6 hours
  WAL Archiving: Continuous to S3
  Retention: 90 days full, 1 year incremental
  
ClickHouse:
  Backup: Daily snapshots
  Retention: 30 days
  Recovery: Point-in-time from Kafka replay
  
Elasticsearch:
  Snapshots: Daily to S3 repository
  Retention: 60 days
  Cross-cluster replication: Real-time to DR site
  
Redis:
  RDB Snapshots: Every 6 hours
  AOF: Continuous
  Persistence: Both RDB and AOF enabled
```

### Disaster Recovery
```yaml
RTO (Recovery Time Objective): 15 minutes
RPO (Recovery Point Objective): 5 minutes

Recovery Procedures:
  Database Failover: Automatic with read replicas
  Cross-region Replication: Async for disaster recovery
  Data Consistency Checks: Automated validation
  Rollback Procedures: Documented for each component
```

## Compliance and Security

### Data Encryption
```yaml
Encryption at Rest:
  PostgreSQL: Transparent Data Encryption (TDE)
  ClickHouse: Disk-level encryption
  Elasticsearch: Index-level encryption
  MinIO: Server-side encryption with KMS
  
Encryption in Transit:
  TLS 1.3 for all database connections
  Certificate pinning for critical connections
  VPN tunnels for cross-region traffic
```

### Access Controls
```yaml
Database Access:
  Authentication: Certificate-based for services
  Authorization: Role-based with principle of least privilege
  Auditing: All access logged to SIEM
  
Data Classification:
  Public: Templates, documentation
  Internal: Analytics, performance metrics
  Confidential: Customer data, communications
  Restricted: Financial data, compliance records
```

### GDPR Compliance
```yaml
Data Subject Rights:
  Right to Access: API endpoints for data export
  Right to Rectification: Update APIs with audit trails
  Right to Erasure: Soft deletion with cleanup jobs
  Right to Portability: Standardized export formats
  
Data Processing:
  Lawful Basis: Contract performance, legitimate interest
  Consent Management: Granular consent tracking
  Data Minimization: Automated cleanup of unnecessary data
  Purpose Limitation: Clear data usage policies
```

## Success Metrics

### Performance Metrics
- **Query Response Time**: P95 < 100ms for customer lookups
- **Analytics Query**: P95 < 2 seconds for dashboard queries
- **Search Response**: P95 < 200ms for full-text search
- **Data Ingestion**: 10,000+ events/second sustained

### Reliability Metrics
- **Database Availability**: 99.99% uptime
- **Data Consistency**: Zero data loss for transactional data
- **Backup Success**: 100% backup completion rate
- **Recovery Time**: < 15 minutes for production systems

### Compliance Metrics
- **Audit Trail**: 100% of data access logged
- **Data Retention**: 100% compliance with retention policies
- **Encryption Coverage**: 100% of sensitive data encrypted
- **Access Control**: Zero unauthorized access incidents

## Review and Updates

This ADR will be reviewed:
- **Quarterly**: Performance and capacity planning reviews
- **Annually**: Technology stack evaluation and updates
- **After incidents**: Post-mortem analysis and improvements

**Next Review Date**: April 15, 2024

---
**Decision Makers**: Architecture Team, Data Engineering Team, Security Team
**Stakeholders**: Development Teams, Operations Team, Compliance Team, Legal Team