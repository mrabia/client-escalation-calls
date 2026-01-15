/**
 * Task Routes
 * CRUD operations for task management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { authenticate, requireAgent, requireManager } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();

/**
 * Validation schemas
 */
const createTaskSchema = Joi.object({
  type: Joi.string().valid('send_email', 'make_call', 'send_sms', 'research_customer', 'escalate', 'follow_up').required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  customerId: Joi.string().uuid().required(),
  campaignId: Joi.string().uuid().required(),
  dueAt: Joi.date().optional(),
  maxAttempts: Joi.number().integer().min(1).max(10).default(3),
  context: Joi.object({
    paymentRecordId: Joi.string().uuid().optional(),
    messageTemplate: Joi.string().optional(),
    metadata: Joi.object().optional(),
  }).optional(),
});

const updateTaskSchema = Joi.object({
  status: Joi.string().valid('pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  assignedAgentId: Joi.string().uuid().allow(null).optional(),
  dueAt: Joi.date().optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled').optional(),
  type: Joi.string().valid('send_email', 'make_call', 'send_sms', 'research_customer', 'escalate', 'follow_up').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  customerId: Joi.string().uuid().optional(),
  campaignId: Joi.string().uuid().optional(),
  assignedAgentId: Joi.string().uuid().optional(),
  sortBy: Joi.string().valid('createdAt', 'dueAt', 'priority').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * GET /api/v1/tasks
 * List all tasks with pagination and filtering
 */
router.get('/', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    const { page, limit, status, type, priority, customerId, campaignId, assignedAgentId, sortBy, sortOrder } = value;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, c.company_name as customer_name, a.type as agent_type, camp.name as campaign_name
      FROM tasks t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN agents a ON t.assigned_agent_id = a.id
      LEFT JOIN campaigns camp ON t.campaign_id = camp.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    if (type) {
      query += ` AND t.type = $${paramIndex++}`;
      params.push(type);
    }
    if (priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      params.push(priority);
    }
    if (customerId) {
      query += ` AND t.customer_id = $${paramIndex++}`;
      params.push(customerId);
    }
    if (campaignId) {
      query += ` AND t.campaign_id = $${paramIndex++}`;
      params.push(campaignId);
    }
    if (assignedAgentId) {
      query += ` AND t.assigned_agent_id = $${paramIndex++}`;
      params.push(assignedAgentId);
    }

    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await dbService.query(countQuery, params);
    const totalCount = Number.parseInt(countResult.rows[0].count, 10);

    // Add sorting and pagination
    let sortColumn = 't.created_at';
    if (sortBy === 'dueAt') sortColumn = 't.due_at';
    if (sortBy === 'priority') sortColumn = `CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`;
    
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await dbService.query(query, params);

    const tasks = result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      priority: row.priority,
      status: row.status,
      customerId: row.customer_id,
      customerName: row.customer_name,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      assignedAgentId: row.assigned_agent_id,
      agentType: row.agent_type,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      dueAt: row.due_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    logger.error('Failed to list tasks:', error);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

/**
 * GET /api/v1/tasks/:id
 * Get a single task by ID
 */
router.get('/:id', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `SELECT t.*, c.company_name as customer_name, c.email as customer_email, c.phone as customer_phone,
              a.type as agent_type, camp.name as campaign_name
       FROM tasks t
       LEFT JOIN customers c ON t.customer_id = c.id
       LEFT JOIN agents a ON t.assigned_agent_id = a.id
       LEFT JOIN campaigns camp ON t.campaign_id = camp.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const row = result.rows[0];
    const task = {
      id: row.id,
      type: row.type,
      priority: row.priority,
      status: row.status,
      customerId: row.customer_id,
      customer: {
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
      },
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      assignedAgentId: row.assigned_agent_id,
      agentType: row.agent_type,
      context: row.context,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      dueAt: row.due_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ success: true, data: task });
  } catch (error: any) {
    logger.error('Failed to get task:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

/**
 * POST /api/v1/tasks
 * Create a new task
 */
router.post('/', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { error, value } = createTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    // Verify customer exists
    const customerCheck = await dbService.query('SELECT id FROM customers WHERE id = $1', [value.customerId]);
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    // Verify campaign exists
    const campaignCheck = await dbService.query('SELECT id FROM campaigns WHERE id = $1', [value.campaignId]);
    if (campaignCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Campaign not found' });
    }

    const taskId = uuidv4();
    const now = new Date();

    const context = {
      customerId: value.customerId,
      campaignId: value.campaignId,
      paymentRecordId: value.context?.paymentRecordId || null,
      previousAttempts: [],
      customerContext: {},
      messageTemplate: value.context?.messageTemplate || null,
      metadata: value.context?.metadata || {},
    };

    await dbService.query(
      `INSERT INTO tasks (id, type, priority, customer_id, campaign_id, status, context, due_at, attempts, max_attempts, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        taskId,
        value.type,
        value.priority,
        value.customerId,
        value.campaignId,
        'pending',
        JSON.stringify(context),
        value.dueAt || null,
        0,
        value.maxAttempts,
        now,
        now,
      ]
    );

    logger.info('Task created', { taskId, type: value.type, customerId: value.customerId });

    res.status(201).json({
      success: true,
      data: {
        id: taskId,
        type: value.type,
        priority: value.priority,
        customerId: value.customerId,
        campaignId: value.campaignId,
        status: 'pending',
        context,
        dueAt: value.dueAt,
        attempts: 0,
        maxAttempts: value.maxAttempts,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    logger.error('Failed to create task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * PUT /api/v1/tasks/:id
 * Update a task
 */
router.put('/:id', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = updateTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    // Check if task exists
    const existing = await dbService.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (value.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(value.status);
      
      if (value.status === 'completed' || value.status === 'failed') {
        updates.push(`completed_at = $${paramIndex++}`);
        params.push(new Date());
      }
    }
    if (value.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(value.priority);
    }
    if (value.assignedAgentId !== undefined) {
      updates.push(`assigned_agent_id = $${paramIndex++}`);
      params.push(value.assignedAgentId);
    }
    if (value.dueAt !== undefined) {
      updates.push(`due_at = $${paramIndex++}`);
      params.push(value.dueAt);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());
    params.push(id);

    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await dbService.query(query, params);

    const row = result.rows[0];
    logger.info('Task updated', { taskId: id, status: row.status });

    res.json({
      success: true,
      data: {
        id: row.id,
        type: row.type,
        priority: row.priority,
        status: row.status,
        customerId: row.customer_id,
        campaignId: row.campaign_id,
        assignedAgentId: row.assigned_agent_id,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        dueAt: row.due_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    logger.error('Failed to update task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * DELETE /api/v1/tasks/:id
 * Delete a task
 */
router.delete('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await dbService.query('SELECT id, status FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Don't allow deleting in-progress tasks
    if (existing.rows[0].status === 'in_progress') {
      return res.status(400).json({ error: 'Cannot delete a task that is in progress' });
    }

    await dbService.query('DELETE FROM tasks WHERE id = $1', [id]);

    logger.info('Task deleted', { taskId: id });

    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

/**
 * POST /api/v1/tasks/:id/assign
 * Assign a task to an agent
 */
router.post('/:id/assign', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    // Verify agent exists
    const agentCheck = await dbService.query('SELECT id, type FROM agents WHERE id = $1', [agentId]);
    if (agentCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Agent not found' });
    }

    const result = await dbService.query(
      `UPDATE tasks SET assigned_agent_id = $1, status = 'assigned', updated_at = $2 WHERE id = $3 AND status = 'pending' RETURNING *`,
      [agentId, new Date(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or not in pending status' });
    }

    logger.info('Task assigned', { taskId: id, agentId });

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    logger.error('Failed to assign task:', error);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

/**
 * GET /api/v1/tasks/:id/attempts
 * Get contact attempts for a task
 */
router.get('/:id/attempts', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `SELECT * FROM contact_attempts WHERE task_id = $1 ORDER BY timestamp DESC`,
      [id]
    );

    const attempts = result.rows.map((row: any) => ({
      id: row.id,
      channel: row.channel,
      status: row.status,
      response: row.response,
      agentId: row.agent_id,
      duration: row.duration,
      metadata: row.metadata,
      timestamp: row.timestamp,
    }));

    res.json({ success: true, data: attempts });
  } catch (error: any) {
    logger.error('Failed to get task attempts:', error);
    res.status(500).json({ error: 'Failed to get attempts' });
  }
});

export default router;
