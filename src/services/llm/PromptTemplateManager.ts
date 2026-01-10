/**
 * Prompt Template Manager
 * Centralized management of LLM prompt templates
 */

import { logger } from '@/utils/logger';
import {
  PromptTemplate,
  PromptVariable,
  LLMProvider,
  OpenAIModel,
  AnthropicModel,
  GoogleModel,
} from '@/types/llm';

export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default prompt templates
   */
  private initializeDefaultTemplates(): void {
    // Email templates
    this.registerTemplate(this.createEmailReminderTemplate());
    this.registerTemplate(this.createEmailUrgentTemplate());
    this.registerTemplate(this.createEmailFinalNoticeTemplate());
    this.registerTemplate(this.createEmailPaymentPlanTemplate());

    // Conversation templates
    this.registerTemplate(this.createConversationTemplate());
    this.registerTemplate(this.createObjectionHandlingTemplate());

    // Analysis templates
    this.registerTemplate(this.createRiskAssessmentTemplate());
    this.registerTemplate(this.createStrategyRecommendationTemplate());

    logger.info(`Initialized ${this.templates.size} prompt templates`);
  }

  /**
   * Register a template
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    logger.debug(`Registered template: ${template.id}`);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Render template with variables
   */
  renderTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate required variables
    const missingVars = template.variables
      .filter(v => v.required && !(v.name in variables))
      .map(v => v.name);

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Replace variables in template
    let rendered = template.userPromptTemplate;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }

    return rendered;
  }

  /**
   * Email Reminder Template
   */
  private createEmailReminderTemplate(): PromptTemplate {
    return {
      id: 'email-payment-reminder',
      name: 'Payment Reminder Email',
      description: 'Friendly payment reminder for overdue invoices',
      version: '1.0.0',
      provider: LLMProvider.OPENAI,
      model: OpenAIModel.GPT4_TURBO,
      systemPrompt: `You are a professional payment collection specialist. Generate a friendly but professional payment reminder email.`,
      userPromptTemplate: `Generate a payment reminder email for:
- Customer: {{customerName}}
- Company: {{companyName}}
- Outstanding Amount: ${{outstandingAmount}}
- Days Past Due: {{daysPastDue}}
- Invoice Number: {{invoiceNumber}}

Tone: Friendly and professional
Include: Payment link, contact information
Format: Subject line and email body`,
      variables: [
        { name: 'customerName', type: 'string', required: true, description: 'Customer name' },
        { name: 'companyName', type: 'string', required: true, description: 'Company name' },
        { name: 'outstandingAmount', type: 'number', required: true, description: 'Outstanding amount' },
        { name: 'daysPastDue', type: 'number', required: true, description: 'Days past due' },
        { name: 'invoiceNumber', type: 'string', required: false, description: 'Invoice number' },
      ],
      outputFormat: 'SUBJECT: [subject]\n\nBODY:\n[body]',
    };
  }

  /**
   * Email Urgent Template
   */
  private createEmailUrgentTemplate(): PromptTemplate {
    return {
      id: 'email-urgent-collection',
      name: 'Urgent Collection Email',
      description: 'Urgent payment request for significantly overdue accounts',
      version: '1.0.0',
      provider: LLMProvider.OPENAI,
      model: OpenAIModel.GPT4_TURBO,
      systemPrompt: `You are a professional payment collection specialist. Generate an urgent but respectful payment request email.`,
      userPromptTemplate: `Generate an urgent payment request email for:
- Customer: {{customerName}}
- Company: {{companyName}}
- Outstanding Amount: ${{outstandingAmount}}
- Days Past Due: {{daysPastDue}}
- Previous Attempts: {{previousAttempts}}

Tone: Urgent but professional
Emphasize: Time sensitivity, consequences, immediate action required
Include: Payment options, deadline, contact information`,
      variables: [
        { name: 'customerName', type: 'string', required: true },
        { name: 'companyName', type: 'string', required: true },
        { name: 'outstandingAmount', type: 'number', required: true },
        { name: 'daysPastDue', type: 'number', required: true },
        { name: 'previousAttempts', type: 'number', required: false },
      ],
      outputFormat: 'SUBJECT: [subject]\n\nBODY:\n[body]',
    };
  }

  /**
   * Email Final Notice Template
   */
  private createEmailFinalNoticeTemplate(): PromptTemplate {
    return {
      id: 'email-final-notice',
      name: 'Final Notice Email',
      description: 'Final notice before escalation to collections',
      version: '1.0.0',
      provider: LLMProvider.OPENAI,
      model: OpenAIModel.GPT4_TURBO,
      systemPrompt: `You are a professional payment collection specialist. Generate a firm but professional final notice email.`,
      userPromptTemplate: `Generate a final notice email for:
- Customer: {{customerName}}
- Company: {{companyName}}
- Outstanding Amount: ${{outstandingAmount}}
- Days Past Due: {{daysPastDue}}
- Escalation Date: {{escalationDate}}

Tone: Firm but professional
Emphasize: Final opportunity, escalation consequences, legal action
Include: Immediate payment required, last chance to resolve`,
      variables: [
        { name: 'customerName', type: 'string', required: true },
        { name: 'companyName', type: 'string', required: true },
        { name: 'outstandingAmount', type: 'number', required: true },
        { name: 'daysPastDue', type: 'number', required: true },
        { name: 'escalationDate', type: 'string', required: false },
      ],
      outputFormat: 'SUBJECT: [subject]\n\nBODY:\n[body]',
    };
  }

  /**
   * Email Payment Plan Template
   */
  private createEmailPaymentPlanTemplate(): PromptTemplate {
    return {
      id: 'email-payment-plan',
      name: 'Payment Plan Offer Email',
      description: 'Offer flexible payment plan options',
      version: '1.0.0',
      provider: LLMProvider.OPENAI,
      model: OpenAIModel.GPT4_TURBO,
      systemPrompt: `You are a professional payment collection specialist. Generate a solution-focused payment plan offer email.`,
      userPromptTemplate: `Generate a payment plan offer email for:
- Customer: {{customerName}}
- Company: {{companyName}}
- Outstanding Amount: ${{outstandingAmount}}
- Proposed Plan: {{proposedPlan}}

Tone: Helpful and solution-focused
Emphasize: Flexibility, partnership, easy next steps
Include: Specific payment plan options, benefits, acceptance process`,
      variables: [
        { name: 'customerName', type: 'string', required: true },
        { name: 'companyName', type: 'string', required: true },
        { name: 'outstandingAmount', type: 'number', required: true },
        { name: 'proposedPlan', type: 'string', required: false },
      ],
      outputFormat: 'SUBJECT: [subject]\n\nBODY:\n[body]',
    };
  }

  /**
   * Conversation Template
   */
  private createConversationTemplate(): PromptTemplate {
    return {
      id: 'phone-conversation',
      name: 'Phone Conversation',
      description: 'Real-time phone conversation responses',
      version: '1.0.0',
      provider: LLMProvider.ANTHROPIC,
      model: AnthropicModel.CLAUDE_3_SONNET,
      systemPrompt: `You are a professional payment collection phone agent. Generate natural, empathetic responses that move the conversation toward payment resolution.`,
      userPromptTemplate: `Customer: {{customerName}}
Outstanding: ${{outstandingAmount}}
Days Overdue: {{daysPastDue}}

Conversation context: {{conversationContext}}
Customer just said: "{{customerInput}}"

Generate your response (2-4 sentences, natural and conversational).`,
      variables: [
        { name: 'customerName', type: 'string', required: true },
        { name: 'outstandingAmount', type: 'number', required: true },
        { name: 'daysPastDue', type: 'number', required: true },
        { name: 'conversationContext', type: 'string', required: false },
        { name: 'customerInput', type: 'string', required: true },
      ],
      outputFormat: 'Natural conversational response',
    };
  }

  /**
   * Objection Handling Template
   */
  private createObjectionHandlingTemplate(): PromptTemplate {
    return {
      id: 'objection-handling',
      name: 'Objection Handling',
      description: 'Handle customer objections professionally',
      version: '1.0.0',
      provider: LLMProvider.ANTHROPIC,
      model: AnthropicModel.CLAUDE_3_SONNET,
      systemPrompt: `You are an expert at handling customer objections in payment collection. Provide empathetic, solution-focused responses.`,
      userPromptTemplate: `Customer objection: "{{objection}}"

Context:
- Customer: {{customerName}}
- Outstanding: ${{outstandingAmount}}
- Days Overdue: {{daysPastDue}}

Generate a response that:
1. Acknowledges the objection
2. Addresses the concern
3. Offers a solution
4. Moves toward commitment

Keep it concise (2-3 sentences).`,
      variables: [
        { name: 'objection', type: 'string', required: true },
        { name: 'customerName', type: 'string', required: true },
        { name: 'outstandingAmount', type: 'number', required: true },
        { name: 'daysPastDue', type: 'number', required: true },
      ],
      outputFormat: 'Natural conversational response',
    };
  }

  /**
   * Risk Assessment Template
   */
  private createRiskAssessmentTemplate(): PromptTemplate {
    return {
      id: 'risk-assessment',
      name: 'Customer Risk Assessment',
      description: 'Comprehensive customer payment risk analysis',
      version: '1.0.0',
      provider: LLMProvider.GOOGLE,
      model: GoogleModel.GEMINI_2_PRO_EXP,
      systemPrompt: `You are an expert financial risk analyst. Analyze customer data and provide a comprehensive risk assessment with high precision.`,
      userPromptTemplate: `Analyze payment risk for:
- Customer: {{customerName}}
- Outstanding: ${{outstandingAmount}}
- Days Overdue: {{daysPastDue}}
- Payment History: {{paymentHistory}}
- Communication History: {{communicationHistory}}

Provide risk score (0-100), risk level, key factors, and recommendations in JSON format.`,
      variables: [
        { name: 'customerName', type: 'string', required: true },
        { name: 'outstandingAmount', type: 'number', required: true },
        { name: 'daysPastDue', type: 'number', required: true },
        { name: 'paymentHistory', type: 'string', required: false },
        { name: 'communicationHistory', type: 'string', required: false },
      ],
      outputFormat: 'JSON with risk score, level, factors, and recommendations',
    };
  }

  /**
   * Strategy Recommendation Template
   */
  private createStrategyRecommendationTemplate(): PromptTemplate {
    return {
      id: 'strategy-recommendation',
      name: 'Collection Strategy Recommendation',
      description: 'Recommend optimal collection strategy based on risk assessment',
      version: '1.0.0',
      provider: LLMProvider.GOOGLE,
      model: GoogleModel.GEMINI_2_PRO_EXP,
      systemPrompt: `You are an expert collection strategy consultant. Recommend the optimal approach based on customer risk profile.`,
      userPromptTemplate: `Recommend collection strategy for:
- Customer: {{customerName}}
- Risk Score: {{riskScore}}
- Risk Level: {{riskLevel}}
- Available Channels: {{availableChannels}}

Provide channel, tone, timing, and strategy in JSON format.`,
      variables: [
        { name: 'customerName', type: 'string', required: true },
        { name: 'riskScore', type: 'number', required: true },
        { name: 'riskLevel', type: 'string', required: true },
        { name: 'availableChannels', type: 'string', required: true },
      ],
      outputFormat: 'JSON with recommended channel, tone, timing, and strategy',
    };
  }

  /**
   * List templates by provider
   */
  getTemplatesByProvider(provider: LLMProvider): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.provider === provider);
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(
      t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<PromptTemplate>): void {
    const template = this.getTemplate(id);
    
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    const updated = { ...template, ...updates };
    this.registerTemplate(updated);
    
    logger.info(`Updated template: ${id}`);
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    
    if (deleted) {
      logger.info(`Deleted template: ${id}`);
    }
    
    return deleted;
  }
}

// Export singleton instance
export const promptTemplateManager = new PromptTemplateManager();
