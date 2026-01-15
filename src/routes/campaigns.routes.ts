/**
 * Campaign Routes
 * CRUD operations for campaign management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireAgent, requireManager } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import { logger } from '../utils/logger';
import { CampaignStatus, Priority } from '../types';

const router = Router();
const dbService = new DatabaseService();

/**
 * Validation schemas
 */
const escalationStepSchema = Joi.object({
  stepNumber: Joi.number().integer().min(1).required(),
  channel: Joi.string().valid('email', 'phone', 'sms').required(),
  template: Joi.string().required(),
  delayHours: Joi.number().integer().min(0).default(0),
  maxAttempts: Joi.number().integer().min(1).max(10).default(3),
});

const createCampaignSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().optional().max(1000),
  customerId: Joi.string().uuid().required(),
  paymentRecordId: Joi.string().uuid().optional(),
  escalationSteps: Joi.array().items(escalationStepSchema).min(1).required(),
  config: Joi.object({
    maxDailyContacts: Joi.number().integer().min(1).max(10).default(3),
    cooldownPeriod: Joi.number().integer().min(1).default(4),
    respectDoNotContact: Joi.boolean().default(true),
    timezone: Joi.string().default('America/New_York'),
  }).optional(),
  startDate: Joi.date().optional(),
});

const updateCampaignSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  description: Joi.string().max(1000).optional(),
  status: Joi.string().valid('draft', 'active', 'paused', 'completed', 'cancelled').optional(),
  escalationSteps: Joi.array().items(escalationStepSchema).min(1).optional(),
  config: Joi.object({
    maxDailyContacts: Joi.number().integer().min(1).max(10).optional(),
    cooldownPeriod: Joi.number().integer().min(1).optional(),
    respectDoNotContact: Joi.boolean().optional(),
    timezone: Joi.string().optional(),
  }).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('draft', 'active', 'paused', 'completed', 'cancelled').optional(),
  customerId: Joi.string().uuid().optional(),
  sortBy: Joi.string().valid('name', 'createdAt', 'startDate').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * GET /api/v1/campaigns
 * List all campaigns with pagination and filtering
 */
router.get('/', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    const { page, limit, status, customerId, sortBy, sortOrder } = value;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, cust.company_name as customer_name
      FROM campaigns c
      LEFT JOIN customers cust ON c.customer_id = cust.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (customerId) {
      query += ` AND c.customer_id = $${paramIndex}`;
      params.push(customerId);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await dbService.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Add sorting and pagination
    const sortColumn = sortBy === 'name' ? 'c.name' : sortBy === 'startDate' ? 'c.start_date' : 'c.created_at';
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await dbService.query(query, params);

    const campaigns = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      customerId: row.customer_id,
      customerName: row.customer_name,
      status: row.status,
      currentStep: row.current_step,
      escalationSteps: row.escalation_steps,
      startDate: row.start_date,
      endDate: row.end_date,
      results: row.results,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    logger.error('Failed to list campaigns:', error);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

/**
 * GET /api/v1/campaigns/:id
 * Get a single campaign by ID
 */
router.get('/:id', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `SELECT c.*, cust.company_name as customer_name, cust.contact_name, cust.email as customer_email
       FROM campaigns c
       LEFT JOIN customers cust ON c.customer_id = cust.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const row = result.rows[0];
    const campaign = {
      id: row.id,
      name: row.name,
      description: row.description,
      customerId: row.customer_id,
      customer: {
        name: row.customer_name,
        contactName: row.contact_name,
        email: row.customer_email,
      },
      status: row.status,
      currentStep: row.current_step,
      escalationSteps: row.escalation_steps,
      startDate: row.start_date,
      endDate: row.end_date,
      pausedUntil: row.paused_until,
      results: row.results,
      config: row.config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ success: true, data: campaign });
  } catch (error: any) {
    logger.error('Failed to get campaign:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

/**
 * POST /api/v1/campaigns
 * Create a new campaign
 */
router.post('/', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    // Verify customer exists
    const customerCheck = await dbService.query('SELECT id FROM customers WHERE id = $1', [value.customerId]);
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const campaignId = uuidv4();
    const now = new Date();
    const startDate = value.startDate || now;

    const defaultConfig = {
      maxDailyContacts: 3,
      cooldownPeriod: 4,
      respectDoNotContact: true,
      timezone: 'America/New_York',
      businessHours: { start: '09:00', end: '17:00' },
      complianceRules: [],
    };

    const defaultResults = {
      totalContacts: 0,
      successfulContacts: 0,
      paymentsReceived: 0,
      totalAmountCollected: 0,
      averageCollectionTime: 0,
      channelPerformance: [],
    };

    await dbService.query(
      `INSERT INTO campaigns (id, name, description, customer_id, status, escalation_steps, current_step, start_date, results, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        campaignId,
        value.name,
        value.description || null,
        value.customerId,
        'active',
        JSON.stringify(value.escalationSteps),
        1,
        startDate,
        JSON.stringify(defaultResults),
        JSON.stringify({ ...defaultConfig, ...value.config }),
        now,
        now,
      ]
    );

    logger.info('Campaign created', { campaignId, name: value.name, customerId: value.customerId });

    res.status(201).json({
      success: true,
      data: {
        id: campaignId,
        name: value.name,
        description: value.description,
        customerId: value.customerId,
        status: 'active',
        currentStep: 1,
        escalationSteps: value.escalationSteps,
        startDate,
        config: { ...defaultConfig, ...value.config },
        results: defaultResults,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    logger.error('Failed to create campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

/**
 * PUT /api/v1/campaigns/:id
 * Update a campaign
 */
router.put('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = updateCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    // Check if campaign exists
    const existing = await dbService.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (value.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(value.name);
    }
    if (value.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(value.description);
    }
    if (value.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(value.status);
      
      // If completing or cancelling, set end date
      if (value.status === 'completed' || value.status === 'cancelled') {
        updates.push(`end_date = $${paramIndex++}`);
        params.push(new Date());
      }
    }
    if (value.escalationSteps !== undefined) {
      updates.push(`escalation_steps = $${paramIndex++}`);
      params.push(JSON.stringify(value.escalationSteps));
    }
    if (value.config !== undefined) {
      const existingConfig = existing.rows[0].config || {};
      updates.push(`config = $${paramIndex++}`);
      params.push(JSON.stringify({ ...existingConfig, ...value.config }));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());
    params.push(id);

    const query = `UPDATE campaigns SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await dbService.query(query, params);

    const row = result.rows[0];
    logger.info('Campaign updated', { campaignId: id, status: row.status });

    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        description: row.description,
        customerId: row.customer_id,
        status: row.status,
        currentStep: row.current_step,
        escalationSteps: row.escalation_steps,
        startDate: row.start_date,
        endDate: row.end_date,
        config: row.config,
        results: row.results,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    logger.error('Failed to update campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

/**
 * DELETE /api/v1/campaigns/:id
 * Delete a campaign
 */
router.delete('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const existing = await dbService.query('SELECT id, status FROM campaigns WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Don't allow deleting active campaigns
    if (existing.rows[0].status === 'active') {
      return res.status(400).json({ error: 'Cannot delete an active campaign. Please pause or cancel it first.' });
    }

    await dbService.query('DELETE FROM campaigns WHERE id = $1', [id]);

    logger.info('Campaign deleted', { campaignId: id });

    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

/**
 * POST /api/v1/campaigns/:id/pause
 * Pause a campaign
 */
router.post('/:id/pause', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pauseUntil } = req.body;

    const result = await dbService.query(
      `UPDATE campaigns SET status = 'paused', paused_until = $1, updated_at = $2 WHERE id = $3 AND status = 'active' RETURNING *`,
      [pauseUntil || null, new Date(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found or not active' });
    }

    logger.info('Campaign paused', { campaignId: id });

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    logger.error('Failed to pause campaign:', error);
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

/**
 * POST /api/v1/campaigns/:id/resume
 * Resume a paused campaign
 */
router.post('/:id/resume', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `UPDATE campaigns SET status = 'active', paused_until = NULL, updated_at = $1 WHERE id = $2 AND status = 'paused' RETURNING *`,
      [new Date(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found or not paused' });
    }

    logger.info('Campaign resumed', { campaignId: id });

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    logger.error('Failed to resume campaign:', error);
    res.status(500).json({ error: 'Failed to resume campaign' });
  }
});

/**
 * GET /api/v1/campaigns/:id/tasks
 * Get tasks for a campaign
 */
router.get('/:id/tasks', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `SELECT t.*, a.type as agent_type
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_agent_id = a.id
       WHERE t.campaign_id = $1
       ORDER BY t.created_at DESC`,
      [id]
    );

    const tasks = result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      priority: row.priority,
      status: row.status,
      assignedAgentId: row.assigned_agent_id,
      agentType: row.agent_type,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      dueAt: row.due_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: tasks });
  } catch (error: any) {
    logger.error('Failed to get campaign tasks:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

export default router;
