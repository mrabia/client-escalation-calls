/**
 * Routes Index
 * Aggregates all API routes and exports a single router
 */

import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customers.routes';
import campaignRoutes from './campaigns.routes';
import taskRoutes from './tasks.routes';
import agentRoutes from './agents.routes';
import paymentRoutes from './payments.routes';
import twilioRoutes from './twilio.routes';
import { DatabaseService } from '../core/services/database';
import { RedisService } from '../core/services/redis';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();
const redisService = new RedisService();

/**
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'unknown',
        redis: 'unknown',
      },
    };

    // Check database
    try {
      await dbService.query('SELECT 1');
      healthStatus.services.database = 'healthy';
    } catch {
      healthStatus.services.database = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    // Check Redis
    try {
      const isHealthy = await redisService.healthCheck();
      healthStatus.services.redis = isHealthy ? 'healthy' : 'unhealthy';
      if (!isHealthy) healthStatus.status = 'degraded';
    } catch {
      healthStatus.services.redis = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error: any) {
    logger.error('Health check failed:', error);
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

/**
 * API info endpoint
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Client Escalation Calls API',
    version: '1.0.0',
    description: 'Agentic AI Payment Collection System',
    endpoints: {
      auth: '/api/v1/auth',
      customers: '/api/v1/customers',
      campaigns: '/api/v1/campaigns',
      tasks: '/api/v1/tasks',
      agents: '/api/v1/agents',
      payments: '/api/v1/payments',
      health: '/api/v1/health',
    },
    documentation: '/api/v1/docs',
  });
});

/**
 * Dashboard stats endpoint
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get various counts
    const [customers, campaigns, tasks, agents, payments] = await Promise.all([
      dbService.query('SELECT COUNT(*) FROM customers'),
      dbService.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM campaigns`),
      dbService.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'pending') as pending, COUNT(*) FILTER (WHERE status = 'completed') as completed FROM tasks`),
      dbService.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM agents`),
      dbService.query(`SELECT COUNT(*) as total, SUM(amount) FILTER (WHERE status = 'overdue') as overdue_amount, COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count FROM payment_records`),
    ]);

    res.json({
      success: true,
      data: {
        customers: {
          total: Number.parseInt(customers.rows[0].count, 10),
        },
        campaigns: {
          total: Number.parseInt(campaigns.rows[0].total, 10),
          active: Number.parseInt(campaigns.rows[0].active, 10),
        },
        tasks: {
          total: Number.parseInt(tasks.rows[0].total, 10),
          pending: Number.parseInt(tasks.rows[0].pending, 10),
          completed: Number.parseInt(tasks.rows[0].completed, 10),
        },
        agents: {
          total: Number.parseInt(agents.rows[0].total, 10),
          active: Number.parseInt(agents.rows[0].active, 10),
        },
        payments: {
          total: Number.parseInt(payments.rows[0].total, 10),
          overdueCount: Number.parseInt(payments.rows[0].overdue_count || '0', 10),
          overdueAmount: Number.parseFloat(payments.rows[0].overdue_amount || '0'),
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Mount route handlers
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/tasks', taskRoutes);
router.use('/agents', agentRoutes);
router.use('/payments', paymentRoutes);
router.use('/twilio', twilioRoutes);

export default router;
