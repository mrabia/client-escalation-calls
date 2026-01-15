import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import { MessageQueueService } from '@/core/services/messageQueue';
import { config } from '@/config';
import { logger } from '@/utils/logger';

// Base agents
import { EmailAgent, EmailConfig, createEmailConfigFromEnv } from './email/EmailAgent';
import { SmsAgent } from './sms/SmsAgent';

// Enhanced agents with memory integration
import { EmailAgentEnhanced } from './email/EmailAgentEnhanced';
import { SMSAgentEnhanced } from './sms/SMSAgentEnhanced';
import { PhoneAgentEnhanced } from './phone/PhoneAgentEnhanced';

/**
 * Agent Factory
 * 
 * Creates agent instances based on configuration.
 * When AI generation and vector memory features are enabled,
 * creates enhanced agents with Agentic RAG capabilities.
 */
export class AgentFactory {
  private dbService: DatabaseService;
  private redisService: RedisService;
  private mqService: MessageQueueService;
  
  constructor(
    dbService: DatabaseService,
    redisService: RedisService,
    mqService: MessageQueueService
  ) {
    this.dbService = dbService;
    this.redisService = redisService;
    this.mqService = mqService;
  }
  
  /**
   * Check if enhanced agents should be used
   */
  private shouldUseEnhancedAgents(): boolean {
    return config.features.aiGeneration && config.features.vectorMemory;
  }
  
  /**
   * Create an email agent
   */
  createEmailAgent(agentId: string, emailConfig?: EmailConfig): EmailAgent {
    const effectiveConfig = emailConfig || createEmailConfigFromEnv();
    
    if (this.shouldUseEnhancedAgents() && config.features.emailAgent) {
      logger.info(`Creating enhanced email agent: ${agentId}`);
      return new EmailAgentEnhanced(
        agentId,
        effectiveConfig,
        this.dbService,
        this.redisService,
        this.mqService
      );
    }
    
    logger.info(`Creating standard email agent: ${agentId}`);
    return new EmailAgent(
      agentId,
      effectiveConfig,
      this.dbService,
      this.redisService,
      this.mqService
    );
  }
  
  /**
   * Create an SMS agent
   */
  createSmsAgent(agentId: string, smsConfig?: any): SmsAgent | SMSAgentEnhanced {
    const effectiveConfig = smsConfig || this.createDefaultSmsConfig();
    
    if (this.shouldUseEnhancedAgents() && config.features.smsAgent) {
      logger.info(`Creating enhanced SMS agent: ${agentId}`);
      return new SMSAgentEnhanced(
        agentId,
        effectiveConfig,
        this.dbService,
        this.redisService,
        this.mqService
      );
    }
    
    logger.info(`Creating standard SMS agent: ${agentId}`);
    return new SmsAgent(
      agentId,
      effectiveConfig,
      this.dbService,
      this.redisService,
      this.mqService
    );
  }
  
  /**
   * Create a phone agent (enhanced only - base not fully implemented)
   */
  createPhoneAgent(agentId: string, phoneConfig?: any): PhoneAgentEnhanced {
    const effectiveConfig = phoneConfig || this.createDefaultPhoneConfig();
    
    logger.info(`Creating phone agent: ${agentId}`);
    return new PhoneAgentEnhanced(
      agentId,
      effectiveConfig,
      this.dbService,
      this.redisService,
      this.mqService
    );
  }
  
  /**
   * Create default SMS config from environment
   */
  private createDefaultSmsConfig(): any {
    return {
      twilio: {
        accountSid: config.twilio.accountSid,
        authToken: config.twilio.authToken,
        phoneNumber: config.twilio.phoneNumber
      },
      messageSettings: {
        maxLength: 160,
        enableDeliveryTracking: true,
        enableOptOut: true,
        optOutKeywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL']
      },
      templates: {},
      complianceSettings: {
        includeOptOut: true,
        businessHours: {
          start: config.business.businessHoursStart,
          end: config.business.businessHoursEnd,
          timezone: config.business.defaultTimezone
        },
        respectDoNotContact: config.compliance.enableDoNotCallCheck
      }
    };
  }
  
  /**
   * Create default phone config from environment
   */
  private createDefaultPhoneConfig(): any {
    return {
      twilio: {
        accountSid: config.twilio.accountSid,
        authToken: config.twilio.authToken,
        phoneNumber: config.twilio.phoneNumber,
        webhookUrl: config.twilio.webhookUrl
      },
      callSettings: {
        maxDuration: 600,
        ringTimeout: 30,
        machineDetection: true
      },
      complianceSettings: {
        businessHours: {
          start: config.business.businessHoursStart,
          end: config.business.businessHoursEnd,
          timezone: config.business.defaultTimezone
        },
        respectDoNotContact: config.compliance.enableDoNotCallCheck
      }
    };
  }
  
  /**
   * Get status of available agent types
   */
  getAvailableAgents(): {
    email: { enabled: boolean; enhanced: boolean };
    phone: { enabled: boolean; enhanced: boolean };
    sms: { enabled: boolean; enhanced: boolean };
    research: { enabled: boolean; enhanced: boolean };
  } {
    const useEnhanced = this.shouldUseEnhancedAgents();
    
    return {
      email: {
        enabled: config.features.emailAgent,
        enhanced: useEnhanced && config.features.emailAgent
      },
      phone: {
        enabled: config.features.phoneAgent,
        enhanced: useEnhanced && config.features.phoneAgent
      },
      sms: {
        enabled: config.features.smsAgent,
        enhanced: useEnhanced && config.features.smsAgent
      },
      research: {
        enabled: config.features.researchAgent,
        enhanced: useEnhanced && config.features.researchAgent
      }
    };
  }
}

/**
 * Create a singleton agent factory instance
 */
let agentFactoryInstance: AgentFactory | null = null;

export function getAgentFactory(
  dbService: DatabaseService,
  redisService: RedisService,
  mqService: MessageQueueService
): AgentFactory {
  if (!agentFactoryInstance) {
    agentFactoryInstance = new AgentFactory(dbService, redisService, mqService);
  }
  return agentFactoryInstance;
}
