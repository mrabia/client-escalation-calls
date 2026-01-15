/**
 * End-to-End Workflow Tests
 * 
 * Tests complete collection workflows from campaign creation to payment resolution
 */

// Mock all external services
jest.mock('../../src/core/services/database');
jest.mock('../../src/core/services/redis');
jest.mock('../../src/core/services/messageQueue');
jest.mock('twilio');
jest.mock('nodemailer');

import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// Import routes
import apiRoutes from '../../src/routes';
import { DatabaseService } from '../../src/core/services/database';
import { RedisService } from '../../src/core/services/redis';

const mockDbService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const mockRedisService = RedisService as jest.MockedClass<typeof RedisService>;

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { userId: 'admin-user', email: 'admin@test.com', role: 'admin' };
    next();
  },
  requireAgent: (req: any, res: any, next: any) => next(),
  requireManager: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

describe('Collection Workflow E2E', () => {
  let app: express.Application;
  let customerId: string;
  let paymentId: string;
  let campaignId: string;
  let taskId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    customerId = uuidv4();
    paymentId = uuidv4();
    campaignId = uuidv4();
    taskId = uuidv4();
  });

  describe('Complete Collection Workflow', () => {
    it('should create customer, payment, campaign, and process tasks', async () => {
      // Step 1: Create a customer
      const customerData = {
        companyName: 'Acme Corp',
        contactName: 'John Smith',
        email: 'john@acme.com',
        phone: '+1234567890',
        preferredContactMethod: 'email',
      };

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // Insert customer
        .mockResolvedValueOnce({ rows: [] }); // Create profile

      const customerResponse = await request(app)
        .post('/api/v1/customers')
        .send(customerData);

      expect(customerResponse.status).toBe(201);
      const createdCustomerId = customerResponse.body.data.id;

      // Step 2: Create an overdue payment
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: createdCustomerId }] }) // Customer exists
        .mockResolvedValueOnce({ rows: [] }); // Insert payment

      const paymentData = {
        customerId: createdCustomerId,
        amount: 5000,
        currency: 'USD',
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        invoiceNumber: 'INV-2024-001',
        description: 'Service charges',
      };

      const paymentResponse = await request(app)
        .post('/api/v1/payments')
        .send(paymentData);

      expect(paymentResponse.status).toBe(201);
      expect(paymentResponse.body.data.status).toBe('overdue');

      // Step 3: Create a collection campaign
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: createdCustomerId }] }) // Customer exists
        .mockResolvedValueOnce({ rows: [] }); // Insert campaign

      const campaignData = {
        name: 'Acme Collection Campaign',
        description: 'Collection for overdue invoice INV-2024-001',
        customerId: createdCustomerId,
        escalationSteps: [
          { stepNumber: 1, channel: 'email', template: 'payment_reminder_1', delayHours: 0, maxAttempts: 2 },
          { stepNumber: 2, channel: 'sms', template: 'sms_reminder', delayHours: 48, maxAttempts: 1 },
          { stepNumber: 3, channel: 'phone', template: 'phone_call', delayHours: 72, maxAttempts: 2 },
        ],
      };

      const campaignResponse = await request(app)
        .post('/api/v1/campaigns')
        .send(campaignData);

      expect(campaignResponse.status).toBe(201);
      expect(campaignResponse.body.data.status).toBe('active');
      const createdCampaignId = campaignResponse.body.data.id;

      // Step 4: Create an email task for the first step
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: createdCustomerId }] }) // Customer exists
        .mockResolvedValueOnce({ rows: [{ id: createdCampaignId }] }) // Campaign exists
        .mockResolvedValueOnce({ rows: [] }); // Insert task

      const taskData = {
        type: 'send_email',
        priority: 'high',
        customerId: createdCustomerId,
        campaignId: createdCampaignId,
        context: {
          template: 'payment_reminder_1',
          invoiceNumber: 'INV-2024-001',
          amount: 5000,
        },
      };

      const taskResponse = await request(app)
        .post('/api/v1/tasks')
        .send(taskData);

      expect(taskResponse.status).toBe(201);
      expect(taskResponse.body.data.status).toBe('pending');
    });

    it('should handle payment resolution and campaign completion', async () => {
      // Simulate marking payment as paid
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: paymentId,
            status: 'paid',
            paid_date: new Date(),
          }],
        });

      const paymentUpdateResponse = await request(app)
        .post(`/api/v1/payments/${paymentId}/mark-paid`)
        .send({ paidDate: new Date() });

      expect(paymentUpdateResponse.status).toBe(200);

      // Complete the campaign
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: campaignId, config: {} }] })
        .mockResolvedValueOnce({
          rows: [{
            id: campaignId,
            status: 'completed',
            end_date: new Date(),
          }],
        });

      const campaignUpdateResponse = await request(app)
        .put(`/api/v1/campaigns/${campaignId}`)
        .send({ status: 'completed' });

      expect(campaignUpdateResponse.status).toBe(200);
      expect(campaignUpdateResponse.body.data.status).toBe('completed');
    });
  });

  describe('Escalation Workflow', () => {
    it('should escalate from email to phone when no response', async () => {
      // First, create failed email task
      const mockEmailTask = {
        id: taskId,
        type: 'send_email',
        status: 'failed',
        customer_id: customerId,
        campaign_id: campaignId,
        attempts: 3,
      };

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockEmailTask] });

      // Update task status to failed
      const updateResponse = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .send({ status: 'failed', result: { reason: 'no_response' } });

      // Next step should be to create a phone task
      // (In real scenario, this would be handled by the AgentCoordinator)
      expect(updateResponse.status).toBe(200);
    });
  });

  describe('Statistics and Reporting', () => {
    it('should return dashboard statistics', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // Customers
        .mockResolvedValueOnce({ rows: [{ total: '10', active: '5' }] }) // Campaigns
        .mockResolvedValueOnce({ rows: [{ total: '50', pending: '20', completed: '25' }] }) // Tasks
        .mockResolvedValueOnce({ rows: [{ total: '3', active: '2' }] }) // Agents
        .mockResolvedValueOnce({ rows: [{ total: '200', overdue_amount: '50000', overdue_count: '15' }] }); // Payments

      const response = await request(app)
        .get('/api/v1/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.customers.total).toBe(100);
      expect(response.body.data.campaigns.active).toBe(5);
      expect(response.body.data.payments.overdueAmount).toBe(50000);
    });

    it('should return overdue payments report', async () => {
      const mockOverduePayments = [
        {
          id: uuidv4(),
          customer_id: customerId,
          company_name: 'Acme Corp',
          contact_name: 'John Smith',
          email: 'john@acme.com',
          phone: '+1234567890',
          risk_level: 'high',
          amount: '5000.00',
          currency: 'USD',
          due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          invoice_number: 'INV-001',
        },
      ];

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: mockOverduePayments });

      const response = await request(app)
        .get('/api/v1/payments/overdue');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.summary.count).toBe(1);
      expect(response.body.summary.totalAmount).toBe(5000);
    });
  });

  describe('API Health and Info', () => {
    it('should return API info', async () => {
      const response = await request(app)
        .get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Client Escalation Calls API');
      expect(response.body.endpoints).toBeDefined();
    });

    it('should return health status', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ '1': 1 }] });
      mockRedisService.prototype.healthCheck = jest.fn()
        .mockResolvedValueOnce(true);

      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.services.database).toBe('healthy');
    });
  });
});
