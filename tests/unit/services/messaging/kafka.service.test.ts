/**
 * KafkaService Unit Tests
 * 
 * Note: Full integration tests with Kafka require a running broker.
 * These tests focus on the service interface, event types, and createEvent helper.
 */

// Set environment
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.KAFKA_CLIENT_ID = 'test-client';

import { 
  KafkaService, 
  getKafkaService, 
  EventType
} from '../../../../src/services/messaging/KafkaService';

describe('KafkaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (KafkaService as any).instance = null;
  });

  describe('singleton pattern', () => {
    it('should create singleton instance', () => {
      const instance1 = getKafkaService();
      const instance2 = getKafkaService();
      expect(instance1).toBe(instance2);
    });

    it('should return different instance after reset', () => {
      const instance1 = getKafkaService();
      (KafkaService as any).instance = null;
      const instance2 = getKafkaService();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('isAvailable', () => {
    it('should return false before initialization', () => {
      const service = getKafkaService();
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('EventType enum', () => {
    it('should have customer event types', () => {
      expect(EventType.CUSTOMER_CREATED).toBe('customer.created');
      expect(EventType.CUSTOMER_UPDATED).toBe('customer.updated');
      expect(EventType.CUSTOMER_CONTACTED).toBe('customer.contacted');
    });

    it('should have task event types', () => {
      expect(EventType.TASK_CREATED).toBe('task.created');
      expect(EventType.TASK_ASSIGNED).toBe('task.assigned');
      expect(EventType.TASK_COMPLETED).toBe('task.completed');
      expect(EventType.TASK_FAILED).toBe('task.failed');
    });

    it('should have communication event types', () => {
      expect(EventType.EMAIL_SENT).toBe('communication.email.sent');
      expect(EventType.EMAIL_DELIVERED).toBe('communication.email.delivered');
      expect(EventType.EMAIL_BOUNCED).toBe('communication.email.bounced');
      expect(EventType.CALL_INITIATED).toBe('communication.call.initiated');
      expect(EventType.CALL_COMPLETED).toBe('communication.call.completed');
      expect(EventType.SMS_SENT).toBe('communication.sms.sent');
    });

    it('should have payment event types', () => {
      expect(EventType.PAYMENT_RECEIVED).toBe('payment.received');
      expect(EventType.PAYMENT_FAILED).toBe('payment.failed');
      expect(EventType.PAYMENT_PLAN_CREATED).toBe('payment.plan.created');
    });

    it('should have agent event types', () => {
      expect(EventType.AGENT_STARTED).toBe('agent.started');
      expect(EventType.AGENT_STOPPED).toBe('agent.stopped');
      expect(EventType.AGENT_ERROR).toBe('agent.error');
    });

    it('should have system event types', () => {
      expect(EventType.SYSTEM_HEALTH).toBe('system.health');
      expect(EventType.SYSTEM_ERROR).toBe('system.error');
    });
  });

  describe('createEvent method', () => {
    it('should create event with required fields', () => {
      const service = getKafkaService();
      const event = service.createEvent(EventType.CUSTOMER_CREATED, { customerId: 'cust-123' });
      
      expect(event.id).toBeDefined();
      expect(event.type).toBe(EventType.CUSTOMER_CREATED);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.source).toBe('test-client'); // Uses KAFKA_CLIENT_ID from env
    });

    it('should generate unique event IDs', () => {
      const service = getKafkaService();
      const event1 = service.createEvent(EventType.CUSTOMER_CREATED, { customerId: 'cust-1' });
      const event2 = service.createEvent(EventType.CUSTOMER_CREATED, { customerId: 'cust-2' });
      
      expect(event1.id).not.toBe(event2.id);
    });

    it('should include optional correlationId', () => {
      const service = getKafkaService();
      const event = service.createEvent(
        EventType.TASK_COMPLETED, 
        { taskId: 'task-123' },
        { correlationId: 'correlation-456' }
      );
      
      expect(event.correlationId).toBe('correlation-456');
    });
  });

  describe('service interface', () => {
    it('should have initialize method', () => {
      const service = getKafkaService();
      expect(typeof service.initialize).toBe('function');
    });

    it('should have publish method', () => {
      const service = getKafkaService();
      expect(typeof service.publish).toBe('function');
    });

    it('should have publishBatch method', () => {
      const service = getKafkaService();
      expect(typeof service.publishBatch).toBe('function');
    });

    it('should have subscribe method', () => {
      const service = getKafkaService();
      expect(typeof service.subscribe).toBe('function');
    });

    it('should have disconnect method', () => {
      const service = getKafkaService();
      expect(typeof service.disconnect).toBe('function');
    });

    it('should have createEvent method', () => {
      const service = getKafkaService();
      expect(typeof service.createEvent).toBe('function');
    });
  });
});
