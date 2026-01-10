/**
 * Email Generation Service
 * AI-powered email generation for payment collection
 */

import { logger } from '@/utils/logger';
import { llmService } from './LLMService';
import {
  EmailGenerationRequest,
  EmailGenerationResponse,
  ChatMessage,
  OpenAIModel,
  PromptContext,
} from '@/types/llm';

export class EmailGenerationService {
  /**
   * Generate payment collection email
   */
  async generateEmail(request: EmailGenerationRequest): Promise<EmailGenerationResponse> {
    const startTime = Date.now();
    
    logger.info('Generating email', {
      customerId: request.customerId,
      templateType: request.templateType,
      tone: request.tone,
    });

    // Build prompt messages
    const messages = this.buildPrompt(request);

    // Generate with LLM
    const response = await llmService.chat(messages, {
      model: OpenAIModel.GPT4_TURBO,
      temperature: 0.7,
      maxTokens: 1500,
    });

    // Parse response
    const { subject, body } = this.parseEmailResponse(response.content);

    // Calculate estimated reading time
    const wordCount = body.split(/\s+/).length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute

    const result: EmailGenerationResponse = {
      subject,
      body,
      tone: request.tone,
      estimatedReadingTime,
      metadata: {
        model: response.model,
        provider: response.provider,
        tokens: response.usage.totalTokens,
        cost: response.cost.totalCost,
        generatedAt: new Date(),
      },
    };

    const latency = Date.now() - startTime;
    logger.info('Email generated successfully', {
      customerId: request.customerId,
      tokens: response.usage.totalTokens,
      cost: response.cost.totalCost,
      latency,
    });

    return result;
  }

  /**
   * Build prompt for email generation
   */
  private buildPrompt(request: EmailGenerationRequest): ChatMessage[] {
    const systemPrompt = this.getSystemPrompt(request.tone);
    const userPrompt = this.getUserPrompt(request);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * Get system prompt based on tone
   */
  private getSystemPrompt(tone: string): string {
    const basePrompt = `You are a professional payment collection specialist with excellent communication skills. Your goal is to encourage customers to pay their outstanding invoices while maintaining a positive relationship.

Key principles:
- Be respectful and empathetic
- Focus on solutions, not problems
- Provide clear next steps
- Maintain professionalism
- Acknowledge the customer's business relationship
- Make payment as easy as possible

`;

    const toneGuidelines: Record<string, string> = {
      professional: `Tone: Professional and businesslike
- Use formal language
- Be direct but courteous
- Focus on facts and deadlines
- Maintain a neutral, business-focused approach`,

      friendly: `Tone: Friendly and approachable
- Use conversational language
- Show understanding and flexibility
- Build rapport
- Emphasize partnership`,

      urgent: `Tone: Urgent but respectful
- Convey time sensitivity
- Highlight consequences clearly
- Offer immediate solutions
- Maintain professionalism despite urgency`,

      formal: `Tone: Formal and official
- Use formal business language
- Reference policies and terms
- Be precise and structured
- Maintain legal compliance`,
    };

    return basePrompt + (toneGuidelines[tone] || toneGuidelines.professional);
  }

  /**
   * Get user prompt with context
   */
  private getUserPrompt(request: EmailGenerationRequest): string {
    const { context, templateType, includePaymentLink, includeContactInfo } = request;

    let prompt = `Generate a payment collection email with the following details:\n\n`;

    // Customer information
    prompt += `**Customer Information:**\n`;
    prompt += `- Name: ${context.customerName || 'Customer'}\n`;
    prompt += `- Company: ${context.companyName || 'N/A'}\n`;
    if (context.industry) prompt += `- Industry: ${context.industry}\n`;
    if (context.companySize) prompt += `- Company Size: ${context.companySize}\n`;
    prompt += `\n`;

    // Payment information
    prompt += `**Payment Details:**\n`;
    prompt += `- Outstanding Amount: $${context.outstandingAmount?.toLocaleString() || '0'}\n`;
    prompt += `- Days Past Due: ${context.daysPastDue || 0} days\n`;
    if (context.riskLevel) prompt += `- Risk Level: ${context.riskLevel}\n`;
    prompt += `\n`;

    // Communication history
    if (context.previousAttempts && context.previousAttempts > 0) {
      prompt += `**Previous Communication:**\n`;
      prompt += `- Number of previous attempts: ${context.previousAttempts}\n`;
      if (context.communicationHistory && context.communicationHistory.length > 0) {
        prompt += `- Recent contacts: ${context.communicationHistory.slice(0, 3).map(c => c.channel).join(', ')}\n`;
      }
      prompt += `\n`;
    }

    // Payment history context
    if (context.paymentHistory && context.paymentHistory.length > 0) {
      prompt += `**Payment History:**\n`;
      const recentPayments = context.paymentHistory.slice(0, 3);
      prompt += `- Customer has made ${context.paymentHistory.length} payments in the past\n`;
      if (context.communicationStyle) {
        prompt += `- Preferred communication style: ${context.communicationStyle}\n`;
      }
      prompt += `\n`;
    }

    // Template type instructions
    prompt += `**Email Type:** ${templateType}\n\n`;

    const templateInstructions: Record<string, string> = {
      reminder: `This is a friendly payment reminder. The customer may have simply forgotten. Focus on:
- Gentle reminder of the outstanding invoice
- Easy payment options
- Offer to answer questions
- Maintain positive relationship`,

      urgent: `This is an urgent payment request. The payment is significantly overdue. Focus on:
- Clear statement of urgency
- Specific consequences if not paid
- Immediate action required
- Payment options and deadlines
- Contact information for discussion`,

      final_notice: `This is a final notice before escalation. Be firm but professional. Focus on:
- Clear statement this is the final notice
- Specific escalation consequences
- Last opportunity to resolve
- Immediate payment required
- Legal or collection agency mention if appropriate`,

      payment_plan: `This is an offer to set up a payment plan. Be solution-focused. Focus on:
- Acknowledge the difficulty
- Offer flexible payment options
- Specific payment plan proposals
- Benefits of staying current
- Easy next steps to accept`,
    };

    prompt += templateInstructions[templateType] || templateInstructions.reminder;
    prompt += `\n\n`;

    // Additional requirements
    prompt += `**Requirements:**\n`;
    if (includePaymentLink) {
      prompt += `- Include a payment link placeholder: [PAYMENT_LINK]\n`;
    }
    if (includeContactInfo) {
      prompt += `- Include contact information placeholder: [CONTACT_INFO]\n`;
    }
    prompt += `- Keep the email concise (200-400 words)\n`;
    prompt += `- Use clear, actionable language\n`;
    prompt += `- Include a clear call-to-action\n`;
    prompt += `\n`;

    // Output format
    prompt += `**Output Format:**\n`;
    prompt += `Please provide the email in the following format:\n\n`;
    prompt += `SUBJECT: [Email subject line]\n\n`;
    prompt += `BODY:\n[Email body content]\n`;

    return prompt;
  }

  /**
   * Parse LLM response into subject and body
   */
  private parseEmailResponse(content: string): { subject: string; body: string } {
    const lines = content.trim().split('\n');
    let subject = '';
    let body = '';
    let inBody = false;

    for (const line of lines) {
      if (line.startsWith('SUBJECT:')) {
        subject = line.replace('SUBJECT:', '').trim();
      } else if (line.startsWith('BODY:')) {
        inBody = true;
      } else if (inBody) {
        body += line + '\n';
      }
    }

    // Fallback if parsing fails
    if (!subject || !body) {
      const parts = content.split('\n\n', 2);
      subject = parts[0]?.replace(/^(Subject|SUBJECT):\s*/i, '').trim() || 'Payment Reminder';
      body = parts[1] || content;
    }

    return {
      subject: subject.trim(),
      body: body.trim(),
    };
  }

  /**
   * Generate payment email with specific context
   * Alias for generateEmail with payment-specific defaults
   */
  async generatePaymentEmail(
    customerId: string,
    context: any,
    options?: { tone?: string; templateType?: string }
  ): Promise<EmailGenerationResponse> {
    const request: EmailGenerationRequest = {
      customerId,
      templateType: options?.templateType || 'reminder',
      tone: options?.tone || 'professional',
      context: {
        customerName: context.customerName || context.contactName,
        companyName: context.companyName,
        outstandingAmount: context.amount || context.outstandingAmount,
        daysPastDue: context.daysOverdue || context.daysPastDue || 0,
        riskLevel: context.riskLevel,
        previousAttempts: context.previousAttempts || 0,
      },
      includePaymentLink: true,
      includeContactInfo: true,
    };
    return this.generateEmail(request);
  }

  /**
   * Generate multiple email variations for A/B testing
   */
  async generateVariations(
    request: EmailGenerationRequest,
    count: number = 3
  ): Promise<EmailGenerationResponse[]> {
    logger.info('Generating email variations', {
      customerId: request.customerId,
      count,
    });

    const variations: EmailGenerationResponse[] = [];

    for (let i = 0; i < count; i++) {
      const variation = await this.generateEmail({
        ...request,
        // Vary temperature for different variations
      });
      variations.push(variation);
    }

    return variations;
  }

  /**
   * Optimize email for better response rate
   */
  async optimizeEmail(
    originalEmail: string,
    context: PromptContext
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert in email optimization for payment collection. Your goal is to improve email effectiveness while maintaining professionalism.`,
      },
      {
        role: 'user',
        content: `Please optimize the following payment collection email for better response rate:

${originalEmail}

Context:
- Customer: ${context.customerName}
- Outstanding: $${context.outstandingAmount}
- Days overdue: ${context.daysPastDue}
- Risk level: ${context.riskLevel}

Improvements to focus on:
1. Clearer subject line
2. Stronger opening
3. More specific call-to-action
4. Better formatting
5. Personalization

Provide the optimized email in the same format.`,
      },
    ];

    const response = await llmService.chat(messages, {
      model: OpenAIModel.GPT4_TURBO,
      temperature: 0.7,
      maxTokens: 1500,
    });

    return response.content;
  }
}

// Export singleton instance
export const emailGenerationService = new EmailGenerationService();
