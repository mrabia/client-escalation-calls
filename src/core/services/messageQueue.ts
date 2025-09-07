import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { logger } from '@/utils/logger';

export interface QueueMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
}

export interface QueueHandler {
  (message: QueueMessage): Promise<void>;
}

export class MessageQueueService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isInitialized = false;
  private handlers: Map<string, QueueHandler> = new Map();

  // Queue and Exchange names
  private readonly EXCHANGE_NAME = 'client-escalation';
  private readonly QUEUES = {
    EMAIL_TASKS: 'email.tasks',
    PHONE_TASKS: 'phone.tasks',
    SMS_TASKS: 'sms.tasks',
    RESEARCH_TASKS: 'research.tasks',
    NOTIFICATIONS: 'notifications',
    RETRIES: 'retries',
    DEAD_LETTER: 'dead-letter'
  };

  constructor() {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Connect to RabbitMQ
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
      this.channel = await this.connection.createChannel();

      // Set up connection error handlers
      this.connection.on('error', (error) => {
        logger.error('RabbitMQ connection error:', error);
        this.handleConnectionError(error);
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isInitialized = false;
      });

      // Create exchange
      await this.channel.assertExchange(this.EXCHANGE_NAME, 'topic', {
        durable: true
      });

      // Create queues
      await this.createQueues();

      // Set prefetch count for fair dispatching
      await this.channel.prefetch(1);

      this.isInitialized = true;
      logger.info('Message queue service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize message queue:', error);
      throw error;
    }
  }

  private async createQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    const queueOptions = {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
        'x-dead-letter-exchange': this.EXCHANGE_NAME,
        'x-dead-letter-routing-key': 'dead-letter'
      }
    };

    // Create task queues with retry mechanism
    for (const [key, queueName] of Object.entries(this.QUEUES)) {
      if (key !== 'DEAD_LETTER') {
        await this.channel.assertQueue(queueName, queueOptions);
        await this.channel.bindQueue(queueName, this.EXCHANGE_NAME, queueName);
      }
    }

    // Create dead letter queue
    await this.channel.assertQueue(this.QUEUES.DEAD_LETTER, {
      durable: true
    });
    await this.channel.bindQueue(this.QUEUES.DEAD_LETTER, this.EXCHANGE_NAME, 'dead-letter');

    logger.info('Message queues created successfully');
  }

  async publish(routingKey: string, message: any, options?: any): Promise<void> {
    if (!this.isInitialized || !this.channel) {
      throw new Error('Message queue service not initialized');
    }

    try {
      const queueMessage: QueueMessage = {
        id: this.generateMessageId(),
        type: routingKey,
        payload: message,
        timestamp: new Date(),
        attempts: 0,
        maxAttempts: options?.maxAttempts || 3
      };

      const messageBuffer = Buffer.from(JSON.stringify(queueMessage));
      
      const publishOptions = {
        persistent: true,
        timestamp: Date.now(),
        messageId: queueMessage.id,
        ...options
      };

      const published = this.channel.publish(
        this.EXCHANGE_NAME,
        routingKey,
        messageBuffer,
        publishOptions
      );

      if (!published) {
        throw new Error('Failed to publish message to queue');
      }

      logger.debug('Message published to queue', {
        messageId: queueMessage.id,
        routingKey,
        type: queueMessage.type
      });
    } catch (error) {
      logger.error('Failed to publish message:', {
        routingKey,
        error: error.message
      });
      throw error;
    }
  }

  async subscribe(queueName: string, handler: QueueHandler): Promise<void> {
    if (!this.isInitialized || !this.channel) {
      throw new Error('Message queue service not initialized');
    }

    try {
      this.handlers.set(queueName, handler);

      await this.channel.consume(queueName, async (msg: ConsumeMessage | null) => {
        if (!msg) {
          return;
        }

        try {
          const queueMessage: QueueMessage = JSON.parse(msg.content.toString());
          queueMessage.attempts++;

          logger.debug('Processing message', {
            messageId: queueMessage.id,
            queue: queueName,
            attempts: queueMessage.attempts
          });

          // Execute handler
          await handler(queueMessage);

          // Acknowledge successful processing
          this.channel!.ack(msg);

          logger.debug('Message processed successfully', {
            messageId: queueMessage.id,
            queue: queueName
          });
        } catch (error) {
          logger.error('Error processing message:', {
            queue: queueName,
            error: error.message,
            messageId: msg.properties.messageId
          });

          await this.handleMessageError(msg, error);
        }
      });

      logger.info(`Subscribed to queue: ${queueName}`);
    } catch (error) {
      logger.error(`Failed to subscribe to queue ${queueName}:`, error);
      throw error;
    }
  }

  private async handleMessageError(msg: ConsumeMessage, error: Error): Promise<void> {
    if (!this.channel) {
      return;
    }

    try {
      const queueMessage: QueueMessage = JSON.parse(msg.content.toString());

      if (queueMessage.attempts < queueMessage.maxAttempts) {
        // Retry with exponential backoff
        const delay = Math.pow(2, queueMessage.attempts) * 1000; // 2^attempts seconds
        
        setTimeout(async () => {
          await this.publish(this.QUEUES.RETRIES, queueMessage, {
            delay
          });
        }, delay);

        logger.warn('Message scheduled for retry', {
          messageId: queueMessage.id,
          attempts: queueMessage.attempts,
          maxAttempts: queueMessage.maxAttempts,
          delay
        });
      } else {
        // Send to dead letter queue
        await this.publish('dead-letter', {
          ...queueMessage,
          error: error.message,
          failedAt: new Date()
        });

        logger.error('Message sent to dead letter queue', {
          messageId: queueMessage.id,
          error: error.message
        });
      }

      // Acknowledge to remove from original queue
      this.channel.ack(msg);
    } catch (retryError) {
      logger.error('Failed to handle message error:', retryError);
      // Reject and requeue
      this.channel.nack(msg, false, true);
    }
  }

  private handleConnectionError(error: Error): void {
    logger.error('Connection error, attempting to reconnect...', error);
    this.isInitialized = false;
    
    // Attempt to reconnect after delay
    setTimeout(async () => {
      try {
        await this.initialize();
        logger.info('Successfully reconnected to message queue');
      } catch (reconnectError) {
        logger.error('Failed to reconnect:', reconnectError);
      }
    }, 5000);
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods for specific queues
  async publishEmailTask(task: any): Promise<void> {
    await this.publish(this.QUEUES.EMAIL_TASKS, task);
  }

  async publishPhoneTask(task: any): Promise<void> {
    await this.publish(this.QUEUES.PHONE_TASKS, task);
  }

  async publishSmsTask(task: any): Promise<void> {
    await this.publish(this.QUEUES.SMS_TASKS, task);
  }

  async publishResearchTask(task: any): Promise<void> {
    await this.publish(this.QUEUES.RESEARCH_TASKS, task);
  }

  async publishNotification(notification: any): Promise<void> {
    await this.publish(this.QUEUES.NOTIFICATIONS, notification);
  }

  // Queue management methods
  async getQueueInfo(queueName: string): Promise<any> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      return await this.channel.checkQueue(queueName);
    } catch (error) {
      logger.error(`Failed to get queue info for ${queueName}:`, error);
      throw error;
    }
  }

  async purgeQueue(queueName: string): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      await this.channel.purgeQueue(queueName);
      logger.info(`Queue purged: ${queueName}`);
    } catch (error) {
      logger.error(`Failed to purge queue ${queueName}:`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.connection || !this.channel) {
        return false;
      }
      
      // Try to check a queue to verify connection is alive
      await this.channel.checkQueue(this.QUEUES.NOTIFICATIONS);
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      
      if (this.connection) {
        await this.connection.close();
      }
      
      this.isInitialized = false;
      logger.info('Message queue connection closed');
    } catch (error) {
      logger.error('Error closing message queue connection:', error);
    }
  }
}