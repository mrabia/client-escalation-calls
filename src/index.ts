import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { logger } from './utils/logger';
import { errorHandler } from './utils/errorHandler';
import { DatabaseService } from './core/services/database';
import { RedisService } from './core/services/redis';
import { MessageQueueService } from './core/services/messageQueue';
import { AgentCoordinator } from './agents/coordinator/AgentCoordinator';
import { getMemorySystem } from './services/memory';
import { config } from './config';
import apiRoutes from './routes';

// Load environment variables
dotenv.config();

class Application {
  private app: express.Application;
  private server: any;
  private io: SocketServer;
  private agentCoordinator!: AgentCoordinator;
  private dbService!: DatabaseService;
  private redisService!: RedisService;
  private mqService!: MessageQueueService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    // Synchronous initialization only in constructor
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  public async initialize(): Promise<void> {
    // Async initialization moved out of constructor
    await this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize core services with graceful fallback
      this.dbService = new DatabaseService();
      this.redisService = new RedisService();
      this.mqService = new MessageQueueService();

      // Try to initialize database (optional in dev mode)
      if (process.env.DATABASE_URL) {
        try {
          await this.dbService.initialize();
          logger.info('Database service initialized');
        } catch (dbError) {
          logger.warn('Database not available - running without database', { error: dbError instanceof Error ? dbError.message : String(dbError) });
        }
      } else {
        logger.info('DATABASE_URL not set - skipping database initialization');
      }

      // Try to initialize Redis (optional in dev mode)
      if (process.env.REDIS_URL) {
        try {
          await this.redisService.initialize();
          logger.info('Redis service initialized');
        } catch (redisError) {
          logger.warn('Redis not available - running without Redis', { error: redisError instanceof Error ? redisError.message : String(redisError) });
        }
      } else {
        logger.info('REDIS_URL not set - skipping Redis initialization');
      }

      // Try to initialize message queue (optional in dev mode)
      if (process.env.RABBITMQ_URL) {
        try {
          await this.mqService.initialize();
          logger.info('Message queue service initialized');
        } catch (mqError) {
          logger.warn('Message queue not available - running without MQ', { error: mqError instanceof Error ? mqError.message : String(mqError) });
        }
      } else {
        logger.info('RABBITMQ_URL not set - skipping message queue initialization');
      }

      // Initialize memory system (if enabled)
      if (config.features.vectorMemory) {
        try {
          const memorySystem = getMemorySystem();
          await memorySystem.initialize();
          logger.info('Memory system initialized');
        } catch (memoryError) {
          logger.warn('Memory system not available - running without memory', { 
            error: memoryError instanceof Error ? memoryError.message : String(memoryError) 
          });
        }
      } else {
        logger.info('Vector memory feature disabled - skipping memory system initialization');
      }

      // Initialize agent coordinator
      this.agentCoordinator = new AgentCoordinator({
        dbService: this.dbService,
        redisService: this.redisService,
        mqService: this.mqService,
        io: this.io
      });

      try {
        await this.agentCoordinator.initialize();
        logger.info('Agent coordinator initialized');
      } catch (coordError) {
        logger.warn('Agent coordinator initialization failed', { error: coordError instanceof Error ? coordError.message : String(coordError) });
      }

      logger.info('Services initialization complete');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      // In development, continue anyway
      if (process.env.NODE_ENV !== 'development') {
        process.exit(1);
      }
      logger.warn('Continuing in development mode with limited functionality');
    }
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // API routes
    this.app.use('/api/v1', apiRoutes);

    // Socket.IO connection handling
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });

      // Agent status updates
      socket.on('agent:status', (data) => {
        this.agentCoordinator.handleAgentStatusUpdate(socket.id, data);
      });

      // Task updates
      socket.on('task:update', (data) => {
        this.agentCoordinator.handleTaskUpdate(socket.id, data);
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Global error handler
    this.app.use(errorHandler);

    // Process error handlers
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, starting graceful shutdown');
      this.gracefulShutdown();
    });
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      logger.info('Starting graceful shutdown...');

      // Stop accepting new connections
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // Shutdown agent coordinator
      if (this.agentCoordinator) {
        await this.agentCoordinator.shutdown();
      }

      // Close database connections
      if (this.dbService) {
        await this.dbService.close();
      }

      if (this.redisService) {
        await this.redisService.close();
      }

      if (this.mqService) {
        await this.mqService.close();
      }

      // Shutdown memory system
      try {
        const memorySystem = getMemorySystem();
        if (memorySystem.isInitialized()) {
          await memorySystem.shutdown();
        }
      } catch {
        // Memory system may not be initialized
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    const port = process.env.PORT || 3000;
    
    this.server.listen(port, () => {
      logger.info(`🚀 Client Escalation Calls API started on port ${port}`);
      logger.info(`📊 Health check available at http://localhost:${port}/health`);
      logger.info(`🔌 WebSocket server running on ws://localhost:${port}`);
      logger.info(`🏗️  Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
}

// Start the application
async function bootstrap() {
  try {
    const app = new Application();
    await app.initialize();
    await app.start();
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Only start if this file is run directly
if (require.main === module) {
  bootstrap();
}

export default Application;
