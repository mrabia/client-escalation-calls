/**
 * TCPA Compliance Integration Tests
 * 
 * Tests TCPA compliance features including opt-out management,
 * consent tracking, and contact frequency limits
 */

import { TCPAService } from '@/services/compliance/TCPAService';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '@tests/utils/test-db';
import { flushRedis, closeTestRedisClient } from '@tests/utils/test-redis';
import { createTestCustomer } from '@tests/fixtures/customers';
import { logger } from '@/utils/logger';

describe('TCPA Compliance Tests', () => {
  let tcpaService: TCPAService;
  let testCustomer: any;

  beforeAll(async () => {
    await setupTestDatabase();
    tcpaService = new TCPAService(logger);
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestRedisClient();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await flushRedis();
    testCustomer = createTestCustomer();
  });

  describe('Opt-Out Management', () => {
    it('should record opt-out for email channel', async () => {
      await tcpaService.recordOptOut(testCustomer.id, 'email', 'Customer request');

      const canContact = await tcpaService.canContact(testCustomer.id, 'email');
      expect(canContact).toBe(false);
    });

    it('should record opt-out for phone channel', async () => {
      await tcpaService.recordOptOut(testCustomer.id, 'phone', 'Do not call');

      const canContact = await tcpaService.canContact(testCustomer.id, 'phone');
      expect(canContact).toBe(false);
    });

    it('should record opt-out for SMS channel', async () => {
      await tcpaService.recordOptOut(testCustomer.id, 'sms', 'Stop SMS');

      const canContact = await tcpaService.canContact(testCustomer.id, 'sms');
      expect(canContact).toBe(false);
    });

    it('should allow contact on non-opted-out channels', async () => {
      await tcpaService.recordOptOut(testCustomer.id, 'email', 'No emails');

      const canContactEmail = await tcpaService.canContact(testCustomer.id, 'email');
      const canContactPhone = await tcpaService.canContact(testCustomer.id, 'phone');
      const canContactSMS = await tcpaService.canContact(testCustomer.id, 'sms');

      expect(canContactEmail).toBe(false);
      expect(canContactPhone).toBe(true);
      expect(canContactSMS).toBe(true);
    });

    it('should retrieve opt-out status', async () => {
      await tcpaService.recordOptOut(testCustomer.id, 'email', 'Customer request');
      await tcpaService.recordOptOut(testCustomer.id, 'sms', 'Stop SMS');

      const status = await tcpaService.getOptOutStatus(testCustomer.id);

      expect(status.email).toBe(true);
      expect(status.phone).toBe(false);
      expect(status.sms).toBe(true);
    });
  });

  describe('Consent Tracking', () => {
    it('should record consent for contact', async () => {
      await tcpaService.recordConsent(testCustomer.id, 'email', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        consentText: 'I agree to receive emails',
      });

      const hasConsent = await tcpaService.hasConsent(testCustomer.id, 'email');
      expect(hasConsent).toBe(true);
    });

    it('should track consent timestamp', async () => {
      const beforeConsent = new Date();
      
      await tcpaService.recordConsent(testCustomer.id, 'phone', {
        ipAddress: '192.168.1.1',
        consentText: 'I agree to phone calls',
      });

      const consent = await tcpaService.getConsent(testCustomer.id, 'phone');
      const afterConsent = new Date();

      expect(consent).toBeDefined();
      expect(consent.timestamp).toBeInstanceOf(Date);
      expect(consent.timestamp.getTime()).toBeGreaterThanOrEqual(beforeConsent.getTime());
      expect(consent.timestamp.getTime()).toBeLessThanOrEqual(afterConsent.getTime());
    });

    it('should store consent metadata', async () => {
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        consentText: 'I agree to receive communications',
        source: 'website',
      };

      await tcpaService.recordConsent(testCustomer.id, 'sms', metadata);

      const consent = await tcpaService.getConsent(testCustomer.id, 'sms');

      expect(consent.ipAddress).toBe(metadata.ipAddress);
      expect(consent.userAgent).toBe(metadata.userAgent);
      expect(consent.consentText).toBe(metadata.consentText);
    });

    it('should revoke consent', async () => {
      await tcpaService.recordConsent(testCustomer.id, 'email', {
        ipAddress: '192.168.1.1',
        consentText: 'I agree',
      });

      await tcpaService.revokeConsent(testCustomer.id, 'email');

      const hasConsent = await tcpaService.hasConsent(testCustomer.id, 'email');
      expect(hasConsent).toBe(false);
    });
  });

  describe('Contact Frequency Limits', () => {
    it('should enforce daily call limit (3 calls)', async () => {
      // Make 3 calls
      for (let i = 0; i < 3; i++) {
        const canContact = await tcpaService.checkFrequencyLimit(testCustomer.id, 'phone');
        expect(canContact).toBe(true);
        await tcpaService.recordContactAttempt(testCustomer.id, 'phone');
      }

      // 4th call should be blocked
      const canContact = await tcpaService.checkFrequencyLimit(testCustomer.id, 'phone');
      expect(canContact).toBe(false);
    });

    it('should enforce daily SMS limit (3 SMS)', async () => {
      // Send 3 SMS
      for (let i = 0; i < 3; i++) {
        const canContact = await tcpaService.checkFrequencyLimit(testCustomer.id, 'sms');
        expect(canContact).toBe(true);
        await tcpaService.recordContactAttempt(testCustomer.id, 'sms');
      }

      // 4th SMS should be blocked
      const canContact = await tcpaService.checkFrequencyLimit(testCustomer.id, 'sms');
      expect(canContact).toBe(false);
    });

    it('should enforce daily email limit (5 emails)', async () => {
      // Send 5 emails
      for (let i = 0; i < 5; i++) {
        const canContact = await tcpaService.checkFrequencyLimit(testCustomer.id, 'email');
        expect(canContact).toBe(true);
        await tcpaService.recordContactAttempt(testCustomer.id, 'email');
      }

      // 6th email should be blocked
      const canContact = await tcpaService.checkFrequencyLimit(testCustomer.id, 'email');
      expect(canContact).toBe(false);
    });

    it('should reset limits after 24 hours', async () => {
      // Make 3 calls
      for (let i = 0; i < 3; i++) {
        await tcpaService.recordContactAttempt(testCustomer.id, 'phone');
      }

      // Should be at limit
      let canContact = await tcpaService.checkFrequencyLimit(testCustomer.id, 'phone');
      expect(canContact).toBe(false);

      // Mock time passing (24 hours)
      jest.useFakeTimers();
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);

      // Should be able to contact again
      canContact = await tcpaService.checkFrequencyLimit(testCustomer.id, 'phone');
      expect(canContact).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Time Restrictions', () => {
    it('should allow contact during business hours (8 AM - 9 PM)', async () => {
      // Mock 2 PM
      const date = new Date();
      date.setHours(14, 0, 0, 0);
      jest.useFakeTimers();
      jest.setSystemTime(date);

      const canContact = await tcpaService.isWithinContactHours(testCustomer.id);
      expect(canContact).toBe(true);

      jest.useRealTimers();
    });

    it('should block contact before 8 AM', async () => {
      // Mock 6 AM
      const date = new Date();
      date.setHours(6, 0, 0, 0);
      jest.useFakeTimers();
      jest.setSystemTime(date);

      const canContact = await tcpaService.isWithinContactHours(testCustomer.id);
      expect(canContact).toBe(false);

      jest.useRealTimers();
    });

    it('should block contact after 9 PM', async () => {
      // Mock 10 PM
      const date = new Date();
      date.setHours(22, 0, 0, 0);
      jest.useFakeTimers();
      jest.setSystemTime(date);

      const canContact = await tcpaService.isWithinContactHours(testCustomer.id);
      expect(canContact).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('Audit Trail', () => {
    it('should maintain audit log for opt-outs', async () => {
      await tcpaService.recordOptOut(testCustomer.id, 'email', 'Customer request');

      const auditLog = await tcpaService.getAuditLog(testCustomer.id);

      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0]).toHaveProperty('action', 'opt_out');
      expect(auditLog[0]).toHaveProperty('channel', 'email');
      expect(auditLog[0]).toHaveProperty('timestamp');
    });

    it('should maintain audit log for consent', async () => {
      await tcpaService.recordConsent(testCustomer.id, 'phone', {
        ipAddress: '192.168.1.1',
        consentText: 'I agree',
      });

      const auditLog = await tcpaService.getAuditLog(testCustomer.id);

      expect(auditLog.length).toBeGreaterThan(0);
      const consentEntry = auditLog.find(entry => entry.action === 'consent_granted');
      expect(consentEntry).toBeDefined();
      expect(consentEntry.channel).toBe('phone');
    });

    it('should retain audit log for 7 years', async () => {
      await tcpaService.recordOptOut(testCustomer.id, 'email', 'Test');

      const auditLog = await tcpaService.getAuditLog(testCustomer.id);
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + 7);

      // Verify retention policy is set
      expect(auditLog[0]).toHaveProperty('retentionUntil');
      expect(new Date(auditLog[0].retentionUntil).getFullYear()).toBe(retentionDate.getFullYear());
    });
  });
});
