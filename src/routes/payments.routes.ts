/**
 * Payment Routes
 * CRUD operations for payment record management
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
const createPaymentSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().default('USD'),
  dueDate: Joi.date().required(),
  invoiceNumber: Joi.string().required().max(100),
  description: Joi.string().max(500).optional(),
});

const updatePaymentSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  dueDate: Joi.date().optional(),
  status: Joi.string().valid('pending', 'overdue', 'paid', 'partial', 'cancelled').optional(),
  paidDate: Joi.date().optional(),
  paidAmount: Joi.number().positive().optional(),
  description: Joi.string().max(500).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  customerId: Joi.string().uuid().optional(),
  status: Joi.string().valid('pending', 'overdue', 'paid', 'partial', 'cancelled').optional(),
  overdueOnly: Joi.boolean().optional(),
  sortBy: Joi.string().valid('dueDate', 'amount', 'createdAt').default('dueDate'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * GET /api/v1/payments
 * List all payment records with pagination and filtering
 */
router.get('/', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    const { page, limit, customerId, status, overdueOnly, sortBy, sortOrder } = value;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, c.company_name as customer_name
      FROM payment_records p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (customerId) {
      query += ` AND p.customer_id = $${paramIndex++}`;
      params.push(customerId);
    }
    if (status) {
      query += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }
    if (overdueOnly) {
      query += ` AND p.status = 'overdue'`;
    }

    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await dbService.query(countQuery, params);
    const totalCount = Number.parseInt(countResult.rows[0].count, 10);

    // Add sorting and pagination
    const sortColumn = sortBy === 'amount' ? 'p.amount' : sortBy === 'createdAt' ? 'p.created_at' : 'p.due_date';
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await dbService.query(query, params);

    const payments = result.rows.map((row: any) => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      amount: Number.parseFloat(row.amount),
      currency: row.currency,
      dueDate: row.due_date,
      paidDate: row.paid_date,
      status: row.status,
      invoiceNumber: row.invoice_number,
      description: row.description,
      daysOverdue: row.status === 'overdue' ? Math.floor((Date.now() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    logger.error('Failed to list payments:', error);
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

/**
 * GET /api/v1/payments/overdue
 * Get all overdue payments with customer details
 */
router.get('/overdue', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const result = await dbService.query(
      `SELECT p.*, c.company_name, c.contact_name, c.email, c.phone, cp.risk_level
       FROM payment_records p
       JOIN customers c ON p.customer_id = c.id
       LEFT JOIN customer_profiles cp ON c.id = cp.customer_id
       WHERE p.status = 'overdue'
       ORDER BY p.due_date ASC`
    );

    const overduePayments = result.rows.map((row: any) => ({
      id: row.id,
      customerId: row.customer_id,
      customer: {
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        riskLevel: row.risk_level,
      },
      amount: Number.parseFloat(row.amount),
      currency: row.currency,
      dueDate: row.due_date,
      invoiceNumber: row.invoice_number,
      daysOverdue: Math.floor((Date.now() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Calculate summary
    const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      data: overduePayments,
      summary: {
        count: overduePayments.length,
        totalAmount: totalOverdue,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get overdue payments:', error);
    res.status(500).json({ error: 'Failed to get overdue payments' });
  }
});

/**
 * GET /api/v1/payments/:id
 * Get a single payment record by ID
 */
router.get('/:id', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `SELECT p.*, c.company_name, c.contact_name, c.email
       FROM payment_records p
       LEFT JOIN customers c ON p.customer_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const row = result.rows[0];
    const payment = {
      id: row.id,
      customerId: row.customer_id,
      customer: {
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
      },
      amount: Number.parseFloat(row.amount),
      currency: row.currency,
      dueDate: row.due_date,
      paidDate: row.paid_date,
      status: row.status,
      invoiceNumber: row.invoice_number,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ success: true, data: payment });
  } catch (error: any) {
    logger.error('Failed to get payment:', error);
    res.status(500).json({ error: 'Failed to get payment' });
  }
});

/**
 * POST /api/v1/payments
 * Create a new payment record
 */
router.post('/', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { error, value } = createPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    // Verify customer exists
    const customerCheck = await dbService.query('SELECT id FROM customers WHERE id = $1', [value.customerId]);
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const paymentId = uuidv4();
    const now = new Date();
    const dueDate = new Date(value.dueDate);
    const status = dueDate < now ? 'overdue' : 'pending';

    await dbService.query(
      `INSERT INTO payment_records (id, customer_id, amount, currency, due_date, status, invoice_number, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        paymentId,
        value.customerId,
        value.amount,
        value.currency,
        value.dueDate,
        status,
        value.invoiceNumber,
        value.description || null,
        now,
        now,
      ]
    );

    logger.info('Payment record created', { paymentId, customerId: value.customerId, amount: value.amount });

    res.status(201).json({
      success: true,
      data: {
        id: paymentId,
        customerId: value.customerId,
        amount: value.amount,
        currency: value.currency,
        dueDate: value.dueDate,
        status,
        invoiceNumber: value.invoiceNumber,
        description: value.description,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    logger.error('Failed to create payment:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

/**
 * PUT /api/v1/payments/:id
 * Update a payment record
 */
router.put('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = updatePaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    // Check if payment exists
    const existing = await dbService.query('SELECT * FROM payment_records WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (value.amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      params.push(value.amount);
    }
    if (value.dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      params.push(value.dueDate);
    }
    if (value.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(value.status);
    }
    if (value.paidDate !== undefined) {
      updates.push(`paid_date = $${paramIndex++}`);
      params.push(value.paidDate);
    }
    if (value.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(value.description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());
    params.push(id);

    const query = `UPDATE payment_records SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await dbService.query(query, params);

    const row = result.rows[0];
    logger.info('Payment updated', { paymentId: id, status: row.status });

    res.json({
      success: true,
      data: {
        id: row.id,
        customerId: row.customer_id,
        amount: Number.parseFloat(row.amount),
        currency: row.currency,
        dueDate: row.due_date,
        paidDate: row.paid_date,
        status: row.status,
        invoiceNumber: row.invoice_number,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    logger.error('Failed to update payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

/**
 * POST /api/v1/payments/:id/mark-paid
 * Mark a payment as paid
 */
router.post('/:id/mark-paid', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paidDate, paidAmount } = req.body;

    const result = await dbService.query(
      `UPDATE payment_records 
       SET status = 'paid', paid_date = $1, updated_at = $2 
       WHERE id = $3 AND status IN ('pending', 'overdue', 'partial') 
       RETURNING *`,
      [paidDate || new Date(), new Date(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found or already paid/cancelled' });
    }

    logger.info('Payment marked as paid', { paymentId: id });

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    logger.error('Failed to mark payment as paid:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

/**
 * DELETE /api/v1/payments/:id
 * Delete a payment record
 */
router.delete('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await dbService.query('SELECT id FROM payment_records WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    await dbService.query('DELETE FROM payment_records WHERE id = $1', [id]);

    logger.info('Payment deleted', { paymentId: id });

    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

export default router;
