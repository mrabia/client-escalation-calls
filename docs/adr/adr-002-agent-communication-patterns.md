# ADR-002: Agent Communication Patterns and Protocols

## Status
**ACCEPTED** - January 15, 2024

## Context
The agentic AI payment collection system requires robust communication patterns between multiple autonomous agents (Email, Phone, SMS, Research) and coordination services. Key requirements:

- **Real-time coordination** between agents during multi-channel campaigns
- **State synchronization** across agents for consistent customer experience
- **Fault tolerance** to handle agent failures and network issues
- **Scalability** to support thousands of concurrent agent operations
- **Observability** for monitoring and debugging distributed agent behavior

## Decision
We will implement a **hybrid communication architecture** combining:

### 1. Message Broker Pattern (Apache Kafka + RabbitMQ)
- **Apache Kafka** for high-throughput event streaming and audit logs
- **RabbitMQ** for reliable task queues and direct agent coordination
- **Redis Streams** for real-time state synchronization

### 2. Agent Communication Protocols
- **Event-Driven Architecture** for loose coupling between agents
- **Command Query Responsibility Segregation (CQRS)** for read/write optimization
- **Saga Pattern** for distributed transaction management
- **Circuit Breaker Pattern** for fault tolerance

### 3. Message Types and Routing
```yaml
Event Messages (Kafka):
  - CustomerInteractionEvent
  - AgentStatusEvent
  - CampaignProgressEvent
  - ComplianceAuditEvent

Command Messages (RabbitMQ):
  - SendEmailCommand
  - MakePhoneCallCommand
  - SendSMSCommand
  - EscalateCustomerCommand

State Messages (Redis Streams):
  - AgentStateUpdate
  - CustomerContextUpdate
  - ConversationStateUpdate
```

## Alternatives Considered

### Alternative 1: Direct REST API Communication
**Rejected** because:
- Creates tight coupling between agents
- Synchronous communication blocks agent operations
- Difficult to implement circuit breakers and retries
- Limited scalability for high-volume scenarios
- No built-in message ordering guarantees

### Alternative 2: Pure Event Sourcing
**Rejected** because:
- Increased complexity for simple command operations
- Potential performance issues for real-time requirements
- Difficulty in implementing immediate consistency where needed
- Overkill for straightforward agent task distribution

### Alternative 3: gRPC-based Communication
**Rejected** because:
- Requires more complex service discovery
- Less flexibility in message routing
- Harder to implement async patterns
- Limited ecosystem for message brokers integration

### Alternative 4: Database-based Communication
**Rejected** because:
- Database becomes a bottleneck and single point of failure
- Polling-based approaches create unnecessary load
- Difficult to implement message ordering and delivery guarantees
- Poor scalability characteristics

## Consequences

### Positive Consequences
✅ **Loose Coupling**: Agents can be developed, deployed, and scaled independently
✅ **Fault Tolerance**: Message persistence and retry mechanisms
✅ **Scalability**: Horizontal scaling through partitioning and load balancing
✅ **Observability**: Built-in message tracing and monitoring capabilities
✅ **Flexibility**: Support for multiple communication patterns
✅ **Performance**: Optimized for both real-time and batch processing

### Negative Consequences
❌ **Increased Complexity**: Multiple message brokers and protocols to manage
❌ **Network Dependencies**: Potential single points of failure in message infrastructure
❌ **Message Ordering**: Complex ordering guarantees across multiple brokers
❌ **Debugging Difficulty**: Distributed traces across multiple messaging systems
❌ **Operational Overhead**: More infrastructure components to monitor and maintain

## Implementation Details

### Message Broker Configuration

#### Apache Kafka Setup
```yaml
Cluster Configuration:
  Brokers: 5 (for high availability)
  Replication Factor: 3
  Partitions: Based on customer ID hash
  Retention: 7 days for events, 30 days for audit logs

Topic Strategy:
  customer-events: Customer interaction events
  agent-metrics: Performance and health metrics  
  audit-logs: Compliance and security events
  campaign-events: Campaign lifecycle events

Consumer Groups:
  analytics-pipeline: Real-time analytics processing
  audit-processor: Compliance event processing
  notification-service: Real-time user notifications
```

#### RabbitMQ Setup
```yaml
Cluster Configuration:
  Nodes: 3 (for high availability)
  Virtual Hosts: Per-tenant isolation
  Queue Mirroring: All queues mirrored across nodes

Queue Strategy:
  email-tasks: Email sending tasks (durable)
  phone-tasks: Phone call tasks (priority queue)
  sms-tasks: SMS sending tasks (durable)
  escalation-tasks: Priority escalation tasks
  
Exchange Types:
  direct: Point-to-point agent commands
  topic: Broadcast notifications by pattern
  fanout: System-wide announcements
```

#### Redis Streams Configuration
```yaml
Stream Strategy:
  agent-states: Real-time agent status updates
  customer-context: Live customer interaction context
  conversation-threads: Ongoing conversation state
  
Consumer Groups:
  real-time-dashboard: Live UI updates
  agent-coordinator: Cross-agent coordination
  context-engine: Customer context aggregation

Retention:
  Max Length: 10,000 messages per stream
  TTL: 24 hours for real-time data
```

### Message Schemas

#### Agent Command Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "messageId": {"type": "string", "format": "uuid"},
    "messageType": {"enum": ["COMMAND"]},
    "timestamp": {"type": "string", "format": "date-time"},
    "source": {"type": "string"},
    "target": {"type": "string"},
    "command": {
      "type": "object",
      "properties": {
        "type": {"enum": ["SEND_EMAIL", "MAKE_CALL", "SEND_SMS", "ESCALATE"]},
        "campaignId": {"type": "string"},
        "customerId": {"type": "string"},
        "priority": {"enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]},
        "scheduledFor": {"type": "string", "format": "date-time"},
        "context": {"type": "object"},
        "retryPolicy": {
          "maxRetries": {"type": "integer"},
          "backoffStrategy": {"enum": ["FIXED", "EXPONENTIAL"]}
        }
      },
      "required": ["type", "campaignId", "customerId"]
    },
    "correlation": {
      "type": "object",
      "properties": {
        "conversationId": {"type": "string"},
        "workflowId": {"type": "string"},
        "parentMessageId": {"type": "string"}
      }
    }
  },
  "required": ["messageId", "messageType", "timestamp", "source", "target", "command"]
}
```

#### Agent Event Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "messageId": {"type": "string", "format": "uuid"},
    "messageType": {"enum": ["EVENT"]},
    "timestamp": {"type": "string", "format": "date-time"},
    "source": {"type": "string"},
    "event": {
      "type": "object",
      "properties": {
        "type": {"type": "string"},
        "campaignId": {"type": "string"},
        "customerId": {"type": "string"},
        "status": {"type": "string"},
        "metadata": {"type": "object"},
        "performance": {
          "responseTime": {"type": "number"},
          "memoryUsage": {"type": "number"},
          "cpuUsage": {"type": "number"}
        }
      },
      "required": ["type", "status"]
    },
    "correlation": {
      "type": "object",
      "properties": {
        "conversationId": {"type": "string"},
        "originalCommandId": {"type": "string"}
      }
    }
  },
  "required": ["messageId", "messageType", "timestamp", "source", "event"]
}
```

### Error Handling and Resilience

#### Retry Mechanisms
```yaml
Email Agent Retries:
  Max Attempts: 3
  Backoff: Exponential (1s, 4s, 16s)
  Dead Letter: email-failed-queue
  
Phone Agent Retries:
  Max Attempts: 2
  Backoff: Fixed (30s)
  Dead Letter: phone-failed-queue
  Fallback: Route to SMS agent

SMS Agent Retries:
  Max Attempts: 3
  Backoff: Linear (5s, 10s, 15s)
  Dead Letter: sms-failed-queue
```

#### Circuit Breaker Configuration
```yaml
Email Service Circuit Breaker:
  Failure Threshold: 50%
  Recovery Time: 60 seconds
  Half-Open Test Requests: 3
  
Phone Service Circuit Breaker:
  Failure Threshold: 30%
  Recovery Time: 30 seconds
  Half-Open Test Requests: 2
  
External API Circuit Breaker:
  Failure Threshold: 25%
  Recovery Time: 120 seconds
  Half-Open Test Requests: 5
```

### Monitoring and Observability

#### Message Tracing
```yaml
Trace Headers:
  - X-Trace-ID: End-to-end request tracing
  - X-Conversation-ID: Customer conversation tracking
  - X-Campaign-ID: Campaign execution tracking
  - X-Agent-ID: Agent instance identification

Distributed Tracing:
  - Jaeger for message flow visualization
  - OpenTelemetry for standardized instrumentation
  - Custom spans for business logic operations
```

#### Performance Metrics
```yaml
Message Broker Metrics:
  - Message throughput (messages/second)
  - Message latency (producer to consumer)
  - Queue depths and backlogs
  - Consumer lag and processing time

Agent Communication Metrics:
  - Command success/failure rates
  - Agent response times
  - Cross-agent coordination latency
  - Message ordering violations
```

## Security Considerations

### Message Encryption
```yaml
Transport Security:
  - TLS 1.3 for all broker connections
  - Client certificate authentication
  - Network segmentation and firewalls

Message Security:
  - Message-level encryption for sensitive data
  - Digital signatures for message integrity
  - Key rotation every 90 days
```

### Access Control
```yaml
Kafka Security:
  - SASL/SCRAM authentication
  - ACL-based topic authorization
  - Schema registry access control

RabbitMQ Security:
  - Username/password authentication
  - Virtual host isolation
  - Queue and exchange permissions

Redis Security:
  - AUTH password protection
  - TLS encryption for connections
  - Command renaming for security
```

## Migration Strategy

### Phase 1: Core Messaging Infrastructure
- Deploy Kafka cluster for event streaming
- Deploy RabbitMQ cluster for task queues
- Implement basic message schemas
- Set up monitoring and alerting

### Phase 2: Agent Integration
- Integrate Email agent with message brokers
- Implement command and event handling
- Add error handling and retries
- Deploy circuit breakers

### Phase 3: Advanced Patterns
- Implement Saga pattern for complex workflows
- Add Redis Streams for real-time state sync
- Implement distributed tracing
- Performance optimization and tuning

### Phase 4: Production Hardening
- Multi-region message broker setup
- Advanced monitoring and alerting
- Chaos engineering testing
- Disaster recovery procedures

## Success Metrics

### Reliability Metrics
- **Message Delivery**: 99.99% success rate
- **Agent Availability**: 99.9% uptime
- **Error Recovery**: < 30 seconds for transient failures
- **Data Consistency**: Zero message loss for critical operations

### Performance Metrics
- **Message Latency**: P95 < 100ms for commands
- **Throughput**: 10,000+ messages/second
- **Agent Response Time**: P95 < 2 seconds
- **Cross-Agent Coordination**: < 500ms latency

### Operational Metrics
- **Mean Time to Recovery**: < 5 minutes
- **False Positive Alerts**: < 5% of total alerts
- **Operational Overhead**: < 10% of development time
- **Documentation Coverage**: 100% of critical workflows

## Review and Updates

This ADR will be reviewed:
- **Monthly**: During architecture review meetings
- **Quarterly**: As part of system performance assessments
- **After Incidents**: To incorporate lessons learned

**Next Review Date**: February 15, 2024

---
**Decision Makers**: Architecture Team, Agent Development Teams, Infrastructure Team
**Stakeholders**: Development Teams, Operations Team, Product Management, Security Team