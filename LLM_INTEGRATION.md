# LLM Integration - Phase 3 Implementation

## Overview

This document describes the LLM (Large Language Model) integration implemented in Phase 3 of the client-escalation-calls system. The implementation provides AI-powered capabilities for intelligent email generation, phone conversations, and risk assessment.

---

## What Was Implemented

### 1. Core LLM Service Layer

**File**: `src/services/llm/LLMService.ts`

**Features**:
- Multi-provider support (OpenAI, Anthropic, Google AI)
- Automatic fallback chain when providers fail
- Response caching for cost optimization
- Usage tracking and statistics
- Budget enforcement
- Unified API for all providers

**Key Methods**:
```typescript
// Generate text from prompt
await llmService.generateText(prompt, options);

// Chat completion
await llmService.chat(messages, options);

// Streaming chat
for await (const chunk of llmService.streamChat(messages, options)) {
  console.log(chunk);
}

// Count tokens
await llmService.countTokens(text, model);

// Estimate cost
await llmService.estimateCost(text, model, outputTokens);
```

### 2. Provider Adapters

**Files**:
- `src/services/llm/adapters/BaseAdapter.ts` - Abstract base class
- `src/services/llm/adapters/OpenAIAdapter.ts` - OpenAI integration
- `src/services/llm/adapters/AnthropicAdapter.ts` - Anthropic integration
- `src/services/llm/adapters/GoogleAdapter.ts` - Google AI integration

**Features**:
- Retry logic with exponential backoff
- Error normalization across providers
- Token counting
- Cost calculation per model
- Streaming support

**Supported Models**:

**OpenAI**:
- GPT-4
- GPT-4 Turbo
- GPT-4o
- GPT-3.5 Turbo

**Anthropic**:
- Claude 3 Opus
- Claude 3.5 Sonnet
- Claude 3 Haiku

**Google AI**:
- Gemini 2.0 Pro Experimental (default for precision tasks)
- Gemini 2.0 Flash Experimental
- Gemini 1.5 Pro
- Gemini 1.5 Flash

### 3. Email Generation Service

**File**: `src/services/llm/EmailGenerationService.ts`

**Features**:
- AI-powered email generation for payment collection
- Multiple email types (reminder, urgent, final notice, payment plan)
- Tone customization (professional, friendly, urgent, formal)
- Context-aware personalization
- A/B testing support (multiple variations)
- Email optimization

**Usage Example**:
```typescript
import { emailGenerationService } from '@/services/llm';

const email = await emailGenerationService.generateEmail({
  customerId: 'cust-123',
  templateType: 'reminder',
  tone: 'professional',
  context: {
    customerName: 'John Doe',
    companyName: 'ABC Logistics',
    outstandingAmount: 15000,
    daysPastDue: 45,
    riskLevel: 'medium',
  },
  includePaymentLink: true,
  includeContactInfo: true,
});

console.log(email.subject);
console.log(email.body);
console.log(`Cost: $${email.metadata.cost}`);
```

### 4. Conversation Service

**File**: `src/services/llm/ConversationService.ts`

**Features**:
- Real-time conversation response generation
- Sentiment analysis
- Intent detection
- Objection handling
- Conversation summarization
- Suggested actions and next steps

**Usage Example**:
```typescript
import { conversationService } from '@/services/llm';

const response = await conversationService.generateResponse({
  customerId: 'cust-123',
  conversationHistory: [
    { role: 'assistant', content: 'Hello, this is Sarah calling about...' },
    { role: 'user', content: 'I know why you\'re calling...' },
  ],
  currentInput: 'I\'m having cash flow issues right now',
  context: {
    customerName: 'John Doe',
    outstandingAmount: 15000,
    daysPastDue: 45,
  },
  objective: 'negotiate a payment plan',
});

console.log(response.response);
console.log(`Sentiment: ${response.sentiment}`);
console.log(`Suggested actions: ${response.suggestedActions.join(', ')}`);
```

### 5. Risk Assessment Service

**File**: `src/services/llm/RiskAssessmentService.ts`

**Features**:
- AI-powered customer risk analysis
- Risk scoring (0-100)
- Risk level classification (low, medium, high, critical)
- Key factor identification
- Strategy recommendation
- Payment timeline prediction

**Usage Example**:
```typescript
import { riskAssessmentService } from '@/services/llm';

const assessment = await riskAssessmentService.assessRisk({
  customerId: 'cust-123',
  paymentHistory: [...],
  communicationHistory: [...],
  businessData: {...},
  context: {
    customerName: 'John Doe',
    companyName: 'ABC Logistics',
    outstandingAmount: 15000,
    daysPastDue: 45,
  },
});

console.log(`Risk Score: ${assessment.riskScore}`);
console.log(`Risk Level: ${assessment.riskLevel}`);
console.log(`Key Factors: ${assessment.keyFactors.join(', ')}`);
console.log(`Recommended Strategy: ${assessment.recommendedStrategy}`);
```

### 6. Prompt Template Manager

**File**: `src/services/llm/PromptTemplateManager.ts`

**Features**:
- Centralized prompt template management
- Template versioning
- Variable interpolation
- Template search and filtering
- Pre-configured templates for common tasks

**Pre-configured Templates**:
- `email-payment-reminder` - Friendly payment reminder
- `email-urgent-collection` - Urgent collection notice
- `email-final-notice` - Final notice before escalation
- `email-payment-plan` - Payment plan offer
- `phone-conversation` - Phone conversation responses
- `objection-handling` - Objection handling
- `risk-assessment` - Customer risk assessment
- `strategy-recommendation` - Collection strategy

**Usage Example**:
```typescript
import { promptTemplateManager } from '@/services/llm';

// Get template
const template = promptTemplateManager.getTemplate('email-payment-reminder');

// Render with variables
const prompt = promptTemplateManager.renderTemplate('email-payment-reminder', {
  customerName: 'John Doe',
  companyName: 'ABC Logistics',
  outstandingAmount: 15000,
  daysPastDue: 45,
});
```

### 7. Token Manager

**File**: `src/services/llm/TokenManager.ts`

**Features**:
- Token usage tracking
- Cost tracking per customer/agent/campaign
- Budget limit enforcement
- Daily and monthly usage reports
- Usage analytics by provider and model
- Automatic budget alerts

**Usage Example**:
```typescript
import { tokenManager } from '@/services/llm';

// Record usage
tokenManager.recordUsage(
  LLMProvider.OPENAI,
  'gpt-4-turbo',
  { promptTokens: 500, completionTokens: 200, totalTokens: 700 },
  0.015,
  { customerId: 'cust-123', agentId: 'agent-456' }
);

// Check budget
const budgetCheck = tokenManager.checkBudgetLimit(0.02, {
  customerId: 'cust-123',
});

if (!budgetCheck.allowed) {
  console.log(`Budget exceeded: ${budgetCheck.reason}`);
}

// Get usage stats
const stats = tokenManager.getUsageMetrics();
console.log(`Total requests: ${stats.requestCount}`);
console.log(`Total cost: $${stats.totalCost}`);

// Get budget status
const status = tokenManager.getBudgetStatus();
console.log(`Daily: $${status.daily.used} / $${status.daily.limit}`);
console.log(`Monthly: $${status.monthly.used} / $${status.monthly.limit}`);
```

---

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORGANIZATION=your_org_id_here  # Optional

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# LLM Feature Flags
ENABLE_AI_GENERATION=true
ENABLE_LLM_CACHING=true

# Budget Limits (optional, defaults provided)
LLM_DAILY_BUDGET=100
LLM_MONTHLY_BUDGET=2000
LLM_CUSTOMER_DAILY_BUDGET=5
LLM_AGENT_DAILY_BUDGET=20
LLM_CAMPAIGN_MONTHLY_BUDGET=500
```

### Configuration in Code

The configuration is managed in `src/config/index.ts`:

```typescript
export const config = {
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      organization: process.env.OPENAI_ORGANIZATION,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY || '',
    },
  },
  features: {
    aiGeneration: process.env.ENABLE_AI_GENERATION === 'true',
    llmCaching: process.env.ENABLE_LLM_CACHING === 'true',
  },
};
```

---

## Model Selection Strategy

### By Task Type

| Task | Primary Model | Fallback | Reasoning |
|------|--------------|----------|-----------|
| Email Generation | GPT-4 Turbo | Claude 3.5 Sonnet | Best quality, creative writing |
| Phone Conversation | Claude 3.5 Sonnet | GPT-4 | Instruction following, empathy |
| Risk Assessment | Gemini 2.0 Pro Exp | GPT-4 | Maximum precision, code execution |
| Strategy Recommendation | Gemini 2.0 Pro Exp | Claude 3.5 Sonnet | Complex reasoning, precision |
| Intent Detection | Claude 3.5 Sonnet | GPT-4 | Classification accuracy |
| Sentiment Analysis | GPT-4 | Claude 3.5 Sonnet | Nuanced understanding |

### By Cost Sensitivity

**High Volume, Cost-Sensitive**:
- GPT-3.5 Turbo / Gemini 2.0 Flash
- Use case: Simple emails, SMS

**Medium Volume, Quality Important**:
- GPT-4 Turbo / Claude 3.5 Sonnet
- Use case: Complex emails, conversations

**Low Volume, Maximum Quality**:
- GPT-4 / Gemini 2.0 Pro Exp
- Use case: Strategy, risk assessment

---

## Cost Estimates

### Approximate Costs (as of January 2026)

**Email Generation**:
- Simple reminder: ~$0.01 - $0.02 per email
- Complex email: ~$0.03 - $0.05 per email

**Phone Conversation**:
- Per response: ~$0.005 - $0.015
- Full conversation (10 exchanges): ~$0.05 - $0.15

**Risk Assessment**:
- Per assessment: ~$0.02 - $0.05

**Strategy Recommendation**:
- Per recommendation: ~$0.01 - $0.03

**Daily Usage Estimates**:
- 100 emails: ~$2 - $5
- 50 phone conversations: ~$2.50 - $7.50
- 20 risk assessments: ~$0.40 - $1.00
- **Total: ~$5 - $14 per day**

---

## Testing

### Unit Tests (To Be Added)

```bash
npm run test
```

### Manual Testing

```typescript
// Test email generation
import { emailGenerationService } from '@/services/llm';

const email = await emailGenerationService.generateEmail({
  customerId: 'test-123',
  templateType: 'reminder',
  tone: 'professional',
  context: {
    customerName: 'Test Customer',
    companyName: 'Test Company',
    outstandingAmount: 1000,
    daysPastDue: 30,
  },
});

console.log('Subject:', email.subject);
console.log('Body:', email.body);
console.log('Cost:', email.metadata.cost);
```

---

## Integration with Existing Agents

### Email Agent Integration

```typescript
import { emailGenerationService } from '@/services/llm';

class EmailAgent {
  async sendPaymentReminder(customerId: string) {
    // Get customer context
    const context = await this.getCustomerContext(customerId);
    
    // Generate email with AI
    const email = await emailGenerationService.generateEmail({
      customerId,
      templateType: 'reminder',
      tone: 'professional',
      context,
      includePaymentLink: true,
    });
    
    // Send email
    await this.sendEmail(context.email, email.subject, email.body);
    
    // Log usage
    this.logAIUsage(email.metadata);
  }
}
```

### Phone Agent Integration

```typescript
import { conversationService } from '@/services/llm';

class PhoneAgent {
  async handleConversation(customerId: string, customerInput: string) {
    // Get conversation history
    const history = await this.getConversationHistory(customerId);
    const context = await this.getCustomerContext(customerId);
    
    // Generate response
    const response = await conversationService.generateResponse({
      customerId,
      conversationHistory: history,
      currentInput: customerInput,
      context,
      objective: 'secure payment commitment',
    });
    
    // Speak response
    await this.speak(response.response);
    
    // Handle suggested actions
    if (response.suggestedActions.includes('Transfer to manager')) {
      await this.transferToManager();
    }
    
    return response;
  }
}
```

### Context Engine Integration

```typescript
import { riskAssessmentService } from '@/services/llm';

class ContextEngine {
  async analyzeCustomer(customerId: string) {
    // Get customer data
    const paymentHistory = await this.getPaymentHistory(customerId);
    const communicationHistory = await this.getCommunicationHistory(customerId);
    const businessData = await this.getBusinessData(customerId);
    const context = await this.getCustomerContext(customerId);
    
    // AI-powered risk assessment
    const assessment = await riskAssessmentService.assessRisk({
      customerId,
      paymentHistory,
      communicationHistory,
      businessData,
      context,
    });
    
    // Store assessment
    await this.storeRiskAssessment(customerId, assessment);
    
    // Get strategy recommendation
    const strategy = await riskAssessmentService.recommendStrategy({
      customerId,
      riskAssessment: assessment,
      context,
      availableChannels: ['email', 'phone', 'sms'],
    });
    
    return { assessment, strategy };
  }
}
```

---

## Performance Considerations

### Response Times

- **Email Generation**: 2-5 seconds
- **Conversation Response**: 1-3 seconds
- **Risk Assessment**: 3-7 seconds
- **Strategy Recommendation**: 2-4 seconds

### Optimization Strategies

1. **Caching**: Enabled by default for similar prompts
2. **Streaming**: Use for real-time conversations
3. **Batch Processing**: Combine multiple requests when possible
4. **Model Selection**: Use faster models for simple tasks
5. **Prompt Optimization**: Keep prompts concise

---

## Monitoring and Logging

All LLM operations are logged with:
- Provider and model used
- Token usage
- Cost
- Latency
- Success/failure status
- Customer/agent/campaign IDs

**Example Log**:
```json
{
  "level": "info",
  "message": "Email generated successfully",
  "customerId": "cust-123",
  "provider": "openai",
  "model": "gpt-4-turbo",
  "tokens": 1250,
  "cost": 0.0187,
  "latency": 3421
}
```

---

## Next Steps (Phase 4)

1. **Vector Database Integration**
   - Add Qdrant for semantic memory
   - Implement conversation embeddings
   - Enable similarity search

2. **Advanced Memory System**
   - Short-term memory (session context)
   - Long-term memory (historical patterns)
   - Memory consolidation

3. **RAG Implementation**
   - Document retrieval
   - Context-aware responses
   - Knowledge base integration

4. **Testing Suite**
   - Unit tests for all services
   - Integration tests
   - Performance tests
   - Cost optimization tests

---

## Troubleshooting

### Common Issues

**Issue**: "Provider not configured"
**Solution**: Ensure API keys are set in `.env` file

**Issue**: "Budget limit exceeded"
**Solution**: Check budget status and adjust limits in config

**Issue**: "Token counting failed"
**Solution**: Fallback estimation is used automatically

**Issue**: "Rate limit exceeded"
**Solution**: Automatic retry with exponential backoff

---

## Support

For questions or issues:
1. Check the architecture documentation: `docs/llm/architecture.md`
2. Review the implementation code
3. Check logs for error details
4. Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-09  
**Status**: ✅ Implemented and Ready for Testing
