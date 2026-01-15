/**
 * Customer Routes Unit Tests
 */

import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../../../src/core/services/database');
jest.mock('../../../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-id', email: 'test@example.com', role: 'admin' };
    next();
  },
  requireAgent: (req: any, res: any, next: any) => next(),
  requireManager: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

import customerRoutes from '../../../src/routes/customers.routes';
import { DatabaseService } from '../../../src/core/services/database';

const mockDbService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

describe('Customer Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/customers', customerRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /customers', () => {
    it('should return paginated customers', async () => {
      const mockCustomers = [
        {
          id: uuidv4(),
          company_name: 'Test Company',
          contact_name: 'John Doe',
          email: 'john@test.com',
          phone: '+1234567890',
          preferred_contact_method: 'email',
          tags: ['vip'],
          risk_level: 'medium',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockCustomers });

      const response = await request(app)
        .get('/customers')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalCount).toBe(1);
    });

    it('should filter customers by search query', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/customers')
        .query({ search: 'nonexistent' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should filter customers by risk level', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/customers')
        .query({ riskLevel: 'high' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /customers/:id', () => {
    it('should return a customer by ID', async () => {
      const customerId = uuidv4();
      const mockCustomer = {
        id: customerId,
        company_name: 'Test Company',
        contact_name: 'John Doe',
        email: 'john@test.com',
        risk_level: 'medium',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockCustomer] });

      const response = await request(app)
        .get(`/customers/${customerId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(customerId);
    });

    it('should return 404 for non-existent customer', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(`/customers/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Customer not found');
    });
  });

  describe('POST /customers', () => {
    it('should create a new customer', async () => {
      const newCustomer = {
        companyName: 'New Company',
        contactName: 'Jane Doe',
        email: 'jane@newcompany.com',
        phone: '+1234567890',
        preferredContactMethod: 'email',
      };

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // Insert customer
        .mockResolvedValueOnce({ rows: [] }); // Create profile

      const response = await request(app)
        .post('/customers')
        .send(newCustomer);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companyName).toBe(newCustomer.companyName);
      expect(response.body.data.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidCustomer = {
        companyName: 'Test',
        // Missing contactName and email
      };

      const response = await request(app)
        .post('/customers')
        .send(invalidCustomer);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should validate email format', async () => {
      const invalidCustomer = {
        companyName: 'Test',
        contactName: 'Test',
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/customers')
        .send(invalidCustomer);

      expect(response.status).toBe(400);
    });

    it('should handle duplicate email error', async () => {
      const newCustomer = {
        companyName: 'New Company',
        contactName: 'Jane Doe',
        email: 'existing@company.com',
      };

      mockDbService.prototype.query = jest.fn()
        .mockRejectedValueOnce({ code: '23505' });

      const response = await request(app)
        .post('/customers')
        .send(newCustomer);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('PUT /customers/:id', () => {
    it('should update a customer', async () => {
      const customerId = uuidv4();
      const updatedData = {
        companyName: 'Updated Company',
        email: 'updated@company.com',
      };

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: customerId }] }) // Check exists
        .mockResolvedValueOnce({
          rows: [{
            id: customerId,
            company_name: 'Updated Company',
            contact_name: 'John Doe',
            email: 'updated@company.com',
            created_at: new Date(),
            updated_at: new Date(),
          }],
        });

      const response = await request(app)
        .put(`/customers/${customerId}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companyName).toBe('Updated Company');
    });

    it('should return 404 for non-existent customer', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put(`/customers/${uuidv4()}`)
        .send({ companyName: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should reject empty update', async () => {
      const customerId = uuidv4();

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: customerId }] });

      const response = await request(app)
        .put(`/customers/${customerId}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });
  });

  describe('DELETE /customers/:id', () => {
    it('should delete a customer', async () => {
      const customerId = uuidv4();

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: customerId }] }) // Check exists
        .mockResolvedValueOnce({ rows: [] }); // Delete

      const response = await request(app)
        .delete(`/customers/${customerId}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent customer', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete(`/customers/${uuidv4()}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /customers/:id/payments', () => {
    it('should return customer payments', async () => {
      const customerId = uuidv4();
      const mockPayments = [
        {
          id: uuidv4(),
          amount: '500.00',
          currency: 'USD',
          due_date: new Date(),
          status: 'overdue',
          invoice_number: 'INV-001',
        },
      ];

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: mockPayments });

      const response = await request(app)
        .get(`/customers/${customerId}/payments`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].amount).toBe(500);
    });
  });

  describe('GET /customers/:id/campaigns', () => {
    it('should return customer campaigns', async () => {
      const customerId = uuidv4();
      const mockCampaigns = [
        {
          id: uuidv4(),
          name: 'Collection Campaign',
          status: 'active',
          current_step: 1,
          start_date: new Date(),
          created_at: new Date(),
        },
      ];

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: mockCampaigns });

      const response = await request(app)
        .get(`/customers/${customerId}/campaigns`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });
});
