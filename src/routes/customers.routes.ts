/**
 * Customer Routes
 * CRUD operations for customer management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireAgent } from '../middleware/auth';
import { DatabaseService } from '../core/services/database';
import { logger } from '../utils/logger';
import { ContactMethod, RiskLevel } from '../types';

const router = Router();
const dbService = new DatabaseService();

/**
 * Validation schemas
 */
const createCustomerSchema = Joi.object({
  companyName: Joi.string().required().max(255),
  contactName: Joi.string().required().max(255),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  mobile: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
  }).optional(),
  preferredContactMethod: Joi.string().valid('email', 'phone', 'sms').default('email'),
  tags: Joi.array().items(Joi.string()).optional(),
});

const updateCustomerSchema = Joi.object({
  companyName: Joi.string().max(255).optional(),
  contactName: Joi.string().max(255).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('').optional(),
  mobile: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('').optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
  }).optional(),
  preferredContactMethod: Joi.string().valid('email', 'phone', 'sms').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional(),
  riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  sortBy: Joi.string().valid('companyName', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * GET /api/v1/customers
 * List all customers with pagination and filtering
 */
router.get('/', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    const { page, limit, search, riskLevel, sortBy, sortOrder } = value;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, cp.risk_level, cp.payment_behavior, cp.response_rate
      FROM customers c
      LEFT JOIN customer_profiles cp ON c.id = cp.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (c.company_name ILIKE $${paramIndex} OR c.contact_name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (riskLevel) {
      query += ` AND cp.risk_level = $${paramIndex}`;
      params.push(riskLevel);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await dbService.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Add sorting and pagination
    const sortColumn = sortBy === 'companyName' ? 'c.company_name' : `c.${sortBy === 'createdAt' ? 'created_at' : 'updated_at'}`;
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await dbService.query(query, params);

    const customers = result.rows.map((row: any) => ({
      id: row.id,
      companyName: row.company_name,
      contactName: row.contact_name,
      email: row.email,
      phone: row.phone,
      mobile: row.mobile,
      address: row.address,
      preferredContactMethod: row.preferred_contact_method,
      tags: row.tags || [],
      riskLevel: row.risk_level,
      responseRate: row.response_rate,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    logger.error('Failed to list customers:', error);
    res.status(500).json({ error: 'Failed to list customers' });
  }
});

/**
 * GET /api/v1/customers/:id
 * Get a single customer by ID
 */
router.get('/:id', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `SELECT c.*, cp.risk_level, cp.payment_behavior, cp.response_rate, cp.average_payment_delay, cp.notes
       FROM customers c
       LEFT JOIN customer_profiles cp ON c.id = cp.customer_id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const row = result.rows[0];
    const customer = {
      id: row.id,
      companyName: row.company_name,
      contactName: row.contact_name,
      email: row.email,
      phone: row.phone,
      mobile: row.mobile,
      address: row.address,
      preferredContactMethod: row.preferred_contact_method,
      tags: row.tags || [],
      profile: {
        riskLevel: row.risk_level,
        paymentBehavior: row.payment_behavior,
        responseRate: row.response_rate,
        averagePaymentDelay: row.average_payment_delay,
        notes: row.notes || [],
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ success: true, data: customer });
  } catch (error: any) {
    logger.error('Failed to get customer:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

/**
 * POST /api/v1/customers
 * Create a new customer
 */
router.post('/', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { error, value } = createCustomerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    const customerId = uuidv4();
    const now = new Date();

    // Insert customer
    await dbService.query(
      `INSERT INTO customers (id, company_name, contact_name, email, phone, mobile, address, preferred_contact_method, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        customerId,
        value.companyName,
        value.contactName,
        value.email,
        value.phone || null,
        value.mobile || null,
        value.address ? JSON.stringify(value.address) : null,
        value.preferredContactMethod,
        value.tags || [],
        now,
        now,
      ]
    );

    // Create default profile
    await dbService.query(
      `INSERT INTO customer_profiles (id, customer_id, risk_level, response_rate, average_payment_delay, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), customerId, 'medium', 0, 0, now, now]
    );

    logger.info('Customer created', { customerId, companyName: value.companyName });

    res.status(201).json({
      success: true,
      data: {
        id: customerId,
        ...value,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    logger.error('Failed to create customer:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Customer with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

/**
 * PUT /api/v1/customers/:id
 * Update a customer
 */
router.put('/:id', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error, value } = updateCustomerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details[0].message });
    }

    // Check if customer exists
    const existing = await dbService.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (value.companyName !== undefined) {
      updates.push(`company_name = $${paramIndex++}`);
      params.push(value.companyName);
    }
    if (value.contactName !== undefined) {
      updates.push(`contact_name = $${paramIndex++}`);
      params.push(value.contactName);
    }
    if (value.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(value.email);
    }
    if (value.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(value.phone || null);
    }
    if (value.mobile !== undefined) {
      updates.push(`mobile = $${paramIndex++}`);
      params.push(value.mobile || null);
    }
    if (value.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      params.push(JSON.stringify(value.address));
    }
    if (value.preferredContactMethod !== undefined) {
      updates.push(`preferred_contact_method = $${paramIndex++}`);
      params.push(value.preferredContactMethod);
    }
    if (value.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(value.tags);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());
    params.push(id);

    const query = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await dbService.query(query, params);

    const row = result.rows[0];
    logger.info('Customer updated', { customerId: id });

    res.json({
      success: true,
      data: {
        id: row.id,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        mobile: row.mobile,
        address: row.address,
        preferredContactMethod: row.preferred_contact_method,
        tags: row.tags || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    logger.error('Failed to update customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

/**
 * DELETE /api/v1/customers/:id
 * Delete a customer
 */
router.delete('/:id', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const existing = await dbService.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Delete customer (cascades to profiles, payments, etc. if configured)
    await dbService.query('DELETE FROM customers WHERE id = $1', [id]);

    logger.info('Customer deleted', { customerId: id });

    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

/**
 * GET /api/v1/customers/:id/payments
 * Get payment records for a customer
 */
router.get('/:id/payments', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `SELECT * FROM payment_records WHERE customer_id = $1 ORDER BY due_date DESC`,
      [id]
    );

    const payments = result.rows.map((row: any) => ({
      id: row.id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      dueDate: row.due_date,
      paidDate: row.paid_date,
      status: row.status,
      invoiceNumber: row.invoice_number,
      description: row.description,
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: payments });
  } catch (error: any) {
    logger.error('Failed to get customer payments:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

/**
 * GET /api/v1/customers/:id/campaigns
 * Get campaigns for a customer
 */
router.get('/:id/campaigns', authenticate, requireAgent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbService.query(
      `SELECT * FROM campaigns WHERE customer_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const campaigns = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      currentStep: row.current_step,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    logger.error('Failed to get customer campaigns:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

export default router;
