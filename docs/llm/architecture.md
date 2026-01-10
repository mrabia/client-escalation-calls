# LLM Integration Architecture

## Overview

This document describes the LLM (Large Language Model) integration architecture for the Client Escalation Calls system. The implementation provides intelligent, context-aware communication capabilities for all agents.

---

## Design Principles

### 1. Provider Abstraction
- **Multi-provider support**: OpenAI, Anthropic, Google AI
- **Unified interface**: Single API for all providers
- **Easy switching**: Change providers without code changes
- **Fallback mechanism**: Automatic failover if primary fails

### 2. Cost Management
- **Token tracking**: Monitor usage per request
- **Budget limits**: Set daily/monthly limits
- **Cost optimization**: Use appropriate models for tasks
- **Caching**: Reduce redundant API calls

### 3. Quality & Reliability
- **Retry logic**: Handle transient failures
- **Rate limiting**: Respect API limits
- **Response validation**: Ensure output quality
- **Error handling**: Graceful degradation

### 4. Context Awareness
- **Customer profiling**: Use historical data
- **Conversation history**: Maintain context
- **Risk assessment**: Adjust tone and strategy
- **Compliance**: Ensure regulatory adherence

---

## Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Email   │  │  Phone   │  │   SMS    │  │ Research │   │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │    LLM Service Layer      │
        │  (Abstraction & Routing)  │
        └─────────────┬─────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐          ┌────────────────┐
│  Prompt       │          │  Token         │
│  Manager      │          │  Manager       │
│  - Templates  │          │  - Tracking    │
│  - Variables  │          │  - Limits      │
│  - Validation │          │  - Costs       │
└───────────────┘          └────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│           Provider Adapters                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  OpenAI  │  │Anthropic │  │ Google   │  │
│  │  Adapter │  │ Adapter  │  │ Adapter  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼─────────────┼─────────────┼─────────┘
        │             │             │
        ▼             ▼             ▼
   [OpenAI API] [Anthropic API] [Google API]
```

---

## Component Details

### 1. LLM Service Layer

**Purpose**: Unified interface for all LLM operations

**Responsibilities**:
- Route requests to appropriate provider
- Handle authentication and configuration
- Manage retries and fallbacks
- Track usage and costs
- Cache responses when appropriate

**Interface**:
```typescript
interface LLMService {
  // Text generation
  generateText(prompt: string, options?: GenerationOptions): Promise<string>
  
  // Chat completion
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>
  
  // Streaming response
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>
  
  // Embeddings (for future vector DB)
  generateEmbedding(text: string): Promise<number[]>
  
  // Token counting
  countTokens(text: string): number
  
  // Cost estimation
  estimateCost(tokens: number, model: string): number
}
```

### 2. Provider Adapters

**Purpose**: Normalize different provider APIs

**Providers**:

#### OpenAI
- **Models**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Use Cases**: Email generation, conversation, analysis
- **Strengths**: Best overall quality, function calling
- **Cost**: Medium-high

#### Anthropic
- **Models**: Claude 3.5 Sonnet, Claude 3 Opus
- **Use Cases**: Complex reasoning, long context
- **Strengths**: Safety, instruction following
- **Cost**: Medium

#### Google AI
- **Models**: Gemini 2.0 Pro Exp, Gemini 2.0 Flash
- **Use Cases**: High precision tasks, calculations
- **Strengths**: Multimodal, code execution
- **Cost**: Low-medium
- **Configuration**: Temperature 0.1, top_p 0.95, max_tokens 8192

**Adapter Interface**:
```typescript
interface ProviderAdapter {
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>
  streamCompletion(request: CompletionRequest): AsyncGenerator<string>
  countTokens(text: string, model: string): number
  getCostPerToken(model: string): { input: number; output: number }
}
```

### 3. Prompt Manager

**Purpose**: Centralized prompt template management

**Features**:
- Template storage and versioning
- Variable interpolation
- Prompt optimization
- A/B testing support

**Template Structure**:
```typescript
interface PromptTemplate {
  id: string
  name: string
  version: string
  provider: string
  model: string
  systemPrompt: string
  userPromptTemplate: string
  variables: PromptVariable[]
  examples?: Example[]
  constraints?: string[]
  outputFormat?: string
}
```

**Example Templates**:
- `email-payment-reminder` - Friendly payment reminder
- `email-urgent-collection` - Urgent collection notice
- `phone-conversation` - Phone agent conversation
- `risk-assessment` - Customer risk analysis
- `strategy-recommendation` - Collection strategy

### 4. Token Manager

**Purpose**: Track and control token usage

**Features**:
- Real-time token counting
- Budget enforcement
- Cost tracking per customer/campaign
- Usage analytics

**Metrics Tracked**:
- Tokens per request (input + output)
- Cost per request
- Total daily/monthly usage
- Cost by agent type
- Cost by customer
- Average tokens per task

---

## Use Cases

### 1. Intelligent Email Generation

**Flow**:
1. Agent receives task to send email
2. Retrieves customer context (profile, history, risk)
3. Selects appropriate email template
4. Calls LLM service with context
5. LLM generates personalized email
6. Agent validates and sends

**Prompt Structure**:
```
System: You are a professional payment collection agent...

Context:
- Customer: John Doe, ABC Logistics
- Outstanding: $15,000 (45 days overdue)
- Risk Level: Medium
- Previous contacts: 2 emails, 1 call
- Payment history: Usually pays within 60 days
- Communication style: Professional, responds to data

Task: Generate a payment reminder email that:
- Is professional and respectful
- References previous communications
- Provides payment options
- Creates urgency without being aggressive
- Includes specific invoice details

Output: Email subject and body
```

### 2. Phone Conversation

**Flow**:
1. Phone agent initiates call
2. Speech-to-text transcribes customer response
3. LLM generates appropriate response
4. Text-to-speech converts to audio
5. Repeat until call ends

**Prompt Structure**:
```
System: You are a payment collection phone agent...

Conversation History:
Agent: "Hello, this is Sarah from ABC Collections..."
Customer: "Hi, I know why you're calling..."

Context:
- Customer seems aware of debt
- Tone: Apologetic
- Previous: Promised payment last week

Generate next agent response that:
- Acknowledges customer's awareness
- Asks about payment plan
- Remains empathetic
- Moves toward resolution
```

### 3. Risk Assessment

**Flow**:
1. Context Engine analyzes customer
2. Calls LLM with historical data
3. LLM provides risk score and reasoning
4. System adjusts collection strategy

**Prompt Structure**:
```
System: You are a financial risk analyst...

Customer Data:
- Payment history: [last 24 months]
- Communication responses: [history]
- Business indicators: [data]
- Industry: Logistics
- Company size: 50-100 employees

Analyze and provide:
1. Risk score (0-100)
2. Key risk factors
3. Positive indicators
4. Recommended approach
5. Predicted payment timeline
```

---

## Model Selection Strategy

### By Task Type

| Task | Primary Model | Fallback | Reasoning |
|------|--------------|----------|-----------|
| Email Generation | GPT-4 Turbo | Claude 3.5 Sonnet | Best quality, function calling |
| Phone Conversation | GPT-4 | Claude 3.5 Sonnet | Real-time performance |
| Risk Assessment | Gemini 2.0 Pro Exp | GPT-4 | Precision, code execution |
| Strategy Recommendation | Claude 3.5 Sonnet | GPT-4 | Complex reasoning |
| Template Optimization | GPT-4 | Claude 3 Opus | Creative writing |
| Compliance Check | Claude 3.5 Sonnet | GPT-4 | Safety, instruction following |

### By Cost Sensitivity

**High Volume, Cost-Sensitive**:
- Primary: GPT-3.5 Turbo / Gemini 2.0 Flash
- Use case: Simple emails, SMS

**Medium Volume, Quality Important**:
- Primary: GPT-4 Turbo / Claude 3.5 Sonnet
- Use case: Complex emails, conversations

**Low Volume, Maximum Quality**:
- Primary: GPT-4 / Claude 3 Opus / Gemini 2.0 Pro Exp
- Use case: Strategy, risk assessment

---

## Error Handling

### Retry Strategy

```typescript
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // ms
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'rate_limit_exceeded',
    'server_error',
    'timeout',
    'network_error'
  ]
}
```

### Fallback Chain

```
Primary Provider (e.g., OpenAI GPT-4)
    ↓ (if fails)
Secondary Provider (e.g., Anthropic Claude)
    ↓ (if fails)
Tertiary Provider (e.g., Google Gemini)
    ↓ (if fails)
Template-Based Fallback (no AI)
```

### Error Types

1. **Rate Limit**: Wait and retry with exponential backoff
2. **Invalid Request**: Log and use template fallback
3. **Timeout**: Retry with shorter timeout
4. **Provider Down**: Switch to fallback provider
5. **Budget Exceeded**: Use template fallback, alert admin

---

## Cost Management

### Budget Limits

```typescript
const budgetLimits = {
  daily: {
    total: 100, // $100/day
    perCustomer: 5, // $5 per customer/day
    perAgent: 20 // $20 per agent/day
  },
  monthly: {
    total: 2000, // $2000/month
    perCampaign: 500 // $500 per campaign/month
  }
}
```

### Cost Optimization

1. **Caching**: Cache similar prompts for 1 hour
2. **Prompt Compression**: Remove unnecessary context
3. **Model Selection**: Use cheaper models when appropriate
4. **Batch Processing**: Combine multiple requests
5. **Early Termination**: Stop generation when sufficient

---

## Security & Compliance

### API Key Management

- Store in environment variables (never in code)
- Rotate keys regularly
- Use separate keys for dev/staging/prod
- Monitor for unauthorized usage

### Data Privacy

- Anonymize customer data in prompts when possible
- Don't send sensitive financial details
- Log prompts and responses securely
- Comply with GDPR/CCPA

### Content Filtering

- Validate LLM outputs before sending
- Check for inappropriate language
- Ensure compliance with regulations
- Verify factual accuracy

---

## Monitoring & Analytics

### Metrics to Track

1. **Performance**:
   - Response time (p50, p95, p99)
   - Success rate
   - Error rate by type
   - Fallback usage

2. **Cost**:
   - Total spend (daily/monthly)
   - Cost per request
   - Cost by model
   - Cost by agent type

3. **Quality**:
   - Customer response rate
   - Payment conversion rate
   - Email open rate
   - Call success rate

4. **Usage**:
   - Requests per minute
   - Tokens per request
   - Most used templates
   - Provider distribution

---

## Implementation Phases

### Phase 3.1: Foundation ✅ (Current)
- LLM service abstraction layer
- Provider adapters (OpenAI, Anthropic, Google)
- Basic prompt templates
- Token tracking

### Phase 3.2: Email Agent
- Intelligent email generation
- Template selection
- Personalization
- A/B testing

### Phase 3.3: Phone Agent
- Conversation management
- Speech-to-text integration
- Real-time responses
- Context maintenance

### Phase 3.4: Context Engine
- AI-powered risk assessment
- Strategy recommendation
- Pattern recognition
- Predictive analytics

### Phase 3.5: Optimization
- Response caching
- Prompt optimization
- Cost reduction
- Quality improvement

---

## Testing Strategy

### Unit Tests
- Provider adapters
- Prompt template rendering
- Token counting
- Cost calculation

### Integration Tests
- End-to-end email generation
- Conversation flow
- Fallback mechanisms
- Error handling

### Quality Tests
- Output validation
- Tone consistency
- Factual accuracy
- Compliance adherence

### Performance Tests
- Response time under load
- Concurrent request handling
- Rate limit behavior
- Failover speed

---

## Future Enhancements

### Short-term (Phase 4)
- Vector database integration
- Semantic search
- Memory system
- RAG implementation

### Medium-term
- Fine-tuned models
- Custom embeddings
- Multi-language support
- Voice cloning

### Long-term
- Autonomous agents
- Self-improving prompts
- Predictive modeling
- Real-time learning

---

## References

- OpenAI API Documentation: https://platform.openai.com/docs
- Anthropic Claude Documentation: https://docs.anthropic.com
- Google AI Documentation: https://ai.google.dev/docs
- LangChain Documentation: https://docs.langchain.com

---

**Version**: 1.0  
**Last Updated**: 2026-01-09  
**Status**: In Development
