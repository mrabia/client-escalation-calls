import { AuditService, AuditEvent, AuditEventType } from '../../../src/services/audit/AuditService';

// Mock the config
jest.mock('../../../src/config', () => ({
  config: {
    compliance: {
      enableAuditLogging: true
    }
  }
}));

// Mock Redis client
const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  sAdd: jest.fn().mockResolvedValue(1),
  sMembers: jest.fn().mockResolvedValue([]),
  lPush: jest.fn().mockResolvedValue(1),
  lTrim: jest.fn().mockResolvedValue('OK'),
  lRange: jest.fn().mockResolvedValue([]),
  expire: jest.fn().mockResolvedValue(true)
} as any;

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as any;

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditService(mockRedis, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with audit logging enabled', () => {
      expect(service.isEnabled()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Audit service initialized', expect.any(Object));
    });
  });

  describe('log', () => {
    it('should log an audit event to Redis', async () => {
      const eventId = await service.log({
        eventType: 'auth.login',
        severity: 'info',
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'User logged in',
        success: true
      });

      expect(eventId).toBeTruthy();
      expect(eventId).toMatch(/^audit_/);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.sAdd).toHaveBeenCalled();
    });

    it('should store event in user index when userId is present', async () => {
      await service.log({
        eventType: 'auth.login',
        severity: 'info',
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'User logged in',
        success: true
      });

      expect(mockRedis.lPush).toHaveBeenCalledWith(
        expect.stringContaining('audit:user:user-123'),
        expect.any(String)
      );
    });

    it('should store event in resource index when resourceId is present', async () => {
      await service.log({
        eventType: 'customer.update',
        severity: 'info',
        resourceType: 'customer',
        resourceId: 'cust-456',
        action: 'Customer updated',
        success: true
      });

      expect(mockRedis.lPush).toHaveBeenCalledWith(
        expect.stringContaining('audit:resource:customer:cust-456'),
        expect.any(String)
      );
    });
  });

  describe('logAuth', () => {
    it('should log authentication events', async () => {
      const eventId = await service.logAuth(
        'auth.login',
        'user-123',
        'test@example.com',
        true,
        { method: 'password' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(eventId).toBeTruthy();
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should log failed login attempts with warning severity', async () => {
      await service.logAuth(
        'auth.failed_login',
        undefined,
        'test@example.com',
        false,
        { reason: 'invalid_password' }
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Audit:'),
        expect.any(Object)
      );
    });
  });

  describe('logDataAccess', () => {
    it('should log data access events', async () => {
      const eventId = await service.logDataAccess(
        'user-123',
        'test@example.com',
        'admin',
        'customer',
        'cust-456',
        'view',
        true
      );

      expect(eventId).toBeTruthy();
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('logContact', () => {
    it('should log contact attempts', async () => {
      const eventId = await service.logContact(
        'email',
        'cust-123',
        'campaign-456',
        true,
        { templateId: 'payment_reminder' }
      );

      expect(eventId).toBeTruthy();
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('logCompliance', () => {
    it('should log compliance events', async () => {
      const eventId = await service.logCompliance(
        'compliance.consent_granted',
        'cust-123',
        'email',
        'web_form',
        { consentVersion: '1.0' }
      );

      expect(eventId).toBeTruthy();
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('logSystem', () => {
    it('should log system events', async () => {
      const eventId = await service.logSystem(
        'configuration_updated',
        'info',
        true,
        { setting: 'rate_limit', newValue: 100 }
      );

      expect(eventId).toBeTruthy();
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should log system errors', async () => {
      const eventId = await service.logSystem(
        'database_connection_failed',
        'error',
        false,
        {},
        'Connection timeout'
      );

      expect(eventId).toBeTruthy();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getEvent', () => {
    it('should retrieve an event by ID', async () => {
      const mockEvent: AuditEvent = {
        id: 'audit_123',
        timestamp: new Date(),
        eventType: 'auth.login',
        severity: 'info',
        action: 'User logged in',
        success: true
      };
      
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockEvent));

      const event = await service.getEvent('audit_123');

      expect(event).toBeTruthy();
      expect(event?.id).toBe('audit_123');
    });

    it('should return null for non-existent event', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const event = await service.getEvent('non_existent');

      expect(event).toBeNull();
    });
  });

  describe('getUserEvents', () => {
    it('should retrieve events for a user', async () => {
      const mockEvent: AuditEvent = {
        id: 'audit_123',
        timestamp: new Date(),
        eventType: 'auth.login',
        severity: 'info',
        action: 'User logged in',
        success: true
      };
      
      mockRedis.lRange.mockResolvedValueOnce(['audit_123']);
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockEvent));

      const events = await service.getUserEvents('user-123');

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('audit_123');
    });
  });

  describe('getResourceEvents', () => {
    it('should retrieve events for a resource', async () => {
      const mockEvent: AuditEvent = {
        id: 'audit_456',
        timestamp: new Date(),
        eventType: 'customer.update',
        severity: 'info',
        action: 'Customer updated',
        success: true
      };
      
      mockRedis.lRange.mockResolvedValueOnce(['audit_456']);
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockEvent));

      const events = await service.getResourceEvents('customer', 'cust-123');

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('audit_456');
    });
  });
});

describe('AuditService (disabled)', () => {
  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-mock config with audit logging disabled
    jest.resetModules();
    jest.doMock('../../../src/config', () => ({
      config: {
        compliance: {
          enableAuditLogging: false
        }
      }
    }));
  });

  it('should not log events when disabled', async () => {
    // Create a new service instance to pick up the mock
    const { AuditService: DisabledAuditService } = require('../../../src/services/audit/AuditService');
    const disabledService = new DisabledAuditService(mockRedis, mockLogger);

    const eventId = await disabledService.log({
      eventType: 'auth.login',
      severity: 'info',
      action: 'test',
      success: true
    });

    expect(eventId).toBeNull();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});
