/**
 * Email Delivery Service
 * Handles email delivery tracking, bounce processing, and retry logic
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '@/config';
import { createLogger, Logger } from '@/utils/logger';

/**
 * Email delivery status
 */
export enum DeliveryStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  SOFT_BOUNCE = 'soft_bounce',
  COMPLAINED = 'complained',
  UNSUBSCRIBED = 'unsubscribed',
  FAILED = 'failed'
}

/**
 * Bounce types
 */
export enum BounceType {
  HARD = 'hard',           // Permanent failure (invalid email, domain doesn't exist)
  SOFT = 'soft',           // Temporary failure (mailbox full, server down)
  COMPLAINT = 'complaint', // Spam complaint
  UNKNOWN = 'unknown'
}

/**
 * Email delivery record
 */
export interface EmailDeliveryRecord {
  id: string;
  messageId: string;
  taskId: string;
  customerId: string;
  campaignId: string;
  recipient: string;
  subject: string;
  status: DeliveryStatus;
  attempts: number;
  maxAttempts: number;
  lastAttempt: Date | null;
  nextRetry: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  bouncedAt: Date | null;
  bounceType: BounceType | null;
  bounceReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bounce record
 */
export interface BounceRecord {
  id: string;
  email: string;
  bounceType: BounceType;
  bounceCode: string;
  bounceMessage: string;
  messageId: string;
  timestamp: Date;
  permanent: boolean;
}

/**
 * Email thread
 */
export interface EmailThread {
  id: string;
  customerId: string;
  taskId: string;
  subject: string;
  participants: string[];
  messageIds: string[];
  lastMessageAt: Date;
  status: 'active' | 'resolved' | 'pending';
  createdAt: Date;
}

/**
 * Email Delivery Service
 */
export class EmailDeliveryService {
  private static instance: EmailDeliveryService | null = null;
  
  private readonly redis: RedisClientType;
  private readonly logger: Logger;
  
  // Retry configuration
  private readonly maxRetries = 3;
  private readonly retryDelays = [60, 300, 900]; // 1min, 5min, 15min (seconds)
  
  // Bounce thresholds
  private readonly softBounceThreshold = 3; // Mark as hard bounce after 3 soft bounces

  private constructor() {
    this.redis = createClient({ url: config.redis.url });
    this.redis.connect().catch(err => {
      this.logger?.error('Failed to connect to Redis for EmailDelivery', err);
    });
    this.logger = createLogger('EmailDeliveryService');
  }

  static getInstance(): EmailDeliveryService {
    if (!EmailDeliveryService.instance) {
      EmailDeliveryService.instance = new EmailDeliveryService();
    }
    return EmailDeliveryService.instance;
  }

  /**
   * Create a new delivery record when queueing an email
   */
  async createDeliveryRecord(params: {
    messageId: string;
    taskId: string;
    customerId: string;
    campaignId: string;
    recipient: string;
    subject: string;
    metadata?: Record<string, unknown>;
  }): Promise<EmailDeliveryRecord> {
    const id = `delivery_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const record: EmailDeliveryRecord = {
      id,
      messageId: params.messageId,
      taskId: params.taskId,
      customerId: params.customerId,
      campaignId: params.campaignId,
      recipient: params.recipient,
      subject: params.subject,
      status: DeliveryStatus.QUEUED,
      attempts: 0,
      maxAttempts: this.maxRetries,
      lastAttempt: null,
      nextRetry: null,
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      bouncedAt: null,
      bounceType: null,
      bounceReason: null,
      metadata: params.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveDeliveryRecord(record);
    
    // Index by messageId for webhook lookups
    await this.redis.set(`email:msgid:${params.messageId}`, id, { EX: 86400 * 30 }); // 30 days
    
    // Index by recipient for bounce checks
    await this.redis.sAdd(`email:recipient:${params.recipient}`, id);
    
    this.logger.info('Created email delivery record', { id, recipient: params.recipient });
    
    return record;
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    idOrMessageId: string,
    status: DeliveryStatus,
    metadata?: Record<string, unknown>
  ): Promise<EmailDeliveryRecord | null> {
    // Try to find by ID first, then by messageId
    let record = await this.getDeliveryRecord(idOrMessageId);
    
    if (!record) {
      const id = await this.redis.get(`email:msgid:${idOrMessageId}`);
      if (id) {
        record = await this.getDeliveryRecord(id);
      }
    }
    
    if (!record) {
      this.logger.warn('Delivery record not found', { idOrMessageId });
      return null;
    }

    record.status = status;
    record.updatedAt = new Date();
    
    // Update specific timestamps based on status
    switch (status) {
      case DeliveryStatus.SENT:
        record.sentAt = new Date();
        break;
      case DeliveryStatus.DELIVERED:
        record.deliveredAt = new Date();
        break;
      case DeliveryStatus.OPENED:
        record.openedAt = new Date();
        break;
      case DeliveryStatus.BOUNCED:
      case DeliveryStatus.SOFT_BOUNCE:
        record.bouncedAt = new Date();
        break;
    }
    
    if (metadata) {
      record.metadata = { ...record.metadata, ...metadata };
    }

    await this.saveDeliveryRecord(record);
    
    this.logger.info('Updated delivery status', { 
      id: record.id, 
      status,
      recipient: record.recipient 
    });
    
    return record;
  }

  /**
   * Process a bounce notification
   */
  async processBounce(params: {
    messageId: string;
    email: string;
    bounceType: BounceType;
    bounceCode?: string;
    bounceMessage?: string;
  }): Promise<void> {
    const { messageId, email, bounceType, bounceCode, bounceMessage } = params;
    
    // Record the bounce
    const bounceRecord: BounceRecord = {
      id: `bounce_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      email,
      bounceType,
      bounceCode: bounceCode || 'unknown',
      bounceMessage: bounceMessage || 'No message provided',
      messageId,
      timestamp: new Date(),
      permanent: bounceType === BounceType.HARD
    };
    
    await this.redis.set(
      `email:bounce:${bounceRecord.id}`,
      JSON.stringify(bounceRecord),
      { EX: 86400 * 365 } // Keep bounce records for 1 year
    );
    
    // Add to bounced email set
    await this.redis.sAdd('email:bounced', email.toLowerCase());
    
    // Track bounce count for soft bounces
    if (bounceType === BounceType.SOFT) {
      const bounceCount = await this.redis.incr(`email:softbounce:${email.toLowerCase()}`);
      await this.redis.expire(`email:softbounce:${email.toLowerCase()}`, 86400 * 7); // 7 days
      
      // Convert to hard bounce if threshold exceeded
      if (bounceCount >= this.softBounceThreshold) {
        await this.markAsHardBounce(email);
      }
    } else if (bounceType === BounceType.HARD) {
      await this.markAsHardBounce(email);
    }
    
    // Update delivery record
    await this.updateDeliveryStatus(
      messageId,
      bounceType === BounceType.HARD ? DeliveryStatus.BOUNCED : DeliveryStatus.SOFT_BOUNCE,
      { bounceType, bounceCode, bounceMessage }
    );
    
    this.logger.warn('Processed email bounce', { 
      email, 
      bounceType, 
      bounceCode,
      messageId 
    });
  }

  /**
   * Mark email as hard bounced (permanently invalid)
   */
  private async markAsHardBounce(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    await this.redis.sAdd('email:hardbounce', normalizedEmail);
    await this.redis.del(`email:softbounce:${normalizedEmail}`);
    
    this.logger.info('Marked email as hard bounce', { email: normalizedEmail });
  }

  /**
   * Check if email is bounced (should not send)
   */
  async isEmailBounced(email: string): Promise<{ bounced: boolean; type: BounceType | null }> {
    const normalizedEmail = email.toLowerCase();
    
    // Check hard bounce first
    const isHardBounced = await this.redis.sIsMember('email:hardbounce', normalizedEmail);
    if (isHardBounced) {
      return { bounced: true, type: BounceType.HARD };
    }
    
    // Check soft bounce threshold
    const softBounceCount = await this.redis.get(`email:softbounce:${normalizedEmail}`);
    if (softBounceCount && parseInt(softBounceCount, 10) >= this.softBounceThreshold) {
      return { bounced: true, type: BounceType.SOFT };
    }
    
    return { bounced: false, type: null };
  }

  /**
   * Schedule retry for failed delivery
   */
  async scheduleRetry(deliveryId: string): Promise<boolean> {
    const record = await this.getDeliveryRecord(deliveryId);
    if (!record) {
      return false;
    }
    
    if (record.attempts >= record.maxAttempts) {
      // Max retries reached
      record.status = DeliveryStatus.FAILED;
      record.updatedAt = new Date();
      await this.saveDeliveryRecord(record);
      
      this.logger.warn('Max retries reached for delivery', { 
        id: deliveryId, 
        attempts: record.attempts 
      });
      return false;
    }
    
    // Calculate next retry time with exponential backoff
    const delaySeconds = this.retryDelays[record.attempts] || this.retryDelays[this.retryDelays.length - 1];
    const nextRetry = new Date(Date.now() + delaySeconds * 1000);
    
    record.attempts += 1;
    record.lastAttempt = new Date();
    record.nextRetry = nextRetry;
    record.status = DeliveryStatus.QUEUED;
    record.updatedAt = new Date();
    
    await this.saveDeliveryRecord(record);
    
    // Add to retry queue
    await this.redis.zAdd('email:retry:queue', {
      score: nextRetry.getTime(),
      value: deliveryId
    });
    
    this.logger.info('Scheduled email retry', { 
      id: deliveryId, 
      attempt: record.attempts,
      nextRetry 
    });
    
    return true;
  }

  /**
   * Get deliveries ready for retry
   */
  async getDeliveriesForRetry(limit: number = 100): Promise<EmailDeliveryRecord[]> {
    const now = Date.now();
    
    // Get delivery IDs that are ready for retry
    const ids = await this.redis.zRangeByScore('email:retry:queue', 0, now, {
      LIMIT: { offset: 0, count: limit }
    });
    
    if (ids.length === 0) {
      return [];
    }
    
    // Remove from queue
    await this.redis.zRemRangeByScore('email:retry:queue', 0, now);
    
    // Get delivery records
    const records: EmailDeliveryRecord[] = [];
    for (const id of ids) {
      const record = await this.getDeliveryRecord(id);
      if (record) {
        records.push(record);
      }
    }
    
    return records;
  }

  // ============================================================================
  // Email Threading
  // ============================================================================

  /**
   * Create or update email thread
   */
  async upsertThread(params: {
    customerId: string;
    taskId: string;
    subject: string;
    messageId: string;
    from: string;
    to: string;
  }): Promise<EmailThread> {
    // Normalize subject for threading (remove Re:, Fwd:, etc.)
    const normalizedSubject = this.normalizeSubject(params.subject);
    const threadKey = `thread:${params.customerId}:${this.hashString(normalizedSubject)}`;
    
    // Try to get existing thread
    const existingData = await this.redis.get(threadKey);
    
    if (existingData) {
      const thread: EmailThread = JSON.parse(existingData);
      
      // Add message to thread
      if (!thread.messageIds.includes(params.messageId)) {
        thread.messageIds.push(params.messageId);
      }
      
      // Add participants
      const participants = new Set(thread.participants);
      participants.add(params.from.toLowerCase());
      participants.add(params.to.toLowerCase());
      thread.participants = Array.from(participants);
      
      thread.lastMessageAt = new Date();
      
      await this.redis.set(threadKey, JSON.stringify(thread), { EX: 86400 * 90 }); // 90 days
      
      return thread;
    }
    
    // Create new thread
    const thread: EmailThread = {
      id: `thread_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      customerId: params.customerId,
      taskId: params.taskId,
      subject: normalizedSubject,
      participants: [params.from.toLowerCase(), params.to.toLowerCase()],
      messageIds: [params.messageId],
      lastMessageAt: new Date(),
      status: 'active',
      createdAt: new Date()
    };
    
    await this.redis.set(threadKey, JSON.stringify(thread), { EX: 86400 * 90 }); // 90 days
    
    // Index by thread ID
    await this.redis.set(`email:thread:${thread.id}`, threadKey, { EX: 86400 * 90 });
    
    this.logger.info('Created email thread', { 
      threadId: thread.id, 
      customerId: params.customerId,
      subject: normalizedSubject
    });
    
    return thread;
  }

  /**
   * Get thread by ID
   */
  async getThread(threadId: string): Promise<EmailThread | null> {
    const threadKey = await this.redis.get(`email:thread:${threadId}`);
    if (!threadKey) {
      return null;
    }
    
    const data = await this.redis.get(threadKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get threads for customer
   */
  async getCustomerThreads(customerId: string): Promise<EmailThread[]> {
    const pattern = `thread:${customerId}:*`;
    const keys = await this.redis.keys(pattern);
    
    const threads: EmailThread[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        threads.push(JSON.parse(data));
      }
    }
    
    // Sort by last message date
    threads.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    
    return threads;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get delivery statistics for a campaign
   */
  async getCampaignStats(campaignId: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    bounced: number;
    failed: number;
  }> {
    const keys = await this.redis.keys(`email:delivery:*`);
    const stats = {
      total: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      bounced: 0,
      failed: 0
    };
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const record: EmailDeliveryRecord = JSON.parse(data);
        if (record.campaignId === campaignId) {
          stats.total++;
          switch (record.status) {
            case DeliveryStatus.SENT:
              stats.sent++;
              break;
            case DeliveryStatus.DELIVERED:
              stats.delivered++;
              break;
            case DeliveryStatus.OPENED:
              stats.opened++;
              break;
            case DeliveryStatus.BOUNCED:
            case DeliveryStatus.SOFT_BOUNCE:
              stats.bounced++;
              break;
            case DeliveryStatus.FAILED:
              stats.failed++;
              break;
          }
        }
      }
    }
    
    return stats;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async saveDeliveryRecord(record: EmailDeliveryRecord): Promise<void> {
    await this.redis.set(
      `email:delivery:${record.id}`,
      JSON.stringify(record),
      { EX: 86400 * 90 } // 90 days retention
    );
  }

  private async getDeliveryRecord(id: string): Promise<EmailDeliveryRecord | null> {
    const data = await this.redis.get(`email:delivery:${id}`);
    return data ? JSON.parse(data) : null;
  }

  private normalizeSubject(subject: string): string {
    // Remove common prefixes and normalize
    return subject
      .replace(/^(re|fwd|fw|aw|sv|vs|ref):\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Get singleton instance
 */
export function getEmailDeliveryService(): EmailDeliveryService {
  return EmailDeliveryService.getInstance();
}
