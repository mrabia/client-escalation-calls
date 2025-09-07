import { logger } from '@/utils/logger';
import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import { MessageQueueService } from '@/core/services/messageQueue';

export interface SystemMetrics {
  timestamp: Date;
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    version: string;
  };
  services: {
    database: {
      healthy: boolean;
      connections: number;
      queries: number;
      avgResponseTime: number;
    };
    redis: {
      healthy: boolean;
      memory: number;
      keys: number;
      hitRate: number;
    };
    messageQueue: {
      healthy: boolean;
      queues: QueueMetrics[];
      totalMessages: number;
    };
  };
  business: {
    totalCustomers: number;
    activePayments: number;
    activeCampaigns: number;
    totalTasks: number;
    completionRate: number;
  };
  performance: {
    requestsPerMinute: number;
    avgResponseTime: number;
    errorRate: number;
    p95ResponseTime: number;
  };
}

export interface QueueMetrics {
  name: string;
  messages: number;
  consumers: number;
  processingRate: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export class MetricsCollector {
  private dbService: DatabaseService;
  private redisService: RedisService;
  private mqService: MessageQueueService;
  
  private isRunning = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private metricsHistory: SystemMetrics[] = [];
  
  // Performance tracking
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private errorCounts: Map<string, number> = new Map();
  
  // Alert rules
  private alertRules: AlertRule[] = [
    {
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      condition: 'system.memory.rss > threshold',
      threshold: 1024 * 1024 * 1024, // 1GB
      severity: 'high',
      enabled: true,
      cooldownMinutes: 15
    },
    {
      id: 'database-connection-limit',
      name: 'Database Connection Limit',
      condition: 'services.database.connections > threshold',
      threshold: 18, // 90% of typical 20 connection limit
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 5
    },
    {
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: 'performance.errorRate > threshold',
      threshold: 5, // 5% error rate
      severity: 'high',
      enabled: true,
      cooldownMinutes: 10
    },
    {
      id: 'slow-response-time',
      name: 'Slow Response Time',
      condition: 'performance.p95ResponseTime > threshold',
      threshold: 5000, // 5 seconds
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 20
    },
    {
      id: 'queue-backlog',
      name: 'Message Queue Backlog',
      condition: 'services.messageQueue.totalMessages > threshold',
      threshold: 1000,
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 15
    },
    {
      id: 'redis-memory-high',
      name: 'Redis Memory High',
      condition: 'services.redis.memory > threshold',
      threshold: 100 * 1024 * 1024, // 100MB
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 30
    }
  ];

  constructor(
    dbService: DatabaseService,
    redisService: RedisService,
    mqService: MessageQueueService
  ) {
    this.dbService = dbService;
    this.redisService = redisService;
    this.mqService = mqService;
  }

  async initialize(): Promise<void> {
    try {
      // Start metrics collection
      this.startCollection();
      
      // Load historical metrics from Redis
      await this.loadHistoricalMetrics();
      
      this.isRunning = true;
      logger.info('Metrics Collector initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Metrics Collector:', error);
      throw error;
    }
  }

  private startCollection(): void {
    this.collectionInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Error collecting metrics:', error);
      }
    }, 60 * 1000); // Collect every minute

    logger.info('Metrics collection started');
  }

  private async collectMetrics(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        system: await this.collectSystemMetrics(),
        services: await this.collectServiceMetrics(),
        business: await this.collectBusinessMetrics(),
        performance: await this.collectPerformanceMetrics()
      };

      // Store metrics
      await this.storeMetrics(metrics);
      
      // Check alert rules
      await this.checkAlertRules(metrics);
      
      // Keep only last 24 hours in memory
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 1440) { // 24 hours * 60 minutes
        this.metricsHistory.shift();
      }

      const collectionTime = Date.now() - startTime;
      logger.debug('Metrics collected successfully', {
        collectionTime: `${collectionTime}ms`,
        timestamp: metrics.timestamp
      });

    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    }
  }

  private async collectSystemMetrics(): Promise<SystemMetrics['system']> {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version
    };
  }

  private async collectServiceMetrics(): Promise<SystemMetrics['services']> {
    const [dbHealth, redisHealth, mqHealth] = await Promise.allSettled([
      this.dbService.healthCheck(),
      this.redisService.healthCheck(),
      this.mqService.healthCheck()
    ]);

    // Database metrics
    const databaseMetrics = {
      healthy: dbHealth.status === 'fulfilled' && dbHealth.value,
      connections: await this.getDatabaseConnections(),
      queries: await this.getDatabaseQueries(),
      avgResponseTime: await this.getDatabaseResponseTime()
    };

    // Redis metrics
    const redisMetrics = {
      healthy: redisHealth.status === 'fulfilled' && redisHealth.value,
      memory: await this.getRedisMemoryUsage(),
      keys: await this.getRedisKeyCount(),
      hitRate: await this.getRedisHitRate()
    };

    // Message Queue metrics
    const queueMetrics = await this.getQueueMetrics();
    const messageQueueMetrics = {
      healthy: mqHealth.status === 'fulfilled' && mqHealth.value,
      queues: queueMetrics,
      totalMessages: queueMetrics.reduce((sum, q) => sum + q.messages, 0)
    };

    return {
      database: databaseMetrics,
      redis: redisMetrics,
      messageQueue: messageQueueMetrics
    };
  }

  private async collectBusinessMetrics(): Promise<SystemMetrics['business']> {
    try {
      const [
        customersResult,
        paymentsResult,
        campaignsResult,
        tasksResult,
        completionResult
      ] = await Promise.all([
        this.dbService.query('SELECT COUNT(*) FROM customers'),
        this.dbService.query('SELECT COUNT(*) FROM payment_records WHERE status IN (\'pending\', \'overdue\')'),
        this.dbService.query('SELECT COUNT(*) FROM campaigns WHERE status = \'active\''),
        this.dbService.query('SELECT COUNT(*) FROM tasks WHERE status IN (\'pending\', \'assigned\', \'in_progress\')'),
        this.dbService.query(`
          SELECT 
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(*) as total
          FROM tasks 
          WHERE created_at >= NOW() - INTERVAL '24 hours'
        `)
      ]);

      const completionRate = completionResult.rows[0]?.total > 0 
        ? (completionResult.rows[0].completed / completionResult.rows[0].total) * 100
        : 0;

      return {
        totalCustomers: parseInt(customersResult.rows[0].count),
        activePayments: parseInt(paymentsResult.rows[0].count),
        activeCampaigns: parseInt(campaignsResult.rows[0].count),
        totalTasks: parseInt(tasksResult.rows[0].count),
        completionRate: Math.round(completionRate)
      };
    } catch (error) {
      logger.error('Failed to collect business metrics:', error);
      return {
        totalCustomers: 0,
        activePayments: 0,
        activeCampaigns: 0,
        totalTasks: 0,
        completionRate: 0
      };
    }
  }

  private async collectPerformanceMetrics(): Promise<SystemMetrics['performance']> {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Calculate requests per minute
    const recentRequests = Array.from(this.requestCounts.entries())
      .filter(([timestamp]) => parseInt(timestamp) > oneMinuteAgo)
      .reduce((sum, [, count]) => sum + count, 0);

    // Calculate average response time
    const recentResponseTimes = this.responseTimes.filter(time => time > oneMinuteAgo);
    const avgResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((sum, time) => sum + time, 0) / recentResponseTimes.length
      : 0;

    // Calculate P95 response time
    const sortedTimes = recentResponseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ResponseTime = sortedTimes.length > 0 ? sortedTimes[p95Index] || 0 : 0;

    // Calculate error rate
    const recentErrors = Array.from(this.errorCounts.entries())
      .filter(([timestamp]) => parseInt(timestamp) > oneMinuteAgo)
      .reduce((sum, [, count]) => sum + count, 0);

    const errorRate = recentRequests > 0 ? (recentErrors / recentRequests) * 100 : 0;

    // Clean up old data
    this.cleanupOldMetrics(oneMinuteAgo);

    return {
      requestsPerMinute: recentRequests,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      p95ResponseTime: Math.round(p95ResponseTime)
    };
  }

  private async getDatabaseConnections(): Promise<number> {
    try {
      // This would typically come from database monitoring
      // For PostgreSQL, you might query pg_stat_activity
      return 5; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  private async getDatabaseQueries(): Promise<number> {
    try {
      // This would come from database query logs or monitoring
      return 0; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  private async getDatabaseResponseTime(): Promise<number> {
    try {
      const start = Date.now();
      await this.dbService.query('SELECT 1');
      return Date.now() - start;
    } catch (error) {
      return 0;
    }
  }

  private async getRedisMemoryUsage(): Promise<number> {
    try {
      // In a real implementation, you'd use Redis INFO command
      return 0; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  private async getRedisKeyCount(): Promise<number> {
    try {
      const keys = await this.redisService.keys('*');
      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  private async getRedisHitRate(): Promise<number> {
    try {
      // This would come from Redis INFO stats
      return 95; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  private async getQueueMetrics(): Promise<QueueMetrics[]> {
    try {
      const queues = ['email.tasks', 'phone.tasks', 'sms.tasks', 'notifications'];
      const metrics: QueueMetrics[] = [];

      for (const queueName of queues) {
        try {
          const queueInfo = await this.mqService.getQueueInfo(queueName);
          metrics.push({
            name: queueName,
            messages: queueInfo.messageCount || 0,
            consumers: queueInfo.consumerCount || 0,
            processingRate: 0 // Would need to calculate from historical data
          });
        } catch (error) {
          metrics.push({
            name: queueName,
            messages: 0,
            consumers: 0,
            processingRate: 0
          });
        }
      }

      return metrics;
    } catch (error) {
      return [];
    }
  }

  private async storeMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      // Store in Redis for short-term access
      await this.redisService.setJson('metrics:latest', metrics, 300); // 5 minutes
      
      // Store in Redis time series for historical data
      const timeKey = `metrics:${Math.floor(metrics.timestamp.getTime() / 60000)}`; // Per minute
      await this.redisService.setJson(timeKey, metrics, 24 * 60 * 60); // 24 hours

      // Store aggregated metrics in database for long-term storage
      await this.storeAggregatedMetrics(metrics);

    } catch (error) {
      logger.error('Failed to store metrics:', error);
    }
  }

  private async storeAggregatedMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      // Store hourly aggregated metrics in database
      const hourKey = Math.floor(metrics.timestamp.getTime() / (60 * 60 * 1000));
      
      await this.dbService.query(`
        INSERT INTO system_metrics (hour_key, timestamp, data)
        VALUES ($1, $2, $3)
        ON CONFLICT (hour_key) DO UPDATE SET 
        data = $3, updated_at = CURRENT_TIMESTAMP
      `, [
        hourKey,
        metrics.timestamp,
        JSON.stringify(metrics)
      ]);

    } catch (error) {
      logger.debug('Failed to store aggregated metrics (table may not exist):', error.message);
    }
  }

  private async checkAlertRules(metrics: SystemMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
        if (timeSinceLastTrigger < cooldownMs) {
          continue;
        }
      }

      try {
        const shouldTrigger = this.evaluateAlertCondition(rule, metrics);
        if (shouldTrigger) {
          await this.triggerAlert(rule, metrics);
          rule.lastTriggered = new Date();
        }
      } catch (error) {
        logger.error(`Failed to evaluate alert rule ${rule.name}:`, error);
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule, metrics: SystemMetrics): boolean {
    // Simple condition evaluation - in production, use a proper expression evaluator
    const condition = rule.condition.toLowerCase();
    
    if (condition.includes('system.memory.rss')) {
      return metrics.system.memory.rss > rule.threshold;
    }
    
    if (condition.includes('services.database.connections')) {
      return metrics.services.database.connections > rule.threshold;
    }
    
    if (condition.includes('performance.errorrate')) {
      return metrics.performance.errorRate > rule.threshold;
    }
    
    if (condition.includes('performance.p95responsetime')) {
      return metrics.performance.p95ResponseTime > rule.threshold;
    }
    
    if (condition.includes('services.messagequeue.totalmessages')) {
      return metrics.services.messageQueue.totalMessages > rule.threshold;
    }
    
    if (condition.includes('services.redis.memory')) {
      return metrics.services.redis.memory > rule.threshold;
    }

    return false;
  }

  private async triggerAlert(rule: AlertRule, metrics: SystemMetrics): Promise<void> {
    const alert = {
      id: `${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Alert triggered: ${rule.name}`,
      timestamp: new Date(),
      metrics: this.getRelevantMetrics(rule, metrics),
      resolved: false
    };

    logger.warn('Alert triggered', alert);

    try {
      // Store alert in Redis
      await this.redisService.setJson(`alert:${alert.id}`, alert, 7 * 24 * 60 * 60); // 7 days

      // Store alert in database
      await this.dbService.query(`
        INSERT INTO alerts (id, rule_id, rule_name, severity, message, timestamp, metrics_data, resolved)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        alert.id,
        alert.ruleId,
        alert.ruleName,
        alert.severity,
        alert.message,
        alert.timestamp,
        JSON.stringify(alert.metrics),
        alert.resolved
      ]);

      // Send notification (could be email, Slack, etc.)
      await this.sendAlertNotification(alert);

    } catch (error) {
      logger.error('Failed to store alert:', error);
    }
  }

  private getRelevantMetrics(rule: AlertRule, metrics: SystemMetrics): any {
    // Return subset of metrics relevant to the alert
    const condition = rule.condition.toLowerCase();
    
    if (condition.includes('system.memory')) {
      return { system: { memory: metrics.system.memory } };
    }
    
    if (condition.includes('services.database')) {
      return { services: { database: metrics.services.database } };
    }
    
    if (condition.includes('performance')) {
      return { performance: metrics.performance };
    }

    return metrics;
  }

  private async sendAlertNotification(alert: any): Promise<void> {
    try {
      // In a real implementation, you'd send to external systems
      logger.info('Alert notification sent', {
        alertId: alert.id,
        severity: alert.severity,
        message: alert.message
      });

    } catch (error) {
      logger.error('Failed to send alert notification:', error);
    }
  }

  private cleanupOldMetrics(cutoffTime: number): void {
    // Clean up request counts
    for (const [timestamp] of this.requestCounts) {
      if (parseInt(timestamp) <= cutoffTime) {
        this.requestCounts.delete(timestamp);
      }
    }

    // Clean up error counts
    for (const [timestamp] of this.errorCounts) {
      if (parseInt(timestamp) <= cutoffTime) {
        this.errorCounts.delete(timestamp);
      }
    }

    // Clean up response times (keep only recent ones)
    this.responseTimes = this.responseTimes.filter(time => time > cutoffTime);
  }

  private async loadHistoricalMetrics(): Promise<void> {
    try {
      // Load last 24 hours of metrics from Redis
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      for (let time = oneDayAgo; time <= now; time += 60 * 1000) { // Every minute
        const timeKey = `metrics:${Math.floor(time / 60000)}`;
        const metrics = await this.redisService.getJson<SystemMetrics>(timeKey);
        
        if (metrics) {
          this.metricsHistory.push(metrics);
        }
      }

      logger.info(`Loaded ${this.metricsHistory.length} historical metrics`);

    } catch (error) {
      logger.error('Failed to load historical metrics:', error);
    }
  }

  // Public API methods
  recordRequest(path: string, method: string): void {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const key = `${timestamp}-${method}-${path}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
  }

  recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
  }

  recordError(errorType: string): void {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const key = `${timestamp}-${errorType}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  async getLatestMetrics(): Promise<SystemMetrics | null> {
    return await this.redisService.getJson<SystemMetrics>('metrics:latest');
  }

  async getMetricsHistory(hours: number = 1): Promise<SystemMetrics[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(m => m.timestamp >= cutoff);
  }

  async getAlerts(resolved: boolean = false): Promise<any[]> {
    try {
      const result = await this.dbService.query(
        'SELECT * FROM alerts WHERE resolved = $1 ORDER BY timestamp DESC LIMIT 50',
        [resolved]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get alerts:', error);
      return [];
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    try {
      await this.dbService.query(
        'UPDATE alerts SET resolved = true, resolved_at = CURRENT_TIMESTAMP WHERE id = $1',
        [alertId]
      );

      // Update Redis cache
      const alert = await this.redisService.getJson(`alert:${alertId}`);
      if (alert) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        await this.redisService.setJson(`alert:${alertId}`, alert, 7 * 24 * 60 * 60);
      }

      logger.info('Alert resolved', { alertId });

    } catch (error) {
      logger.error('Failed to resolve alert:', error);
      throw error;
    }
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      return false;
    }

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    logger.info('Alert rule updated', { ruleId, updates });
    return true;
  }

  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const newRule: AlertRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...rule
    };

    this.alertRules.push(newRule);
    logger.info('Alert rule added', { ruleId: newRule.id, rule: newRule });
    return newRule.id;
  }

  removeAlertRule(ruleId: string): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      return false;
    }

    this.alertRules.splice(ruleIndex, 1);
    logger.info('Alert rule removed', { ruleId });
    return true;
  }

  async getSystemHealth(): Promise<any> {
    const latest = await this.getLatestMetrics();
    if (!latest) {
      return { status: 'unknown', message: 'No metrics available' };
    }

    const issues: string[] = [];
    
    // Check service health
    if (!latest.services.database.healthy) issues.push('Database unhealthy');
    if (!latest.services.redis.healthy) issues.push('Redis unhealthy');
    if (!latest.services.messageQueue.healthy) issues.push('Message queue unhealthy');
    
    // Check performance
    if (latest.performance.errorRate > 5) issues.push('High error rate');
    if (latest.performance.p95ResponseTime > 5000) issues.push('Slow response times');
    
    // Check system resources
    if (latest.system.memory.rss > 1024 * 1024 * 1024) issues.push('High memory usage');

    let status: 'healthy' | 'warning' | 'critical';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.some(issue => issue.includes('unhealthy'))) {
      status = 'critical';
    } else {
      status = 'warning';
    }

    return {
      status,
      issues,
      metrics: latest,
      timestamp: new Date()
    };
  }

  async shutdown(): Promise<void> {
    try {
      this.isRunning = false;
      
      if (this.collectionInterval) {
        clearInterval(this.collectionInterval);
      }

      logger.info('Metrics Collector shut down successfully');

    } catch (error) {
      logger.error('Error shutting down Metrics Collector:', error);
    }
  }
}