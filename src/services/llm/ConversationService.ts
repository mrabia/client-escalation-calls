/**
 * Conversation Service
 * AI-powered conversation management for phone agents
 */

import { logger } from '@/utils/logger';
import { llmService } from './LLMService';
import {
  ConversationRequest,
  ConversationResponse,
  ChatMessage,
  AnthropicModel,
  PromptContext,
} from '@/types/llm';

export class ConversationService {
  /**
   * Generate conversation response
   */
  async generateResponse(request: ConversationRequest): Promise<ConversationResponse> {
    const startTime = Date.now();
    
    logger.info('Generating conversation response', {
      customerId: request.customerId,
      historyLength: request.conversationHistory.length,
    });

    // Build prompt messages
    const messages = this.buildConversationPrompt(request);

    // Generate with LLM (using Claude for conversation - better at following instructions)
    const response = await llmService.chat(messages, {
      model: AnthropicModel.CLAUDE_3_SONNET,
      temperature: 0.7,
      maxTokens: 500,
    });

    // Analyze sentiment and extract insights
    const analysis = this.analyzeResponse(response.content, request);

    const result: ConversationResponse = {
      response: response.content,
      suggestedActions: analysis.suggestedActions,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      nextSteps: analysis.nextSteps,
      metadata: {
        model: response.model,
        provider: response.provider,
        tokens: response.usage.totalTokens,
        cost: response.cost.totalCost,
        generatedAt: new Date(),
      },
    };

    const latency = Date.now() - startTime;
    logger.info('Conversation response generated', {
      customerId: request.customerId,
      sentiment: analysis.sentiment,
      tokens: response.usage.totalTokens,
      latency,
    });

    return result;
  }

  /**
   * Build conversation prompt
   */
  private buildConversationPrompt(request: ConversationRequest): ChatMessage[] {
    const systemPrompt = this.getConversationSystemPrompt(request.objective, request.context);
    
    // Include conversation history
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.conversationHistory,
      { role: 'user', content: request.currentInput },
    ];

    return messages;
  }

  /**
   * Get system prompt for conversation
   */
  private getConversationSystemPrompt(objective: string, context: PromptContext): string {
    return `You are a professional payment collection phone agent having a conversation with a customer. Your goal is to ${objective}.

**Customer Context:**
- Name: ${context.customerName || 'Customer'}
- Company: ${context.companyName || 'N/A'}
- Outstanding Amount: $${context.outstandingAmount?.toLocaleString() || '0'}
- Days Past Due: ${context.daysPastDue || 0} days
- Risk Level: ${context.riskLevel || 'Unknown'}
${context.paymentHistory ? `- Payment History: Customer has made ${context.paymentHistory.length} payments previously` : ''}
${context.previousAttempts ? `- Previous Contact Attempts: ${context.previousAttempts}` : ''}

**Your Role and Guidelines:**

1. **Be Empathetic and Professional**
   - Listen actively to customer concerns
   - Acknowledge their situation
   - Show understanding while maintaining professionalism
   - Build rapport and trust

2. **Stay Focused on the Goal**
   - Keep the conversation on track toward payment resolution
   - Gently redirect if customer goes off-topic
   - Don't get sidetracked by unrelated issues

3. **Provide Clear Information**
   - Be specific about amounts and dates
   - Explain payment options clearly
   - Answer questions directly and honestly
   - Avoid jargon or complex terms

4. **Offer Solutions**
   - Propose concrete payment options
   - Be flexible when appropriate
   - Make it easy for customer to commit
   - Provide clear next steps

5. **Handle Objections**
   - Address concerns directly
   - Provide alternatives
   - Don't argue or be defensive
   - Find common ground

6. **Maintain Control**
   - Be confident but not aggressive
   - Set clear expectations
   - Follow up on commitments
   - Document agreements

7. **Know When to Escalate**
   - Recognize when customer needs manager
   - Identify when legal discussion is needed
   - Understand your authority limits

**Response Guidelines:**
- Keep responses concise (2-4 sentences)
- Use natural, conversational language
- Ask clarifying questions when needed
- Confirm understanding of customer statements
- Always end with a clear next step or question

**Compliance:**
- Follow FDCPA and TCPA regulations
- Respect customer requests to stop contact
- Don't make threats or false statements
- Maintain professional boundaries

Generate your next response in the conversation.`;
  }

  /**
   * Analyze response for sentiment and insights
   */
  private analyzeResponse(
    response: string,
    request: ConversationRequest
  ): {
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    suggestedActions: string[];
    nextSteps: string[];
  } {
    // Simple sentiment analysis (could be enhanced with dedicated sentiment model)
    const positiveWords = ['yes', 'sure', 'okay', 'agree', 'will pay', 'understand', 'appreciate'];
    const negativeWords = ['no', 'cannot', 'unable', 'refuse', 'lawyer', 'dispute', 'unfair'];
    
    const lowerResponse = response.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerResponse.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerResponse.includes(word)).length;
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let confidence = 0.5;
    
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      confidence = Math.min(0.7 + (positiveCount * 0.1), 0.95);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      confidence = Math.min(0.7 + (negativeCount * 0.1), 0.95);
    }

    // Generate suggested actions based on conversation
    const suggestedActions: string[] = [];
    const nextSteps: string[] = [];

    if (lowerResponse.includes('payment') || lowerResponse.includes('pay')) {
      suggestedActions.push('Confirm payment amount and date');
      nextSteps.push('Send payment confirmation email');
    }

    if (lowerResponse.includes('plan') || lowerResponse.includes('installment')) {
      suggestedActions.push('Discuss payment plan options');
      nextSteps.push('Prepare payment plan agreement');
    }

    if (lowerResponse.includes('question') || lowerResponse.includes('?')) {
      suggestedActions.push('Provide clear answer to customer question');
      nextSteps.push('Follow up with additional information if needed');
    }

    if (lowerResponse.includes('manager') || lowerResponse.includes('supervisor')) {
      suggestedActions.push('Prepare for escalation to manager');
      nextSteps.push('Transfer call to supervisor');
    }

    if (lowerResponse.includes('lawyer') || lowerResponse.includes('attorney')) {
      suggestedActions.push('Note legal representation');
      nextSteps.push('Cease direct contact, communicate through attorney');
    }

    // Default actions if none detected
    if (suggestedActions.length === 0) {
      suggestedActions.push('Continue conversation toward payment commitment');
      nextSteps.push('Ask for specific payment date');
    }

    return {
      sentiment,
      confidence,
      suggestedActions,
      nextSteps,
    };
  }

  /**
   * Generate conversation summary
   */
  async summarizeConversation(
    conversationHistory: ChatMessage[],
    context: PromptContext
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert at summarizing payment collection conversations. Create a concise summary that captures:
1. Key points discussed
2. Customer's position and concerns
3. Commitments made
4. Next steps agreed upon
5. Overall outcome`,
      },
      {
        role: 'user',
        content: `Please summarize the following conversation:

Customer: ${context.customerName}
Outstanding: $${context.outstandingAmount}

Conversation:
${conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}

Provide a structured summary.`,
      },
    ];

    const response = await llmService.chat(messages, {
      model: AnthropicModel.CLAUDE_3_SONNET,
      temperature: 0.3,
      maxTokens: 500,
    });

    return response.content;
  }

  /**
   * Detect customer intent
   */
  async detectIntent(
    customerMessage: string,
    context: PromptContext
  ): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, any>;
  }> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an intent detection system for payment collection conversations. Analyze the customer's message and identify their intent.

Possible intents:
- payment_commitment: Customer agrees to pay
- payment_plan_request: Customer wants payment plan
- dispute: Customer disputes the debt
- request_information: Customer needs more information
- financial_hardship: Customer explains inability to pay
- escalation_request: Customer wants to speak to manager
- legal_representation: Customer mentions lawyer
- opt_out: Customer wants to stop contact
- other: None of the above

Respond in JSON format:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "entities": {
    "payment_amount": number or null,
    "payment_date": "date string" or null,
    "reason": "string" or null
  }
}`,
      },
      {
        role: 'user',
        content: `Customer message: "${customerMessage}"

Context:
- Outstanding: $${context.outstandingAmount}
- Days overdue: ${context.daysPastDue}

Analyze the intent.`,
      },
    ];

    const response = await llmService.chat(messages, {
      model: AnthropicModel.CLAUDE_3_SONNET,
      temperature: 0.1,
      maxTokens: 300,
    });

    try {
      const parsed = JSON.parse(response.content);
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse intent detection response', { error });
      return {
        intent: 'other',
        confidence: 0.5,
        entities: {},
      };
    }
  }

  /**
   * Generate objection handling response
   */
  async handleObjection(
    objection: string,
    context: PromptContext
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert at handling customer objections in payment collection. Provide a professional, empathetic response that addresses the objection while moving toward resolution.`,
      },
      {
        role: 'user',
        content: `Customer objection: "${objection}"

Context:
- Customer: ${context.customerName}
- Outstanding: $${context.outstandingAmount}
- Days overdue: ${context.daysPastDue}
- Risk level: ${context.riskLevel}

Provide a response that:
1. Acknowledges the objection
2. Addresses the concern
3. Offers a solution
4. Moves toward payment commitment

Keep it concise (2-3 sentences).`,
      },
    ];

    const response = await llmService.chat(messages, {
      model: AnthropicModel.CLAUDE_3_SONNET,
      temperature: 0.7,
      maxTokens: 300,
    });

    return response.content;
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
