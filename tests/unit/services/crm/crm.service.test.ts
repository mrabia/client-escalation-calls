/**
 * CRMService Unit Tests
 */

// Mock fetch globally
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

// Set environment before importing service
process.env.SALESFORCE_ACCESS_TOKEN = 'test-sf-token';
process.env.SALESFORCE_INSTANCE_URL = 'https://test.salesforce.com';
process.env.HUBSPOT_ACCESS_TOKEN = 'test-hs-token';

import { 
  CRMService, 
  getCRMService, 
  CRMProvider
} from '../../../../src/services/crm/CRMService';

describe('CRMService', () => {
  let service: CRMService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (CRMService as any).instance = null;
    service = getCRMService();
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = getCRMService();
      const instance2 = getCRMService();
      expect(instance1).toBe(instance2);
    });

    it('should not have active provider initially', () => {
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('initializeProvider', () => {
    it('should initialize Salesforce provider', async () => {
      await service.initializeProvider({
        provider: CRMProvider.SALESFORCE,
        credentials: {
          accessToken: 'test-token',
          instanceUrl: 'https://test.salesforce.com'
        }
      });

      expect(service.isConfigured()).toBe(true);
      expect(service.getActiveProviderType()).toBe(CRMProvider.SALESFORCE);
    });

    it('should initialize HubSpot provider', async () => {
      await service.initializeProvider({
        provider: CRMProvider.HUBSPOT,
        credentials: {
          accessToken: 'test-hs-token'
        }
      });

      expect(service.isConfigured()).toBe(true);
      expect(service.getActiveProviderType()).toBe(CRMProvider.HUBSPOT);
    });

    it('should throw for unsupported provider', async () => {
      await expect(
        service.initializeProvider({
          provider: CRMProvider.ZOHO,
          credentials: {}
        })
      ).rejects.toThrow('not yet implemented');
    });
  });

  describe('Salesforce operations', () => {
    beforeEach(async () => {
      await service.initializeProvider({
        provider: CRMProvider.SALESFORCE,
        credentials: {
          accessToken: 'test-token',
          instanceUrl: 'https://test.salesforce.com'
        }
      });
    });

    describe('getContact', () => {
      it('should fetch contact by ID', async () => {
        const mockContact = {
          Id: 'sf-123',
          FirstName: 'John',
          LastName: 'Doe',
          Email: 'john@example.com',
          Phone: '555-1234'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockContact)
        });

        const result = await service.getContact('sf-123');

        expect(result).toBeDefined();
        expect(result?.firstName).toBe('John');
        expect(result?.lastName).toBe('Doe');
        expect(result?.email).toBe('john@example.com');
      });

      it('should return null for non-existent contact', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404
        });

        const result = await service.getContact('invalid-id');
        expect(result).toBeNull();
      });
    });

    describe('searchContacts', () => {
      it('should search contacts by query', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            records: [
              { Id: 'sf-1', FirstName: 'John', LastName: 'Doe', Email: 'john@example.com' },
              { Id: 'sf-2', FirstName: 'Jane', LastName: 'Doe', Email: 'jane@example.com' }
            ]
          })
        });

        const results = await service.searchContacts('Doe');

        expect(results).toHaveLength(2);
        expect(results[0].lastName).toBe('Doe');
      });

      it('should return empty array on error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const results = await service.searchContacts('test');
        expect(results).toHaveLength(0);
      });
    });

    describe('createContact', () => {
      it('should create new contact', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'new-sf-123' })
        });

        const result = await service.createContact({
          firstName: 'New',
          lastName: 'Contact',
          email: 'new@example.com'
        });

        expect(result.id).toBe('new-sf-123');
        expect(result.externalId).toBe('new-sf-123');
      });
    });

    describe('createActivity', () => {
      it('should create activity/task', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'task-123' })
        });

        const result = await service.createActivity({
          type: 'call',
          subject: 'Follow-up call',
          description: 'Discussed payment plan',
          contactId: 'sf-123',
          status: 'completed'
        });

        expect(result.id).toBe('task-123');
      });
    });

    describe('logContactActivity', () => {
      it('should log activity for contact', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'activity-123' })
        });

        const result = await service.logContactActivity(
          'contact-123',
          'call',
          'Payment discussion',
          'Customer agreed to payment plan',
          'success'
        );

        expect(result).toBeDefined();
        expect(result.type).toBe('call');
        expect(result.status).toBe('completed');
      });
    });
  });

  describe('HubSpot operations', () => {
    beforeEach(async () => {
      await service.initializeProvider({
        provider: CRMProvider.HUBSPOT,
        credentials: {
          accessToken: 'test-hs-token'
        }
      });
    });

    describe('getContact', () => {
      it('should fetch HubSpot contact', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'hs-123',
            properties: {
              firstname: 'Jane',
              lastname: 'Smith',
              email: 'jane@example.com',
              phone: '555-5678'
            }
          })
        });

        const result = await service.getContact('hs-123');

        expect(result).toBeDefined();
        expect(result?.firstName).toBe('Jane');
        expect(result?.email).toBe('jane@example.com');
      });
    });

    describe('searchContacts', () => {
      it('should search HubSpot contacts', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: [
              { id: 'hs-1', properties: { firstname: 'Test', lastname: 'User', email: 'test@example.com' } }
            ]
          })
        });

        const results = await service.searchContacts('Test');

        expect(results).toHaveLength(1);
        expect(results[0].firstName).toBe('Test');
      });
    });

    describe('getAccount', () => {
      it('should fetch HubSpot company', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'company-123',
            properties: {
              name: 'Acme Corp',
              website: 'https://acme.com',
              industry: 'Technology'
            }
          })
        });

        const result = await service.getAccount('company-123');

        expect(result).toBeDefined();
        expect(result?.name).toBe('Acme Corp');
        expect(result?.industry).toBe('Technology');
      });
    });
  });

  describe('setActiveProvider', () => {
    it('should switch between providers', async () => {
      await service.initializeProvider({
        provider: CRMProvider.SALESFORCE,
        credentials: { accessToken: 'sf-token' }
      });

      await service.initializeProvider({
        provider: CRMProvider.HUBSPOT,
        credentials: { accessToken: 'hs-token' }
      });

      expect(service.getActiveProviderType()).toBe(CRMProvider.SALESFORCE);

      service.setActiveProvider(CRMProvider.HUBSPOT);
      expect(service.getActiveProviderType()).toBe(CRMProvider.HUBSPOT);
    });

    it('should throw for uninitialized provider', () => {
      expect(() => {
        service.setActiveProvider(CRMProvider.ZOHO);
      }).toThrow('not initialized');
    });
  });
});
