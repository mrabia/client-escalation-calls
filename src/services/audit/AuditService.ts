import { Logger } from 'winston';
import { RedisClientType } from 'redis';
import { config } from '@/config';

/**
 * Audit Event Types
 */
export type AuditEventType = 
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'auth.password_change'
  | 'auth.token_refresh'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'customer.create'
  | 'customer.update'
  | 'customer.delete'
  | 'customer.view'
  | 'campaign.create'
  | 'campaign.update'
  | 'campaign.delete'
  | 'campaign.start'
  | 'campaign.pause'
  | 'campaign.complete'
  | 'contact.email_sent'
  | 'contact.call_made'
  | 'contact.sms_sent'
  | 'contact.opt_out'
  | 'payment.received'
  | 'payment.failed'
  | 'system.config_change'
  | 'system.error'
  | 'compliance.consent_granted'
  | 'compliance.consent_revoked'
  | 'data.export'
  | 'data.access';

/**
 * Audit Event Severity
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Audit Event
 */
export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Audit Query Options
 */
export interface AuditQueryOptions {
  userId?: string;
  eventType?: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit Service
 * 
 * Provides comprehensive audit logging for:
 * - User authentication events
 * - Data access and modifications
 * - System configuration changes
 * - Compliance-related events
 * 
 * Uses Redis for real-time storage and supports long-term archival.
 */
export class AuditService {
  private readonly redis: RedisClientType;
  private readonly logger: Logger;
  private readonly enabled: boolean;
  private readonly retentionDays: number;
  private readonly keyPrefix = 'audit';
  
  constructor(redis: RedisClientType, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
    this.enabled = config.compliance.enableAuditLogging;
    this.retentionDays = 2555; // 7 years for compliance
    
    if (this.enabled) {
      this.logger.info('Audit service initialized', { retentionDays: this.retentionDays });
    } else {
      this.logger.warn('Audit logging is disabled');
    }
  }
  
  /**
   * Check if audit logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }
    
    try {
      const id = this.generateEventId();
      const timestamp = new Date();
      
      const auditEvent: AuditEvent = {
        id,
        timestamp,
        ...event
      };
      
      // Store in Redis with TTL
      const key = `${this.keyPrefix}:${id}`;
      const ttl = this.retentionDays * 24 * 60 * 60;
      
      await this.redis.set(key, JSON.stringify(auditEvent), { EX: ttl });
      
      // Also store in time-series index for querying
      const dateKey = `${this.keyPrefix}:index:${timestamp.toISOString().split('T')[0]}`;
      await this.redis.sAdd(dateKey, id);
      await this.redis.expire(dateKey, ttl);
      
      // Store in user index if userId is present
      if (event.userId) {
        const userKey = `${this.keyPrefix}:user:${event.userId}`;
        await this.redis.lPush(userKey, id);
        await this.redis.lTrim(userKey, 0, 9999); // Keep last 10000 events per user
        await this.redis.expire(userKey, ttl);
      }
      
      // Store in resource index if resourceId is present
      if (event.resourceType && event.resourceId) {
        const resourceKey = `${this.keyPrefix}:resource:${event.resourceType}:${event.resourceId}`;
        await this.redis.lPush(resourceKey, id);
        await this.redis.lTrim(resourceKey, 0, 999); // Keep last 1000 events per resource
        await this.redis.expire(resourceKey, ttl);
      }
      
      // Log to application logger for immediate visibility
      const logLevel = event.severity === 'critical' || event.severity === 'error' ? 'error' :
                       event.severity === 'warning' ? 'warn' : 'info';
      
      this.logger[logLevel](`Audit: ${event.eventType}`, {
        auditId: id,
        action: event.action,
        userId: event.userId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        success: event.success
      });
      
      return id;
      
    } catch (error) {
      this.logger.error('Failed to log audit event', { error, event });
      // Don't throw - audit logging shouldn't break main flow
      return null;
    }
  }
  
  /**
   * Log authentication event
   */
  async logAuth(
    eventType: 'auth.login' | 'auth.logout' | 'auth.failed_login' | 'auth.password_change' | 'auth.token_refresh',
    userId: string | undefined,
    userEmail: string,
    success: boolean,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    return this.log({
      eventType,
      severity: success ? 'info' : 'warning',
      userId,
      userEmail,
      action: eventType.replace('auth.', '').replace('_', ' '),
      details,
      ipAddress,
      userAgent,
      success
    });
  }
  
  /**
   * Log data access event
   */
  async logDataAccess(
    userId: string,
    userEmail: string,
    userRole: string,
    resourceType: string,
    resourceId: string,
    action: 'view' | 'create' | 'update' | 'delete' | 'export',
    success: boolean,
    details?: Record<string, any>
  ): Promise<string | null> {
    const eventTypeMap: Record<string, AuditEventType> = {
      view: 'data.access',
      create: 'customer.create',
      update: 'customer.update',
      delete: 'customer.delete',
      export: 'data.export'
    };
    
    return this.log({
      eventType: eventTypeMap[action] || 'data.access',
      severity: success ? 'info' : 'warning',
      userId,
      userEmail,
      userRole,
      resourceType,
      resourceId,
      action: `${action} ${resourceType}`,
      details,
      success
    });
  }
  
  /**
   * Log contact attempt
   */
  async logContact(
    channel: 'email' | 'phone' | 'sms',
    customerId: string,
    campaignId: string,
    success: boolean,
    details?: Record<string, any>
  ): Promise<string | null> {
    const eventTypeMap: Record<string, AuditEventType> = {
      email: 'contact.email_sent',
      phone: 'contact.call_made',
      sms: 'contact.sms_sent'
    };
    
    return this.log({
      eventType: eventTypeMap[channel],
      severity: success ? 'info' : 'warning',
      resourceType: 'customer',
      resourceId: customerId,
      action: `${channel} contact attempt`,
      details: { ...details, campaignId },
      success
    });
  }
  
  /**
   * Log compliance event
   */
  async logCompliance(
    eventType: 'compliance.consent_granted' | 'compliance.consent_revoked' | 'contact.opt_out',
    customerId: string,
    channel: string,
    source: string,
    details?: Record<string, any>
  ): Promise<string | null> {
    return this.log({
      eventType,
      severity: 'info',
      resourceType: 'customer',
      resourceId: customerId,
      action: eventType.replace('compliance.', '').replace('.', ' ').replace('_', ' '),
      details: { ...details, channel, source },
      success: true
    });
  }
  
  /**
   * Log system event
   */
  async logSystem(
    action: string,
    severity: AuditSeverity,
    success: boolean,
    details?: Record<string, any>,
    errorMessage?: string
  ): Promise<string | null> {
    return this.log({
      eventType: success ? 'system.config_change' : 'system.error',
      severity,
      action,
      details,
      success,
      errorMessage
    });
  }
  
  /**
   * Get audit event by ID
   */
  async getEvent(eventId: string): Promise<AuditEvent | null> {
    try {
      const key = `${this.keyPrefix}:${eventId}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data) as AuditEvent;
      
    } catch (error) {
      this.logger.error('Failed to get audit event', { error, eventId });
      return null;
    }
  }
  
  /**
   * Query audit events for a user
   */
  async getUserEvents(userId: string, limit: number = 100): Promise<AuditEvent[]> {
    try {
      const userKey = `${this.keyPrefix}:user:${userId}`;
      const eventIds = await this.redis.lRange(userKey, 0, limit - 1);
      
      const events: AuditEvent[] = [];
      for (const id of eventIds) {
        const event = await this.getEvent(id);
        if (event) {
          events.push(event);
        }
      }
      
      return events;
      
    } catch (error) {
      this.logger.error('Failed to get user events', { error, userId });
      return [];
    }
  }
  
  /**
   * Query audit events for a resource
   */
  async getResourceEvents(resourceType: string, resourceId: string, limit: number = 100): Promise<AuditEvent[]> {
    try {
      const resourceKey = `${this.keyPrefix}:resource:${resourceType}:${resourceId}`;
      const eventIds = await this.redis.lRange(resourceKey, 0, limit - 1);
      
      const events: AuditEvent[] = [];
      for (const id of eventIds) {
        const event = await this.getEvent(id);
        if (event) {
          events.push(event);
        }
      }
      
      return events;
      
    } catch (error) {
      this.logger.error('Failed to get resource events', { error, resourceType, resourceId });
      return [];
    }
  }
  
  /**
   * Get audit statistics
   */
  async getStats(days: number = 7): Promise<{
    totalEvents: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    successRate: number;
  }> {
    try {
      let totalEvents = 0;
      let successCount = 0;
      const byType: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      
      const today = new Date();
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = `${this.keyPrefix}:index:${date.toISOString().split('T')[0]}`;
        
        const eventIds = await this.redis.sMembers(dateKey);
        
        for (const id of eventIds) {
          const event = await this.getEvent(id);
          if (event) {
            totalEvents++;
            if (event.success) successCount++;
            byType[event.eventType] = (byType[event.eventType] || 0) + 1;
            bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
          }
        }
      }
      
      return {
        totalEvents,
        byType,
        bySeverity,
        successRate: totalEvents > 0 ? successCount / totalEvents : 1
      };
      
    } catch (error) {
      this.logger.error('Failed to get audit stats', { error });
      return {
        totalEvents: 0,
        byType: {},
        bySeverity: {},
        successRate: 1
      };
    }
  }
  
  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `audit_${timestamp}_${random}`;
  }
}
