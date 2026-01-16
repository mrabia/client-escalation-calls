/**
 * EmailDeliveryService Unit Tests
 * 
 * Note: Full integration tests require a running Redis instance.
 * These tests focus on the service interface and enum values.
 */

import { 
  EmailDeliveryService, 
  getEmailDeliveryService,
  DeliveryStatus,
  BounceType
} from '../../../../src/services/email/EmailDeliveryService';

describe('EmailDeliveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (EmailDeliveryService as any).instance = null;
  });

  describe('singleton pattern', () => {
    it('should create singleton instance', () => {
      const instance1 = getEmailDeliveryService();
      const instance2 = getEmailDeliveryService();
      expect(instance1).toBe(instance2);
    });

    it('should return different instance after reset', () => {
      const instance1 = getEmailDeliveryService();
      (EmailDeliveryService as any).instance = null;
      const instance2 = getEmailDeliveryService();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('DeliveryStatus enum', () => {
    it('should have queued status', () => {
      expect(DeliveryStatus.QUEUED).toBe('queued');
    });

    it('should have sending status', () => {
      expect(DeliveryStatus.SENDING).toBe('sending');
    });

    it('should have sent status', () => {
      expect(DeliveryStatus.SENT).toBe('sent');
    });

    it('should have delivered status', () => {
      expect(DeliveryStatus.DELIVERED).toBe('delivered');
    });

    it('should have opened status', () => {
      expect(DeliveryStatus.OPENED).toBe('opened');
    });

    it('should have clicked status', () => {
      expect(DeliveryStatus.CLICKED).toBe('clicked');
    });

    it('should have bounced status', () => {
      expect(DeliveryStatus.BOUNCED).toBe('bounced');
    });

    it('should have soft_bounce status', () => {
      expect(DeliveryStatus.SOFT_BOUNCE).toBe('soft_bounce');
    });

    it('should have complained status', () => {
      expect(DeliveryStatus.COMPLAINED).toBe('complained');
    });

    it('should have unsubscribed status', () => {
      expect(DeliveryStatus.UNSUBSCRIBED).toBe('unsubscribed');
    });

    it('should have failed status', () => {
      expect(DeliveryStatus.FAILED).toBe('failed');
    });
  });

  describe('BounceType enum', () => {
    it('should have hard bounce type', () => {
      expect(BounceType.HARD).toBe('hard');
    });

    it('should have soft bounce type', () => {
      expect(BounceType.SOFT).toBe('soft');
    });

    it('should have complaint bounce type', () => {
      expect(BounceType.COMPLAINT).toBe('complaint');
    });

    it('should have unknown bounce type', () => {
      expect(BounceType.UNKNOWN).toBe('unknown');
    });
  });

  describe('service interface', () => {
    it('should have createDeliveryRecord method', () => {
      const service = getEmailDeliveryService();
      expect(typeof service.createDeliveryRecord).toBe('function');
    });

    it('should have updateDeliveryStatus method', () => {
      const service = getEmailDeliveryService();
      expect(typeof service.updateDeliveryStatus).toBe('function');
    });

    it('should have processBounce method', () => {
      const service = getEmailDeliveryService();
      expect(typeof service.processBounce).toBe('function');
    });

    it('should have scheduleRetry method', () => {
      const service = getEmailDeliveryService();
      expect(typeof service.scheduleRetry).toBe('function');
    });

    it('should have getCampaignStats method', () => {
      const service = getEmailDeliveryService();
      expect(typeof service.getCampaignStats).toBe('function');
    });

    it('should have isEmailBounced method', () => {
      const service = getEmailDeliveryService();
      expect(typeof service.isEmailBounced).toBe('function');
    });
  });
});
