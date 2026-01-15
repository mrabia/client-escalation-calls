/**
 * Campaign Routes Unit Tests
 */

import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../../../src/core/services/database');
jest.mock('../../../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-id', email: 'test@example.com', role: 'manager' };
    next();
  },
  requireAgent: (req: any, res: any, next: any) => next(),
  requireManager: (req: any, res: any, next: any) => next(),
}));

import campaignRoutes from '../../../src/routes/campaigns.routes';
import { DatabaseService } from '../../../src/core/services/database';

const mockDbService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

describe('Campaign Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/campaigns', campaignRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /campaigns', () => {
    it('should return paginated campaigns', async () => {
      const mockCampaigns = [
        {
          id: uuidv4(),
          name: 'Test Campaign',
          description: 'Test description',
          customer_id: uuidv4(),
          customer_name: 'Test Customer',
          status: 'active',
          current_step: 1,
          escalation_steps: [{ stepNumber: 1, channel: 'email', template: 'reminder', delayHours: 0 }],
          start_date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockCampaigns });

      const response = await request(app)
        .get('/campaigns')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Campaign');
    });

    it('should filter campaigns by status', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/campaigns')
        .query({ status: 'active' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /campaigns/:id', () => {
    it('should return a campaign by ID', async () => {
      const campaignId = uuidv4();
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        description: 'Description',
        customer_id: uuidv4(),
        customer_name: 'Test Customer',
        contact_name: 'John Doe',
        customer_email: 'john@test.com',
        status: 'active',
        current_step: 1,
        escalation_steps: [],
        start_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockCampaign] });

      const response = await request(app)
        .get(`/campaigns/${campaignId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(campaignId);
    });

    it('should return 404 for non-existent campaign', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(`/campaigns/${uuidv4()}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /campaigns', () => {
    it('should create a new campaign', async () => {
      const customerId = uuidv4();
      const newCampaign = {
        name: 'New Campaign',
        description: 'Campaign description',
        customerId,
        escalationSteps: [
          { stepNumber: 1, channel: 'email', template: 'reminder_1', delayHours: 0, maxAttempts: 3 },
          { stepNumber: 2, channel: 'phone', template: 'call_1', delayHours: 48, maxAttempts: 2 },
        ],
      };

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: customerId }] }) // Customer exists
        .mockResolvedValueOnce({ rows: [] }); // Insert campaign

      const response = await request(app)
        .post('/campaigns')
        .send(newCampaign);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newCampaign.name);
      expect(response.body.data.status).toBe('active');
    });

    it('should validate escalation steps', async () => {
      const invalidCampaign = {
        name: 'Invalid Campaign',
        customerId: uuidv4(),
        escalationSteps: [], // Empty steps - should fail
      };

      const response = await request(app)
        .post('/campaigns')
        .send(invalidCampaign);

      expect(response.status).toBe(400);
    });

    it('should return 400 for non-existent customer', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }); // Customer doesn't exist

      const response = await request(app)
        .post('/campaigns')
        .send({
          name: 'Test Campaign',
          customerId: uuidv4(),
          escalationSteps: [{ stepNumber: 1, channel: 'email', template: 'test' }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Customer not found');
    });
  });

  describe('PUT /campaigns/:id', () => {
    it('should update a campaign', async () => {
      const campaignId = uuidv4();

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: campaignId, config: {} }] }) // Exists
        .mockResolvedValueOnce({
          rows: [{
            id: campaignId,
            name: 'Updated Campaign',
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
          }],
        });

      const response = await request(app)
        .put(`/campaigns/${campaignId}`)
        .send({ name: 'Updated Campaign' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Campaign');
    });

    it('should set end date when completing campaign', async () => {
      const campaignId = uuidv4();

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: campaignId, config: {} }] })
        .mockResolvedValueOnce({
          rows: [{
            id: campaignId,
            status: 'completed',
            end_date: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          }],
        });

      const response = await request(app)
        .put(`/campaigns/${campaignId}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
    });
  });

  describe('DELETE /campaigns/:id', () => {
    it('should delete a campaign', async () => {
      const campaignId = uuidv4();

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: campaignId, status: 'paused' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete(`/campaigns/${campaignId}`);

      expect(response.status).toBe(204);
    });

    it('should not delete active campaigns', async () => {
      const campaignId = uuidv4();

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: campaignId, status: 'active' }] });

      const response = await request(app)
        .delete(`/campaigns/${campaignId}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('active');
    });
  });

  describe('POST /campaigns/:id/pause', () => {
    it('should pause an active campaign', async () => {
      const campaignId = uuidv4();

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: campaignId,
            status: 'paused',
            paused_until: null,
          }],
        });

      const response = await request(app)
        .post(`/campaigns/${campaignId}/pause`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /campaigns/:id/resume', () => {
    it('should resume a paused campaign', async () => {
      const campaignId = uuidv4();

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: campaignId,
            status: 'active',
          }],
        });

      const response = await request(app)
        .post(`/campaigns/${campaignId}/resume`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
