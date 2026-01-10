import express, { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id?: string;
      userId?: string;
      userRole?: string;
    }
  }
}

// Extend Socket.IO Socket type
interface CustomSocket extends Socket {
  userId?: string;
  userRole?: string;
}
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { logger } from '@/utils/logger';
import { asyncHandler, ValidationError, UnauthorizedError, ForbiddenError } from '@/utils/errorHandler';
import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import { MessageQueueService } from '@/core/services/messageQueue';
import { AgentCoordinator } from '@/agents/coordinator/AgentCoordinator';
import { ContextEngine } from '@/core/engines/ContextEngine';
import { CampaignManager } from '@/core/managers/CampaignManager';

export interface ApiGatewayConfig {
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  services: {
    dbService: DatabaseService;
    redisService: RedisService;
    mqService: MessageQueueService;
    agentCoordinator: AgentCoordinator;
    contextEngine: ContextEngine;
    campaignManager: CampaignManager;
  };
}

// AuthenticatedRequest removed - Request is extended globally above

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export class ApiGateway {
  private app: express.Application;
  private server: any;
  private io: SocketServer;
  private config: ApiGatewayConfig;
  
  // Service references
  private dbService: DatabaseService;
  private redisService: RedisService;
  private mqService: MessageQueueService;
  private agentCoordinator: AgentCoordinator;
  private contextEngine: ContextEngine;
  private campaignManager: CampaignManager;

  private isRunning = false;

  // Validation schemas
  private readonly schemas = {
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    }),
    
    createCampaign: Joi.object({
      name: Joi.string().min(3).max(100).required(),
      description: Joi.string().max(500),
      customerId: Joi.string().uuid().required(),
      paymentRecordId: Joi.string().uuid().required(),
      escalationTemplate: Joi.string().valid('standard_collection', 'high_value_collection', 'gentle_reminder'),
      escalationSteps: Joi.array().items(Joi.object({
        stepNumber: Joi.number().integer().min(1).required(),
        channel: Joi.string().valid('email', 'phone', 'sms').required(),
        template: Joi.string().required(),
        delayHours: Joi.number().min(0).required(),
        maxAttempts: Joi.number().integer().min(1).max(10).required(),
        conditions: Joi.array().items(Joi.object({
          type: Joi.string().required(),
          operator: Joi.string().required(),
          value: Joi.any().required()
        }))
      })),
      config: Joi.object()
    }),

    createCustomer: Joi.object({
      companyName: Joi.string().min(2).max(255).required(),
      contactName: Joi.string().min(2).max(255).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
      mobile: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
      address: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
        country: Joi.string().required()
      }),
      preferredContactMethod: Joi.string().valid('email', 'phone', 'sms').default('email'),
      tags: Joi.array().items(Joi.string())
    }),

    createPaymentRecord: Joi.object({
      customerId: Joi.string().uuid().required(),
      amount: Joi.number().positive().required(),
      currency: Joi.string().length(3).default('USD'),
      dueDate: Joi.date().required(),
      invoiceNumber: Joi.string().required(),
      description: Joi.string().max(500)
    }),

    updatePaymentStatus: Joi.object({
      status: Joi.string().valid('pending', 'paid', 'partial', 'overdue', 'cancelled').required(),
      paidDate: Joi.date(),
      paidAmount: Joi.number().positive()
    })
  };

  constructor(config: ApiGatewayConfig) {
    this.config = config;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST']
      }
    });

    // Service references
    this.dbService = config.services.dbService;
    this.redisService = config.services.redisService;
    this.mqService = config.services.mqService;
    this.agentCoordinator = config.services.agentCoordinator;
    this.contextEngine = config.services.contextEngine;
    this.campaignManager = config.services.campaignManager;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandlers();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigin,
      credentials: true
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const rateLimiter = rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.maxRequests,
      message: {
        success: false,
        error: {
          message: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      }
    });
    this.app.use('/api/', rateLimiter);

    // Request ID and logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = Math.random().toString(36).substring(7);
      res.setHeader('X-Request-ID', req.id);
      
      logger.info('API Request', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      next();
    });
  }

  private setupRoutes(): void {
    const router = express.Router();

    // Health check
    router.get('/health', this.healthCheck.bind(this));

    // Authentication routes
    router.post('/auth/login', this.validateSchema('login'), this.login.bind(this));
    router.post('/auth/logout', this.authenticate, this.logout.bind(this));
    router.get('/auth/me', this.authenticate, this.getCurrentUser.bind(this));

    // Customer management
    router.post('/customers', this.authenticate, this.requirePermission('customers:create'), 
                this.validateSchema('createCustomer'), this.createCustomer.bind(this));
    router.get('/customers', this.authenticate, this.requirePermission('customers:read'), this.getCustomers.bind(this));
    router.get('/customers/:id', this.authenticate, this.requirePermission('customers:read'), this.getCustomer.bind(this));
    router.get('/customers/:id/context', this.authenticate, this.requirePermission('customers:read'), this.getCustomerContext.bind(this));
    router.put('/customers/:id', this.authenticate, this.requirePermission('customers:update'), this.updateCustomer.bind(this));

    // Payment record management
    router.post('/payments', this.authenticate, this.requirePermission('payments:create'),
                this.validateSchema('createPaymentRecord'), this.createPaymentRecord.bind(this));
    router.get('/payments', this.authenticate, this.requirePermission('payments:read'), this.getPaymentRecords.bind(this));
    router.get('/payments/:id', this.authenticate, this.requirePermission('payments:read'), this.getPaymentRecord.bind(this));
    router.put('/payments/:id/status', this.authenticate, this.requirePermission('payments:update'),
                this.validateSchema('updatePaymentStatus'), this.updatePaymentStatus.bind(this));

    // Campaign management
    router.post('/campaigns', this.authenticate, this.requirePermission('campaigns:create'),
                this.validateSchema('createCampaign'), this.createCampaign.bind(this));
    router.get('/campaigns', this.authenticate, this.requirePermission('campaigns:read'), this.getCampaigns.bind(this));
    router.get('/campaigns/:id', this.authenticate, this.requirePermission('campaigns:read'), this.getCampaign.bind(this));
    router.put('/campaigns/:id/pause', this.authenticate, this.requirePermission('campaigns:update'), this.pauseCampaign.bind(this));
    router.put('/campaigns/:id/resume', this.authenticate, this.requirePermission('campaigns:update'), this.resumeCampaign.bind(this));
    router.delete('/campaigns/:id', this.authenticate, this.requirePermission('campaigns:delete'), this.deleteCampaign.bind(this));

    // Agent management
    router.get('/agents', this.authenticate, this.requirePermission('agents:read'), this.getAgents.bind(this));
    router.get('/agents/:id', this.authenticate, this.requirePermission('agents:read'), this.getAgent.bind(this));
    router.get('/agents/:id/metrics', this.authenticate, this.requirePermission('agents:read'), this.getAgentMetrics.bind(this));

    // Task management  
    router.get('/tasks', this.authenticate, this.requirePermission('tasks:read'), this.getTasks.bind(this));
    router.get('/tasks/:id', this.authenticate, this.requirePermission('tasks:read'), this.getTask.bind(this));

    // Analytics and reporting
    router.get('/analytics/dashboard', this.authenticate, this.requirePermission('analytics:read'), this.getDashboardData.bind(this));
    router.get('/analytics/campaigns/:id', this.authenticate, this.requirePermission('analytics:read'), this.getCampaignAnalytics.bind(this));
    router.get('/analytics/performance', this.authenticate, this.requirePermission('analytics:read'), this.getPerformanceMetrics.bind(this));

    // System management
    router.get('/system/status', this.authenticate, this.requirePermission('system:read'), this.getSystemStatus.bind(this));
    router.get('/system/metrics', this.authenticate, this.requirePermission('system:read'), this.getSystemMetrics.bind(this));

    this.app.use('/api/v1', router);
  }

  private setupWebSocket(): void {
    this.io.use(async (socket: CustomSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('No token provided'));
        }

        const decoded = jwt.verify(token, this.config.jwtSecret) as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: CustomSocket) => {
      logger.info('WebSocket connection established', {
        socketId: socket.id,
        userId: socket.userId
      });

      // Subscribe to user-specific updates
      socket.join(`user:${socket.userId}`);
      socket.join(`role:${socket.userRole}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info('WebSocket connection closed', {
          socketId: socket.id,
          userId: socket.userId
        });
      });

      // Handle real-time subscriptions
      socket.on('subscribe:campaigns', (data: any) => {
        if (data.campaignIds && Array.isArray(data.campaignIds)) {
          data.campaignIds.forEach((id: any) => socket.join(`campaign:${id}`));
        }
      });

      socket.on('subscribe:agents', () => {
        socket.join('agents');
      });

      socket.on('subscribe:tasks', () => {
        socket.join('tasks');
      });
    });
  }

  private setupErrorHandlers(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      this.sendError(res, 'Route not found', 'ROUTE_NOT_FOUND', 404);
    });

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      logger.error('API Error', {
        requestId: req.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error.stack,
        url: req.url,
        method: req.method
      });

      if (error instanceof ValidationError) {
        return this.sendError(res, error instanceof Error ? error.message : String(error), 'VALIDATION_ERROR', 400, error);
      }

      if (error instanceof UnauthorizedError) {
        return this.sendError(res, error instanceof Error ? error.message : String(error), 'UNAUTHORIZED', 401);
      }

      if (error instanceof ForbiddenError) {
        return this.sendError(res, error instanceof Error ? error.message : String(error), 'FORBIDDEN', 403);
      }

      this.sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    });
  }

  // Middleware functions
  private validateSchema(schemaName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const schema = this.schemas[schemaName];
      if (!schema) {
        return next(new ValidationError('Invalid schema'));
      }

      const { error, value } = schema.validate(req.body);
      if (error) {
        return next(new ValidationError(error.details[0].message));
      }

      req.body = value;
      next();
    };
  }

  private authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        throw new UnauthorizedError('Access token required');
      }

      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      
      // Get user from database
      const result = await this.dbService.query(
        'SELECT id, email, role, permissions FROM users WHERE id = $1 AND active = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedError('User not found or inactive');
      }

      req.user = result.rows[0];
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        next(new UnauthorizedError('Invalid token'));
      } else {
        next(error);
      }
    }
  };

  private requirePermission(permission: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      if (req.user.role === 'admin' || req.user.permissions.includes(permission)) {
        return next();
      }

      next(new ForbiddenError('Insufficient permissions'));
    };
  }

  // Route handlers
  private healthCheck = asyncHandler(async (req: Request, res: Response) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: await this.dbService.healthCheck(),
        redis: await this.redisService.healthCheck(),
        messageQueue: await this.mqService.healthCheck()
      }
    };

    const statusCode = Object.values(health.services).every(s => s) ? 200 : 503;
    this.sendResponse(res, health, statusCode);
  });

  private login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Get user from database
    const result = await this.dbService.query(
      'SELECT id, email, password_hash, role, permissions FROM users WHERE email = $1 AND active = true',
      [email]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      this.config.jwtSecret,
      { expiresIn: '24h' }
    );

    // Store session in Redis
    await this.redisService.setJson(`session:${user.id}`, {
      userId: user.id,
      email: user.email,
      role: user.role,
      loginAt: new Date()
    }, 24 * 60 * 60); // 24 hours

    this.sendResponse(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  });

  private logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user) {
      await this.redisService.del(`session:${req.user.id}`);
    }
    
    this.sendResponse(res, { message: 'Logged out successfully' });
  });

  private getCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.sendResponse(res, req.user);
  });

  private createCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerData = req.body;
    const customerId = await this.generateUuid();

    await this.dbService.query(
      `INSERT INTO customers (id, company_name, contact_name, email, phone, mobile, address, 
       preferred_contact_method, profile, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        customerId,
        customerData.companyName,
        customerData.contactName,
        customerData.email,
        customerData.phone,
        customerData.mobile,
        JSON.stringify(customerData.address),
        customerData.preferredContactMethod,
        JSON.stringify({}),
        customerData.tags || []
      ]
    );

    const customer = await this.getCustomerById(customerId);
    this.sendResponse(res, customer, 201);
  });

  private getCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM customers';
    let countQuery = 'SELECT COUNT(*) FROM customers';
    const params: any[] = [];

    if (search) {
      query += ' WHERE company_name ILIKE $1 OR contact_name ILIKE $1 OR email ILIKE $1';
      countQuery += ' WHERE company_name ILIKE $1 OR contact_name ILIKE $1 OR email ILIKE $1';
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [customers, countResult] = await Promise.all([
      this.dbService.query(query, params),
      this.dbService.query(countQuery, params.slice(0, -2))
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    this.sendResponse(res, {
      customers: customers.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  });

  private getCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customer = await this.getCustomerById(req.params.id);
    if (!customer) {
      return this.sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    this.sendResponse(res, customer);
  });

  private getCustomerContext = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const context = await this.contextEngine.getCustomerContext(req.params.id);
    if (!context) {
      return this.sendError(res, 'Customer context not found', 'CONTEXT_NOT_FOUND', 404);
    }

    this.sendResponse(res, context);
  });

  private updateCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerId = req.params.id;
    const updates = req.body;

    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      switch (key) {
        case 'companyName':
          updateFields.push(`company_name = $${paramIndex++}`);
          values.push(value);
          break;
        case 'contactName':
          updateFields.push(`contact_name = $${paramIndex++}`);
          values.push(value);
          break;
        case 'email':
          updateFields.push(`email = $${paramIndex++}`);
          values.push(value);
          break;
        case 'phone':
          updateFields.push(`phone = $${paramIndex++}`);
          values.push(value);
          break;
        case 'mobile':
          updateFields.push(`mobile = $${paramIndex++}`);
          values.push(value);
          break;
        case 'address':
          updateFields.push(`address = $${paramIndex++}`);
          values.push(JSON.stringify(value));
          break;
        case 'preferredContactMethod':
          updateFields.push(`preferred_contact_method = $${paramIndex++}`);
          values.push(value);
          break;
        case 'tags':
          updateFields.push(`tags = $${paramIndex++}`);
          values.push(value);
          break;
      }
    }

    if (updateFields.length === 0) {
      return this.sendError(res, 'No valid fields to update', 'NO_FIELDS', 400);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(customerId);

    await this.dbService.query(
      `UPDATE customers SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Invalidate customer context cache
    await this.contextEngine.invalidateCustomerContext(customerId);

    const updatedCustomer = await this.getCustomerById(customerId);
    this.sendResponse(res, updatedCustomer);
  });

  private createPaymentRecord = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paymentData = req.body;
    const paymentId = await this.generateUuid();

    await this.dbService.query(
      `INSERT INTO payment_records (id, customer_id, amount, currency, due_date, invoice_number, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        paymentId,
        paymentData.customerId,
        paymentData.amount,
        paymentData.currency,
        paymentData.dueDate,
        paymentData.invoiceNumber,
        paymentData.description,
        'pending'
      ]
    );

    const paymentRecord = await this.getPaymentRecordById(paymentId);
    this.sendResponse(res, paymentRecord, 201);
  });

  private getPaymentRecords = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const customerId = req.query.customerId as string;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    let query = `SELECT pr.*, c.company_name, c.contact_name 
                 FROM payment_records pr 
                 JOIN customers c ON pr.customer_id = c.id`;
    let countQuery = 'SELECT COUNT(*) FROM payment_records pr';
    const params: any[] = [];
    const whereConditions: string[] = [];

    if (customerId) {
      whereConditions.push(`pr.customer_id = $${params.length + 1}`);
      params.push(customerId);
    }

    if (status) {
      whereConditions.push(`pr.status = $${params.length + 1}`);
      params.push(status);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ` ORDER BY pr.due_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [records, countResult] = await Promise.all([
      this.dbService.query(query, params),
      this.dbService.query(countQuery, params.slice(0, -2))
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    this.sendResponse(res, {
      records: records.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  });

  private getPaymentRecord = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const record = await this.getPaymentRecordById(req.params.id);
    if (!record) {
      return this.sendError(res, 'Payment record not found', 'PAYMENT_NOT_FOUND', 404);
    }

    this.sendResponse(res, record);
  });

  private updatePaymentStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, paidDate, paidAmount } = req.body;
    const paymentId = req.params.id;

    await this.dbService.query(
      'UPDATE payment_records SET status = $1, paid_date = $2, updated_at = $3 WHERE id = $4',
      [status, paidDate, new Date(), paymentId]
    );

    // If payment is marked as paid, complete any related campaigns
    if (status === 'paid') {
      await this.mqService.publishNotification({
        type: 'payment_received',
        paymentRecordId: paymentId,
        amount: paidAmount,
        timestamp: new Date()
      });
    }

    const updatedRecord = await this.getPaymentRecordById(paymentId);
    this.sendResponse(res, updatedRecord);
  });

  private createCampaign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const campaignData = req.body;
    
    // Use default escalation steps if template is specified
    if (campaignData.escalationTemplate && !campaignData.escalationSteps) {
      campaignData.escalationSteps = this.getDefaultEscalationSteps(campaignData.escalationTemplate);
    }

    const campaignId = await this.campaignManager.createCampaign({
      name: campaignData.name,
      description: campaignData.description,
      customerId: campaignData.customerId,
      paymentRecordId: campaignData.paymentRecordId,
      escalationSteps: campaignData.escalationSteps,
      config: campaignData.config
    });

    const campaign = await this.campaignManager.getCampaignStatus(campaignId);
    
    // Emit real-time update
    this.io.to(`user:${req.user!.id}`).emit('campaign:created', campaign);

    this.sendResponse(res, campaign, 201);
  });

  private getCampaigns = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const campaigns = await this.campaignManager.getActiveCampaigns();
    this.sendResponse(res, campaigns);
  });

  private getCampaign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const campaign = await this.campaignManager.getCampaignStatus(req.params.id);
    if (!campaign.campaign) {
      return this.sendError(res, 'Campaign not found', 'CAMPAIGN_NOT_FOUND', 404);
    }

    this.sendResponse(res, campaign);
  });

  private pauseCampaign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const pauseUntil = req.body.pauseUntil ? new Date(req.body.pauseUntil) : undefined;
    
    await this.campaignManager.pauseCampaign(req.params.id, pauseUntil);
    
    const campaign = await this.campaignManager.getCampaignStatus(req.params.id);
    
    // Emit real-time update
    this.io.to(`campaign:${req.params.id}`).emit('campaign:paused', campaign);
    
    this.sendResponse(res, campaign);
  });

  private resumeCampaign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await this.campaignManager.resumeCampaign(req.params.id);
    
    const campaign = await this.campaignManager.getCampaignStatus(req.params.id);
    
    // Emit real-time update
    this.io.to(`campaign:${req.params.id}`).emit('campaign:resumed', campaign);
    
    this.sendResponse(res, campaign);
  });

  private deleteCampaign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await this.campaignManager.completeCampaign(req.params.id, 'Deleted by user');
    
    // Emit real-time update
    this.io.to(`campaign:${req.params.id}`).emit('campaign:deleted', { campaignId: req.params.id });
    
    this.sendResponse(res, { message: 'Campaign deleted successfully' });
  });

  private getAgents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = await this.agentCoordinator.getCoordinatorStatus();
    this.sendResponse(res, status.agents);
  });

  private getAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = await this.agentCoordinator.getCoordinatorStatus();
    const agent = status.agents.find((a: any) => a.id === req.params.id);
    
    if (!agent) {
      return this.sendError(res, 'Agent not found', 'AGENT_NOT_FOUND', 404);
    }

    this.sendResponse(res, agent);
  });

  private getAgentMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would fetch detailed metrics for a specific agent
    // Implementation depends on agent-specific metrics storage
    this.sendResponse(res, { message: 'Agent metrics endpoint - implementation pending' });
  });

  private getTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const campaignId = req.query.campaignId as string;
    const offset = (page - 1) * limit;

    let query = `SELECT t.*, c.company_name, c.contact_name 
                 FROM tasks t 
                 JOIN customers c ON t.customer_id = c.id`;
    let countQuery = 'SELECT COUNT(*) FROM tasks t';
    const params: any[] = [];
    const whereConditions: string[] = [];

    if (status) {
      whereConditions.push(`t.status = $${params.length + 1}`);
      params.push(status);
    }

    if (campaignId) {
      whereConditions.push(`t.campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [tasks, countResult] = await Promise.all([
      this.dbService.query(query, params),
      this.dbService.query(countQuery, params.slice(0, -2))
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    this.sendResponse(res, {
      tasks: tasks.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  });

  private getTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.dbService.query(
      'SELECT * FROM tasks WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return this.sendError(res, 'Task not found', 'TASK_NOT_FOUND', 404);
    }

    this.sendResponse(res, result.rows[0]);
  });

  private getDashboardData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Aggregate dashboard data
    const [
      totalCustomers,
      totalPayments,
      activeCampaigns,
      systemMetrics
    ] = await Promise.all([
      this.dbService.query('SELECT COUNT(*) FROM customers'),
      this.dbService.query('SELECT COUNT(*), SUM(amount) FROM payment_records WHERE status = \'pending\''),
      this.campaignManager.getActiveCampaigns(),
      this.agentCoordinator.getCoordinatorStatus()
    ]);

    const dashboard = {
      customers: {
        total: parseInt(totalCustomers.rows[0].count)
      },
      payments: {
        pending: parseInt(totalPayments.rows[0].count),
        pendingAmount: parseFloat(totalPayments.rows[0].sum || '0')
      },
      campaigns: {
        active: activeCampaigns.filter((c: any) => c.status === 'running').length,
        paused: activeCampaigns.filter((c: any) => c.status === 'paused').length
      },
      agents: {
        total: systemMetrics.agentCount,
        active: systemMetrics.agents.filter((a: any) => a.status === 'active').length
      },
      tasks: {
        queue: systemMetrics.queueSize
      }
    };

    this.sendResponse(res, dashboard);
  });

  private getCampaignAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Campaign-specific analytics
    this.sendResponse(res, { message: 'Campaign analytics endpoint - implementation pending' });
  });

  private getPerformanceMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const metrics = await this.campaignManager.getManagerMetrics();
    this.sendResponse(res, metrics);
  });

  private getSystemStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = {
      apiGateway: { status: 'running', uptime: process.uptime() },
      agentCoordinator: await this.agentCoordinator.getCoordinatorStatus(),
      campaignManager: await this.campaignManager.getManagerMetrics(),
      contextEngine: await this.contextEngine.getContextStats(),
      services: {
        database: await this.dbService.healthCheck(),
        redis: await this.redisService.healthCheck(),
        messageQueue: await this.mqService.healthCheck()
      }
    };

    this.sendResponse(res, status);
  });

  private getSystemMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const metrics = {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      timestamp: new Date()
    };

    this.sendResponse(res, metrics);
  });

  // Helper methods
  private sendResponse<T>(res: Response, data: T, statusCode: number = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.getHeader('X-Request-ID') as string,
        version: 'v1'
      }
    };

    res.status(statusCode).json(response);
  }

  private sendError(res: Response, message: string, code: string, statusCode: number = 400, details?: any): void {
    const response: ApiResponse = {
      success: false,
      error: {
        message,
        code,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.getHeader('X-Request-ID') as string,
        version: 'v1'
      }
    };

    res.status(statusCode).json(response);
  }

  private async generateUuid(): Promise<string> {
    const { v4: uuidv4 } = await import('uuid');
    return uuidv4();
  }

  private async getCustomerById(customerId: string): Promise<any> {
    const result = await this.dbService.query(
      'SELECT * FROM customers WHERE id = $1',
      [customerId]
    );

    return result.rows[0] || null;
  }

  private async getPaymentRecordById(paymentId: string): Promise<any> {
    const result = await this.dbService.query(
      `SELECT pr.*, c.company_name, c.contact_name 
       FROM payment_records pr 
       JOIN customers c ON pr.customer_id = c.id 
       WHERE pr.id = $1`,
      [paymentId]
    );

    return result.rows[0] || null;
  }

  private getDefaultEscalationSteps(template: string): any[] {
    return this.campaignManager['DEFAULT_ESCALATION_STEPS'][template] || 
           this.campaignManager['DEFAULT_ESCALATION_STEPS']['standard_collection'];
  }

  // Public methods
  async start(): Promise<void> {
    try {
      this.server.listen(this.config.port, () => {
        logger.info(`API Gateway started on port ${this.config.port}`, {
          environment: process.env.NODE_ENV || 'development',
          version: 'v1'
        });
      });

      this.isRunning = true;
    } catch (error) {
      logger.error('Failed to start API Gateway:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.isRunning = false;
      
      if (this.server) {
        this.server.close();
      }

      logger.info('API Gateway shut down successfully');
    } catch (error) {
      logger.error('Error shutting down API Gateway:', error);
    }
  }

  getServer() {
    return this.server;
  }

  getSocketServer() {
    return this.io;
  }
}