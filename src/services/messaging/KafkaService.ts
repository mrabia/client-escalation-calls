/**
 * Kafka Event Streaming Service
 * High-throughput event streaming for analytics and real-time processing
 */

import { Kafka, Producer, Consumer, Admin, EachMessagePayload, logLevel } from 'kafkajs';
import { config } from '@/config';
import { createLogger, Logger } from '@/utils/logger';

/**
 * Event types for the system
 */
export enum EventType {
  // Customer events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_CONTACTED = 'customer.contacted',
  
  // Task events
  TASK_CREATED = 'task.created',
  TASK_ASSIGNED = 'task.assigned',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',
  
  // Communication events
  EMAIL_SENT = 'communication.email.sent',
  EMAIL_DELIVERED = 'communication.email.delivered',
  EMAIL_BOUNCED = 'communication.email.bounced',
  EMAIL_OPENED = 'communication.email.opened',
  CALL_INITIATED = 'communication.call.initiated',
  CALL_COMPLETED = 'communication.call.completed',
  SMS_SENT = 'communication.sms.sent',
  SMS_DELIVERED = 'communication.sms.delivered',
  
  // Payment events
  PAYMENT_REQUESTED = 'payment.requested',
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_PLAN_CREATED = 'payment.plan.created',
  
  // Agent events
  AGENT_STARTED = 'agent.started',
  AGENT_STOPPED = 'agent.stopped',
  AGENT_ERROR = 'agent.error',
  
  // System events
  SYSTEM_HEALTH = 'system.health',
  SYSTEM_ERROR = 'system.error'
}

/**
 * Base event structure
 */
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Customer event payload
 */
export interface CustomerEvent extends BaseEvent {
  type: EventType.CUSTOMER_CREATED | EventType.CUSTOMER_UPDATED | EventType.CUSTOMER_CONTACTED;
  data: {
    customerId: string;
    companyName?: string;
    contactName?: string;
    email?: string;
    changes?: Record<string, unknown>;
  };
}

/**
 * Task event payload
 */
export interface TaskEvent extends BaseEvent {
  type: EventType.TASK_CREATED | EventType.TASK_ASSIGNED | EventType.TASK_COMPLETED | EventType.TASK_FAILED;
  data: {
    taskId: string;
    customerId: string;
    campaignId?: string;
    agentId?: string;
    status?: string;
    result?: unknown;
    error?: string;
  };
}

/**
 * Communication event payload
 */
export interface CommunicationEvent extends BaseEvent {
  type: EventType.EMAIL_SENT | EventType.EMAIL_DELIVERED | EventType.EMAIL_BOUNCED | 
        EventType.EMAIL_OPENED | EventType.CALL_INITIATED | EventType.CALL_COMPLETED |
        EventType.SMS_SENT | EventType.SMS_DELIVERED;
  data: {
    communicationId: string;
    customerId: string;
    taskId?: string;
    channel: 'email' | 'phone' | 'sms';
    direction?: 'inbound' | 'outbound';
    status?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Payment event payload
 */
export interface PaymentEvent extends BaseEvent {
  type: EventType.PAYMENT_REQUESTED | EventType.PAYMENT_RECEIVED | 
        EventType.PAYMENT_FAILED | EventType.PAYMENT_PLAN_CREATED;
  data: {
    paymentId?: string;
    customerId: string;
    amount: number;
    currency?: string;
    method?: string;
    status?: string;
    planDetails?: unknown;
  };
}

/**
 * Event handler type
 */
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void>;

/**
 * Topic configuration
 */
export interface TopicConfig {
  name: string;
  partitions?: number;
  replicationFactor?: number;
  retentionMs?: number;
}

/**
 * Kafka Service
 */
export class KafkaService {
  private static instance: KafkaService | null = null;
  
  private readonly kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private readonly consumers: Map<string, Consumer> = new Map();
  private admin: Admin | null = null;
  private readonly logger: Logger;
  private readonly enabled: boolean;
  private initialized = false;

  // Topic definitions
  private readonly topics: TopicConfig[] = [
    { name: 'escalation.customers', partitions: 3, retentionMs: 604800000 }, // 7 days
    { name: 'escalation.tasks', partitions: 6, retentionMs: 604800000 },
    { name: 'escalation.communications', partitions: 6, retentionMs: 2592000000 }, // 30 days
    { name: 'escalation.payments', partitions: 3, retentionMs: 31536000000 }, // 1 year
    { name: 'escalation.agents', partitions: 3, retentionMs: 86400000 }, // 1 day
    { name: 'escalation.analytics', partitions: 6, retentionMs: 2592000000 }, // 30 days
    { name: 'escalation.system', partitions: 1, retentionMs: 604800000 }
  ];

  private constructor() {
    this.logger = createLogger('KafkaService');
    this.enabled = Boolean(config.messageQueue.kafka.brokers[0] && 
                           config.messageQueue.kafka.brokers[0] !== 'localhost:9092');

    if (this.enabled) {
      this.kafka = new Kafka({
        clientId: config.messageQueue.kafka.clientId,
        brokers: config.messageQueue.kafka.brokers,
        logLevel: logLevel.WARN,
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });
    }
  }

  static getInstance(): KafkaService {
    KafkaService.instance ??= new KafkaService();
    return KafkaService.instance;
  }

  /**
   * Initialize Kafka connections and create topics
   */
  async initialize(): Promise<void> {
    if (!this.enabled || !this.kafka || this.initialized) {
      return;
    }

    try {
      // Initialize admin client
      this.admin = this.kafka.admin();
      await this.admin.connect();

      // Create topics if they don't exist
      await this.createTopics();

      // Initialize producer
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: false,
        transactionTimeout: 30000
      });
      await this.producer.connect();

      this.initialized = true;
      this.logger.info('Kafka service initialized', {
        brokers: config.messageQueue.kafka.brokers,
        clientId: config.messageQueue.kafka.clientId
      });
    } catch (error) {
      this.logger.error('Failed to initialize Kafka service', { error });
      // Don't throw - allow app to continue without Kafka
    }
  }

  /**
   * Create required topics
   */
  private async createTopics(): Promise<void> {
    if (!this.admin) return;

    try {
      const existingTopics = await this.admin.listTopics();
      const topicsToCreate = this.topics.filter(t => !existingTopics.includes(t.name));

      if (topicsToCreate.length > 0) {
        await this.admin.createTopics({
          topics: topicsToCreate.map(t => ({
            topic: t.name,
            numPartitions: t.partitions || 3,
            replicationFactor: 1,
            configEntries: t.retentionMs ? [
              { name: 'retention.ms', value: String(t.retentionMs) }
            ] : undefined
          }))
        });

        this.logger.info('Created Kafka topics', { 
          topics: topicsToCreate.map(t => t.name) 
        });
      }
    } catch (error) {
      this.logger.error('Failed to create Kafka topics', { error });
    }
  }

  // ============================================================================
  // Publishing
  // ============================================================================

  /**
   * Publish an event to Kafka
   */
  async publish<T extends BaseEvent>(event: T): Promise<void> {
    if (!this.enabled || !this.producer) {
      this.logger.debug('Kafka not enabled, skipping publish', { eventType: event.type });
      return;
    }

    const topic = this.getTopicForEvent(event.type);
    const key = this.getKeyForEvent(event);

    try {
      await this.producer.send({
        topic,
        messages: [{
          key,
          value: JSON.stringify(event),
          timestamp: String(event.timestamp.getTime()),
          headers: {
            'event-type': event.type,
            'correlation-id': event.correlationId || '',
            'source': event.source
          }
        }]
      });

      this.logger.debug('Published event to Kafka', { 
        topic, 
        type: event.type, 
        id: event.id 
      });
    } catch (error) {
      this.logger.error('Failed to publish event to Kafka', { 
        error, 
        topic, 
        type: event.type 
      });
      throw error;
    }
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch<T extends BaseEvent>(events: T[]): Promise<void> {
    if (!this.enabled || !this.producer || events.length === 0) {
      return;
    }

    // Group events by topic
    const eventsByTopic = new Map<string, T[]>();
    for (const event of events) {
      const topic = this.getTopicForEvent(event.type);
      const existing = eventsByTopic.get(topic) || [];
      existing.push(event);
      eventsByTopic.set(topic, existing);
    }

    try {
      const topicMessages = Array.from(eventsByTopic.entries()).map(([topic, topicEvents]) => ({
        topic,
        messages: topicEvents.map(event => ({
          key: this.getKeyForEvent(event),
          value: JSON.stringify(event),
          timestamp: String(event.timestamp.getTime()),
          headers: {
            'event-type': event.type,
            'correlation-id': event.correlationId || '',
            'source': event.source
          }
        }))
      }));

      await this.producer.sendBatch({ topicMessages });

      this.logger.debug('Published batch of events to Kafka', { 
        count: events.length,
        topics: Array.from(eventsByTopic.keys())
      });
    } catch (error) {
      this.logger.error('Failed to publish batch to Kafka', { error });
      throw error;
    }
  }

  // ============================================================================
  // Subscribing
  // ============================================================================

  /**
   * Subscribe to events
   */
  async subscribe<T extends BaseEvent>(
    groupId: string,
    topics: string[],
    handler: EventHandler<T>
  ): Promise<void> {
    if (!this.enabled || !this.kafka) {
      this.logger.debug('Kafka not enabled, skipping subscribe');
      return;
    }

    const consumer = this.kafka.consumer({ 
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });

    try {
      await consumer.connect();
      
      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }

      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          try {
            const event = JSON.parse(payload.message.value?.toString() || '{}') as T;
            event.timestamp = new Date(event.timestamp);
            await handler(event);
          } catch (error) {
            this.logger.error('Error processing Kafka message', {
              error,
              topic: payload.topic,
              partition: payload.partition,
              offset: payload.message.offset
            });
          }
        }
      });

      this.consumers.set(groupId, consumer);
      this.logger.info('Subscribed to Kafka topics', { groupId, topics });
    } catch (error) {
      this.logger.error('Failed to subscribe to Kafka', { error, groupId, topics });
      throw error;
    }
  }

  /**
   * Subscribe to specific event types
   */
  async subscribeToEventTypes<T extends BaseEvent>(
    groupId: string,
    eventTypes: EventType[],
    handler: EventHandler<T>
  ): Promise<void> {
    const topics = [...new Set(eventTypes.map(et => this.getTopicForEvent(et)))];
    
    await this.subscribe(groupId, topics, async (event: T) => {
      if (eventTypes.includes(event.type)) {
        await handler(event);
      }
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get topic for event type
   */
  private getTopicForEvent(eventType: EventType): string {
    if (eventType.startsWith('customer.')) return 'escalation.customers';
    if (eventType.startsWith('task.')) return 'escalation.tasks';
    if (eventType.startsWith('communication.')) return 'escalation.communications';
    if (eventType.startsWith('payment.')) return 'escalation.payments';
    if (eventType.startsWith('agent.')) return 'escalation.agents';
    if (eventType.startsWith('system.')) return 'escalation.system';
    return 'escalation.analytics';
  }

  /**
   * Get partition key for event
   */
  private getKeyForEvent(event: BaseEvent): string {
    // Use customerId as key for customer-related events for ordering
    const data = (event as any).data;
    if (data?.customerId) return data.customerId;
    if (data?.taskId) return data.taskId;
    return event.id;
  }

  /**
   * Create event helper
   */
  createEvent<T extends BaseEvent>(
    type: EventType,
    data: T extends { data: infer D } ? D : Record<string, unknown>,
    options: { correlationId?: string; metadata?: Record<string, unknown> } = {}
  ): T {
    return {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type,
      timestamp: new Date(),
      source: config.messageQueue.kafka.clientId,
      correlationId: options.correlationId,
      metadata: options.metadata,
      data
    } as unknown as T;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.enabled && this.initialized;
  }

  /**
   * Get consumer group lag
   */
  async getConsumerLag(groupId: string): Promise<Map<string, number>> {
    if (!this.admin) return new Map();

    try {
      const offsets = await this.admin.fetchOffsets({ groupId });
      const lag = new Map<string, number>();

      for (const topicOffset of offsets) {
        const topicLag = topicOffset.partitions.reduce((sum, p) => {
          return sum + (Number(p.offset) || 0);
        }, 0);
        lag.set(topicOffset.topic, topicLag);
      }

      return lag;
    } catch (error) {
      this.logger.error('Failed to get consumer lag', { error, groupId });
      return new Map();
    }
  }

  /**
   * Disconnect all connections
   */
  async disconnect(): Promise<void> {
    try {
      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
      }

      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect();
        this.logger.debug('Disconnected consumer', { groupId });
      }
      this.consumers.clear();

      if (this.admin) {
        await this.admin.disconnect();
        this.admin = null;
      }

      this.initialized = false;
      this.logger.info('Kafka service disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka service', { error });
    }
  }
}

/**
 * Get singleton instance
 */
export function getKafkaService(): KafkaService {
  return KafkaService.getInstance();
}
