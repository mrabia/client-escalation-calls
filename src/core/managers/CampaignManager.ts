import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import { MessageQueueService } from '@/core/services/messageQueue';
import { ContextEngine } from '@/core/engines/ContextEngine';
import {
  Campaign,
  CampaignStatus,
  EscalationStep,
  Task,
  TaskType,
  TaskStatus,
  Priority,
  Customer,
  PaymentRecord,
  ContactMethod,
  EscalationCondition,
  ConditionType,
  Operator
} from '@/types';

export interface CampaignConfig {
  dbService: DatabaseService;
  redisService: RedisService;
  mqService: MessageQueueService;
  contextEngine: ContextEngine;
}

export interface CreateCampaignRequest {
  name: string;
  description: string;
  customerId: string;
  paymentRecordId: string;
  escalationSteps: EscalationStep[];
  startDate?: Date;
  config?: any;
}

export interface CampaignExecution {
  campaignId: string;
  customerId: string;
  currentStep: number;
  tasksCreated: string[];
  nextExecutionDate?: Date;
  status: 'running' | 'paused' | 'completed' | 'failed';
  context: any;
}

export class CampaignManager {
  private dbService: DatabaseService;
  private redisService: RedisService;
  private mqService: MessageQueueService;
  private contextEngine: ContextEngine;
  private isRunning = false;

  // Active campaign executions
  private activeExecutions: Map<string, CampaignExecution> = new Map();
  
  // Processing intervals
  private processingInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Default escalation templates
  private readonly DEFAULT_ESCALATION_STEPS: Record<string, EscalationStep[]> = {
    standard_collection: [
      {
        stepNumber: 1,
        channel: ContactMethod.EMAIL,
        template: 'payment_reminder_1',
        delayHours: 0,
        maxAttempts: 2,
        conditions: [
          {
            type: ConditionType.DAYS_OVERDUE,
            operator: Operator.GREATER_THAN,
            value: 5
          }
        ]
      },
      {
        stepNumber: 2,
        channel: ContactMethod.PHONE,
        template: 'payment_reminder_call',
        delayHours: 72,
        maxAttempts: 3,
        conditions: [
          {
            type: ConditionType.DAYS_OVERDUE,
            operator: Operator.GREATER_THAN,
            value: 10
          }
        ]
      },
      {
        stepNumber: 3,
        channel: ContactMethod.SMS,
        template: 'payment_reminder_sms',
        delayHours: 48,
        maxAttempts: 2,
        conditions: [
          {
            type: ConditionType.DAYS_OVERDUE,
            operator: Operator.GREATER_THAN,
            value: 15
          }
        ]
      },
      {
        stepNumber: 4,
        channel: ContactMethod.EMAIL,
        template: 'payment_reminder_2',
        delayHours: 96,
        maxAttempts: 1,
        conditions: [
          {
            type: ConditionType.DAYS_OVERDUE,
            operator: Operator.GREATER_THAN,
            value: 20
          }
        ]
      },
      {
        stepNumber: 5,
        channel: ContactMethod.PHONE,
        template: 'final_notice_call',
        delayHours: 72,
        maxAttempts: 3,
        conditions: [
          {
            type: ConditionType.DAYS_OVERDUE,
            operator: Operator.GREATER_THAN,
            value: 25
          }
        ]
      }
    ],

    high_value_collection: [
      {
        stepNumber: 1,
        channel: ContactMethod.PHONE,
        template: 'high_value_payment_call',
        delayHours: 0,
        maxAttempts: 3,
        conditions: [
          {
            type: ConditionType.PAYMENT_AMOUNT,
            operator: Operator.GREATER_THAN,
            value: 5000
          }
        ]
      },
      {
        stepNumber: 2,
        channel: ContactMethod.EMAIL,
        template: 'high_value_payment_email',
        delayHours: 24,
        maxAttempts: 2,
        conditions: [
          {
            type: ConditionType.DAYS_OVERDUE,
            operator: Operator.GREATER_THAN,
            value: 3
          }
        ]
      },
      {
        stepNumber: 3,
        channel: ContactMethod.PHONE,
        template: 'executive_escalation_call',
        delayHours: 48,
        maxAttempts: 2,
        conditions: [
          {
            type: ConditionType.DAYS_OVERDUE,
            operator: Operator.GREATER_THAN,
            value: 7
          }
        ]
      }
    ],

    gentle_reminder: [
      {
        stepNumber: 1,
        channel: ContactMethod.EMAIL,
        template: 'gentle_reminder_email',
        delayHours: 0,
        maxAttempts: 1,
        conditions: [
          {
            type: ConditionType.CUSTOMER_RISK_LEVEL,
            operator: Operator.EQUALS,
            value: 'low'
          }
        ]
      },
      {
        stepNumber: 2,
        channel: ContactMethod.SMS,
        template: 'gentle_reminder_sms',
        delayHours: 168, // 7 days
        maxAttempts: 1,
        conditions: [
          {
            type: ConditionType.DAYS_OVERDUE,
            operator: Operator.GREATER_THAN,
            value: 10
          }
        ]
      },
      {
        stepNumber: 3,
        channel: ContactMethod.PHONE,
        template: 'gentle_follow_up_call',
        delayHours: 120, // 5 days
        maxAttempts: 2,
        conditions: [
          {
            type: ConditionType.DAYS_OVERDUE,
            operator: Operator.GREATER_THAN,
            value: 15
          }
        ]
      }
    ]
  };

  constructor(config: CampaignConfig) {
    this.dbService = config.dbService;
    this.redisService = config.redisService;
    this.mqService = config.mqService;
    this.contextEngine = config.contextEngine;
  }

  async initialize(): Promise<void> {
    try {
      // Load active campaigns from database
      await this.loadActiveCampaigns();

      // Start campaign processing
      this.startCampaignProcessing();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isRunning = true;
      logger.info('Campaign Manager initialized successfully', {
        activeCampaigns: this.activeExecutions.size
      });

    } catch (error) {
      logger.error('Failed to initialize Campaign Manager:', error);
      throw error;
    }
  }

  async createCampaign(request: CreateCampaignRequest): Promise<string> {
    try {
      // Validate customer exists
      const customer = await this.getCustomer(request.customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${request.customerId}`);
      }

      // Validate payment record exists
      const paymentRecord = await this.getPaymentRecord(request.paymentRecordId);
      if (!paymentRecord) {
        throw new Error(`Payment record not found: ${request.paymentRecordId}`);
      }

      // Get customer context for intelligent campaign customization
      const context = await this.contextEngine.getCustomerContext(request.customerId);
      
      // Customize escalation steps based on context
      const optimizedSteps = await this.optimizeEscalationSteps(
        request.escalationSteps,
        context,
        paymentRecord
      );

      // Create campaign
      const campaign: Campaign = {
        id: uuidv4(),
        name: request.name,
        description: request.description,
        customerId: request.customerId,
        status: CampaignStatus.ACTIVE,
        escalationSteps: optimizedSteps,
        currentStep: 0,
        startDate: request.startDate || new Date(),
        results: {
          totalContacts: 0,
          successfulContacts: 0,
          paymentsReceived: 0,
          totalAmountCollected: 0,
          averageCollectionTime: 0,
          channelPerformance: []
        },
        config: {
          businessHours: { start: '09:00', end: '17:00' },
          timezone: 'UTC',
          respectDoNotContact: true,
          maxDailyContacts: 3,
          cooldownPeriod: 4,
          complianceRules: [],
          ...request.config
        }
      };

      // Store in database
      await this.dbService.query(
        `INSERT INTO campaigns (id, name, description, customer_id, status, escalation_steps, 
         current_step, start_date, end_date, paused_until, results, config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          campaign.id,
          campaign.name,
          campaign.description,
          campaign.customerId,
          campaign.status,
          JSON.stringify(campaign.escalationSteps),
          campaign.currentStep,
          campaign.startDate,
          campaign.endDate || null,
          campaign.pausedUntil || null,
          JSON.stringify(campaign.results),
          JSON.stringify(campaign.config)
        ]
      );

      // Cache campaign
      await this.redisService.setJson(`campaign:${campaign.id}`, campaign, 3600);

      // Create initial execution state
      const execution: CampaignExecution = {
        campaignId: campaign.id,
        customerId: campaign.customerId,
        currentStep: 0,
        tasksCreated: [],
        nextExecutionDate: campaign.startDate,
        status: 'running',
        context: {
          paymentRecordId: request.paymentRecordId,
          customerContext: context,
          startedAt: new Date()
        }
      };

      this.activeExecutions.set(campaign.id, execution);

      logger.info('Campaign created successfully', {
        campaignId: campaign.id,
        customerId: campaign.customerId,
        steps: campaign.escalationSteps.length
      });

      return campaign.id;

    } catch (error) {
      logger.error('Failed to create campaign:', error);
      throw error;
    }
  }

  private async optimizeEscalationSteps(
    steps: EscalationStep[],
    context: any,
    paymentRecord: PaymentRecord
  ): Promise<EscalationStep[]> {
    if (!context) {
      return steps;
    }

    const optimizedSteps = [...steps];

    // Adjust based on customer risk level
    if (context.riskAssessment?.currentRisk === 'high' || context.riskAssessment?.currentRisk === 'critical') {
      // Reduce delays for high-risk customers
      optimizedSteps.forEach(step => {
        step.delayHours = Math.max(24, step.delayHours * 0.7);
      });
      
      // Add priority phone contact for high amounts
      if (paymentRecord.amount > 1000) {
        optimizedSteps.unshift({
          stepNumber: 0,
          channel: ContactMethod.PHONE,
          template: 'urgent_payment_call',
          delayHours: 0,
          maxAttempts: 2,
          conditions: []
        });
      }
    }

    // Adjust based on communication preferences
    if (context.behaviorAnalysis?.preferredContactTimes?.length > 0) {
      const preferredChannel = context.behaviorAnalysis.preferredContactTimes[0].channel;
      
      // Prioritize preferred channel
      optimizedSteps.forEach((step, index) => {
        if (step.channel === preferredChannel) {
          step.stepNumber = index - 0.5; // Move earlier
        }
      });

      // Re-sort by step number
      optimizedSteps.sort((a, b) => a.stepNumber - b.stepNumber);
    }

    // Adjust based on payment patterns
    if (context.behaviorAnalysis?.paymentPatterns) {
      const hasLatePattern = context.behaviorAnalysis.paymentPatterns.some(
        p => p.pattern === 'late' && p.frequency > 0.5
      );

      if (hasLatePattern) {
        // Start earlier for consistently late payers
        optimizedSteps.forEach(step => {
          step.delayHours = Math.max(0, step.delayHours - 24);
        });
      }
    }

    return optimizedSteps;
  }

  async pauseCampaign(campaignId: string, pauseUntil?: Date): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      campaign.status = CampaignStatus.PAUSED;
      campaign.pausedUntil = pauseUntil;

      await this.updateCampaign(campaign);

      const execution = this.activeExecutions.get(campaignId);
      if (execution) {
        execution.status = 'paused';
      }

      logger.info('Campaign paused', {
        campaignId,
        pauseUntil: pauseUntil?.toISOString()
      });

    } catch (error) {
      logger.error(`Failed to pause campaign ${campaignId}:`, error);
      throw error;
    }
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      campaign.status = CampaignStatus.ACTIVE;
      campaign.pausedUntil = undefined;

      await this.updateCampaign(campaign);

      const execution = this.activeExecutions.get(campaignId);
      if (execution) {
        execution.status = 'running';
        execution.nextExecutionDate = new Date();
      }

      logger.info('Campaign resumed', { campaignId });

    } catch (error) {
      logger.error(`Failed to resume campaign ${campaignId}:`, error);
      throw error;
    }
  }

  async completeCampaign(campaignId: string, reason: string): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      campaign.status = CampaignStatus.COMPLETED;
      campaign.endDate = new Date();

      await this.updateCampaign(campaign);

      const execution = this.activeExecutions.get(campaignId);
      if (execution) {
        execution.status = 'completed';
        this.activeExecutions.delete(campaignId);
      }

      logger.info('Campaign completed', {
        campaignId,
        reason,
        duration: campaign.endDate.getTime() - campaign.startDate.getTime()
      });

      // Notify completion
      await this.mqService.publishNotification({
        type: 'campaign_completed',
        campaignId,
        reason,
        results: campaign.results,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`Failed to complete campaign ${campaignId}:`, error);
      throw error;
    }
  }

  private async loadActiveCampaigns(): Promise<void> {
    try {
      const result = await this.dbService.query(
        `SELECT * FROM campaigns 
         WHERE status IN ('active', 'paused') 
         ORDER BY created_at DESC`
      );

      for (const row of result.rows) {
        const campaign: Campaign = {
          id: row.id,
          name: row.name,
          description: row.description,
          customerId: row.customer_id,
          status: row.status,
          escalationSteps: row.escalation_steps,
          currentStep: row.current_step,
          startDate: row.start_date,
          endDate: row.end_date,
          pausedUntil: row.paused_until,
          results: row.results,
          config: row.config
        };

        // Create execution state
        const execution: CampaignExecution = {
          campaignId: campaign.id,
          customerId: campaign.customerId,
          currentStep: campaign.currentStep,
          tasksCreated: [],
          nextExecutionDate: this.calculateNextExecutionDate(campaign),
          status: campaign.status === CampaignStatus.ACTIVE ? 'running' : 'paused',
          context: {
            loadedFromDatabase: true,
            loadedAt: new Date()
          }
        };

        this.activeExecutions.set(campaign.id, execution);

        // Cache campaign
        await this.redisService.setJson(`campaign:${campaign.id}`, campaign, 3600);
      }

      logger.info(`Loaded ${result.rows.length} active campaigns`);

    } catch (error) {
      logger.error('Failed to load active campaigns:', error);
    }
  }

  private calculateNextExecutionDate(campaign: Campaign): Date {
    if (campaign.status === CampaignStatus.PAUSED && campaign.pausedUntil) {
      return campaign.pausedUntil;
    }

    const currentStep = campaign.escalationSteps[campaign.currentStep];
    if (!currentStep) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours
    }

    return new Date(Date.now() + currentStep.delayHours * 60 * 60 * 1000);
  }

  private startCampaignProcessing(): void {
    this.processingInterval = setInterval(async () => {
      await this.processCampaigns();
    }, 60 * 1000); // Process every minute

    logger.info('Campaign processing started');
  }

  private async processCampaigns(): Promise<void> {
    const now = new Date();

    for (const [campaignId, execution] of this.activeExecutions) {
      try {
        if (execution.status !== 'running') {
          continue;
        }

        if (!execution.nextExecutionDate || execution.nextExecutionDate > now) {
          continue;
        }

        await this.executeCampaignStep(campaignId, execution);

      } catch (error) {
        logger.error(`Error processing campaign ${campaignId}:`, error);
        
        execution.status = 'failed';
        await this.mqService.publishNotification({
          type: 'campaign_error',
          campaignId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        });
      }
    }
  }

  private async executeCampaignStep(campaignId: string, execution: CampaignExecution): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      logger.error(`Campaign not found during execution: ${campaignId}`);
      return;
    }

    const currentStep = campaign.escalationSteps[execution.currentStep];
    if (!currentStep) {
      // No more steps - complete campaign
      await this.completeCampaign(campaignId, 'All escalation steps completed');
      return;
    }

    logger.info('Executing campaign step', {
      campaignId,
      stepNumber: currentStep.stepNumber,
      channel: currentStep.channel
    });

    // Check conditions
    const conditionsMet = await this.checkStepConditions(campaign, currentStep, execution);
    if (!conditionsMet) {
      logger.info('Step conditions not met, advancing to next step', {
        campaignId,
        stepNumber: currentStep.stepNumber
      });
      
      await this.advanceToNextStep(campaign, execution);
      return;
    }

    // Check if payment has been made (campaign completion condition)
    const paymentStatus = await this.checkPaymentStatus(execution.context.paymentRecordId);
    if (paymentStatus === 'paid') {
      await this.completeCampaign(campaignId, 'Payment received');
      return;
    }

    // Create task for this step
    const task = await this.createStepTask(campaign, currentStep, execution);
    execution.tasksCreated.push(task.id);

    // Update campaign results
    campaign.results.totalContacts++;
    await this.updateCampaign(campaign);

    // Check if we've reached max attempts for this step
    const stepTasks = execution.tasksCreated.length;
    if (stepTasks >= currentStep.maxAttempts) {
      // Advance to next step
      await this.advanceToNextStep(campaign, execution);
    } else {
      // Schedule next attempt for this step
      execution.nextExecutionDate = new Date(
        Date.now() + Math.max(currentStep.delayHours * 60 * 60 * 1000 / currentStep.maxAttempts, 60 * 60 * 1000)
      );
    }
  }

  private async checkStepConditions(
    campaign: Campaign,
    step: EscalationStep,
    execution: CampaignExecution
  ): Promise<boolean> {
    if (!step.conditions || step.conditions.length === 0) {
      return true;
    }

    for (const condition of step.conditions) {
      const conditionMet = await this.evaluateCondition(condition, campaign, execution);
      if (!conditionMet) {
        return false;
      }
    }

    return true;
  }

  private async evaluateCondition(
    condition: EscalationCondition,
    campaign: Campaign,
    execution: CampaignExecution
  ): Promise<boolean> {
    switch (condition.type) {
      case ConditionType.DAYS_OVERDUE:
        const paymentRecord = await this.getPaymentRecord(execution.context.paymentRecordId);
        if (!paymentRecord) return false;
        
        const daysOverdue = Math.floor(
          (Date.now() - new Date(paymentRecord.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return this.compareValues(daysOverdue, condition.operator, condition.value);

      case ConditionType.PAYMENT_AMOUNT:
        const payment = await this.getPaymentRecord(execution.context.paymentRecordId);
        if (!payment) return false;
        
        return this.compareValues(payment.amount, condition.operator, condition.value);

      case ConditionType.CUSTOMER_RISK_LEVEL:
        const context = await this.contextEngine.getCustomerContext(campaign.customerId);
        if (!context) return false;
        
        const riskLevel = context.riskAssessment.currentRisk;
        return this.compareValues(riskLevel, condition.operator, condition.value);

      case ConditionType.RESPONSE_RATE:
        const customerContext = await this.contextEngine.getCustomerContext(campaign.customerId);
        if (!customerContext) return false;
        
        const responseRate = customerContext.behaviorAnalysis.responseRate;
        return this.compareValues(responseRate, condition.operator, condition.value);

      case ConditionType.TIME_OF_DAY:
        const currentHour = new Date().getHours();
        return this.compareValues(currentHour, condition.operator, condition.value);

      default:
        logger.warn(`Unknown condition type: ${condition.type}`);
        return true;
    }
  }

  private compareValues(actual: any, operator: Operator, expected: any): boolean {
    switch (operator) {
      case Operator.EQUALS:
        return actual === expected;
      case Operator.GREATER_THAN:
        return actual > expected;
      case Operator.LESS_THAN:
        return actual < expected;
      case Operator.CONTAINS:
        return String(actual).includes(String(expected));
      case Operator.IN:
        return Array.isArray(expected) ? expected.includes(actual) : false;
      default:
        return false;
    }
  }

  private async createStepTask(
    campaign: Campaign,
    step: EscalationStep,
    execution: CampaignExecution
  ): Promise<Task> {
    const customer = await this.getCustomer(campaign.customerId);
    const paymentRecord = await this.getPaymentRecord(execution.context.paymentRecordId);

    if (!customer || !paymentRecord) {
      throw new Error('Missing customer or payment record data');
    }

    // Determine task type based on channel
    let taskType: TaskType;
    switch (step.channel) {
      case ContactMethod.EMAIL:
        taskType = TaskType.SEND_EMAIL;
        break;
      case ContactMethod.PHONE:
        taskType = TaskType.MAKE_CALL;
        break;
      case ContactMethod.SMS:
        taskType = TaskType.SEND_SMS;
        break;
      default:
        throw new Error(`Unsupported channel: ${step.channel}`);
    }

    // Determine priority based on step number and customer risk
    let priority = Priority.MEDIUM;
    const context = await this.contextEngine.getCustomerContext(campaign.customerId);
    if (context?.riskAssessment?.currentRisk === 'critical') {
      priority = Priority.HIGH;
    }
    if (step.stepNumber >= 4) {
      priority = Priority.HIGH;
    }

    // Create task
    const task: Task = {
      id: uuidv4(),
      type: taskType,
      priority,
      customerId: campaign.customerId,
      campaignId: campaign.id,
      status: TaskStatus.PENDING,
      context: {
        customerId: campaign.customerId,
        campaignId: campaign.id,
        paymentRecordId: execution.context.paymentRecordId,
        previousAttempts: [],
        customerContext: context,
        messageTemplate: step.template,
        metadata: this.buildTaskMetadata(step, customer, paymentRecord, context)
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: 0,
      maxAttempts: 1 // Campaign manages retries, not individual tasks
    };

    // Store task in database
    await this.dbService.query(
      `INSERT INTO tasks (id, type, priority, customer_id, campaign_id, status, context, attempts, max_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        task.id,
        task.type,
        task.priority,
        task.customerId,
        task.campaignId,
        task.status,
        JSON.stringify(task.context),
        task.attempts,
        task.maxAttempts
      ]
    );

    // Cache task
    await this.redisService.setJson(`task:${task.id}`, task, 3600);

    logger.info('Campaign task created', {
      taskId: task.id,
      campaignId: campaign.id,
      type: task.type,
      channel: step.channel
    });

    return task;
  }

  private buildTaskMetadata(
    step: EscalationStep,
    customer: Customer,
    paymentRecord: PaymentRecord,
    context: any
  ): any {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(paymentRecord.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const metadata = {
      template: step.template,
      variables: {
        contactName: customer.contactName,
        companyName: customer.companyName,
        invoiceNumber: paymentRecord.invoiceNumber,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        dueDate: paymentRecord.dueDate.toLocaleDateString(),
        daysOverdue: Math.max(0, daysOverdue),
        supportPhone: process.env.SUPPORT_PHONE || '(555) 123-4567',
        paymentLink: `${process.env.BASE_URL}/pay/${paymentRecord.id}`,
        settlementAmount: Math.round(paymentRecord.amount * 0.8), // 20% discount
        discount: 20,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      }
    };

    // Add channel-specific metadata
    switch (step.channel) {
      case ContactMethod.EMAIL:
        metadata.to = customer.email;
        break;
      case ContactMethod.PHONE:
        metadata.phoneNumber = customer.phone || customer.mobile;
        metadata.script = step.template;
        break;
      case ContactMethod.SMS:
        metadata.phoneNumber = customer.mobile || customer.phone;
        break;
    }

    // Add context-based customizations
    if (context?.recommendations?.length > 0) {
      const commRec = context.recommendations.find(r => r.type === 'communication');
      if (commRec) {
        metadata.variables.customMessage = commRec.action;
      }
    }

    return metadata;
  }

  private async advanceToNextStep(campaign: Campaign, execution: CampaignExecution): Promise<void> {
    execution.currentStep++;
    execution.tasksCreated = [];

    // Update campaign in database
    campaign.currentStep = execution.currentStep;
    await this.updateCampaign(campaign);

    if (execution.currentStep >= campaign.escalationSteps.length) {
      // No more steps - complete campaign
      await this.completeCampaign(campaign.id, 'All escalation steps exhausted');
      return;
    }

    // Calculate next execution date
    const nextStep = campaign.escalationSteps[execution.currentStep];
    execution.nextExecutionDate = new Date(Date.now() + nextStep.delayHours * 60 * 60 * 1000);

    logger.info('Advanced to next campaign step', {
      campaignId: campaign.id,
      currentStep: execution.currentStep,
      nextExecution: execution.nextExecutionDate
    });
  }

  private async checkPaymentStatus(paymentRecordId: string): Promise<string> {
    try {
      const result = await this.dbService.query(
        'SELECT status FROM payment_records WHERE id = $1',
        [paymentRecordId]
      );

      return result.rows[0]?.status || 'unknown';
    } catch (error) {
      logger.error(`Failed to check payment status for ${paymentRecordId}:`, error);
      return 'unknown';
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        // Check for stalled campaigns
        const now = Date.now();
        const stalledCampaigns = [];

        for (const [campaignId, execution] of this.activeExecutions) {
          if (execution.status === 'running' && execution.nextExecutionDate) {
            const stalledTime = now - execution.nextExecutionDate.getTime();
            if (stalledTime > 60 * 60 * 1000) { // Stalled for more than 1 hour
              stalledCampaigns.push(campaignId);
            }
          }
        }

        if (stalledCampaigns.length > 0) {
          logger.warn(`Found ${stalledCampaigns.length} stalled campaigns`, {
            campaignIds: stalledCampaigns
          });

          // Reset stalled campaigns
          for (const campaignId of stalledCampaigns) {
            const execution = this.activeExecutions.get(campaignId);
            if (execution) {
              execution.nextExecutionDate = new Date(now + 5 * 60 * 1000); // Retry in 5 minutes
            }
          }
        }

        // Update metrics
        await this.updateMetrics();

      } catch (error) {
        logger.error('Error during campaign health check:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async updateMetrics(): Promise<void> {
    const metrics = {
      activeCampaigns: this.activeExecutions.size,
      runningCampaigns: Array.from(this.activeExecutions.values()).filter(e => e.status === 'running').length,
      pausedCampaigns: Array.from(this.activeExecutions.values()).filter(e => e.status === 'paused').length,
      timestamp: new Date()
    };

    await this.redisService.setJson('campaign_manager:metrics', metrics, 300);
  }

  // Helper methods
  private async getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      // Try cache first
      const cached = await this.redisService.getJson<Campaign>(`campaign:${campaignId}`);
      if (cached) {
        return cached;
      }

      // Fallback to database
      const result = await this.dbService.query(
        'SELECT * FROM campaigns WHERE id = $1',
        [campaignId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const campaign: Campaign = {
        id: row.id,
        name: row.name,
        description: row.description,
        customerId: row.customer_id,
        status: row.status,
        escalationSteps: row.escalation_steps,
        currentStep: row.current_step,
        startDate: row.start_date,
        endDate: row.end_date,
        pausedUntil: row.paused_until,
        results: row.results,
        config: row.config
      };

      await this.redisService.setJson(`campaign:${campaignId}`, campaign, 3600);
      return campaign;

    } catch (error) {
      logger.error(`Failed to get campaign ${campaignId}:`, error);
      return null;
    }
  }

  private async updateCampaign(campaign: Campaign): Promise<void> {
    try {
      await this.dbService.query(
        `UPDATE campaigns SET 
         status = $1, current_step = $2, end_date = $3, paused_until = $4, 
         results = $5, updated_at = $6 
         WHERE id = $7`,
        [
          campaign.status,
          campaign.currentStep,
          campaign.endDate,
          campaign.pausedUntil,
          JSON.stringify(campaign.results),
          new Date(),
          campaign.id
        ]
      );

      // Update cache
      await this.redisService.setJson(`campaign:${campaign.id}`, campaign, 3600);

    } catch (error) {
      logger.error(`Failed to update campaign ${campaign.id}:`, error);
      throw error;
    }
  }

  private async getCustomer(customerId: string): Promise<Customer | null> {
    // Similar implementation to other services...
    try {
      const result = await this.dbService.query(
        'SELECT * FROM customers WHERE id = $1',
        [customerId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
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
    } catch (error) {
      logger.error(`Failed to get customer ${customerId}:`, error);
      return null;
    }
  }

  private async getPaymentRecord(paymentRecordId: string): Promise<PaymentRecord | null> {
    try {
      const result = await this.dbService.query(
        'SELECT * FROM payment_records WHERE id = $1',
        [paymentRecordId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        amount: parseFloat(row.amount),
        currency: row.currency,
        dueDate: row.due_date,
        paidDate: row.paid_date,
        status: row.status,
        invoiceNumber: row.invoice_number,
        description: row.description
      };
    } catch (error) {
      logger.error(`Failed to get payment record ${paymentRecordId}:`, error);
      return null;
    }
  }

  // Public API methods
  async getCampaignStatus(campaignId: string): Promise<any> {
    const campaign = await this.getCampaign(campaignId);
    const execution = this.activeExecutions.get(campaignId);

    return {
      campaign,
      execution,
      isActive: !!execution && execution.status === 'running'
    };
  }

  async getActiveCampaigns(): Promise<any[]> {
    return Array.from(this.activeExecutions.entries()).map(([campaignId, execution]) => ({
      campaignId,
      ...execution
    }));
  }

  async getManagerMetrics(): Promise<any> {
    const metrics = await this.redisService.getJson('campaign_manager:metrics');
    return {
      ...metrics,
      activeExecutions: this.activeExecutions.size,
      isRunning: this.isRunning
    };
  }

  async shutdown(): Promise<void> {
    try {
      this.isRunning = false;

      if (this.processingInterval) {
        clearInterval(this.processingInterval);
      }

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Pause all active campaigns
      for (const [campaignId, execution] of this.activeExecutions) {
        if (execution.status === 'running') {
          await this.pauseCampaign(campaignId);
        }
      }

      this.activeExecutions.clear();

      logger.info('Campaign Manager shut down successfully');

    } catch (error) {
      logger.error('Error shutting down Campaign Manager:', error);
    }
  }
}