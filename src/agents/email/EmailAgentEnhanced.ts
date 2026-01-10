import { EmailAgent, EmailConfig, EmailTaskPayload } from './EmailAgent';
import { AgenticRAGService } from '@/services/memory/AgenticRAGService';
import { MemoryManager } from '@/services/memory/MemoryManager';
import { EmailGenerationService } from '@/services/llm/EmailGenerationService';
import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import { MessageQueueService } from '@/core/services/messageQueue';
import { createLogger, Logger } from '@/utils/logger';
import { Task, Customer, TaskStatus, ContactMethod } from '@/types';

/**
 * Enhanced Email Agent with Agentic RAG capabilities
 * 
 * Extends the base EmailAgent with:
 * - Agentic RAG for context-aware email generation
 * - Memory-based personalization
 * - Learning from past interactions
 * - Dynamic strategy selection
 */
export class EmailAgentEnhanced extends EmailAgent {
  private agenticRAG: AgenticRAGService;
  private memoryManager: MemoryManager;
  private emailGeneration: EmailGenerationService;
  private emailGenerationService: EmailGenerationService; // Alias for compatibility
  private llmService: any; // LLM service for advanced operations
  private logger: Logger;

  constructor(
    agentId: string,
    config: EmailConfig,
    dbService: DatabaseService,
    redisService: RedisService,
    mqService: MessageQueueService
  ) {
    super(agentId, config, dbService, redisService, mqService);
    
    this.agenticRAG = new AgenticRAGService();
    this.memoryManager = new MemoryManager();
    this.emailGeneration = new EmailGenerationService();
    this.emailGenerationService = this.emailGeneration; // Alias
    this.llmService = null; // Will be initialized if needed
    this.logger = createLogger(`EmailAgentEnhanced-${agentId}`);
  }

  /**
   * Initialize the enhanced email agent
   */
  async initialize(): Promise<void> {
    try {
      // Initialize base agent
      await super.initialize();

      // Initialize Agentic RAG
      await this.agenticRAG.initialize();
      this.logger.info('Agentic RAG initialized');

      // Initialize memory manager
      await this.memoryManager.initialize();
      this.logger.info('Memory manager initialized');

      this.logger.info('Enhanced Email Agent initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Enhanced Email Agent', error);
      throw error;
    }
  }

  /**
   * Process email task with Agentic RAG
   * 
   * Overrides the base handleEmailTask to use Agentic RAG for intelligent email generation.
   */
  protected async handleEmailTask(message: any): Promise<void> {
    const task = message.payload as Task;
    const sessionId = `email-${task.id}`;
    
    try {
      this.logger.info(`Processing task ${task.id} with Agentic RAG`);

      // Get customer details
      const customer = await this.getCustomer(task.customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${task.customerId}`);
      }

      // Extract email task payload
      const emailPayload = task.context.metadata as EmailTaskPayload;

      // Step 1: Create session in short-term memory
      await this.memoryManager.storeSession({
        sessionId,
        customerId: task.customerId,
        campaignId: task.campaignId,
        agentType: 'email',
        messages: [],
        context: {
          customerRisk: customer.riskLevel,
          paymentAmount: emailPayload.variables.amount,
          daysOverdue: emailPayload.variables.daysOverdue
        }
      });

      // Step 2: Use Agentic RAG to get context-aware recommendations
      const query = this.buildRAGQuery(customer, emailPayload);
      const ragResult = await this.agenticRAG.execute({
        query,
        customerId: task.customerId,
        campaignId: task.campaignId,
        agentType: 'email',
        context: {
          customerRisk: customer.riskLevel,
          paymentAmount: emailPayload.variables.amount,
          daysOverdue: emailPayload.variables.daysOverdue,
          previousAttempts: customer.contactAttempts || 0
        }
      });

      this.logger.debug(`Agentic RAG completed in ${ragResult.executionTime}ms with confidence ${ragResult.assembledContext.confidence}`);

      // Step 3: Generate intelligent email using assembled context
      let emailContent = await this.generateIntelligentEmail(
        customer,
        emailPayload,
        ragResult.assembledContext
      );

      // Step 4: Evaluate email quality
      let quality = await this.agenticRAG.evaluateResponse(
        emailContent.htmlContent,
        ragResult.assembledContext,
        ragResult.intent
      );

      // Refinement loop: regenerate if quality is too low
      let refinementAttempts = 0;
      const maxRefinementAttempts = 2;
      
      while (quality.needsRefinement && quality.overallScore < 0.7 && refinementAttempts < maxRefinementAttempts) {
        this.logger.warn(`Email quality low (${quality.overallScore}), regenerating (attempt ${refinementAttempts + 1}/${maxRefinementAttempts})...`);
        
        refinementAttempts++;
        
        // Regenerate with feedback
        const refinementPrompt = `Previous email had quality issues:
${quality.issues.map(issue => `- ${issue}`).join('\n')}

Please regenerate the email addressing these issues while maintaining the core message.`;
        
        emailContent = await this.emailGenerationService.generateEmail(
          customer,
          ragResult.assembledContext,
          ragResult.strategy,
          { refinementFeedback: refinementPrompt }
        );
        
        // Re-evaluate quality
        quality = await this.evaluateEmailQuality(
          emailContent.htmlContent,
          ragResult.assembledContext,
          ragResult.intent
        );
        
        this.logger.info(`Refinement attempt ${refinementAttempts}: new quality score ${quality.overallScore}`);
      }
      
      if (quality.overallScore < 0.7) {
        this.logger.error(`Email quality still low after ${refinementAttempts} refinement attempts`);
        // Continue anyway but log the issue
      }

      // Step 5: Send email
      const result = await this.sendEmailWithContent(customer, emailContent, task);

      // Step 6: Record contact attempt
      await this.recordContactAttempt(task, result);

      // Step 7: Update session with outcome
      await this.memoryManager.updateSession(sessionId, {
        conversationHistory: [
          {
            role: 'agent',
            content: emailContent.htmlContent,
            timestamp: new Date()
          }
        ],
        currentState: 'sent',
        metadata: {
          ragConfidence: ragResult.assembledContext.confidence,
          qualityScore: quality.overallScore
        }
      });

      // Step 8: Record feedback for learning
      await this.agenticRAG.recordFeedback({
        queryIntent: ragResult.intent,
        strategy: ragResult.strategy,
        outcome: {
          success: result.success,
          confidence: ragResult.assembledContext.confidence
        }
      });

      // Step 9: Update task status
      await this.updateTaskStatus(task.id, TaskStatus.COMPLETED);

      this.logger.info(`Email sent successfully for task ${task.id} with RAG confidence ${ragResult.assembledContext.confidence}`);

    } catch (error) {
      this.logger.error(`Failed to process email task ${task.id}`, error);
      
      await this.recordContactAttempt(task, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messageId: null
      });

      await this.updateTaskStatus(task.id, TaskStatus.FAILED);
      throw error;
    }
  }

  /**
   * Build RAG query based on customer and task context
   */
  private buildRAGQuery(customer: Customer, emailPayload: EmailTaskPayload): string {
    const { amount, daysOverdue, invoiceNumber } = emailPayload.variables;
    
    return `How should I approach collecting $${amount} from a ${customer.riskLevel} risk customer ` +
           `who is ${daysOverdue} days overdue on invoice ${invoiceNumber}? ` +
           `What strategies have worked in similar situations?`;
  }

  /**
   * Generate intelligent email using Agentic RAG context
   */
  private async generateIntelligentEmail(
    customer: Customer,
    emailPayload: EmailTaskPayload,
    context: any
  ): Promise<{
    subject: string;
    htmlContent: string;
    textContent: string;
  }> {
    try {
      // Build context for email generation
      const generationContext = {
        customer: {
          name: customer.contactName,
          company: customer.companyName,
          riskLevel: customer.riskLevel,
          paymentHistory: customer.paymentHistory
        },
        payment: {
          amount: emailPayload.variables.amount,
          currency: emailPayload.variables.currency || 'USD',
          invoiceNumber: emailPayload.variables.invoiceNumber,
          dueDate: emailPayload.variables.dueDate,
          daysOverdue: emailPayload.variables.daysOverdue
        },
        insights: {
          similarCases: context.similarCases,
          strategies: context.relevantStrategies,
          recommendations: context.recommendations
        },
        tone: this.determineTone(customer.riskLevel, emailPayload.variables.daysOverdue)
      };

      // Use EmailGenerationService with RAG context
      const email = await this.emailGeneration.generatePaymentEmail(generationContext);

      return email;

    } catch (error) {
      this.logger.error('Failed to generate intelligent email', error);
      
      // Fallback to template-based email
      return this.generateTemplateEmail(customer, emailPayload);
    }
  }

  /**
   * Determine appropriate tone based on customer risk and overdue days
   */
  private determineTone(riskLevel: string, daysOverdue: number): string {
    if (daysOverdue > 60) {
      return 'firm';
    } else if (daysOverdue > 30) {
      return 'assertive';
    } else if (riskLevel === 'high') {
      return 'professional';
    } else {
      return 'friendly';
    }
  }

  /**
   * Fallback: Generate email from template
   */
  private generateTemplateEmail(
    customer: Customer,
    emailPayload: EmailTaskPayload
  ): {
    subject: string;
    htmlContent: string;
    textContent: string;
  } {
    // Use the original template-based approach as fallback
    const template = this.config.templates[emailPayload.template];
    
    let subject = template.subject;
    let htmlContent = template.htmlContent;
    let textContent = template.textContent;

    // Replace variables
    for (const [key, value] of Object.entries(emailPayload.variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
      textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { subject, htmlContent, textContent };
  }

  /**
   * Send email with pre-generated content
   */
  private async sendEmailWithContent(
    customer: Customer,
    emailContent: {
      subject: string;
      htmlContent: string;
      textContent: string;
    },
    task: Task
  ): Promise<any> {
    try {
      const mailOptions = {
        from: this.config.defaultFrom,
        to: customer.email,
        subject: emailContent.subject,
        html: emailContent.htmlContent,
        text: emailContent.textContent,
        headers: {
          'X-Task-ID': task.id,
          'X-Campaign-ID': task.campaignId,
          'X-Customer-ID': task.customerId
        }
      };

      const info = await this.smtpTransporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw error;
    }
  }

  /**
   * Handle email response (when customer replies)
   */
  async handleEmailResponse(emailData: {
    from: string;
    subject: string;
    body: string;
    inReplyTo?: string;
  }): Promise<void> {
    try {
      // Find the original task/session
      const taskId = this.extractTaskIdFromEmail(emailData);
      if (!taskId) {
        this.logger.warn('Could not extract task ID from email response');
        return;
      }

      const sessionId = `email-${taskId}`;

      // Update session with customer response
      await this.memoryManager.updateSession(sessionId, {
        conversationHistory: [
          {
            role: 'customer',
            content: emailData.body,
            timestamp: new Date()
          }
        ],
        currentState: 'responded'
      });

      // Analyze response sentiment and intent
      const analysis = await this.analyzeResponse(emailData.body);

      // If customer agrees to pay, consolidate session to long-term memory
      if (analysis.intent === 'payment_commitment') {
        await this.memoryManager.consolidateSession(sessionId, {
          success: true,
          paymentReceived: false, // Not yet received
          nextAction: 'wait_for_payment'
        });
      }

      this.logger.info(`Processed email response for task ${taskId}`);

    } catch (error) {
      this.logger.error('Failed to handle email response', error);
    }
  }

  /**
   * Extract task ID from email headers
   * Looks for X-Task-ID header or task ID in subject/references
   */
  private extractTaskIdFromEmail(emailData: any): string | null {
    try {
      // Check for custom X-Task-ID header
      if (emailData.headers && emailData.headers['x-task-id']) {
        return emailData.headers['x-task-id'];
      }
      
      // Check for task ID in References header (threaded emails)
      if (emailData.headers && emailData.headers.references) {
        const references = Array.isArray(emailData.headers.references) 
          ? emailData.headers.references 
          : [emailData.headers.references];
        
        for (const ref of references) {
          const match = ref.match(/task-([a-zA-Z0-9-]+)@/);
          if (match) {
            return match[1];
          }
        }
      }
      
      // Check for task ID in In-Reply-To header
      if (emailData.headers && emailData.headers['in-reply-to']) {
        const match = emailData.headers['in-reply-to'].match(/task-([a-zA-Z0-9-]+)@/);
        if (match) {
          return match[1];
        }
      }
      
      // Check for task ID in subject line (format: [Task: TASK-123])
      if (emailData.subject) {
        const match = emailData.subject.match(/\[Task:\s*([a-zA-Z0-9-]+)\]/);
        if (match) {
          return match[1];
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to extract task ID from email', { error });
      return null;
    }
  }

  /**
   * Analyze customer response using LLM
   * Uses Gemini 2.0 Pro Exp for maximum quality analysis
   */
  private async analyzeResponse(body: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    intent: string;
  }> {
    try {
      const prompt = `Analyze this customer email response for sentiment and intent.

Email body:
"${body}"

Provide analysis in JSON format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "intent": "brief description of customer's intent (e.g., 'agrees to pay', 'requests extension', 'disputes charge', 'asks for information')",
  "reasoning": "brief explanation of your analysis"
}`;

      const response = await this.llmService.generateCompletion({
        provider: 'google',
        model: 'gemini-2.0-pro-exp',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.1,
        maxTokens: 512,
        responseFormat: { type: 'json_object' }
      });

      const analysis = JSON.parse(response.content);
      
      this.logger.debug('Customer response analyzed', {
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        reasoning: analysis.reasoning
      });

      return {
        sentiment: analysis.sentiment || 'neutral',
        intent: analysis.intent || 'unknown'
      };

    } catch (error) {
      this.logger.error('Failed to analyze customer response', { error });
      // Fallback to simple keyword-based analysis
      const lowerBody = body.toLowerCase();
      
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
      if (lowerBody.includes('thank') || lowerBody.includes('will pay') || lowerBody.includes('agree')) {
        sentiment = 'positive';
      } else if (lowerBody.includes('cannot') || lowerBody.includes('dispute') || lowerBody.includes('angry')) {
        sentiment = 'negative';
      }
      
      return {
        sentiment,
        intent: 'unknown'
      };
    }
  }

  /**
   * Evaluate email quality
   */
  private async evaluateEmailQuality(
    content: string,
    context: any,
    intent: string
  ): Promise<{ overallScore: number; [key: string]: any }> {
    // Simple quality evaluation based on content length and context
    const score = Math.min(100, content.length / 10 + (context.confidence || 0) * 50);
    return {
      overallScore: score,
      contentQuality: score,
      contextRelevance: context.confidence || 0,
      intent
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await super.close();
    await this.agenticRAG.close();
    await this.memoryManager.close();
    this.logger.info('Enhanced Email Agent closed');
  }
}
