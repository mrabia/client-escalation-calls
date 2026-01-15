/**
 * Agent Routes
 * CRUD operations for agent management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { authenticate, requireAdmin, requireManager } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();

/**
 * Validation schemas
 */
const createAgentSchema = Joi.object({
  type: Joi.string().valid('email', 'phone', 'sms', 'research').required(),
  capabilities: Joi.array().items(Joi.string()).default([]),
  config: Joi.object({
    maxConcurrentTasks: Joi.number().integer().min(1).max(20).default(5),
    workingHours: Joi.object({
      start: Joi.string().pattern(/^\d{2}:\d{2}$/).default('09:00'),
      end: Joi.string().pattern(/^\d{2}:\d{2}$/).default('17:00'),
    }).optional(),
    timezone: Joi.string().default('America/New_York'),
    skills: Joi.array().items(Joi.string()).optional(),
  }).optional(),
});

const updateAgentSchema = Joi.object({
  status: Joi.string().valid('idle', 'active', 'busy', 'error', 'offline').optional(),
  capabilities: Joi.array().items(Joi.string()).optional(),
  config: Joi.object({
    maxConcurrentTasks: Joi.number().integer().min(1).max(20).optional(),
    workingHours: Joi.object({
      start: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
      end: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    }).optional(),
    timezone: Joi.string().optional(),
    skills: Joi.array().items(Joi.string()).optional(),
  }).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid('email', 'phone', 'sms', 'research').optional(),
  status: Joi.string().valid('idle', 'active', 'busy', 'error', 'offline').optional(),
});

/**
 * GET /api/v1/agents
 * List all agents with pagination and filtering
 */
router.get('/', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    const { page, limit, type, status } = value;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM agents WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(type);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await dbService.query(countQuery, params);
    const totalCount = Number.parseInt(countResult.rows[0].count, 10);

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await dbService.query(query, params);

    const agents = result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      capabilities: row.capabilities || [],
      currentTasks: row.current_tasks || 0,
      performance: row.performance,
      config: row.config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: agents,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    logger.error('Failed to list agents:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

/**
 * GET /api/v1/agents/:id
 * Get a single agent by ID
 */
router.get('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query('SELECT * FROM agents WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const row = result.rows[0];
    const agent = {
      id: row.id,
      type: row.type,
      status: row.status,
      capabilities: row.capabilities || [],
      currentTasks: row.current_tasks || 0,
      performance: row.performance,
      config: row.config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ success: true, data: agent });
  } catch (error: any) {
    logger.error('Failed to get agent:', error);
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

/**
 * POST /api/v1/agents
 * Create a new agent
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { error, value } = createAgentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    const agentId = uuidv4();
    const now = new Date();

    const defaultConfig = {
      maxConcurrentTasks: 5,
      workingHours: { start: '09:00', end: '17:00' },
      timezone: 'America/New_York',
      skills: value.capabilities || [],
      templates: {},
      integrations: [],
    };

    const defaultPerformance = {
      tasksCompleted: 0,
      tasksSuccessful: 0,
      averageResponseTime: 0,
      customerSatisfactionScore: 0,
      escalationRate: 0,
      lastUpdated: now,
    };

    await dbService.query(
      `INSERT INTO agents (id, type, status, capabilities, performance, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        agentId,
        value.type,
        'idle',
        value.capabilities || [],
        JSON.stringify(defaultPerformance),
        JSON.stringify({ ...defaultConfig, ...value.config }),
        now,
        now,
      ]
    );

    logger.info('Agent created', { agentId, type: value.type });

    res.status(201).json({
      success: true,
      data: {
        id: agentId,
        type: value.type,
        status: 'idle',
        capabilities: value.capabilities || [],
        performance: defaultPerformance,
        config: { ...defaultConfig, ...value.config },
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    logger.error('Failed to create agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

/**
 * PUT /api/v1/agents/:id
 * Update an agent
 */
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = updateAgentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    // Check if agent exists
    const existing = await dbService.query('SELECT * FROM agents WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (value.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(value.status);
    }
    if (value.capabilities !== undefined) {
      updates.push(`capabilities = $${paramIndex++}`);
      params.push(value.capabilities);
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

    const query = `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await dbService.query(query, params);

    const row = result.rows[0];
    logger.info('Agent updated', { agentId: id, status: row.status });

    res.json({
      success: true,
      data: {
        id: row.id,
        type: row.type,
        status: row.status,
        capabilities: row.capabilities || [],
        performance: row.performance,
        config: row.config,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    logger.error('Failed to update agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

/**
 * DELETE /api/v1/agents/:id
 * Delete an agent
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await dbService.query('SELECT id, status, current_tasks FROM agents WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Don't allow deleting agents with active tasks
    if (existing.rows[0].current_tasks > 0) {
      return res.status(400).json({ error: 'Cannot delete an agent with active tasks' });
    }

    await dbService.query('DELETE FROM agents WHERE id = $1', [id]);

    logger.info('Agent deleted', { agentId: id });

    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

/**
 * GET /api/v1/agents/:id/tasks
 * Get tasks assigned to an agent
 */
router.get('/:id/tasks', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `SELECT t.*, c.company_name as customer_name
       FROM tasks t
       LEFT JOIN customers c ON t.customer_id = c.id
       WHERE t.assigned_agent_id = $1 AND t.status NOT IN ('completed', 'failed', 'cancelled')
       ORDER BY t.priority DESC, t.created_at ASC`,
      [id]
    );

    const tasks = result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      priority: row.priority,
      status: row.status,
      customerId: row.customer_id,
      customerName: row.customer_name,
      campaignId: row.campaign_id,
      dueAt: row.due_at,
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: tasks });
  } catch (error: any) {
    logger.error('Failed to get agent tasks:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

/**
 * GET /api/v1/agents/:id/performance
 * Get performance metrics for an agent
 */
router.get('/:id/performance', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agentResult = await dbService.query('SELECT performance FROM agents WHERE id = $1', [id]);
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get additional stats from tasks
    const statsResult = await dbService.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
         COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
         AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time
       FROM tasks WHERE assigned_agent_id = $1`,
      [id]
    );

    const performance = agentResult.rows[0].performance || {};
    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        ...performance,
        completedTasks: Number.parseInt(stats.completed_tasks, 10) || 0,
        failedTasks: Number.parseInt(stats.failed_tasks, 10) || 0,
        avgCompletionTimeSeconds: Math.round(parseFloat(stats.avg_completion_time) || 0),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get agent performance:', error);
    res.status(500).json({ error: 'Failed to get performance' });
  }
});

export default router;
