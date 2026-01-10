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

export interface PhoneConfig {
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  voiceSettings: {
    voice: string;
    language: string;
    speed: number;
  };
  callSettings: {
    timeout: number; // seconds
    maxDuration: number; // seconds
    recordCall: boolean;
  };
  scripts: Record<string, PhoneScript>;
}

export interface PhoneScript {
  greeting: string;
  mainMessage: string;
  options: PhoneOption[];
  fallbackMessage: string;
  transferMessage?: string;
  transferNumber?: string;
}

export interface PhoneOption {
  key: string;
  text: string;
  action: 'repeat' | 'transfer' | 'callback' | 'end' | 'escalate';
  value?: string;
}

export interface PhoneTaskPayload {
  phoneNumber: string;
  script: string;
  variables: Record<string, any>;
  customerId: string;
  campaignId: string;
  priority: string;
  maxAttempts?: number;
}

export interface CallResult {
  success: boolean;
  callSid?: string;
  duration?: number;
  status?: string;
  error?: string;
  recording?: string;
  userInput?: Record<string, any>;
}

export class PhoneAgent {
  private agentId: string;
  private config: PhoneConfig;
  private twilioClient: twilio.Twilio;
  private dbService: DatabaseService;
  private redisService: RedisService;
  private mqService: MessageQueueService;
  private isRunning = false;
  
  // Active calls tracking
  private activeCalls: Map<string, any> = new Map();

  // Default phone scripts
  private readonly DEFAULT_SCRIPTS: Record<string, PhoneScript> = {
    payment_reminder_call: {
      greeting: "Hello, this is {{senderName}} from {{companyName}}. May I speak with {{contactName}}?",
      mainMessage: `I'm calling regarding invoice {{invoiceNumber}} for \$\{\{amount}} which was due on {{dueDate}}. 
                   This payment is now {{daysOverdue}} days overdue. We'd like to arrange payment today.`,
      options: [
        {
          key: '1',
          text: 'Press 1 if you can make payment today',
          action: 'end',
          value: 'payment_today'
        },
        {
          key: '2', 
          text: 'Press 2 to set up a payment plan',
          action: 'transfer',
          value: 'payment_plan'
        },
        {
          key: '3',
          text: 'Press 3 to speak with someone about your account',
          action: 'transfer',
          value: 'speak_to_agent'
        },
        {
          key: '9',
          text: 'Press 9 to repeat this message',
          action: 'repeat'
        }
      ],
      fallbackMessage: "If you need immediate assistance, please call us at {{supportPhone}}. Thank you.",
      transferMessage: "Please hold while I transfer you to a payment specialist.",
      transferNumber: process.env.TRANSFER_NUMBER || '+15551234567'
    },

    final_notice_call: {
      greeting: "Hello, this is {{senderName}} from {{companyName}} calling regarding an urgent matter for {{contactName}}.",
      mainMessage: `This is a final notice for invoice {{invoiceNumber}} in the amount of \$\{\{amount}}. 
                   This payment is {{daysOverdue}} days overdue. Immediate payment is required to avoid further collection activities.`,
      options: [
        {
          key: '1',
          text: 'Press 1 to make payment now',
          action: 'transfer',
          value: 'immediate_payment'
        },
        {
          key: '2',
          text: 'Press 2 to speak with our collections department',
          action: 'transfer', 
          value: 'collections'
        },
        {
          key: '0',
          text: 'Press 0 to repeat this message',
          action: 'repeat'
        }
      ],
      fallbackMessage: "This matter requires immediate attention. Please call {{supportPhone}} within 24 hours.",
      transferMessage: "Transferring you now. Please hold.",
      transferNumber: process.env.COLLECTIONS_NUMBER || '+15551234568'
    }
  };

  constructor(
    agentId: string,
    config: PhoneConfig,
    dbService: DatabaseService,
    redisService: RedisService,
    mqService: MessageQueueService
  ) {
    this.agentId = agentId;
    this.config = {
      ...config,
      scripts: { ...this.DEFAULT_SCRIPTS, ...config.scripts }
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

      // Subscribe to phone task queue
      await this.mqService.subscribe('phone.tasks', this.handlePhoneTask.bind(this));

      // Set up webhook handlers for call status updates
      this.setupWebhookHandlers();

      this.isRunning = true;
      logger.info(`Phone Agent ${this.agentId} initialized successfully`);

    } catch (error) {
      logger.error(`Failed to initialize Phone Agent ${this.agentId}:`, error);
      throw error;
    }
  }

  protected async verifyTwilioConfig(): Promise<void> {
    try {
      // Verify account
      const account = await this.twilioClient.api.accounts(this.config.twilio.accountSid).fetch();
      
      // Verify phone number
      const phoneNumber = await this.twilioClient.incomingPhoneNumbers.list({
        phoneNumber: this.config.twilio.phoneNumber,
        limit: 1
      });

      if (phoneNumber.length === 0) {
        throw new Error(`Phone number ${this.config.twilio.phoneNumber} not found in account`);
      }

      logger.info(`Phone Agent ${this.agentId} Twilio configuration verified`, {
        accountSid: account.sid,
        phoneNumber: this.config.twilio.phoneNumber
      });

    } catch (error) {
      logger.error(`Failed to verify Twilio configuration:`, error);
      throw error;
    }
  }

  protected async handlePhoneTask(message: any): Promise<void> {
    const task = message.payload as Task;
    
    try {
      logger.info(`Phone Agent ${this.agentId} processing task:`, {
        taskId: task.id,
        customerId: task.customerId
      });

      // Get customer details
      const customer = await this.getCustomer(task.customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${task.customerId}`);
      }

      // Extract phone task payload from context
      const phonePayload = task.context.metadata as PhoneTaskPayload;
      
      // Make phone call
      const result = await this.makeCall(customer, phonePayload, task);
      
      // Record contact attempt
      await this.recordContactAttempt(task, result);
      
      // Update task status
      await this.updateTaskStatus(task.id, result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED);
      
      logger.info(`Phone call ${result.success ? 'completed' : 'failed'} for task ${task.id}`, {
        callSid: result.callSid,
        duration: result.duration
      });

    } catch (error) {
      logger.error(`Failed to process phone task ${task.id}:`, error);
      
      await this.recordContactAttempt(task, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      await this.updateTaskStatus(task.id, TaskStatus.FAILED);
      throw error;
    }
  }

  protected async makeCall(
    customer: Customer,
    phonePayload: PhoneTaskPayload,
    task: Task
  ): Promise<CallResult> {
    try {
      const script = this.config.scripts[phonePayload.script];
      if (!script) {
        throw new Error(`Script not found: ${phonePayload.script}`);
      }

      // Prepare script variables
      const variables = {
        ...phonePayload.variables,
        contactName: customer.contactName,
        companyName: customer.companyName || process.env.COMPANY_NAME || 'Your Company',
        senderName: process.env.SENDER_NAME || 'Collections Department',
        supportPhone: process.env.SUPPORT_PHONE || '(555) 123-4567'
      };

      // Generate TwiML for the call
      const twiml = this.generateTwiML(script, variables, task.id);

      // Initiate call
      const call = await this.twilioClient.calls.create({
        to: phonePayload.phoneNumber,
        from: this.config.twilio.phoneNumber,
        twiml: twiml,
        timeout: this.config.callSettings.timeout,
        record: this.config.callSettings.recordCall,
        statusCallback: `${process.env.BASE_URL}/webhooks/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });

      // Track the active call
      this.activeCalls.set(call.sid, {
        callSid: call.sid,
        taskId: task.id,
        customerId: customer.id,
        startTime: new Date(),
        phoneNumber: phonePayload.phoneNumber,
        script: phonePayload.script
      });

      logger.info(`Call initiated`, {
        callSid: call.sid,
        taskId: task.id,
        customerId: customer.id,
        phoneNumber: phonePayload.phoneNumber
      });

      // Return preliminary result - final result will come via webhook
      return {
        success: true,
        callSid: call.sid,
        status: call.status
      };

    } catch (error) {
      logger.error('Failed to make phone call:', {
        error: error instanceof Error ? error.message : String(error),
        customerId: customer.id,
        taskId: task.id
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  protected generateTwiML(script: PhoneScript, variables: Record<string, any>, taskId: string): string {
    // Replace variables in script
    const greeting = this.replaceVariables(script.greeting, variables);
    const mainMessage = this.replaceVariables(script.mainMessage, variables);
    const fallbackMessage = this.replaceVariables(script.fallbackMessage, variables);

    // Build TwiML
    let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.config.voiceSettings.voice}" language="${this.config.voiceSettings.language}">
    ${greeting}
  </Say>
  <Pause length="2"/>
  <Say voice="${this.config.voiceSettings.voice}" language="${this.config.voiceSettings.language}">
    ${mainMessage}
  </Say>`;

    // Add gather for user input if options exist
    if (script.options && script.options.length > 0) {
      twiml += `
  <Gather timeout="10" numDigits="1" action="${process.env.BASE_URL}/webhooks/twilio/gather" method="POST">
    <Say voice="${this.config.voiceSettings.voice}" language="${this.config.voiceSettings.language}">`;

      for (const option of script.options) {
        const optionText = this.replaceVariables(option.text, variables);
        twiml += `${optionText}. `;
      }

      twiml += `</Say>
  </Gather>`;
    }

    // Add fallback message
    twiml += `
  <Say voice="${this.config.voiceSettings.voice}" language="${this.config.voiceSettings.language}">
    ${fallbackMessage}
  </Say>
</Response>`;

    return twiml;
  }

  protected replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  protected setupWebhookHandlers(): void {
    // In a real implementation, these would be Express routes
    // For now, we'll set up the logic that would handle webhook calls
    logger.info(`Phone Agent ${this.agentId} webhook handlers set up`);
  }

  // This method would be called by the webhook endpoint
  async handleCallStatusUpdate(callSid: string, status: string, duration?: number): Promise<void> {
    try {
      const callData = this.activeCalls.get(callSid);
      if (!callData) {
        logger.warn(`Received status update for unknown call: ${callSid}`);
        return;
      }

      logger.info(`Call status update:`, {
        callSid,
        status,
        duration,
        taskId: callData.taskId
      });

      // Update call data
      callData.status = status;
      callData.duration = duration;
      callData.endTime = new Date();

      // If call is completed, update task and remove from active calls
      if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
        const result: CallResult = {
          success: status === 'completed',
          callSid,
          duration,
          status
        };

        // Update contact attempt with final result
        await this.updateContactAttemptWithResult(callData.taskId, result);

        // Remove from active calls
        this.activeCalls.delete(callSid);

        // Notify via message queue
        await this.mqService.publishNotification({
          type: 'call_completed',
          taskId: callData.taskId,
          customerId: callData.customerId,
          result,
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('Failed to handle call status update:', error);
    }
  }

  // This method would be called by the gather webhook endpoint
  async handleGatherInput(callSid: string, digits: string): Promise<string> {
    try {
      const callData = this.activeCalls.get(callSid);
      if (!callData) {
        logger.warn(`Received gather input for unknown call: ${callSid}`);
        return this.generateErrorTwiML();
      }

      const script = this.config.scripts[callData.script];
      const option = script.options?.find(opt => opt.key === digits);

      if (!option) {
        // Invalid input - repeat options
        return this.generateRepeatTwiML(script);
      }

      // Record user input
      callData.userInput = { ...callData.userInput, [digits]: option.value };

      // Handle action
      switch (option.action) {
        case 'repeat':
          return this.generateRepeatTwiML(script);
        
        case 'transfer':
          return this.generateTransferTwiML(script, option.value);
        
        case 'callback':
          // Schedule callback
          await this.scheduleCallback(callData.taskId, callData.customerId);
          return this.generateCallbackTwiML();
        
        case 'escalate':
          // Create escalation task
          await this.createEscalationTask(callData.taskId, callData.customerId);
          return this.generateEscalationTwiML();
        
        case 'end':
        default:
          return this.generateEndTwiML(option.value);
      }

    } catch (error) {
      logger.error('Failed to handle gather input:', error);
      return this.generateErrorTwiML();
    }
  }

  private generateErrorTwiML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.config.voiceSettings.voice}">
    I'm sorry, there was an error processing your request. Please call our support line.
  </Say>
  <Hangup/>
</Response>`;
  }

  private generateRepeatTwiML(script: PhoneScript): string {
    let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.config.voiceSettings.voice}">
    Let me repeat the options.
  </Say>
  <Gather timeout="10" numDigits="1" action="${process.env.BASE_URL}/webhooks/twilio/gather" method="POST">
    <Say voice="${this.config.voiceSettings.voice}">`;

    for (const option of script.options || []) {
      twiml += `${option.text}. `;
    }

    twiml += `</Say>
  </Gather>
  <Say voice="${this.config.voiceSettings.voice}">
    Thank you for your time.
  </Say>
</Response>`;

    return twiml;
  }

  private generateTransferTwiML(script: PhoneScript, transferType: string): string {
    const transferMessage = script.transferMessage || 'Please hold while I transfer your call.';
    const transferNumber = script.transferNumber || process.env.DEFAULT_TRANSFER_NUMBER;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.config.voiceSettings.voice}">
    ${transferMessage}
  </Say>
  <Dial timeout="30">${transferNumber}</Dial>
  <Say voice="${this.config.voiceSettings.voice}">
    I'm sorry, no one is available to take your call right now. Please call back later.
  </Say>
</Response>`;
  }

  private generateCallbackTwiML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.config.voiceSettings.voice}">
    Thank you. We have scheduled a callback for you. Someone will contact you within 24 hours.
  </Say>
  <Hangup/>
</Response>`;
  }

  private generateEscalationTwiML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.config.voiceSettings.voice}">
    Your request has been escalated. A manager will contact you within 4 hours.
  </Say>
  <Hangup/>
</Response>`;
  }

  private generateEndTwiML(value?: string): string {
    let message = 'Thank you for your time.';
    
    if (value === 'payment_today') {
      message = 'Thank you for confirming payment. We will update your account accordingly.';
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.config.voiceSettings.voice}">
    ${message}
  </Say>
  <Hangup/>
</Response>`;
  }

  private async scheduleCallback(taskId: string, customerId: string): Promise<void> {
    // Implementation would create a callback task
    logger.info(`Callback scheduled for customer ${customerId}`);
  }

  private async createEscalationTask(taskId: string, customerId: string): Promise<void> {
    // Implementation would create an escalation task
    logger.info(`Escalation created for customer ${customerId}`);
  }

  private async recordContactAttempt(task: Task, result: CallResult): Promise<void> {
    try {
      const attempt: Partial<ContactAttempt> = {
        id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId: task.id,
        agentId: this.agentId,
        channel: ContactMethod.PHONE,
        status: result.success ? ContactStatus.SENT : ContactStatus.FAILED,
        duration: result.duration,
        timestamp: new Date(),
        metadata: {
          callSid: result.callSid,
          status: result.status,
          recording: result.recording,
          userInput: result.userInput,
          error: result.error
        }
      };

      await this.dbService.query(
        `INSERT INTO contact_attempts (id, task_id, agent_id, channel, status, duration, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          attempt.id,
          attempt.taskId,
          attempt.agentId,
          attempt.channel,
          attempt.status,
          attempt.duration,
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

  private async updateContactAttemptWithResult(taskId: string, result: CallResult): Promise<void> {
    try {
      // Find the contact attempt for this task
      const attempts = await this.dbService.query(
        'SELECT id FROM contact_attempts WHERE task_id = $1 AND agent_id = $2 ORDER BY timestamp DESC LIMIT 1',
        [taskId, this.agentId]
      );

      if (attempts.rows.length > 0) {
        const attemptId = attempts.rows[0].id;
        
        // Update with final result
        await this.dbService.query(
          `UPDATE contact_attempts SET 
           status = $1, duration = $2, metadata = $3, timestamp = $4 
           WHERE id = $5`,
          [
            result.success ? ContactStatus.ANSWERED : ContactStatus.FAILED,
            result.duration,
            JSON.stringify({
              callSid: result.callSid,
              status: result.status,
              recording: result.recording,
              userInput: result.userInput,
              error: result.error
            }),
            new Date(),
            attemptId
          ]
        );
      }

    } catch (error) {
      logger.error('Failed to update contact attempt with result:', error);
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

  protected async getCustomer(customerId: string): Promise<Customer | null> {
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
      type: AgentType.PHONE,
      isRunning: this.isRunning,
      twilioConnected: this.twilioClient !== null,
      activeCalls: this.activeCalls.size,
      scriptsLoaded: Object.keys(this.config.scripts).length,
      callSettings: this.config.callSettings
    };
  }

  async getActiveCalls(): Promise<any[]> {
    return Array.from(this.activeCalls.values());
  }

  async close(): Promise<void> {
    await this.shutdown();
  }

  async shutdown(): Promise<void> {
    try {
      this.isRunning = false;

      // Wait for active calls to complete or timeout
      if (this.activeCalls.size > 0) {
        logger.info(`Waiting for ${this.activeCalls.size} active calls to complete...`);
        
        const timeout = 30000; // 30 seconds timeout
        const startTime = Date.now();
        
        while (this.activeCalls.size > 0 && (Date.now() - startTime) < timeout) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Force end remaining calls
        for (const [callSid, callData] of this.activeCalls) {
          try {
            await this.twilioClient.calls(callSid).update({ status: 'completed' });
            logger.info(`Forcibly ended call: ${callSid}`);
          } catch (error) {
            logger.error(`Failed to end call ${callSid}:`, error);
          }
        }

        this.activeCalls.clear();
      }

      logger.info(`Phone Agent ${this.agentId} shut down successfully`);

    } catch (error) {
      logger.error(`Error shutting down Phone Agent ${this.agentId}:`, error);
    }
  }
}