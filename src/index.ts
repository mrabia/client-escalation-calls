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

// Load environment variables
dotenv.config();

class Application {
  private app: express.Application;
  private server: any;
  private io: SocketServer;
  private agentCoordinator: AgentCoordinator;
  private dbService: DatabaseService;
  private redisService: RedisService;
  private mqService: MessageQueueService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    this.initializeServices();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize core services
      this.dbService = new DatabaseService();
      await this.dbService.initialize();

      this.redisService = new RedisService();
      await this.redisService.initialize();

      this.mqService = new MessageQueueService();
      await this.mqService.initialize();

      // Initialize agent coordinator
      this.agentCoordinator = new AgentCoordinator({
        dbService: this.dbService,
        redisService: this.redisService,
        mqService: this.mqService,
        io: this.io
      });

      await this.agentCoordinator.initialize();

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      process.exit(1);
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

    // API routes placeholder
    this.app.use('/api/v1', (req, res) => {
      res.status(200).json({
        message: 'Client Escalation Calls API v1',
        version: '1.0.0',
        documentation: '/api/v1/docs'
      });
    });

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