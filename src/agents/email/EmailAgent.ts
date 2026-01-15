import nodemailer, { Transporter } from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { logger } from '@/utils/logger';
import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import { MessageQueueService } from '@/core/services/messageQueue';
import { config as appConfig } from '@/config';
import {
  Task,
  TaskStatus,
  ContactAttempt,
  ContactStatus,
  ContactMethod,
  Customer,
  AgentType
} from '@/types';

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  imap: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  defaultFrom: string;
  templates: Record<string, EmailTemplate>;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
}

export interface EmailTaskPayload {
  to: string;
  template: string;
  variables: Record<string, any>;
  customerId: string;
  campaignId: string;
  priority: string;
}

export class EmailAgent {
  private agentId: string;
  protected config: EmailConfig;
  protected smtpTransporter: Transporter;
  private imapClient: ImapFlow | null = null;
  private dbService: DatabaseService;
  private redisService: RedisService;
  private mqService: MessageQueueService;
  private isRunning = false;

  // Default email templates
  private readonly DEFAULT_TEMPLATES: Record<string, EmailTemplate> = {
    payment_reminder_1: {
      subject: 'Payment Reminder - Invoice {{invoiceNumber}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Reminder</h2>
          <p>Dear {{contactName}},</p>
          <p>We hope this email finds you well. We wanted to remind you that payment for invoice <strong>{{invoiceNumber}}</strong> 
          in the amount of <strong>\$\{\{amount}} {{currency}}</strong> was due on <strong>{{dueDate}}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Invoice Details:</h3>
            <ul>
              <li><strong>Invoice Number:</strong> {{invoiceNumber}}</li>
              <li><strong>Amount:</strong> \$\{\{amount}} {{currency}}</li>
              <li><strong>Due Date:</strong> {{dueDate}}</li>
              <li><strong>Days Overdue:</strong> {{daysOverdue}}</li>
            </ul>
          </div>

          <p>Please process this payment at your earliest convenience. If you have already made this payment, 
          please disregard this notice and accept our apologies for any inconvenience.</p>
          
          <p>If you have any questions or concerns regarding this invoice, please don't hesitate to contact us.</p>
          
          <p>Thank you for your prompt attention to this matter.</p>
          
          <p>Best regards,<br>
          {{senderName}}<br>
          {{companyName}}</p>
        </div>
      `,
      textContent: `
Payment Reminder - Invoice {{invoiceNumber}}

Dear {{contactName}},

We hope this email finds you well. We wanted to remind you that payment for invoice {{invoiceNumber}} 
in the amount of \$\{\{amount}} {{currency}} was due on {{dueDate}}.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Amount: \$\{\{amount}} {{currency}}
- Due Date: {{dueDate}}
- Days Overdue: {{daysOverdue}}

Please process this payment at your earliest convenience. If you have already made this payment, 
please disregard this notice and accept our apologies for any inconvenience.

If you have any questions or concerns regarding this invoice, please don't hesitate to contact us.

Thank you for your prompt attention to this matter.

Best regards,
{{senderName}}
{{companyName}}
      `,
      variables: ['contactName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'daysOverdue', 'senderName', 'companyName']
    },

    payment_reminder_2: {
      subject: 'Final Notice - Payment Required for Invoice {{invoiceNumber}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #856404;">Final Payment Notice</h2>
          </div>
          
          <p>Dear {{contactName}},</p>
          <p>This is a <strong>final notice</strong> regarding the overdue payment for invoice <strong>{{invoiceNumber}}</strong>.</p>
          
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #721c24;">Invoice Details:</h3>
            <ul>
              <li><strong>Invoice Number:</strong> {{invoiceNumber}}</li>
              <li><strong>Amount:</strong> \$\{\{amount}} {{currency}}</li>
              <li><strong>Original Due Date:</strong> {{dueDate}}</li>
              <li><strong>Days Overdue:</strong> {{daysOverdue}}</li>
            </ul>
          </div>

          <p><strong>Immediate action required:</strong> Please remit payment within the next 5 business days to avoid 
          further collection activities.</p>
          
          <p>If payment has already been made, please contact us immediately with proof of payment.</p>
          
          <p>We value our business relationship and hope to resolve this matter promptly.</p>
          
          <p>Best regards,<br>
          {{senderName}}<br>
          {{companyName}}<br>
          {{senderPhone}}</p>
        </div>
      `,
      textContent: `
FINAL PAYMENT NOTICE - Invoice {{invoiceNumber}}

Dear {{contactName}},

This is a FINAL NOTICE regarding the overdue payment for invoice {{invoiceNumber}}.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Amount: \$\{\{amount}} {{currency}}
- Original Due Date: {{dueDate}}
- Days Overdue: {{daysOverdue}}

IMMEDIATE ACTION REQUIRED: Please remit payment within the next 5 business days to avoid 
further collection activities.

If payment has already been made, please contact us immediately with proof of payment.

We value our business relationship and hope to resolve this matter promptly.

Best regards,
{{senderName}}
{{companyName}}
{{senderPhone}}
      `,
      variables: ['contactName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'daysOverdue', 'senderName', 'companyName', 'senderPhone']
    }
  };

  constructor(
    agentId: string,
    config: EmailConfig,
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

    // Initialize SMTP transporter
    this.smtpTransporter = nodemailer.createTransport(this.config.smtp);
  }

  async initialize(): Promise<void> {
    try {
      // Verify SMTP connection
      await this.smtpTransporter.verify();
      logger.info(`Email Agent ${this.agentId} SMTP connection verified`);

      // Initialize IMAP connection for reading responses
      await this.initializeIMAP();

      // Subscribe to email task queue
      await this.mqService.subscribe('email.tasks', this.handleEmailTask.bind(this));

      this.isRunning = true;
      logger.info(`Email Agent ${this.agentId} initialized successfully`);

    } catch (error) {
      logger.error(`Failed to initialize Email Agent ${this.agentId}:`, error);
      throw error;
    }
  }

  protected async initializeIMAP(): Promise<void> {
    try {
      this.imapClient = new ImapFlow(this.config.imap);
      
      await this.imapClient.connect();
      logger.info(`Email Agent ${this.agentId} IMAP connection established`);

      // Set up mailbox monitoring for responses
      this.startResponseMonitoring();

    } catch (error) {
      logger.error(`Failed to initialize IMAP for Email Agent ${this.agentId}:`, error);
      // Continue without IMAP if it fails - we can still send emails
    }
  }

  protected async handleEmailTask(message: any): Promise<void> {
    const task = message.payload as Task;
    
    try {
      logger.info(`Email Agent ${this.agentId} processing task:`, {
        taskId: task.id,
        customerId: task.customerId
      });

      // Get customer details
      const customer = await this.getCustomer(task.customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${task.customerId}`);
      }

      // Extract email task payload from context
      const emailPayload = task.context.metadata as EmailTaskPayload;
      
      // Send email
      const result = await this.sendEmail(customer, emailPayload, task);
      
      // Record contact attempt
      await this.recordContactAttempt(task, result);
      
      // Update task status
      await this.updateTaskStatus(task.id, TaskStatus.COMPLETED);
      
      logger.info(`Email sent successfully for task ${task.id}`);

    } catch (error) {
      logger.error(`Failed to process email task ${task.id}:`, error);
      
      await this.recordContactAttempt(task, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messageId: null
      });

      await this.updateTaskStatus(task.id, TaskStatus.FAILED);
      throw error;
    }
  }

  protected async sendEmail(
    customer: Customer,
    emailPayload: EmailTaskPayload,
    task: Task
  ): Promise<any> {
    try {
      const template = this.config.templates[emailPayload.template];
      if (!template) {
        throw new Error(`Template not found: ${emailPayload.template}`);
      }

      // Prepare template variables
      const variables = {
        ...emailPayload.variables,
        contactName: customer.contactName,
        companyName: customer.companyName || process.env.COMPANY_NAME || 'Your Company',
        senderName: process.env.SENDER_NAME || 'Collections Team',
        senderPhone: process.env.SENDER_PHONE || '(555) 123-4567'
      };

      // Replace variables in template
      const subject = this.replaceVariables(template.subject, variables);
      const htmlContent = this.replaceVariables(template.htmlContent, variables);
      const textContent = this.replaceVariables(template.textContent, variables);

      // Send email
      const result = await this.smtpTransporter.sendMail({
        from: this.config.defaultFrom,
        to: customer.email,
        subject,
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Task-ID': task.id,
          'X-Customer-ID': customer.id,
          'X-Campaign-ID': task.campaignId
        }
      });

      logger.info(`Email sent to ${customer.email}`, {
        messageId: result.messageId,
        taskId: task.id,
        customerId: customer.id
      });

      return {
        success: true,
        messageId: result.messageId,
        recipient: customer.email,
        subject
      };

    } catch (error) {
      logger.error('Failed to send email:', {
        error: error instanceof Error ? error.message : String(error),
        customerId: customer.id,
        taskId: task.id
      });
      throw error;
    }
  }

  protected replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  protected async recordContactAttempt(task: Task, result: any): Promise<void> {
    try {
      const attempt: Partial<ContactAttempt> = {
        id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId: task.id,
        agentId: this.agentId,
        channel: ContactMethod.EMAIL,
        status: result.success ? ContactStatus.SENT : ContactStatus.FAILED,
        response: result.error || null,
        timestamp: new Date(),
        metadata: {
          messageId: result.messageId,
          recipient: result.recipient,
          subject: result.subject,
          error: result.error
        }
      };

      await this.dbService.query(
        `INSERT INTO contact_attempts (id, task_id, agent_id, channel, status, response, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          attempt.id,
          attempt.taskId,
          attempt.agentId,
          attempt.channel,
          attempt.status,
          attempt.response,
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

  protected async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
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
        paymentHistory: [], // Would be loaded separately if needed
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

  protected startResponseMonitoring(): void {
    if (!this.imapClient) {
      return;
    }

    // Monitor for new emails (responses)
    this.imapClient.on('exists', async (data) => {
      try {
        await this.processNewEmails();
      } catch (error) {
        logger.error('Failed to process new emails:', error);
      }
    });

    logger.info(`Email Agent ${this.agentId} started response monitoring`);
  }

  protected async processNewEmails(): Promise<void> {
    if (!this.imapClient) {
      return;
    }

    try {
      // Select INBOX
      const lock = await this.imapClient.getMailboxLock('INBOX');
      
      try {
        // Get unseen messages
        const messages = this.imapClient.fetch('1:*', {
          flags: true,
          envelope: true,
          bodyStructure: true,
          headers: ['x-task-id', 'x-customer-id', 'x-campaign-id']
        });

        for await (const message of messages) {
          await this.processResponseEmail(message);
        }

      } finally {
        lock.release();
      }

    } catch (error) {
      logger.error('Failed to process new emails:', error);
    }
  }

  protected async processResponseEmail(message: any): Promise<void> {
    try {
      const headers = message.headers || {};
      const taskId = headers.get('x-task-id')?.[0];
      const customerId = headers.get('x-customer-id')?.[0];

      if (taskId && customerId) {
        // This is a response to our email
        logger.info(`Received response for task ${taskId} from customer ${customerId}`);
        
        // Record the response
        await this.recordEmailResponse(taskId, customerId, message);
        
        // Notify via message queue
        await this.mqService.publishNotification({
          type: 'email_response_received',
          taskId,
          customerId,
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('Failed to process response email:', error);
    }
  }

  protected async recordEmailResponse(taskId: string, customerId: string, message: any): Promise<void> {
    try {
      const response: Partial<ContactAttempt> = {
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId,
        agentId: this.agentId,
        channel: ContactMethod.EMAIL,
        status: ContactStatus.REPLIED,
        timestamp: new Date(),
        metadata: {
          from: message.envelope?.from?.[0]?.address,
          subject: message.envelope?.subject,
          messageId: message.envelope?.messageId
        }
      };

      await this.dbService.query(
        `INSERT INTO contact_attempts (id, task_id, agent_id, channel, status, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          response.id,
          response.taskId,
          response.agentId,
          response.channel,
          response.status,
          JSON.stringify(response.metadata),
          response.timestamp
        ]
      );

    } catch (error) {
      logger.error('Failed to record email response:', error);
    }
  }

  async getAgentStatus(): Promise<any> {
    return {
      agentId: this.agentId,
      type: AgentType.EMAIL,
      isRunning: this.isRunning,
      smtpConnected: this.smtpTransporter !== null,
      imapConnected: this.imapClient !== null,
      templatesLoaded: Object.keys(this.config.templates).length
    };
  }

  async close(): Promise<void> {
    await this.shutdown();
  }

  async shutdown(): Promise<void> {
    try {
      this.isRunning = false;

      // Close IMAP connection
      if (this.imapClient) {
        await this.imapClient.logout();
      }

      // Close SMTP transporter
      this.smtpTransporter.close();

      logger.info(`Email Agent ${this.agentId} shut down successfully`);

    } catch (error) {
      logger.error(`Error shutting down Email Agent ${this.agentId}:`, error);
    }
  }
}

/**
 * Create EmailConfig from centralized application config
 * Uses environment variables: SMTP_*, IMAP_*
 */
export function createEmailConfigFromEnv(): EmailConfig {
  return {
    smtp: {
      host: appConfig.email.smtp.host,
      port: appConfig.email.smtp.port,
      secure: appConfig.email.smtp.secure,
      auth: {
        user: appConfig.email.smtp.user || '',
        pass: appConfig.email.smtp.password || ''
      }
    },
    imap: {
      host: appConfig.email.imap.host,
      port: appConfig.email.imap.port,
      secure: appConfig.email.imap.secure,
      auth: {
        user: appConfig.email.imap.user || '',
        pass: appConfig.email.imap.password || ''
      }
    },
    defaultFrom: `${appConfig.email.smtp.fromName} <${appConfig.email.smtp.fromEmail}>`,
    templates: {}
  };
}

/**
 * Check if email configuration is valid
 */
export function isEmailConfigValid(): boolean {
  return Boolean(
    appConfig.email.smtp.host &&
    appConfig.email.smtp.user &&
    appConfig.email.smtp.password
  );
}