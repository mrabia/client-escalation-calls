import { EmailAgent, EmailConfig, EmailTaskPayload } from './EmailAgent';
import { AgenticRAGService } from '@/services/memory/AgenticRAGService';
import { MemoryManager } from '@/services/memory/MemoryManager';
import { EmailGenerationService } from '@/services/llm/EmailGenerationService';
import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import { MessageQueueService } from '@/core/services/messageQueue';
import { Logger } from '@/utils/logger';
import { Task, Customer } from '@/types';

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
    this.logger = new Logger(`EmailAgentEnhanced-${agentId}`);
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
      const emailContent = await this.generateIntelligentEmail(
        customer,
        emailPayload,
        ragResult.assembledContext
      );

      // Step 4: Evaluate email quality
      const quality = await this.agenticRAG.evaluateResponse(
        emailContent.htmlContent,
        ragResult.assembledContext,
        ragResult.intent
      );

      if (quality.needsRefinement && quality.overallScore < 0.7) {
        this.logger.warn(`Email quality low (${quality.overallScore}), regenerating...`);
        // TODO: Implement refinement loop
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
      await this.updateTaskStatus(task.id, 'COMPLETED');

      this.logger.info(`Email sent successfully for task ${task.id} with RAG confidence ${ragResult.assembledContext.confidence}`);

    } catch (error) {
      this.logger.error(`Failed to process email task ${task.id}`, error);
      
      await this.recordContactAttempt(task, {
        success: false,
        error: error.message,
        messageId: null
      });

      await this.updateTaskStatus(task.id, 'FAILED');
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
   */
  private extractTaskIdFromEmail(emailData: any): string | null {
    // TODO: Implement extraction from email headers
    return null;
  }

  /**
   * Analyze customer response
   */
  private async analyzeResponse(body: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    intent: string;
  }> {
    // TODO: Implement with LLM
    return {
      sentiment: 'neutral',
      intent: 'unknown'
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
