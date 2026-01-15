# Integration Testing Strategy

## Overview

This document outlines a comprehensive integration testing strategy for the client-escalation-calls application. The goal is to achieve **80% code coverage** with a focus on critical business workflows, AI agent interactions, memory systems, and security features.

---

## Current State Analysis

### Existing Infrastructure
- ✅ Jest configured with TypeScript support
- ✅ Test directory structure created (`tests/` with subdirectories)
- ✅ CI/CD pipeline with test execution
- ⚠️ **No test files currently exist** (0% coverage)
- ⚠️ Mock factories not yet implemented
- ⚠️ Test database setup incomplete

### Testing Gaps
1. **Core Workflows**: Campaign creation, task assignment, agent coordination
2. **AI/LLM Integration**: Multi-provider switching, token management, error handling
3. **Memory System**: RAG retrieval, memory consolidation, embedding generation
4. **Security**: Authentication, authorization, TCPA compliance, encryption
5. **Agent Logic**: Email/Phone/SMS agents with memory integration
6. **Database Operations**: Migrations, transactions, data integrity
7. **API Endpoints**: Request/response validation, error handling
8. **External Services**: Twilio, email, Qdrant integration

---

## Testing Architecture

### Test Pyramid

```
                    /\
                   /  \
                  / E2E \          10% - End-to-End Tests
                 /------\
                /        \
               / Integration\      30% - Integration Tests
              /------------\
             /              \
            /   Unit Tests   \     60% - Unit Tests
           /------------------\
```

### Test Categories

#### 1. Unit Tests (60% of tests)
- **Purpose**: Test individual functions and classes in isolation
- **Scope**: Services, utilities, helpers, validators
- **Target**: 80-90% coverage of business logic
- **Duration**: < 5 seconds total

#### 2. Integration Tests (30% of tests)
- **Purpose**: Test interactions between components
- **Scope**: Database operations, API endpoints, service integration
- **Target**: 70-80% coverage of critical paths
- **Duration**: < 30 seconds total

#### 3. End-to-End Tests (10% of tests)
- **Purpose**: Test complete user workflows
- **Scope**: Campaign lifecycle, agent workflows, payment collection
- **Target**: 100% coverage of critical user journeys
- **Duration**: < 2 minutes total

---

## Priority Test Suites

### Phase 1: Critical Path Tests (Week 1)

#### 1.1 Authentication & Authorization Tests
**Priority**: 🔴 Critical  
**Estimated Time**: 4-6 hours  
**Files**: 3 test files

```typescript
// tests/integration/auth/authentication.test.ts
describe('Authentication', () => {
  describe('User Registration', () => {
    it('should register new user with valid data')
    it('should hash password securely')
    it('should reject duplicate email')
    it('should validate email format')
    it('should enforce password requirements')
  })

  describe('User Login', () => {
    it('should login with valid credentials')
    it('should return JWT token')
    it('should reject invalid credentials')
    it('should handle account lockout after failed attempts')
    it('should refresh expired tokens')
  })

  describe('Session Management', () => {
    it('should create session on login')
    it('should invalidate session on logout')
    it('should handle concurrent sessions')
    it('should expire sessions after timeout')
  })
})

// tests/integration/auth/authorization.test.ts
describe('Authorization (RBAC)', () => {
  describe('Role-Based Access', () => {
    it('should allow admin full access')
    it('should restrict agent to assigned campaigns')
    it('should prevent viewer from modifying data')
    it('should enforce manager permissions')
  })

  describe('Resource Permissions', () => {
    it('should check permissions before operations')
    it('should deny unauthorized access')
    it('should log permission violations')
  })
})
```

**Test Data Requirements**:
- User fixtures with different roles
- JWT token generation utilities
- Session mock data

---

#### 1.2 Database Integration Tests
**Priority**: 🔴 Critical  
**Estimated Time**: 6-8 hours  
**Files**: 5 test files

```typescript
// tests/integration/database/migrations.test.ts
describe('Database Migrations', () => {
  it('should run all migrations successfully')
  it('should rollback migrations correctly')
  it('should maintain data integrity during migration')
  it('should handle migration conflicts')
})

// tests/integration/database/customers.test.ts
describe('Customer Operations', () => {
  describe('CRUD Operations', () => {
    it('should create customer with valid data')
    it('should retrieve customer by ID')
    it('should update customer information')
    it('should soft delete customer')
    it('should enforce unique constraints')
  })

  describe('Relationships', () => {
    it('should link customer to payments')
    it('should track contact attempts')
    it('should maintain audit trail')
  })
})

// tests/integration/database/campaigns.test.ts
describe('Campaign Operations', () => {
  it('should create campaign with configuration')
  it('should assign agents to campaign')
  it('should track campaign metrics')
  it('should handle campaign lifecycle')
  it('should enforce business rules')
})

// tests/integration/database/transactions.test.ts
describe('Database Transactions', () => {
  it('should commit successful transactions')
  it('should rollback failed transactions')
  it('should handle concurrent updates')
  it('should prevent race conditions')
})
```

**Test Data Requirements**:
- Database seeding scripts
- Transaction test utilities
- Rollback helpers

---

#### 1.3 LLM Integration Tests
**Priority**: 🟡 High  
**Estimated Time**: 8-10 hours  
**Files**: 6 test files

```typescript
// tests/integration/llm/multi-provider.test.ts
describe('LLM Multi-Provider', () => {
  describe('Provider Selection', () => {
    it('should use OpenAI by default')
    it('should fallback to Anthropic on failure')
    it('should use Google AI as tertiary option')
    it('should track provider usage')
  })

  describe('Error Handling', () => {
    it('should retry on rate limit')
    it('should fallback on provider error')
    it('should handle timeout gracefully')
    it('should log all failures')
  })
})

// tests/integration/llm/email-generation.test.ts
describe('Email Generation Service', () => {
  it('should generate personalized email')
  it('should use customer context')
  it('should respect tone settings')
  it('should include payment details')
  it('should handle template variables')
  it('should validate output format')
})

// tests/integration/llm/conversation.test.ts
describe('Conversation Service', () => {
  it('should maintain conversation context')
  it('should generate contextual responses')
  it('should handle multi-turn conversations')
  it('should track sentiment changes')
  it('should escalate when needed')
})

// tests/integration/llm/token-management.test.ts
describe('Token Management', () => {
  describe('Token Tracking', () => {
    it('should count tokens accurately')
    it('should track costs per provider')
    it('should enforce budget limits')
    it('should persist token usage')
  })

  describe('State Persistence', () => {
    it('should save state to Redis')
    it('should persist to PostgreSQL')
    it('should recover from Redis failure')
    it('should handle concurrent updates')
  })
})
```

**Test Data Requirements**:
- Mock LLM responses
- Customer conversation history
- Token usage fixtures

---

### Phase 2: Memory & Agent Tests (Week 2)

#### 2.1 Memory System Tests
**Priority**: 🟡 High  
**Estimated Time**: 10-12 hours  
**Files**: 7 test files

```typescript
// tests/integration/memory/embedding-service.test.ts
describe('Embedding Service', () => {
  describe('Embedding Generation', () => {
    it('should generate embeddings for text')
    it('should use LRU cache for duplicates')
    it('should batch multiple requests')
    it('should handle large text chunks')
  })

  describe('Cache Management', () => {
    it('should cache embeddings')
    it('should evict old entries')
    it('should handle cache misses')
  })
})

// tests/integration/memory/qdrant-service.test.ts
describe('Qdrant Service', () => {
  describe('Vector Operations', () => {
    it('should store vectors in Qdrant')
    it('should search by similarity')
    it('should filter by metadata')
    it('should handle batch operations')
    it('should update existing vectors')
    it('should delete vectors')
  })

  describe('Collection Management', () => {
    it('should create collections')
    it('should configure vector dimensions')
    it('should handle collection errors')
  })
})

// tests/integration/memory/short-term-memory.test.ts
describe('Short-Term Memory', () => {
  describe('Session Management', () => {
    it('should store session data in Redis')
    it('should retrieve session by ID')
    it('should expire sessions after TTL')
    it('should update session data')
  })

  describe('Context Tracking', () => {
    it('should track conversation context')
    it('should maintain interaction history')
    it('should handle concurrent sessions')
  })
})

// tests/integration/memory/long-term-memory.test.ts
describe('Long-Term Memory', () => {
  describe('Episodic Memory', () => {
    it('should store interaction episodes')
    it('should retrieve by customer ID')
    it('should search by similarity')
    it('should track outcomes')
  })

  describe('Semantic Memory', () => {
    it('should store generalized patterns')
    it('should retrieve relevant knowledge')
    it('should update with new learnings')
  })
})

// tests/integration/memory/memory-manager.test.ts
describe('Memory Manager', () => {
  describe('Unified Interface', () => {
    it('should store in both short and long-term')
    it('should retrieve from appropriate store')
    it('should consolidate memories')
    it('should handle failures gracefully')
  })
})

// tests/integration/memory/agentic-rag.test.ts
describe('Agentic RAG Service', () => {
  describe('7-Step Reasoning', () => {
    it('should understand query intent')
    it('should retrieve relevant context')
    it('should re-rank results')
    it('should synthesize information')
    it('should verify accuracy')
    it('should learn from outcomes')
    it('should generate response')
  })

  describe('Query Processing', () => {
    it('should decompose complex queries')
    it('should handle multi-step reasoning')
    it('should self-reflect on answers')
    it('should improve over time')
  })
})

// tests/integration/memory/memory-consolidation.test.ts
describe('Memory Consolidation', () => {
  it('should identify patterns in interactions')
  it('should create semantic memories')
  it('should update knowledge base')
  it('should track learning metrics')
})
```

**Test Data Requirements**:
- Sample embeddings
- Qdrant test collections
- Memory fixtures (episodic and semantic)
- Conversation history data

---

#### 2.2 Agent Integration Tests
**Priority**: 🟡 High  
**Estimated Time**: 8-10 hours  
**Files**: 4 test files

```typescript
// tests/integration/agents/email-agent.test.ts
describe('Email Agent', () => {
  describe('Email Generation', () => {
    it('should generate personalized email')
    it('should use customer memory')
    it('should apply campaign template')
    it('should validate email format')
  })

  describe('Email Sending', () => {
    it('should send via SMTP')
    it('should track delivery status')
    it('should handle send failures')
    it('should respect TCPA restrictions')
  })

  describe('Memory Integration', () => {
    it('should retrieve customer context')
    it('should store interaction result')
    it('should update customer profile')
  })
})

// tests/integration/agents/phone-agent.test.ts
describe('Phone Agent', () => {
  describe('Call Handling', () => {
    it('should initiate outbound call')
    it('should handle conversation flow')
    it('should detect sentiment')
    it('should escalate when needed')
  })

  describe('Real-Time Processing', () => {
    it('should transcribe speech')
    it('should generate responses')
    it('should maintain context')
    it('should handle interruptions')
  })

  describe('TCPA Compliance', () => {
    it('should check time restrictions')
    it('should respect opt-outs')
    it('should enforce frequency limits')
  })
})

// tests/integration/agents/sms-agent.test.ts
describe('SMS Agent', () => {
  describe('Message Generation', () => {
    it('should generate concise messages')
    it('should stay within character limit')
    it('should include payment link')
  })

  describe('Message Sending', () => {
    it('should send via Twilio')
    it('should track delivery')
    it('should handle opt-outs')
  })
})

// tests/integration/agents/agent-coordination.test.ts
describe('Agent Coordination', () => {
  describe('Multi-Channel Strategy', () => {
    it('should select appropriate channel')
    it('should coordinate across channels')
    it('should avoid duplicate contacts')
    it('should track channel effectiveness')
  })

  describe('Escalation Logic', () => {
    it('should escalate high-risk cases')
    it('should notify supervisors')
    it('should adjust strategy')
  })
})
```

**Test Data Requirements**:
- Mock Twilio responses
- Email templates
- Customer profiles with history
- Agent configuration fixtures

---

### Phase 3: Security & Compliance Tests (Week 3)

#### 3.1 Security Tests
**Priority**: 🔴 Critical  
**Estimated Time**: 6-8 hours  
**Files**: 4 test files

```typescript
// tests/integration/security/encryption.test.ts
describe('Data Encryption', () => {
  describe('Field-Level Encryption', () => {
    it('should encrypt PII fields')
    it('should decrypt on retrieval')
    it('should use AES-256-GCM')
    it('should handle encryption errors')
  })

  describe('Password Hashing', () => {
    it('should hash passwords with bcrypt')
    it('should verify hashed passwords')
    it('should reject weak passwords')
  })

  describe('Data Masking', () => {
    it('should mask sensitive data in logs')
    it('should mask in error messages')
    it('should preserve data for authorized users')
  })
})

// tests/integration/security/rate-limiting.test.ts
describe('Rate Limiting', () => {
  describe('Request Limiting', () => {
    it('should limit requests per user')
    it('should limit requests per IP')
    it('should use token bucket algorithm')
    it('should return 429 on limit exceeded')
  })

  describe('Tier-Based Limits', () => {
    it('should apply auth endpoint limits')
    it('should apply API endpoint limits')
    it('should apply public endpoint limits')
    it('should apply sensitive endpoint limits')
  })

  describe('Redis Integration', () => {
    it('should store counters in Redis')
    it('should handle Redis failures')
    it('should reset counters after window')
  })
})

// tests/integration/security/input-validation.test.ts
describe('Input Validation', () => {
  describe('Injection Prevention', () => {
    it('should detect SQL injection')
    it('should detect NoSQL injection')
    it('should prevent XSS attacks')
    it('should prevent command injection')
    it('should prevent path traversal')
  })

  describe('Schema Validation', () => {
    it('should validate request body')
    it('should validate query parameters')
    it('should validate path parameters')
    it('should return validation errors')
  })
})

// tests/integration/security/audit-logging.test.ts
describe('Audit Logging', () => {
  it('should log authentication events')
  it('should log authorization failures')
  it('should log data access')
  it('should log data modifications')
  it('should maintain 7-year retention')
  it('should include user context')
})
```

**Test Data Requirements**:
- Malicious input samples
- Encryption test keys
- Rate limit test scenarios

---

#### 3.2 TCPA Compliance Tests
**Priority**: 🔴 Critical  
**Estimated Time**: 4-6 hours  
**Files**: 2 test files

```typescript
// tests/integration/compliance/tcpa.test.ts
describe('TCPA Compliance', () => {
  describe('Opt-Out Management', () => {
    it('should record opt-outs')
    it('should prevent contact after opt-out')
    it('should respect channel-specific opt-outs')
    it('should handle permanent opt-outs')
  })

  describe('Consent Tracking', () => {
    it('should verify consent exists')
    it('should track consent expiration')
    it('should require re-consent after expiry')
    it('should log consent changes')
  })

  describe('Frequency Limits', () => {
    it('should enforce daily call limit (3)')
    it('should enforce daily SMS limit (3)')
    it('should enforce daily email limit (5)')
    it('should track attempts across channels')
  })

  describe('Time Restrictions', () => {
    it('should prevent calls before 8 AM')
    it('should prevent calls after 9 PM')
    it('should use customer local timezone')
    it('should handle timezone conversions')
  })

  describe('Audit Trail', () => {
    it('should log all contact attempts')
    it('should log compliance checks')
    it('should maintain 7-year history')
    it('should support compliance reporting')
  })
})

// tests/integration/compliance/dnc-registry.test.ts
describe('DNC Registry Integration', () => {
  it('should check numbers against DNC list')
  it('should prevent calls to DNC numbers')
  it('should log DNC checks')
  it('should handle registry API failures')
})
```

**Test Data Requirements**:
- Customer opt-out fixtures
- Consent tracking data
- Timezone test cases
- DNC registry mock data

---

### Phase 4: API & Workflow Tests (Week 4)

#### 4.1 API Endpoint Tests
**Priority**: 🟡 High  
**Estimated Time**: 8-10 hours  
**Files**: 6 test files

```typescript
// tests/integration/api/campaigns.test.ts
describe('Campaign API', () => {
  describe('POST /api/v1/campaigns', () => {
    it('should create campaign with valid data')
    it('should validate required fields')
    it('should require authentication')
    it('should check authorization')
    it('should return 201 on success')
  })

  describe('GET /api/v1/campaigns', () => {
    it('should list campaigns')
    it('should filter by status')
    it('should paginate results')
    it('should include metrics')
  })

  describe('PUT /api/v1/campaigns/:id', () => {
    it('should update campaign')
    it('should validate changes')
    it('should track modifications')
  })

  describe('DELETE /api/v1/campaigns/:id', () => {
    it('should soft delete campaign')
    it('should prevent deletion of active campaigns')
  })
})

// tests/integration/api/customers.test.ts
// tests/integration/api/tasks.test.ts
// tests/integration/api/analytics.test.ts
// Similar structure for other endpoints
```

**Test Data Requirements**:
- API request/response fixtures
- Authentication tokens
- Pagination test data

---

#### 4.2 Workflow Tests
**Priority**: 🟡 High  
**Estimated Time**: 6-8 hours  
**Files**: 3 test files

```typescript
// tests/integration/workflows/campaign-lifecycle.test.ts
describe('Campaign Lifecycle', () => {
  it('should create campaign')
  it('should assign agents')
  it('should generate tasks')
  it('should execute tasks')
  it('should track progress')
  it('should complete campaign')
  it('should generate report')
})

// tests/integration/workflows/payment-collection.test.ts
describe('Payment Collection Workflow', () => {
  it('should identify overdue payment')
  it('should create collection task')
  it('should attempt contact')
  it('should escalate if needed')
  it('should record payment')
  it('should close task')
})

// tests/integration/workflows/agent-workflow.test.ts
describe('Agent Workflow', () => {
  it('should receive task assignment')
  it('should retrieve customer context')
  it('should execute contact strategy')
  it('should record interaction')
  it('should update task status')
  it('should trigger next action')
})
```

---

### Phase 5: End-to-End Tests (Week 5)

#### 5.1 Critical User Journeys
**Priority**: 🟡 High  
**Estimated Time**: 8-10 hours  
**Files**: 4 test files

```typescript
// tests/e2e/complete-collection-flow.test.ts
describe('Complete Collection Flow (E2E)', () => {
  it('should execute full payment collection journey', async () => {
    // 1. Create campaign
    // 2. Import customers
    // 3. Generate tasks
    // 4. Agent contacts customer (email)
    // 5. Customer doesn't respond
    // 6. Agent escalates to phone
    // 7. Phone conversation recorded
    // 8. Payment promised
    // 9. Payment received
    // 10. Task completed
    // 11. Analytics updated
  })
})

// tests/e2e/multi-channel-escalation.test.ts
describe('Multi-Channel Escalation (E2E)', () => {
  it('should escalate through all channels', async () => {
    // Email → SMS → Phone → Human Agent
  })
})

// tests/e2e/compliance-enforcement.test.ts
describe('Compliance Enforcement (E2E)', () => {
  it('should enforce TCPA throughout workflow', async () => {
    // Test opt-outs, time restrictions, frequency limits
  })
})

// tests/e2e/memory-learning.test.ts
describe('Memory & Learning (E2E)', () => {
  it('should learn from interactions and improve', async () => {
    // Track improvement over multiple interactions
  })
})
```

---

## Test Infrastructure

### Mock Factories

```typescript
// tests/fixtures/factories/user.factory.ts
export class UserFactory {
  static create(overrides?: Partial<User>): User
  static createMany(count: number): User[]
  static createAdmin(): User
  static createAgent(): User
  static createManager(): User
  static createViewer(): User
}

// tests/fixtures/factories/customer.factory.ts
export class CustomerFactory {
  static create(overrides?: Partial<Customer>): Customer
  static createWithPayments(): Customer
  static createWithHistory(): Customer
}

// tests/fixtures/factories/campaign.factory.ts
export class CampaignFactory {
  static create(overrides?: Partial<Campaign>): Campaign
  static createActive(): Campaign
  static createCompleted(): Campaign
}
```

### Test Utilities

```typescript
// tests/utils/test-db.ts
export class TestDatabase {
  static async setup(): Promise<void>
  static async teardown(): Promise<void>
  static async seed(): Promise<void>
  static async clear(): Promise<void>
}

// tests/utils/test-server.ts
export class TestServer {
  static async start(): Promise<Express>
  static async stop(): Promise<void>
  static async request(): SuperTest
}

// tests/utils/mock-llm.ts
export class MockLLMService {
  static mockResponse(response: string): void
  static mockError(error: Error): void
  static mockTokenUsage(tokens: number): void
}
```

### Test Configuration

```typescript
// tests/setup.ts
beforeAll(async () => {
  await TestDatabase.setup()
  await TestServer.start()
})

afterAll(async () => {
  await TestServer.stop()
  await TestDatabase.teardown()
})

beforeEach(async () => {
  await TestDatabase.clear()
  await TestDatabase.seed()
})
```

---

## Coverage Goals

### Overall Target: 80%

| Component | Target Coverage | Priority |
|-----------|----------------|----------|
| Authentication | 95% | 🔴 Critical |
| Authorization | 95% | 🔴 Critical |
| TCPA Compliance | 100% | 🔴 Critical |
| Encryption | 90% | 🔴 Critical |
| LLM Integration | 85% | 🟡 High |
| Memory System | 85% | 🟡 High |
| Agents | 80% | 🟡 High |
| API Endpoints | 80% | 🟡 High |
| Database Operations | 75% | 🟡 High |
| Utilities | 70% | 🟢 Medium |

---

## Implementation Timeline

### Week 1: Critical Path (32-40 hours)
- ✅ Authentication & Authorization tests
- ✅ Database integration tests
- ✅ LLM integration tests
- ✅ Test infrastructure setup

### Week 2: Memory & Agents (32-40 hours)
- ✅ Memory system tests
- ✅ Agent integration tests
- ✅ Mock factories

### Week 3: Security & Compliance (24-32 hours)
- ✅ Security tests
- ✅ TCPA compliance tests
- ✅ Audit logging tests

### Week 4: API & Workflows (24-32 hours)
- ✅ API endpoint tests
- ✅ Workflow tests
- ✅ Integration refinement

### Week 5: E2E & Polish (24-32 hours)
- ✅ End-to-end tests
- ✅ Coverage optimization
- ✅ Documentation

**Total Estimated Time**: 136-176 hours (17-22 days)

---

## Success Metrics

### Quantitative
- ✅ **80% overall code coverage**
- ✅ **95% coverage on critical paths**
- ✅ **100% TCPA compliance coverage**
- ✅ **All tests pass in CI/CD**
- ✅ **Test execution < 5 minutes**

### Qualitative
- ✅ **High confidence in deployment**
- ✅ **Easy to add new tests**
- ✅ **Clear test documentation**
- ✅ **Fast feedback loop**
- ✅ **Reliable test results**

---

## Best Practices

### Test Writing
1. **Follow AAA pattern**: Arrange, Act, Assert
2. **One assertion per test** (when possible)
3. **Descriptive test names**: Should read like documentation
4. **Test behavior, not implementation**
5. **Use factories for test data**
6. **Clean up after each test**
7. **Mock external services**
8. **Test error cases**

### Test Organization
1. **Group related tests** with `describe` blocks
2. **Use consistent naming** conventions
3. **Keep tests independent**
4. **Share setup with `beforeEach`**
5. **Document complex test scenarios**

### Performance
1. **Run unit tests frequently**
2. **Run integration tests before commits**
3. **Run E2E tests in CI/CD**
4. **Parallelize test execution**
5. **Use test database snapshots**

---

## Tools & Libraries

### Testing Framework
- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertion library
- **ts-jest**: TypeScript support for Jest

### Mocking
- **jest.mock()**: Built-in mocking
- **nock**: HTTP request mocking
- **redis-mock**: Redis mocking
- **pg-mem**: PostgreSQL in-memory database

### Test Data
- **faker**: Generate fake data
- **factory-bot**: Test data factories
- **fixtures**: Static test data

### Coverage
- **Istanbul**: Code coverage tool (built into Jest)
- **Codecov**: Coverage reporting

---

## Next Steps

1. **Set up test infrastructure** (Day 1-2)
   - Configure Jest
   - Create mock factories
   - Set up test database

2. **Implement Phase 1 tests** (Week 1)
   - Authentication & Authorization
   - Database integration
   - LLM integration

3. **Implement Phase 2 tests** (Week 2)
   - Memory system
   - Agent integration

4. **Implement Phase 3 tests** (Week 3)
   - Security
   - TCPA compliance

5. **Implement Phase 4 tests** (Week 4)
   - API endpoints
   - Workflows

6. **Implement Phase 5 tests** (Week 5)
   - End-to-end tests
   - Coverage optimization

---

**Status**: 📋 Planning Complete  
**Next Action**: Begin implementation with Phase 1 tests  
**Estimated Completion**: 5 weeks from start
