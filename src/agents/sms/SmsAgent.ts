import twilio from 'twilio';
import { logger } from '@/utils/logger';
import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import { MessageQueueService } from '@/core/services/messageQueue';
import {
  Task,
  TaskStatus,
  ContactAttempt,
  ContactStatus,
  Customer,
  AgentType
} from '@/types';

export interface SmsConfig {
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    messagingServiceSid?: string;
  };
  messageSettings: {
    maxLength: number;
    enableDeliveryTracking: boolean;
    enableOptOut: boolean;
    optOutKeywords: string[];
  };
  templates: Record<string, SmsTemplate>;
  complianceSettings: {
    includeOptOut: boolean;
    businessHours: {
      start: string;
      end: string;
      timezone: string;
    };
    respectDoNotContact: boolean;
  };
}

export interface SmsTemplate {
  content: string;
  variables: string[];
  category: 'reminder' | 'notice' | 'confirmation' | 'alert';
  complianceLevel: 'standard' | 'final_notice' | 'legal';
}

export interface SmsTaskPayload {
  phoneNumber: string;
  template: string;
  variables: Record<string, any>;
  customerId: string;
  campaignId: string;
  priority: string;
  scheduledAt?: Date;
}

export interface SmsResult {
  success: boolean;
  messageSid?: string;
  status?: string;
  error?: string;
  segments?: number;
  cost?: string;
}

export class SmsAgent {
  private agentId: string;
  private config: SmsConfig;
  private twilioClient: twilio.Twilio;
  private dbService: DatabaseService;
  private redisService: RedisService;
  private mqService: MessageQueueService;
  private isRunning = false;
  
  // Message tracking
  private sentMessages: Map<string, any> = new Map();
  private optOutNumbers: Set<string> = new Set();

  // Default SMS templates
  private readonly DEFAULT_TEMPLATES: Record<string, SmsTemplate> = {
    payment_reminder_sms: {
      content: `Payment Reminder: Invoice {{invoiceNumber}} for ${{amount}} was due {{dueDate}}. Please pay at {{paymentLink}} or call {{supportPhone}}. Reply STOP to opt out.`,
      variables: ['invoiceNumber', 'amount', 'dueDate', 'paymentLink', 'supportPhone'],
      category: 'reminder',
      complianceLevel: 'standard'
    },

    final_notice_sms: {
      content: `FINAL NOTICE: Invoice {{invoiceNumber}} - ${{amount}} is {{daysOverdue}} days overdue. Immediate payment required. Pay now: {{paymentLink}} or call {{supportPhone}} Reply STOP to opt out.`,
      variables: ['invoiceNumber', 'amount', 'daysOverdue', 'paymentLink', 'supportPhone'],
      category: 'notice',
      complianceLevel: 'final_notice'
    },

    payment_confirmation: {
      content: `Payment received for Invoice {{invoiceNumber}} - ${{amount}}. Thank you! Your account is current. Questions? Call {{supportPhone}} Reply STOP to opt out.`,
      variables: ['invoiceNumber', 'amount', 'supportPhone'],
      category: 'confirmation',
      complianceLevel: 'standard'
    },

    callback_request: {
      content: `{{companyName}}: You requested a callback regarding Invoice {{invoiceNumber}}. We'll call {{phoneNumber}} within 24 hours. Urgent? Call {{supportPhone}} Reply STOP to opt out.`,
      variables: ['companyName', 'invoiceNumber', 'phoneNumber', 'supportPhone'],
      category: 'confirmation',
      complianceLevel: 'standard'
    },

    settlement_offer: {
      content: `Settlement Opportunity: Pay {{settlementAmount}} ({{discount}}% off) for Invoice {{invoiceNumber}} by {{deadline}}. Accept: {{acceptLink}} Call: {{supportPhone}} Reply STOP to opt out.`,
      variables: ['settlementAmount', 'discount', 'invoiceNumber', 'deadline', 'acceptLink', 'supportPhone'],
      category: 'alert',
      complianceLevel: 'standard'
    }
  };

  private readonly OPT_OUT_RESPONSES = [
    'Thank you. You have been removed from SMS communications.',
    'You\'re unsubscribed from SMS. You may still receive important account notifications via email or mail.',
    'SMS opt-out confirmed. For urgent matters, please call {{supportPhone}}.'
  ];

  constructor(
    agentId: string,
    config: SmsConfig,
    dbService: DatabaseService,
    redisService: RedisService,
    mqService: MessageQueueService
  ) {
    this.agentId = agentId;
    this.config = {
      ...config,
      templates: { ...this.DEFAULT_TEMPLATES, ...config.templates }
    };
    this.dbService = dbService;
    this.redisService = redisService;
    this.mqService = mqService;

    // Initialize Twilio client
    this.twilioClient = twilio(this.config.twilio.accountSid, this.config.twilio.authToken);
  }

  async initialize(): Promise<void> {
    try {
      // Verify Twilio configuration
      await this.verifyTwilioConfig();

      // Load opt-out list
      await this.loadOptOutList();

      // Subscribe to SMS task queue
      await this.mqService.subscribe('sms.tasks', this.handleSmsTask.bind(this));

      // Set up webhook handlers for message status updates
      this.setupWebhookHandlers();

      // Set up periodic cleanup
      this.startPeriodicCleanup();

      this.isRunning = true;
      logger.info(`SMS Agent ${this.agentId} initialized successfully`);

    } catch (error) {
      logger.error(`Failed to initialize SMS Agent ${this.agentId}:`, error);
      throw error;
    }
  }

  private async verifyTwilioConfig(): Promise<void> {
    try {
      // Verify account
      const account = await this.twilioClient.api.accounts(this.config.twilio.accountSid).fetch();
      
      // Verify phone number or messaging service
      if (this.config.twilio.messagingServiceSid) {
        const service = await this.twilioClient.messaging.services(this.config.twilio.messagingServiceSid).fetch();
        logger.info(`Using Messaging Service: ${service.friendlyName}`);
      } else {
        const phoneNumbers = await this.twilioClient.incomingPhoneNumbers.list({
          phoneNumber: this.config.twilio.phoneNumber,
          limit: 1
        });

        if (phoneNumbers.length === 0) {
          throw new Error(`Phone number ${this.config.twilio.phoneNumber} not found in account`);
        }
      }

      logger.info(`SMS Agent ${this.agentId} Twilio configuration verified`, {
        accountSid: account.sid
      });

    } catch (error) {
      logger.error(`Failed to verify Twilio configuration:`, error);
      throw error;
    }
  }

  private async loadOptOutList(): Promise<void> {
    try {
      // Load opt-out numbers from database
      const result = await this.dbService.query(
        'SELECT phone_number FROM sms_opt_outs WHERE active = true'
      );

      this.optOutNumbers.clear();
      for (const row of result.rows) {
        this.optOutNumbers.add(this.normalizePhoneNumber(row.phone_number));
      }

      logger.info(`Loaded ${this.optOutNumbers.size} opt-out numbers`);

    } catch (error) {
      logger.warn('Failed to load opt-out list, continuing without:', error);
    }
  }

  private async handleSmsTask(message: any): Promise<void> {
    const task = message.payload as Task;
    
    try {
      logger.info(`SMS Agent ${this.agentId} processing task:`, {
        taskId: task.id,
        customerId: task.customerId
      });

      // Get customer details
      const customer = await this.getCustomer(task.customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${task.customerId}`);
      }

      // Extract SMS task payload from context
      const smsPayload = task.context.metadata as SmsTaskPayload;
      
      // Check compliance before sending
      const complianceCheck = await this.checkCompliance(customer, smsPayload);
      if (!complianceCheck.allowed) {
        throw new Error(`Compliance check failed: ${complianceCheck.reason}`);
      }

      // Send SMS
      const result = await this.sendSms(customer, smsPayload, task);
      
      // Record contact attempt
      await this.recordContactAttempt(task, result);
      
      // Update task status
      await this.updateTaskStatus(task.id, result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED);
      
      logger.info(`SMS ${result.success ? 'sent' : 'failed'} for task ${task.id}`, {
        messageSid: result.messageSid,
        segments: result.segments
      });

    } catch (error) {
      logger.error(`Failed to process SMS task ${task.id}:`, error);
      
      await this.recordContactAttempt(task, {
        success: false,
        error: error.message
      });

      await this.updateTaskStatus(task.id, TaskStatus.FAILED);
      throw error;
    }
  }

  private async checkCompliance(customer: Customer, smsPayload: SmsTaskPayload): Promise<{allowed: boolean, reason?: string}> {
    // Check opt-out status
    const normalizedNumber = this.normalizePhoneNumber(smsPayload.phoneNumber);
    if (this.optOutNumbers.has(normalizedNumber)) {
      return { allowed: false, reason: 'Number has opted out of SMS communications' };
    }

    // Check business hours if required
    if (this.config.complianceSettings.businessHours) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = parseInt(this.config.complianceSettings.businessHours.start.split(':')[0]);
      const endHour = parseInt(this.config.complianceSettings.businessHours.end.split(':')[0]);
      
      if (currentHour < startHour || currentHour >= endHour) {
        // Allow urgent messages outside business hours
        if (smsPayload.priority !== 'urgent' && smsPayload.priority !== 'high') {
          return { allowed: false, reason: 'Outside business hours' };
        }
      }
    }

    // Check do not contact preferences
    if (this.config.complianceSettings.respectDoNotContact && customer.profile?.communicationPreferences?.doNotContact) {
      return { allowed: false, reason: 'Customer has do not contact preference' };
    }

    // Check message frequency limits
    const recentMessages = await this.getRecentMessageCount(normalizedNumber, 24); // Last 24 hours
    const maxDailyMessages = this.getMaxDailyMessages(smsPayload.template);
    
    if (recentMessages >= maxDailyMessages) {
      return { allowed: false, reason: `Daily message limit reached (${maxDailyMessages})` };
    }

    return { allowed: true };
  }

  private async sendSms(
    customer: Customer,
    smsPayload: SmsTaskPayload,
    task: Task
  ): Promise<SmsResult> {
    try {
      const template = this.config.templates[smsPayload.template];
      if (!template) {
        throw new Error(`Template not found: ${smsPayload.template}`);
      }

      // Prepare template variables
      const variables = {
        ...smsPayload.variables,
        companyName: customer.companyName || process.env.COMPANY_NAME || 'Your Company',
        supportPhone: process.env.SUPPORT_PHONE || '(555) 123-4567',
        paymentLink: process.env.PAYMENT_LINK || 'https://pay.example.com'
      };

      // Replace variables in template
      let messageContent = this.replaceVariables(template.content, variables);

      // Ensure message length compliance
      if (messageContent.length > this.config.messageSettings.maxLength) {
        messageContent = this.truncateMessage(messageContent, this.config.messageSettings.maxLength);
      }

      // Add opt-out compliance if required
      if (this.config.complianceSettings.includeOptOut && !messageContent.includes('STOP')) {
        messageContent += ' Reply STOP to opt out.';
      }

      // Prepare message options
      const messageOptions: any = {
        body: messageContent,
        to: smsPayload.phoneNumber,
        statusCallback: `${process.env.BASE_URL}/webhooks/twilio/sms-status`,
        forceDelivery: true
      };

      // Use messaging service or from number
      if (this.config.twilio.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.config.twilio.messagingServiceSid;
      } else {
        messageOptions.from = this.config.twilio.phoneNumber;
      }

      // Send message
      const message = await this.twilioClient.messages.create(messageOptions);

      // Track the sent message
      this.sentMessages.set(message.sid, {
        messageSid: message.sid,
        taskId: task.id,
        customerId: customer.id,
        phoneNumber: smsPayload.phoneNumber,
        template: smsPayload.template,
        sentAt: new Date(),
        content: messageContent
      });

      logger.info(`SMS sent`, {
        messageSid: message.sid,
        taskId: task.id,
        customerId: customer.id,
        phoneNumber: smsPayload.phoneNumber,
        segments: message.numSegments
      });

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
        segments: parseInt(message.numSegments || '1'),
        cost: message.price || '0'
      };

    } catch (error) {
      logger.error('Failed to send SMS:', {
        error: error.message,
        customerId: customer.id,
        taskId: task.id
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }

    // Try to truncate at word boundary
    const truncated = message.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) { // Only truncate at word if not too far back
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digits and add country code if needed
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return '+1' + cleaned; // Assume US number
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }
    return '+' + cleaned;
  }

  private getMaxDailyMessages(templateName: string): number {
    const template = this.config.templates[templateName];
    
    switch (template?.complianceLevel) {
      case 'final_notice':
        return 2; // Max 2 final notices per day
      case 'legal':
        return 1; // Max 1 legal notice per day
      default:
        return 3; // Max 3 standard messages per day
    }
  }

  private async getRecentMessageCount(phoneNumber: string, hoursBack: number): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
      
      const result = await this.dbService.query(
        `SELECT COUNT(*) as count FROM contact_attempts 
         WHERE channel = 'sms' 
         AND metadata->>'phoneNumber' = $1 
         AND timestamp >= $2 
         AND status != 'failed'`,
        [phoneNumber, cutoffTime]
      );

      return parseInt(result.rows[0]?.count || '0');

    } catch (error) {
      logger.error('Failed to get recent message count:', error);
      return 0;
    }
  }

  private setupWebhookHandlers(): void {
    // In a real implementation, these would be Express routes
    logger.info(`SMS Agent ${this.agentId} webhook handlers set up`);
  }

  // This method would be called by the webhook endpoint
  async handleMessageStatus(messageSid: string, status: string, errorCode?: string): Promise<void> {
    try {
      const messageData = this.sentMessages.get(messageSid);
      if (!messageData) {
        logger.warn(`Received status update for unknown message: ${messageSid}`);
        return;
      }

      logger.info(`SMS status update:`, {
        messageSid,
        status,
        errorCode,
        taskId: messageData.taskId
      });

      // Update message data
      messageData.status = status;
      messageData.errorCode = errorCode;
      messageData.updatedAt = new Date();

      // Update contact attempt with status
      await this.updateContactAttemptStatus(messageData.taskId, status, errorCode);

      // If message is final status, remove from tracking
      if (['delivered', 'failed', 'undelivered'].includes(status)) {
        this.sentMessages.delete(messageSid);

        // Notify via message queue
        await this.mqService.publishNotification({
          type: 'sms_status_update',
          taskId: messageData.taskId,
          customerId: messageData.customerId,
          messageSid,
          status,
          errorCode,
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('Failed to handle message status update:', error);
    }
  }

  // This method would be called by the incoming SMS webhook
  async handleIncomingSms(from: string, body: string, messageSid: string): Promise<void> {
    try {
      const normalizedFrom = this.normalizePhoneNumber(from);
      const cleanedBody = body.trim().toLowerCase();

      logger.info(`Received SMS:`, {
        from: normalizedFrom,
        body: cleanedBody,
        messageSid
      });

      // Check for opt-out keywords
      const optOutKeywords = this.config.messageSettings.optOutKeywords || ['stop', 'unsubscribe', 'opt-out', 'quit'];
      const isOptOut = optOutKeywords.some(keyword => cleanedBody.includes(keyword.toLowerCase()));

      if (isOptOut) {
        await this.handleOptOut(normalizedFrom, messageSid);
        return;
      }

      // Check for opt-in keywords
      const optInKeywords = ['start', 'subscribe', 'yes', 'opt-in'];
      const isOptIn = optInKeywords.some(keyword => cleanedBody.includes(keyword.toLowerCase()));

      if (isOptIn) {
        await this.handleOptIn(normalizedFrom, messageSid);
        return;
      }

      // Handle other responses (payment confirmations, questions, etc.)
      await this.handleGeneralResponse(normalizedFrom, cleanedBody, messageSid);

    } catch (error) {
      logger.error('Failed to handle incoming SMS:', error);
    }
  }

  private async handleOptOut(phoneNumber: string, messageSid: string): Promise<void> {
    try {
      // Add to opt-out list
      this.optOutNumbers.add(phoneNumber);

      // Store in database
      await this.dbService.query(
        `INSERT INTO sms_opt_outs (phone_number, opted_out_at, message_sid, active) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (phone_number) DO UPDATE SET 
         opted_out_at = $2, message_sid = $3, active = $4`,
        [phoneNumber, new Date(), messageSid, true]
      );

      // Send confirmation
      const confirmationMessage = this.OPT_OUT_RESPONSES[0]; // Use first response
      
      const messageOptions: any = {
        body: confirmationMessage,
        to: phoneNumber
      };

      if (this.config.twilio.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.config.twilio.messagingServiceSid;
      } else {
        messageOptions.from = this.config.twilio.phoneNumber;
      }

      await this.twilioClient.messages.create(messageOptions);

      logger.info(`Opt-out processed for ${phoneNumber}`);

      // Notify system
      await this.mqService.publishNotification({
        type: 'sms_opt_out',
        phoneNumber,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`Failed to handle opt-out for ${phoneNumber}:`, error);
    }
  }

  private async handleOptIn(phoneNumber: string, messageSid: string): Promise<void> {
    try {
      // Remove from opt-out list
      this.optOutNumbers.delete(phoneNumber);

      // Update database
      await this.dbService.query(
        `UPDATE sms_opt_outs SET active = false, opted_in_at = $1 WHERE phone_number = $2`,
        [new Date(), phoneNumber]
      );

      // Send confirmation
      const confirmationMessage = `Welcome back! You're now subscribed to SMS notifications. Reply STOP anytime to opt out.`;
      
      const messageOptions: any = {
        body: confirmationMessage,
        to: phoneNumber
      };

      if (this.config.twilio.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.config.twilio.messagingServiceSid;
      } else {
        messageOptions.from = this.config.twilio.phoneNumber;
      }

      await this.twilioClient.messages.create(messageOptions);

      logger.info(`Opt-in processed for ${phoneNumber}`);

      // Notify system
      await this.mqService.publishNotification({
        type: 'sms_opt_in',
        phoneNumber,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`Failed to handle opt-in for ${phoneNumber}:`, error);
    }
  }

  private async handleGeneralResponse(phoneNumber: string, body: string, messageSid: string): Promise<void> {
    try {
      // Look for keywords indicating payment or questions
      const paymentKeywords = ['paid', 'payment', 'sent', 'check', 'money order'];
      const questionKeywords = ['question', 'help', 'info', 'dispute', 'error'];

      const hasPaymentKeyword = paymentKeywords.some(keyword => body.includes(keyword));
      const hasQuestionKeyword = questionKeywords.some(keyword => body.includes(keyword));

      let responseType = 'general_response';
      let responseMessage = `Thank you for your message. A representative will review and respond within 24 hours. For immediate assistance, call ${process.env.SUPPORT_PHONE || '(555) 123-4567'}.`;

      if (hasPaymentKeyword) {
        responseType = 'payment_notification';
        responseMessage = `Thank you for your payment notification. We will verify and update your account within 1-2 business days. Questions? Call ${process.env.SUPPORT_PHONE || '(555) 123-4567'}.`;
      } else if (hasQuestionKeyword) {
        responseType = 'question_received';
        responseMessage = `We received your question and will respond within 4 business hours. For urgent matters, call ${process.env.SUPPORT_PHONE || '(555) 123-4567'}.`;
      }

      // Send automated response
      const messageOptions: any = {
        body: responseMessage,
        to: phoneNumber
      };

      if (this.config.twilio.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.config.twilio.messagingServiceSid;
      } else {
        messageOptions.from = this.config.twilio.phoneNumber;
      }

      await this.twilioClient.messages.create(messageOptions);

      // Log the interaction
      await this.dbService.query(
        `INSERT INTO sms_interactions (phone_number, incoming_message, response_type, response_message, message_sid, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [phoneNumber, body, responseType, responseMessage, messageSid, new Date()]
      );

      // Notify system about the response
      await this.mqService.publishNotification({
        type: 'sms_response_received',
        phoneNumber,
        responseType,
        originalMessage: body,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`Failed to handle general response from ${phoneNumber}:`, error);
    }
  }

  private startPeriodicCleanup(): void {
    // Clean up old sent messages every hour
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const [messageSid, messageData] of this.sentMessages) {
        if (messageData.sentAt.getTime() < cutoff) {
          this.sentMessages.delete(messageSid);
        }
      }
    }, 60 * 60 * 1000); // Every hour

    logger.info(`SMS Agent ${this.agentId} periodic cleanup started`);
  }

  private async recordContactAttempt(task: Task, result: SmsResult): Promise<void> {
    try {
      const attempt: Partial<ContactAttempt> = {
        id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId: task.id,
        agentId: this.agentId,
        channel: 'sms',
        status: result.success ? ContactStatus.SENT : ContactStatus.FAILED,
        timestamp: new Date(),
        metadata: {
          messageSid: result.messageSid,
          status: result.status,
          segments: result.segments,
          cost: result.cost,
          error: result.error
        }
      };

      await this.dbService.query(
        `INSERT INTO contact_attempts (id, task_id, agent_id, channel, status, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          attempt.id,
          attempt.taskId,
          attempt.agentId,
          attempt.channel,
          attempt.status,
          JSON.stringify(attempt.metadata),
          attempt.timestamp
        ]
      );

      // Cache the attempt
      await this.redisService.setJson(`attempt:${attempt.id}`, attempt, 3600);

    } catch (error) {
      logger.error('Failed to record contact attempt:', error);
    }
  }

  private async updateContactAttemptStatus(taskId: string, status: string, errorCode?: string): Promise<void> {
    try {
      // Find the most recent contact attempt for this task
      const attempts = await this.dbService.query(
        'SELECT id FROM contact_attempts WHERE task_id = $1 AND agent_id = $2 ORDER BY timestamp DESC LIMIT 1',
        [taskId, this.agentId]
      );

      if (attempts.rows.length > 0) {
        const attemptId = attempts.rows[0].id;
        
        // Map Twilio status to our ContactStatus
        let contactStatus = ContactStatus.SENT;
        if (status === 'delivered') {
          contactStatus = ContactStatus.DELIVERED;
        } else if (status === 'failed' || status === 'undelivered') {
          contactStatus = ContactStatus.FAILED;
        }

        // Update the attempt
        await this.dbService.query(
          `UPDATE contact_attempts SET 
           status = $1, 
           metadata = jsonb_set(metadata, '{finalStatus}', $2),
           metadata = jsonb_set(metadata, '{errorCode}', $3),
           timestamp = $4
           WHERE id = $5`,
          [
            contactStatus,
            JSON.stringify(status),
            JSON.stringify(errorCode || null),
            new Date(),
            attemptId
          ]
        );
      }

    } catch (error) {
      logger.error('Failed to update contact attempt status:', error);
    }
  }

  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    try {
      await this.dbService.query(
        'UPDATE tasks SET status = $1, updated_at = $2 WHERE id = $3',
        [status, new Date(), taskId]
      );

      // Update cache
      const task = await this.redisService.getJson<Task>(`task:${taskId}`);
      if (task) {
        task.status = status;
        task.updatedAt = new Date();
        await this.redisService.setJson(`task:${taskId}`, task, 3600);
      }

    } catch (error) {
      logger.error('Failed to update task status:', error);
    }
  }

  private async getCustomer(customerId: string): Promise<Customer | null> {
    try {
      // Try cache first
      const cached = await this.redisService.getJson<Customer>(`customer:${customerId}`);
      if (cached) {
        return cached;
      }

      // Fallback to database
      const result = await this.dbService.query(
        'SELECT * FROM customers WHERE id = $1',
        [customerId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const customer: Customer = {
        id: row.id,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        mobile: row.mobile,
        address: row.address,
        preferredContactMethod: row.preferred_contact_method,
        paymentHistory: [],
        profile: row.profile,
        tags: row.tags,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      // Cache for future requests
      await this.redisService.setJson(`customer:${customerId}`, customer, 3600);
      
      return customer;

    } catch (error) {
      logger.error('Failed to get customer:', error);
      return null;
    }
  }

  async getAgentStatus(): Promise<any> {
    return {
      agentId: this.agentId,
      type: AgentType.SMS,
      isRunning: this.isRunning,
      twilioConnected: this.twilioClient !== null,
      activeSentMessages: this.sentMessages.size,
      optOutCount: this.optOutNumbers.size,
      templatesLoaded: Object.keys(this.config.templates).length,
      messageSettings: this.config.messageSettings,
      complianceSettings: this.config.complianceSettings
    };
  }

  async getOptOutNumbers(): Promise<string[]> {
    return Array.from(this.optOutNumbers);
  }

  async getSentMessages(): Promise<any[]> {
    return Array.from(this.sentMessages.values());
  }

  async shutdown(): Promise<void> {
    try {
      this.isRunning = false;

      // Wait for pending messages to complete
      if (this.sentMessages.size > 0) {
        logger.info(`Waiting for ${this.sentMessages.size} pending SMS messages...`);
        
        const timeout = 10000; // 10 seconds timeout
        const startTime = Date.now();
        
        while (this.sentMessages.size > 0 && (Date.now() - startTime) < timeout) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (this.sentMessages.size > 0) {
          logger.warn(`${this.sentMessages.size} SMS messages still pending after timeout`);
        }
      }

      logger.info(`SMS Agent ${this.agentId} shut down successfully`);

    } catch (error) {
      logger.error(`Error shutting down SMS Agent ${this.agentId}:`, error);
    }
  }
}