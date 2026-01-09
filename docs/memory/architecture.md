# Memory System Architecture

**Version:** 1.0  
**Date:** 2026-01-09  
**Phase:** 4 - Vector Database & Memory System

---

## Overview

This document describes the memory system architecture for the client-escalation-calls application, enabling AI agents to learn from past interactions and provide context-aware responses.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Agents Layer                          │
│  (EmailAgent, PhoneAgent, SMSAgent)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Memory Manager                                │
│  - Unified interface for all memory operations                  │
│  - Routes queries to appropriate memory systems                 │
│  - Handles memory consolidation                                 │
└──────┬──────────────────────────┬──────────────────────────────┘
       │                          │
       ↓                          ↓
┌──────────────────┐    ┌──────────────────────────────────────┐
│  Short-Term      │    │  Long-Term Memory                     │
│  Memory          │    │                                       │
│  (Redis)         │    │  ┌─────────────────────────────────┐ │
│                  │    │  │  Episodic Memory                │ │
│  - Session data  │    │  │  (Qdrant Vector DB)             │ │
│  - Active context│    │  │  - Conversation history         │ │
│  - Temp state    │    │  │  - Interaction outcomes         │ │
│  - TTL: 30 min   │    │  │  - Customer responses           │ │
│                  │    │  └─────────────────────────────────┘ │
│                  │    │                                       │
│                  │    │  ┌─────────────────────────────────┐ │
│                  │    │  │  Semantic Memory                │ │
│                  │    │  │  (Qdrant Vector DB)             │ │
│                  │    │  │  - Successful strategies        │ │
│                  │    │  │  - Customer patterns            │ │
│                  │    │  │  - Best practices               │ │
│                  │    │  └─────────────────────────────────┘ │
└──────────────────┘    └──────────────────────────────────────┘
                                      │
                                      ↓
                        ┌──────────────────────────────┐
                        │  Embedding Service           │
                        │  - OpenAI text-embedding-3   │
                        │  - Converts text to vectors  │
                        │  - 1536 dimensions           │
                        └──────────────────────────────┘
```

---

## Components

### 1. Memory Manager

**Purpose:** Unified interface for all memory operations

**Responsibilities:**
- Route memory queries to appropriate systems
- Coordinate between short-term and long-term memory
- Handle memory consolidation (move important data from short to long-term)
- Provide simple API for agents

**Key Methods:**
```typescript
class MemoryManager {
  // Store a new memory
  async store(memory: Memory): Promise<void>
  
  // Retrieve relevant memories
  async retrieve(query: string, options: RetrievalOptions): Promise<Memory[]>
  
  // Search for similar past interactions
  async searchSimilar(embedding: number[], limit: number): Promise<Memory[]>
  
  // Consolidate short-term to long-term
  async consolidate(sessionId: string): Promise<void>
  
  // Get session context
  async getSessionContext(sessionId: string): Promise<SessionContext>
}
```

---

### 2. Short-Term Memory (Redis)

**Purpose:** Fast, temporary storage for active sessions

**Storage Duration:** 30 minutes (configurable)

**Data Stored:**
- Current conversation context
- Active campaign state
- Recent customer responses
- Temporary agent decisions
- Session metadata

**Key Features:**
- **Fast access** - Sub-millisecond retrieval
- **Automatic expiration** - TTL-based cleanup
- **Session isolation** - Each session has its own namespace
- **Real-time updates** - Agents can update context instantly

**Data Structure:**
```typescript
interface SessionContext {
  sessionId: string;
  customerId: string;
  campaignId: string;
  agentType: 'email' | 'phone' | 'sms';
  conversationHistory: Message[];
  currentState: string;
  metadata: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
}
```

**Redis Keys:**
```
session:{sessionId}:context
session:{sessionId}:history
session:{sessionId}:state
customer:{customerId}:active_sessions
```

---

### 3. Long-Term Memory (Vector Database)

**Purpose:** Persistent storage of learned patterns and experiences

**Technology:** Qdrant (self-hosted vector database)

**Storage Duration:** Permanent (with optional archival)

#### 3.1 Episodic Memory

**What it stores:** Specific interaction episodes

**Data Structure:**
```typescript
interface EpisodicMemory {
  id: string;
  type: 'episodic';
  timestamp: Date;
  customerId: string;
  campaignId: string;
  agentType: string;
  
  // Conversation details
  conversation: {
    messages: Message[];
    duration: number;
    channel: string;
  };
  
  // Outcome
  outcome: {
    success: boolean;
    paymentReceived: boolean;
    amount?: number;
    nextAction?: string;
  };
  
  // Context
  context: {
    customerRisk: string;
    paymentHistory: string;
    previousAttempts: number;
  };
  
  // Vector embedding
  embedding: number[]; // 1536 dimensions
  
  // Metadata for filtering
  tags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}
```

**Use Cases:**
- Find similar past interactions
- Learn from successful conversations
- Avoid repeating failed strategies
- Understand customer behavior patterns

#### 3.2 Semantic Memory

**What it stores:** Generalized knowledge and patterns

**Data Structure:**
```typescript
interface SemanticMemory {
  id: string;
  type: 'semantic';
  category: 'strategy' | 'pattern' | 'best_practice';
  
  // Knowledge content
  title: string;
  description: string;
  content: string;
  
  // Evidence
  derivedFrom: string[]; // IDs of episodic memories
  successRate: number;
  timesApplied: number;
  
  // Applicability
  applicableWhen: {
    customerRisk?: string[];
    paymentRange?: { min: number; max: number };
    daysSinceOverdue?: number;
    previousAttempts?: number;
  };
  
  // Vector embedding
  embedding: number[]; // 1536 dimensions
  
  // Metadata
  createdAt: Date;
  lastUpdated: Date;
  confidence: number; // 0-1
}
```

**Use Cases:**
- Retrieve best practices for specific situations
- Apply proven strategies
- Continuously improve agent performance
- Build institutional knowledge

---

### 4. Embedding Service

**Purpose:** Convert text to vector embeddings for semantic search

**Model:** OpenAI `text-embedding-3-small`
- **Dimensions:** 1536
- **Cost:** $0.00002 per 1K tokens
- **Performance:** Fast, high-quality embeddings

**Key Methods:**
```typescript
class EmbeddingService {
  // Generate embedding for a single text
  async generateEmbedding(text: string): Promise<number[]>
  
  // Generate embeddings in batch
  async generateBatch(texts: string[]): Promise<number[][]>
  
  // Generate embedding for a conversation
  async embedConversation(messages: Message[]): Promise<number[]>
  
  // Generate embedding for a memory
  async embedMemory(memory: Memory): Promise<number[]>
}
```

**Text Preparation:**
```typescript
// For conversations
const conversationText = messages
  .map(m => `${m.role}: ${m.content}`)
  .join('\n');

// For semantic memories
const memoryText = `${memory.title}\n${memory.description}\n${memory.content}`;
```

---

### 5. RAG (Retrieval Augmented Generation)

**Purpose:** Enhance LLM responses with relevant memories

**Process:**
1. **Query Understanding** - Extract intent from current situation
2. **Memory Retrieval** - Find relevant episodic and semantic memories
3. **Context Assembly** - Combine memories with current context
4. **Response Generation** - LLM generates response with augmented context
5. **Memory Update** - Store new interaction as episodic memory

**Implementation:**
```typescript
class RAGService {
  async enhancePrompt(
    basePrompt: string,
    context: Context,
    options: RAGOptions
  ): Promise<EnhancedPrompt> {
    // 1. Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(
      context.situation
    );
    
    // 2. Retrieve similar episodic memories
    const episodicMemories = await this.vectorDB.search({
      collection: 'episodic',
      vector: queryEmbedding,
      limit: 5,
      filter: {
        customerRisk: context.customerRisk,
        outcome.success: true
      }
    });
    
    // 3. Retrieve relevant semantic memories
    const semanticMemories = await this.vectorDB.search({
      collection: 'semantic',
      vector: queryEmbedding,
      limit: 3,
      filter: {
        category: 'strategy',
        confidence: { $gte: 0.7 }
      }
    });
    
    // 4. Assemble enhanced prompt
    return {
      systemPrompt: basePrompt,
      context: {
        currentSituation: context,
        similarPastInteractions: episodicMemories,
        relevantStrategies: semanticMemories
      }
    };
  }
}
```

---

### 6. Memory Consolidation

**Purpose:** Move important short-term memories to long-term storage

**Triggers:**
- Session ends successfully
- Payment received
- Significant customer interaction
- Manual consolidation request

**Process:**
```typescript
class MemoryConsolidator {
  async consolidate(sessionId: string): Promise<void> {
    // 1. Retrieve session context from Redis
    const session = await this.redis.get(`session:${sessionId}:context`);
    
    // 2. Determine if worth storing long-term
    const isSignificant = this.evaluateSignificance(session);
    
    if (!isSignificant) {
      return; // Let it expire naturally
    }
    
    // 3. Create episodic memory
    const episodicMemory = this.createEpisodicMemory(session);
    
    // 4. Generate embedding
    episodicMemory.embedding = await this.embeddingService.embedConversation(
      session.conversationHistory
    );
    
    // 5. Store in vector database
    await this.vectorDB.upsert({
      collection: 'episodic',
      points: [episodicMemory]
    });
    
    // 6. Update semantic memories if applicable
    await this.updateSemanticMemories(episodicMemory);
  }
  
  private evaluateSignificance(session: SessionContext): boolean {
    // Store if:
    // - Payment was received
    // - Conversation was longer than 3 messages
    // - Customer sentiment changed significantly
    // - New strategy was applied
    return (
      session.outcome?.paymentReceived ||
      session.conversationHistory.length > 3 ||
      session.metadata.strategyApplied
    );
  }
}
```

---

## Qdrant Configuration

### Collections

**1. Episodic Collection:**
```json
{
  "name": "episodic_memories",
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  },
  "payload_schema": {
    "customerId": { "type": "keyword" },
    "agentType": { "type": "keyword" },
    "outcome.success": { "type": "bool" },
    "outcome.paymentReceived": { "type": "bool" },
    "context.customerRisk": { "type": "keyword" },
    "sentiment": { "type": "keyword" },
    "timestamp": { "type": "datetime" }
  },
  "optimizers_config": {
    "indexing_threshold": 10000
  }
}
```

**2. Semantic Collection:**
```json
{
  "name": "semantic_memories",
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  },
  "payload_schema": {
    "category": { "type": "keyword" },
    "successRate": { "type": "float" },
    "confidence": { "type": "float" },
    "applicableWhen.customerRisk": { "type": "keyword" }
  }
}
```

### Docker Compose Configuration

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    ports:
      - "6333:6333"  # HTTP API
      - "6334:6334"  # gRPC API
    volumes:
      - ./data/qdrant:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334
    restart: unless-stopped
    networks:
      - escalation-network
```

---

## Integration with Agents

### Example: Email Agent with Memory

```typescript
class EmailAgent {
  constructor(
    private llmService: LLMService,
    private memoryManager: MemoryManager,
    private ragService: RAGService
  ) {}
  
  async generateEmail(task: Task): Promise<Email> {
    // 1. Get current context
    const context = await this.memoryManager.getSessionContext(task.sessionId);
    
    // 2. Retrieve relevant memories via RAG
    const enhancedPrompt = await this.ragService.enhancePrompt(
      this.basePrompt,
      {
        customerId: task.customerId,
        customerRisk: task.customerRisk,
        situation: `Generate payment reminder for ${task.amountDue}`
      },
      {
        includeEpisodic: true,
        includeSemantic: true,
        maxMemories: 5
      }
    );
    
    // 3. Generate email with LLM
    const email = await this.llmService.generateEmail({
      prompt: enhancedPrompt,
      customer: task.customer,
      context: context
    });
    
    // 4. Update short-term memory
    await this.memoryManager.store({
      type: 'short-term',
      sessionId: task.sessionId,
      action: 'email_generated',
      content: email,
      timestamp: new Date()
    });
    
    return email;
  }
  
  async handleResponse(response: EmailResponse): Promise<void> {
    // 1. Update short-term memory
    await this.memoryManager.store({
      type: 'short-term',
      sessionId: response.sessionId,
      action: 'customer_responded',
      content: response,
      timestamp: new Date()
    });
    
    // 2. If interaction complete, consolidate to long-term
    if (response.paymentReceived || response.conversationEnded) {
      await this.memoryManager.consolidate(response.sessionId);
    }
  }
}
```

---

## Performance Considerations

### Embedding Generation
- **Batch requests** - Generate embeddings in batches of 100
- **Cache embeddings** - Cache frequently accessed embeddings
- **Async processing** - Don't block on embedding generation

### Vector Search
- **Limit results** - Retrieve only top 5-10 most relevant memories
- **Use filters** - Pre-filter by metadata before vector search
- **Index optimization** - Qdrant auto-optimizes after 10K vectors

### Redis
- **Connection pooling** - Reuse Redis connections
- **Pipeline operations** - Batch multiple Redis commands
- **Compression** - Compress large session data

---

## Cost Estimation

### Embedding Costs (OpenAI text-embedding-3-small)
- **Price:** $0.00002 per 1K tokens
- **Average conversation:** ~500 tokens = $0.00001
- **100 conversations/day:** $0.001/day = $0.30/month

### Qdrant (Self-hosted)
- **Infrastructure:** Free (runs in Docker)
- **Storage:** ~1GB per 100K memories
- **Memory:** 2GB RAM recommended

### Redis
- **Infrastructure:** Free (runs in Docker)
- **Memory:** 512MB recommended for short-term storage

**Total estimated cost:** ~$0.30/month (just embeddings)

---

## Security & Privacy

### Data Protection
- **Encryption at rest** - Qdrant data encrypted
- **Encryption in transit** - TLS for all connections
- **Access control** - API keys for Qdrant access

### PII Handling
- **Anonymization** - Remove PII before storing in long-term memory
- **Retention policy** - Auto-delete memories older than 2 years
- **GDPR compliance** - Support for right to be forgotten

### Audit Trail
- All memory operations logged
- Track who accessed what memories
- Monitor for unusual access patterns

---

## Monitoring & Metrics

### Key Metrics
- **Memory retrieval latency** - Target: <100ms
- **Embedding generation time** - Target: <500ms
- **Vector search accuracy** - Target: >90% relevance
- **Memory consolidation rate** - Track % of sessions consolidated
- **Storage growth** - Monitor Qdrant storage usage

### Alerts
- High latency on memory retrieval
- Qdrant storage >80% capacity
- Redis memory usage >80%
- Embedding API failures

---

## Future Enhancements

### Phase 5+
1. **Multi-modal memories** - Store images, voice recordings
2. **Federated learning** - Learn across multiple deployments
3. **Active learning** - Agents request human feedback
4. **Memory pruning** - Auto-archive low-value memories
5. **Cross-agent learning** - Email agent learns from phone agent
6. **Temporal reasoning** - Understand time-based patterns
7. **Causal inference** - Understand cause-effect relationships

---

## References

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Memory Systems in AI](https://arxiv.org/abs/2307.09288)
