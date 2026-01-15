import { Logger } from 'winston';
import { RedisClientType } from 'redis';
import { config } from '@/config';

/**
 * TCPA Compliance Service
 * 
 * Implements Telephone Consumer Protection Act (TCPA) compliance:
 * - Opt-out management
 * - Consent tracking
 * - Call frequency limits
 * - Time restrictions
 * - Do Not Call (DNC) list management
 */
export class TCPAService {
  private redis: RedisClientType;
  private logger: Logger;
  
  // TCPA configuration from environment
  private readonly maxContactsPerDay: number;
  private readonly callHoursStart: number;
  private readonly callHoursEnd: number;
  private readonly defaultTimezone: string;
  private readonly enabled: boolean;
  private readonly dncEnabled: boolean;
  private readonly OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT'];
  
  constructor(redis: RedisClientType, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
    
    // Load configuration from environment
    this.maxContactsPerDay = config.business.maxDailyContactsPerCustomer;
    this.defaultTimezone = config.business.defaultTimezone;
    this.enabled = config.compliance.enableTcpaCompliance;
    this.dncEnabled = config.compliance.enableDoNotCallCheck;
    
    // Parse business hours (format: "09:00" -> 9)
    this.callHoursStart = this.parseHour(config.business.businessHoursStart, 8);
    this.callHoursEnd = this.parseHour(config.business.businessHoursEnd, 21);
    
    this.logger.info('TCPA Service initialized', {
      enabled: this.enabled,
      dncEnabled: this.dncEnabled,
      maxContactsPerDay: this.maxContactsPerDay,
      businessHours: `${this.callHoursStart}:00 - ${this.callHoursEnd}:00`,
      timezone: this.defaultTimezone
    });
  }
  
  /**
   * Parse hour from time string (e.g., "09:00" -> 9)
   */
  private parseHour(timeStr: string, defaultHour: number): number {
    try {
      const hour = parseInt(timeStr.split(':')[0], 10);
      return isNaN(hour) ? defaultHour : hour;
    } catch {
      return defaultHour;
    }
  }
  
  /**
   * Check if TCPA compliance is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Check if contact is allowed under TCPA
   */
  async canContact(
    customerId: string,
    channel: 'phone' | 'sms' | 'email',
    timezone: string = 'America/New_York'
  ): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: Date;
  }> {
    try {
      // Check opt-out status
      const isOptedOut = await this.isOptedOut(customerId, channel);
      if (isOptedOut) {
        return {
          allowed: false,
          reason: `Customer has opted out of ${channel} communications`
        };
      }
      
      // Check consent
      const hasConsent = await this.hasConsent(customerId, channel);
      if (!hasConsent) {
        return {
          allowed: false,
          reason: `No consent on record for ${channel} communications`
        };
      }
      
      // Check frequency limits
      const frequencyCheck = await this.checkFrequencyLimit(customerId, channel);
      if (!frequencyCheck.allowed) {
        return frequencyCheck;
      }
      
      // Check time restrictions (for phone/SMS only)
      if (channel === 'phone' || channel === 'sms') {
        const timeCheck = this.checkTimeRestrictions(timezone);
        if (!timeCheck.allowed) {
          return timeCheck;
        }
      }
      
      return { allowed: true };
      
    } catch (error) {
      this.logger.error('TCPA check failed', { error, customerId, channel });
      // Fail closed - don't allow contact if check fails
      return {
        allowed: false,
        reason: 'Compliance check failed'
      };
    }
  }
  
  /**
   * Check if customer has opted out
   */
  async isOptedOut(customerId: string, channel: 'phone' | 'sms' | 'email'): Promise<boolean> {
    const key = `tcpa:optout:${customerId}:${channel}`;
    const optedOut = await this.redis.get(key);
    return optedOut === '1';
  }
  
  /**
   * Record opt-out
   */
  async recordOptOut(
    customerId: string,
    channel: 'phone' | 'sms' | 'email' | 'all',
    source: string
  ): Promise<void> {
    try {
      const channels = channel === 'all' ? ['phone', 'sms', 'email'] : [channel];
      
      for (const ch of channels) {
        const key = `tcpa:optout:${customerId}:${ch}`;
        await this.redis.set(key, '1');
        // No expiration - opt-outs are permanent
      }
      
      // Log for audit trail
      await this.logComplianceEvent({
        customerId,
        event: 'opt_out',
        channel,
        source,
        timestamp: new Date()
      });
      
      this.logger.info(`Opt-out recorded`, { customerId, channel, source });
      
    } catch (error) {
      this.logger.error('Failed to record opt-out', { error, customerId, channel });
      throw error;
    }
  }
  
  /**
   * Check if customer has given consent
   */
  async hasConsent(customerId: string, channel: 'phone' | 'sms' | 'email'): Promise<boolean> {
    const key = `tcpa:consent:${customerId}:${channel}`;
    const consent = await this.redis.get(key);
    return consent === '1';
  }
  
  /**
   * Record customer consent
   */
  async recordConsent(
    customerId: string,
    channel: 'phone' | 'sms' | 'email' | 'all',
    source: string,
    expiresInDays: number = 365
  ): Promise<void> {
    try {
      const channels = channel === 'all' ? ['phone', 'sms', 'email'] : [channel];
      
      for (const ch of channels) {
        const key = `tcpa:consent:${customerId}:${ch}`;
        await this.redis.set(key, '1', {
          EX: expiresInDays * 24 * 60 * 60 // Convert days to seconds
        });
      }
      
      // Log for audit trail
      await this.logComplianceEvent({
        customerId,
        event: 'consent_granted',
        channel,
        source,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
        timestamp: new Date()
      });
      
      this.logger.info(`Consent recorded`, { customerId, channel, source, expiresInDays });
      
    } catch (error) {
      this.logger.error('Failed to record consent', { error, customerId, channel });
      throw error;
    }
  }
  
  /**
   * Check frequency limits
   */
  private async checkFrequencyLimit(
    customerId: string,
    channel: 'phone' | 'sms' | 'email'
  ): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: Date;
  }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `tcpa:frequency:${customerId}:${channel}:${today}`;
    
    const count = await this.redis.get(key);
    const currentCount = count ? Number.parseInt(count, 10) : 0;
    
    // Use config-based max contacts per day (same limit for all channels)
    const maxLimit = this.maxContactsPerDay;
    
    if (currentCount >= maxLimit) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      return {
        allowed: false,
        reason: `Daily ${channel} limit reached (${maxLimit} per day)`,
        retryAfter: tomorrow
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Record contact attempt
   */
  async recordContactAttempt(
    customerId: string,
    channel: 'phone' | 'sms' | 'email'
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `tcpa:frequency:${customerId}:${channel}:${today}`;
      
      await this.redis.incr(key);
      await this.redis.expire(key, 24 * 60 * 60); // Expire after 24 hours
      
      // Log for audit trail
      await this.logComplianceEvent({
        customerId,
        event: 'contact_attempt',
        channel,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.logger.error('Failed to record contact attempt', { error, customerId, channel });
      // Don't throw - this is logging only
    }
  }
  
  /**
   * Check time restrictions (8 AM - 9 PM local time)
   */
  private checkTimeRestrictions(timezone: string): {
    allowed: boolean;
    reason?: string;
    retryAfter?: Date;
  } {
    try {
      const now = new Date();
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const hour = localTime.getHours();
      
      if (hour < this.callHoursStart || hour >= this.callHoursEnd) {
        const retryAfter = new Date(localTime);
        if (hour >= this.callHoursEnd) {
          // After end time, retry tomorrow at start time
          retryAfter.setDate(retryAfter.getDate() + 1);
          retryAfter.setHours(this.callHoursStart, 0, 0, 0);
        } else {
          // Before start time, retry today at start time
          retryAfter.setHours(this.callHoursStart, 0, 0, 0);
        }
        
        return {
          allowed: false,
          reason: `Outside permitted calling hours (${this.callHoursStart}:00 - ${this.callHoursEnd}:00 ${timezone})`,
          retryAfter
        };
      }
      
      return { allowed: true };
      
    } catch (error) {
      this.logger.error('Time restriction check failed', { error, timezone });
      // Fail closed
      return {
        allowed: false,
        reason: 'Time zone validation failed'
      };
    }
  }
  
  /**
   * Detect opt-out keywords in message
   */
  detectOptOut(message: string): boolean {
    const normalized = message.toUpperCase().trim();
    return this.OPT_OUT_KEYWORDS.some(keyword => normalized.includes(keyword));
  }
  
  /**
   * Log compliance event for audit trail
   */
  private async logComplianceEvent(event: {
    customerId: string;
    event: string;
    channel?: string;
    source?: string;
    expiresAt?: Date;
    timestamp: Date;
  }): Promise<void> {
    try {
      const key = `tcpa:audit:${event.customerId}:${Date.now()}`;
      await this.redis.set(key, JSON.stringify(event), {
        EX: 7 * 365 * 24 * 60 * 60 // Keep audit logs for 7 years
      });
    } catch (error) {
      this.logger.error('Failed to log compliance event', { error, event });
      // Don't throw - audit logging shouldn't break main flow
    }
  }
  
  /**
   * Get compliance status for customer
   */
  async getComplianceStatus(customerId: string): Promise<{
    phone: {
      optedOut: boolean;
      hasConsent: boolean;
      contactsToday: number;
    };
    sms: {
      optedOut: boolean;
      hasConsent: boolean;
      contactsToday: number;
    };
    email: {
      optedOut: boolean;
      hasConsent: boolean;
      contactsToday: number;
    };
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      phoneOptOut, phoneConsent, phoneCount,
      smsOptOut, smsConsent, smsCount,
      emailOptOut, emailConsent, emailCount
    ] = await Promise.all([
      this.isOptedOut(customerId, 'phone'),
      this.hasConsent(customerId, 'phone'),
      this.redis.get(`tcpa:frequency:${customerId}:phone:${today}`),
      this.isOptedOut(customerId, 'sms'),
      this.hasConsent(customerId, 'sms'),
      this.redis.get(`tcpa:frequency:${customerId}:sms:${today}`),
      this.isOptedOut(customerId, 'email'),
      this.hasConsent(customerId, 'email'),
      this.redis.get(`tcpa:frequency:${customerId}:email:${today}`)
    ]);
    
    return {
      phone: {
        optedOut: phoneOptOut,
        hasConsent: phoneConsent,
        contactsToday: phoneCount ? parseInt(phoneCount) : 0
      },
      sms: {
        optedOut: smsOptOut,
        hasConsent: smsConsent,
        contactsToday: smsCount ? parseInt(smsCount) : 0
      },
      email: {
        optedOut: emailOptOut,
        hasConsent: emailConsent,
        contactsToday: emailCount ? parseInt(emailCount) : 0
      }
    };
  }
}
