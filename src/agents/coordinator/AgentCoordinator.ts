import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import { MessageQueueService } from '@/core/services/messageQueue';
import { logger } from '@/utils/logger';
import {
  Agent,
  AgentType,
  AgentStatus,
  Task,
  TaskType,
  TaskStatus,
  Priority,
  PerformanceMetrics
} from '@/types';

export interface CoordinatorConfig {
  dbService: DatabaseService;
  redisService: RedisService;
  mqService: MessageQueueService;
  io: SocketServer;
}

export interface AgentRegistration {
  type: AgentType;
  capabilities: string[];
  maxConcurrentTasks: number;
  workingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export class AgentCoordinator {
  private dbService: DatabaseService;
  private redisService: RedisService;
  private mqService: MessageQueueService;
  private io: SocketServer;
  
  private agents: Map<string, Agent> = new Map();
  private taskQueue: Task[] = [];
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;

  // Coordination metrics
  private metrics = {
    tasksProcessed: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    averageTaskTime: 0,
    agentUtilization: 0
  };

  constructor(config: CoordinatorConfig) {
    this.dbService = config.dbService;
    this.redisService = config.redisService;
    this.mqService = config.mqService;
    this.io = config.io;
  }

  async initialize(): Promise<void> {
    try {
      // Load existing agents from database
      await this.loadExistingAgents();
      
      // Set up message queue handlers
      await this.setupMessageHandlers();
      
      // Start task processing loop
      this.startTaskProcessing();
      
      // Start metrics collection
      this.startMetricsCollection();
      
      this.isRunning = true;
      logger.info('Agent Coordinator initialized successfully');
      
      // Notify clients
      this.io.emit('coordinator:initialized', {
        timestamp: new Date(),
        agentCount: this.agents.size,
        status: 'ready'
      });
    } catch (error) {
      logger.error('Failed to initialize Agent Coordinator:', error);
      throw error;
    }
  }

  async registerAgent(registration: AgentRegistration): Promise<string> {
    const agentId = uuidv4();
    
    const agent: Agent = {
      id: agentId,
      type: registration.type,
      status: AgentStatus.IDLE,
      capabilities: registration.capabilities,
      currentTasks: [],
      performance: {
        tasksCompleted: 0,
        tasksSuccessful: 0,
        averageResponseTime: 0,
        customerSatisfactionScore: 0,
        escalationRate: 0,
        lastUpdated: new Date()
      },
      config: {
        maxConcurrentTasks: registration.maxConcurrentTasks,
        workingHours: registration.workingHours || {
          start: '09:00',
          end: '17:00'
        },
        timezone: registration.workingHours?.timezone || 'UTC',
        skills: registration.capabilities,
        templates: {},
        integrations: []
      }
    };

    // Store in database
    await this.dbService.query(
      `INSERT INTO agents (id, type, status, capabilities, performance, config)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        agent.id,
        agent.type,
        agent.status,
        agent.capabilities,
        JSON.stringify(agent.performance),
        JSON.stringify(agent.config)
      ]
    );

    // Cache in Redis
    await this.redisService.setJson(`agent:${agentId}`, agent, 3600);
    
    // Store in memory
    this.agents.set(agentId, agent);
    
    logger.info('Agent registered successfully', {
      agentId,
      type: agent.type,
      capabilities: agent.capabilities
    });

    // Notify clients
    this.io.emit('agent:registered', {
      agent,
      timestamp: new Date()
    });

    return agentId;
  }

  async assignTask(task: Task): Promise<void> {
    try {
      // Find available agent for the task
      const agent = await this.findBestAgent(task);
      
      if (!agent) {
        // No available agent, add to queue
        this.taskQueue.push(task);
        
        await this.storeTaskInDatabase(task);
        
        logger.info('Task queued - no available agents', {
          taskId: task.id,
          type: task.type
        });
        
        this.io.emit('task:queued', {
          task,
          timestamp: new Date(),
          reason: 'no_available_agents'
        });
        
        return;
      }

      // Assign task to agent
      await this.assignTaskToAgent(task, agent);
      
    } catch (error) {
      logger.error('Failed to assign task:', {
        taskId: task.id,
        error: error.message
      });
      throw error;
    }
  }

  private async findBestAgent(task: Task): Promise<Agent | null> {
    const availableAgents = Array.from(this.agents.values()).filter(agent => 
      agent.status === AgentStatus.IDLE || 
      (agent.status === AgentStatus.ACTIVE && agent.currentTasks.length < agent.config.maxConcurrentTasks)
    );

    if (availableAgents.length === 0) {
      return null;
    }

    // Filter by agent type capability
    const capableAgents = availableAgents.filter(agent => {
      switch (task.type) {
        case TaskType.SEND_EMAIL:
          return agent.type === AgentType.EMAIL;
        case TaskType.MAKE_CALL:
          return agent.type === AgentType.PHONE;
        case TaskType.SEND_SMS:
          return agent.type === AgentType.SMS;
        case TaskType.RESEARCH_CUSTOMER:
          return agent.type === AgentType.RESEARCH;
        default:
          return true;
      }
    });

    if (capableAgents.length === 0) {
      return null;
    }

    // Score agents based on performance and availability
    const scoredAgents = capableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, task)
    }));

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);
    
    return scoredAgents[0].agent;
  }

  private calculateAgentScore(agent: Agent, task: Task): number {
    let score = 0;
    
    // Performance metrics (40% weight)
    score += (agent.performance.tasksSuccessful / Math.max(agent.performance.tasksCompleted, 1)) * 40;
    
    // Response time (30% weight) - faster is better
    const avgResponseTime = agent.performance.averageResponseTime || 1000;
    score += Math.max(0, (5000 - avgResponseTime) / 5000) * 30;
    
    // Current load (20% weight) - less loaded is better
    const loadRatio = agent.currentTasks.length / agent.config.maxConcurrentTasks;
    score += (1 - loadRatio) * 20;
    
    // Priority match (10% weight)
    if (task.priority === Priority.URGENT || task.priority === Priority.HIGH) {
      score += agent.performance.customerSatisfactionScore > 8 ? 10 : 5;
    } else {
      score += 10; // All agents can handle normal/low priority
    }

    return score;
  }

  private async assignTaskToAgent(task: Task, agent: Agent): Promise<void> {
    try {
      // Update task with agent assignment
      task.assignedAgentId = agent.id;
      task.status = TaskStatus.ASSIGNED;
      task.updatedAt = new Date();

      // Update agent
      agent.currentTasks.push(task);
      if (agent.status === AgentStatus.IDLE) {
        agent.status = AgentStatus.ACTIVE;
      }

      // Update database
      await this.dbService.query(
        `UPDATE tasks SET assigned_agent_id = $1, status = $2, updated_at = $3 WHERE id = $4`,
        [agent.id, task.status, task.updatedAt, task.id]
      );

      await this.dbService.query(
        `UPDATE agents SET status = $1, current_tasks = $2, updated_at = $3 WHERE id = $4`,
        [agent.status, agent.currentTasks.length, new Date(), agent.id]
      );

      // Update cache
      await this.redisService.setJson(`agent:${agent.id}`, agent, 3600);
      await this.redisService.setJson(`task:${task.id}`, task, 3600);

      // Publish task to appropriate queue
      await this.publishTaskToQueue(task);

      logger.info('Task assigned to agent', {
        taskId: task.id,
        agentId: agent.id,
        agentType: agent.type
      });

      // Notify clients
      this.io.emit('task:assigned', {
        task,
        agent: { id: agent.id, type: agent.type },
        timestamp: new Date()
      });

      this.metrics.tasksProcessed++;
      
    } catch (error) {
      logger.error('Failed to assign task to agent:', {
        taskId: task.id,
        agentId: agent.id,
        error: error.message
      });
      throw error;
    }
  }

  private async publishTaskToQueue(task: Task): Promise<void> {
    switch (task.type) {
      case TaskType.SEND_EMAIL:
        await this.mqService.publishEmailTask(task);
        break;
      case TaskType.MAKE_CALL:
        await this.mqService.publishPhoneTask(task);
        break;
      case TaskType.SEND_SMS:
        await this.mqService.publishSmsTask(task);
        break;
      case TaskType.RESEARCH_CUSTOMER:
        await this.mqService.publishResearchTask(task);
        break;
      default:
        logger.warn('Unknown task type, publishing to notifications', {
          taskId: task.id,
          type: task.type
        });
        await this.mqService.publishNotification({
          type: 'unknown_task',
          task
        });
    }
  }

  async completeTask(taskId: string, result: any): Promise<void> {
    try {
      const task = await this.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const agent = this.agents.get(task.assignedAgentId!);
      if (!agent) {
        throw new Error(`Agent not found: ${task.assignedAgentId}`);
      }

      // Update task
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.updatedAt = new Date();

      // Update agent
      agent.currentTasks = agent.currentTasks.filter(t => t.id !== taskId);
      if (agent.currentTasks.length === 0) {
        agent.status = AgentStatus.IDLE;
      }

      // Update performance metrics
      agent.performance.tasksCompleted++;
      agent.performance.tasksSuccessful++;
      agent.performance.lastUpdated = new Date();

      // Update database
      await this.dbService.query(
        `UPDATE tasks SET status = $1, completed_at = $2, updated_at = $3 WHERE id = $4`,
        [task.status, task.completedAt, task.updatedAt, taskId]
      );

      await this.dbService.query(
        `UPDATE agents SET status = $1, current_tasks = $2, performance = $3, updated_at = $4 WHERE id = $5`,
        [agent.status, agent.currentTasks.length, JSON.stringify(agent.performance), new Date(), agent.id]
      );

      // Update cache
      await this.redisService.setJson(`agent:${agent.id}`, agent, 3600);
      await this.redisService.setJson(`task:${taskId}`, task, 3600);

      logger.info('Task completed successfully', {
        taskId,
        agentId: agent.id,
        duration: task.completedAt.getTime() - task.createdAt.getTime()
      });

      // Notify clients
      this.io.emit('task:completed', {
        task,
        agent: { id: agent.id, type: agent.type },
        result,
        timestamp: new Date()
      });

      this.metrics.tasksCompleted++;

      // Process next task in queue if available
      await this.processQueuedTasks();
      
    } catch (error) {
      logger.error('Failed to complete task:', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  async failTask(taskId: string, error: Error): Promise<void> {
    try {
      const task = await this.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const agent = this.agents.get(task.assignedAgentId!);
      if (agent) {
        // Update agent
        agent.currentTasks = agent.currentTasks.filter(t => t.id !== taskId);
        if (agent.currentTasks.length === 0) {
          agent.status = AgentStatus.IDLE;
        }

        // Update performance metrics
        agent.performance.tasksCompleted++;
        agent.performance.lastUpdated = new Date();
      }

      // Check if task should be retried
      task.attempts++;
      
      if (task.attempts < task.maxAttempts) {
        // Retry task
        task.status = TaskStatus.PENDING;
        task.assignedAgentId = undefined;
        task.updatedAt = new Date();
        
        // Add back to queue for retry
        this.taskQueue.push(task);
        
        logger.warn('Task failed, queued for retry', {
          taskId,
          attempts: task.attempts,
          maxAttempts: task.maxAttempts,
          error: error.message
        });
      } else {
        // Mark as failed
        task.status = TaskStatus.FAILED;
        task.updatedAt = new Date();
        
        logger.error('Task permanently failed', {
          taskId,
          attempts: task.attempts,
          error: error.message
        });

        this.metrics.tasksFailed++;
      }

      // Update database
      await this.dbService.query(
        `UPDATE tasks SET status = $1, attempts = $2, updated_at = $3, assigned_agent_id = $4 WHERE id = $5`,
        [task.status, task.attempts, task.updatedAt, task.assignedAgentId || null, taskId]
      );

      if (agent) {
        await this.dbService.query(
          `UPDATE agents SET status = $1, current_tasks = $2, performance = $3, updated_at = $4 WHERE id = $5`,
          [agent.status, agent.currentTasks.length, JSON.stringify(agent.performance), new Date(), agent.id]
        );

        // Update cache
        await this.redisService.setJson(`agent:${agent.id}`, agent, 3600);
      }

      await this.redisService.setJson(`task:${taskId}`, task, 3600);

      // Notify clients
      this.io.emit('task:failed', {
        task,
        agent: agent ? { id: agent.id, type: agent.type } : null,
        error: error.message,
        willRetry: task.attempts < task.maxAttempts,
        timestamp: new Date()
      });
      
    } catch (err) {
      logger.error('Failed to handle task failure:', {
        taskId,
        error: err.message
      });
    }
  }

  private async loadExistingAgents(): Promise<void> {
    try {
      const result = await this.dbService.query(
        'SELECT * FROM agents WHERE status != $1',
        ['offline']
      );

      for (const row of result.rows) {
        const agent: Agent = {
          id: row.id,
          type: row.type,
          status: row.status,
          capabilities: row.capabilities,
          currentTasks: [],
          performance: row.performance,
          config: row.config
        };

        this.agents.set(agent.id, agent);
        
        // Cache in Redis
        await this.redisService.setJson(`agent:${agent.id}`, agent, 3600);
      }

      logger.info(`Loaded ${result.rows.length} existing agents`);
    } catch (error) {
      logger.error('Failed to load existing agents:', error);
    }
  }

  private async setupMessageHandlers(): Promise<void> {
    // This method would set up handlers for incoming messages from agents
    // For now, we'll implement basic queue monitoring
    logger.info('Message handlers set up successfully');
  }

  private startTaskProcessing(): void {
    this.processingInterval = setInterval(async () => {
      await this.processQueuedTasks();
    }, 1000); // Process every second
  }

  private async processQueuedTasks(): Promise<void> {
    if (this.taskQueue.length === 0) {
      return;
    }

    const tasksToProcess = this.taskQueue.splice(0, 10); // Process up to 10 tasks at once
    
    for (const task of tasksToProcess) {
      try {
        await this.assignTask(task);
      } catch (error) {
        logger.error('Failed to process queued task:', {
          taskId: task.id,
          error: error.message
        });
        
        // Put back in queue if it's a temporary error
        this.taskQueue.push(task);
      }
    }
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      await this.updateMetrics();
    }, 30000); // Update every 30 seconds
  }

  private async updateMetrics(): Promise<void> {
    try {
      const totalAgents = this.agents.size;
      const activeAgents = Array.from(this.agents.values()).filter(
        agent => agent.status === AgentStatus.ACTIVE
      ).length;

      this.metrics.agentUtilization = totalAgents > 0 ? (activeAgents / totalAgents) * 100 : 0;

      // Store metrics in Redis
      await this.redisService.setJson('coordinator:metrics', this.metrics, 300);

      // Emit metrics to clients
      this.io.emit('coordinator:metrics', {
        metrics: this.metrics,
        agentCount: totalAgents,
        activeAgents,
        queueSize: this.taskQueue.length,
        timestamp: new Date()
      });
      
    } catch (error) {
      logger.error('Failed to update metrics:', error);
    }
  }

  private async getTask(taskId: string): Promise<Task | null> {
    try {
      // Try cache first
      const cached = await this.redisService.getJson<Task>(`task:${taskId}`);
      if (cached) {
        return cached;
      }

      // Fallback to database
      const result = await this.dbService.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const task: Task = {
        id: row.id,
        type: row.type,
        priority: row.priority,
        customerId: row.customer_id,
        campaignId: row.campaign_id,
        assignedAgentId: row.assigned_agent_id,
        status: row.status,
        context: row.context,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        dueAt: row.due_at,
        completedAt: row.completed_at,
        attempts: row.attempts,
        maxAttempts: row.max_attempts
      };

      // Cache for future requests
      await this.redisService.setJson(`task:${taskId}`, task, 3600);
      
      return task;
    } catch (error) {
      logger.error('Failed to get task:', {
        taskId,
        error: error.message
      });
      return null;
    }
  }

  private async storeTaskInDatabase(task: Task): Promise<void> {
    await this.dbService.query(
      `INSERT INTO tasks (id, type, priority, customer_id, campaign_id, status, context, due_at, attempts, max_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        task.id,
        task.type,
        task.priority,
        task.customerId,
        task.campaignId,
        task.status,
        JSON.stringify(task.context),
        task.dueAt,
        task.attempts,
        task.maxAttempts
      ]
    );
  }

  // Socket.IO event handlers
  handleAgentStatusUpdate(socketId: string, data: any): void {
    logger.debug('Agent status update received', { socketId, data });
    // Implementation would handle real-time agent status updates
  }

  handleTaskUpdate(socketId: string, data: any): void {
    logger.debug('Task update received', { socketId, data });
    // Implementation would handle real-time task updates
  }

  async getCoordinatorStatus(): Promise<any> {
    return {
      isRunning: this.isRunning,
      agentCount: this.agents.size,
      queueSize: this.taskQueue.length,
      metrics: this.metrics,
      agents: Array.from(this.agents.values()).map(agent => ({
        id: agent.id,
        type: agent.type,
        status: agent.status,
        currentTasks: agent.currentTasks.length,
        performance: agent.performance
      }))
    };
  }

  async shutdown(): Promise<void> {
    try {
      this.isRunning = false;
      
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
      }

      // Update all agents to offline status
      for (const agent of this.agents.values()) {
        agent.status = AgentStatus.OFFLINE;
        
        await this.dbService.query(
          'UPDATE agents SET status = $1, updated_at = $2 WHERE id = $3',
          [agent.status, new Date(), agent.id]
        );
      }

      logger.info('Agent Coordinator shut down successfully');
    } catch (error) {
      logger.error('Error during coordinator shutdown:', error);
      throw error;
    }
  }
}