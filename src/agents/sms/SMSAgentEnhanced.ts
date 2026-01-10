import { SMSAgent } from './SMSAgent';
import { AgenticRAGService } from '@/services/memory/AgenticRAGService';
import { MemoryManager } from '@/services/memory/MemoryManager';
import { Logger } from '@/utils/logger';

/**
 * Enhanced SMS Agent with Agentic RAG capabilities
 * 
 * Extends the base SMSAgent with:
 * - Agentic RAG for context-aware SMS generation
 * - Memory-based personalization
 * - Learning from SMS response patterns
 * - Dynamic message optimization
 */
export class SMSAgentEnhanced extends SMSAgent {
  private agenticRAG: AgenticRAGService;
  private memoryManager: MemoryManager;
  private logger: Logger;

  constructor(agentId: string, config: any, dbService: any, redisService: any, mqService: any) {
    super(agentId, config, dbService, redisService, mqService);
    
    this.agenticRAG = new AgenticRAGService();
    this.memoryManager = new MemoryManager();
    this.logger = new Logger(`SMSAgentEnhanced-${agentId}`);
  }

  /**
   * Initialize the enhanced SMS agent
   */
  async initialize(): Promise<void> {
    try {
      await super.initialize();
      await this.agenticRAG.initialize();
      await this.memoryManager.initialize();
      
      this.logger.info('Enhanced SMS Agent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Enhanced SMS Agent', error);
      throw error;
    }
  }

  /**
   * Handle SMS task with Agentic RAG
   */
  protected async handleSMSTask(task: any): Promise<void> {
    const sessionId = `sms-${task.id}`;
    
    try {
      this.logger.info(`Processing SMS task ${task.id} with Agentic RAG`);

      // Get customer details
      const customer = await this.getCustomer(task.customerId);

      // Create session
      await this.memoryManager.storeSession({
        sessionId,
        customerId: task.customerId,
        campaignId: task.campaignId,
        agentType: 'sms',
        messages: [],
        context: {
          customerRisk: customer.riskLevel,
          paymentAmount: task.context.amount
        }
      });

      // Get SMS generation context from Agentic RAG
      const query = `Generate an effective SMS message for a ${customer.riskLevel} risk customer about $${task.context.amount} overdue payment`;
      const ragResult = await this.agenticRAG.execute({
        query,
        customerId: task.customerId,
        campaignId: task.campaignId,
        agentType: 'sms',
        context: {
          customerRisk: customer.riskLevel,
          paymentAmount: task.context.amount,
          previousAttempts: customer.contactAttempts || 0
        }
      });

      this.logger.debug(`Agentic RAG completed with confidence ${ragResult.assembledContext.confidence}`);

      // Generate intelligent SMS
      const smsContent = await this.generateIntelligentSMS(
        customer,
        task.context,
        ragResult.assembledContext
      );

      // Send SMS
      const result = await this.sendSMS(customer.phone, smsContent);

      // Update session
      await this.memoryManager.updateSession(sessionId, {
        conversationHistory: [
          {
            role: 'agent',
            content: smsContent,
            timestamp: new Date()
          }
        ],
        currentState: 'sent'
      });

      // Record feedback
      await this.agenticRAG.recordFeedback({
        queryIntent: ragResult.intent,
        strategy: ragResult.strategy,
        outcome: {
          success: result.success,
          confidence: ragResult.assembledContext.confidence
        }
      });

      this.logger.info(`SMS sent successfully for task ${task.id}`);

    } catch (error) {
      this.logger.error(`Failed to process SMS task ${task.id}`, error);
      throw error;
    }
  }

  /**
   * Generate intelligent SMS using Agentic RAG context
   */
  private async generateIntelligentSMS(
    customer: any,
    taskContext: any,
    ragContext: any
  ): Promise<string> {
    try {
      // Build SMS based on RAG recommendations
      const recommendations = ragContext.recommendations[0] || 'Please contact us regarding your payment';
      
      // SMS must be concise (160 characters ideally)
      const sms = `Hi ${customer.contactName}, ${recommendations}. Reply STOP to opt-out.`;
      
      // Ensure it's within SMS length limits
      return sms.length > 160 ? sms.substring(0, 157) + '...' : sms;

    } catch (error) {
      this.logger.error('Failed to generate intelligent SMS', error);
      
      // Fallback to simple message
      return `Payment reminder for invoice ${taskContext.invoiceNumber}. Amount: $${taskContext.amount}. Reply STOP to opt-out.`;
    }
  }

  /**
   * Handle SMS response from customer
   */
  async handleSMSResponse(response: {
    from: string;
    body: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Find session for this customer
      const sessions = await this.memoryManager.getCustomerSessions(response.from);
      const smsSession = sessions.find(s => s.agentType === 'sms');

      if (!smsSession) {
        this.logger.warn(`No SMS session found for ${response.from}`);
        return;
      }

      // Update session with response
      await this.memoryManager.updateSession(smsSession.sessionId, {
        conversationHistory: [
          {
            role: 'customer',
            content: response.body,
            timestamp: response.timestamp
          }
        ],
        currentState: 'responded'
      });

      // Check for opt-out
      if (response.body.toUpperCase().includes('STOP')) {
        await this.handleOptOut(response.from);
      }

      // Check for payment commitment
      if (this.isPaymentCommitment(response.body)) {
        await this.memoryManager.consolidateSession(smsSession.sessionId, {
          success: true,
          paymentReceived: false,
          nextAction: 'wait_for_payment'
        });
      }

      this.logger.info(`Processed SMS response from ${response.from}`);

    } catch (error) {
      this.logger.error('Failed to handle SMS response', error);
    }
  }

  /**
   * Check if message indicates payment commitment
   */
  private isPaymentCommitment(message: string): boolean {
    const commitmentKeywords = ['yes', 'ok', 'will pay', 'tomorrow', 'today', 'agree'];
    const lowerMessage = message.toLowerCase();
    return commitmentKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Handle opt-out request
   */
  private async handleOptOut(phone: string): Promise<void> {
    // TODO: Implement opt-out in database
    this.logger.info(`Opt-out request from ${phone}`);
  }

  /**
   * Send SMS (placeholder - depends on SMS provider)
   */
  private async sendSMS(phone: string, content: string): Promise<{ success: boolean }> {
    // TODO: Implement with Twilio or other SMS provider
    this.logger.info(`Sending SMS to ${phone}: ${content}`);
    return { success: true };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await super.close();
    await this.agenticRAG.close();
    await this.memoryManager.close();
    this.logger.info('Enhanced SMS Agent closed');
  }
}
