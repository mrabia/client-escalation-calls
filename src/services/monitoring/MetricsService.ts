/**
 * Prometheus Metrics Service
 * Exports application metrics for monitoring and alerting
 */

import { createLogger, Logger } from '@/utils/logger';

// Type definitions for metrics (compatible with prom-client if installed)
interface MetricLabels {
  [key: string]: string | number;
}

interface CounterConfig {
  name: string;
  help: string;
  labelNames?: string[];
}

interface HistogramConfig {
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[];
}

interface GaugeConfig {
  name: string;
  help: string;
  labelNames?: string[];
}

// Simple in-memory metrics implementation (can be replaced with prom-client)
class SimpleCounter {
  private values: Map<string, number> = new Map();
  constructor(private config: CounterConfig) {}
  
  inc(labels: MetricLabels = {}, value: number = 1): void {
    const key = this.makeKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }
  
  private makeKey(labels: MetricLabels): string {
    return JSON.stringify(labels);
  }
  
  getMetrics(): string {
    const lines: string[] = [`# HELP ${this.config.name} ${this.config.help}`, `# TYPE ${this.config.name} counter`];
    for (const [key, value] of this.values) {
      const labels = key === '{}' ? '' : key.replace(/"/g, '').replace(/[{}]/g, '').replace(/:/g, '=');
      lines.push(`${this.config.name}${labels ? `{${labels}}` : ''} ${value}`);
    }
    return lines.join('\n');
  }
  
  reset(): void { this.values.clear(); }
}

class SimpleHistogram {
  private observations: Map<string, number[]> = new Map();
  private buckets: number[];
  constructor(private config: HistogramConfig) {
    this.buckets = config.buckets || [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10];
  }
  
  observe(labels: MetricLabels, value: number): void {
    const key = JSON.stringify(labels);
    const arr = this.observations.get(key) || [];
    arr.push(value);
    this.observations.set(key, arr);
  }
  
  getMetrics(): string {
    const lines: string[] = [`# HELP ${this.config.name} ${this.config.help}`, `# TYPE ${this.config.name} histogram`];
    for (const [key, values] of this.observations) {
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      for (const bucket of this.buckets) {
        const bucketCount = values.filter(v => v <= bucket).length;
        lines.push(`${this.config.name}_bucket{le="${bucket}"} ${bucketCount}`);
      }
      lines.push(`${this.config.name}_bucket{le="+Inf"} ${count}`);
      lines.push(`${this.config.name}_sum ${sum}`);
      lines.push(`${this.config.name}_count ${count}`);
    }
    return lines.join('\n');
  }
  
  reset(): void { this.observations.clear(); }
}

class SimpleGauge {
  private values: Map<string, number> = new Map();
  constructor(private config: GaugeConfig) {}
  
  set(labels: MetricLabels, value: number): void {
    this.values.set(JSON.stringify(labels), value);
  }
  
  inc(value: number = 1): void {
    const key = '{}';
    this.values.set(key, (this.values.get(key) || 0) + value);
  }
  
  dec(value: number = 1): void {
    const key = '{}';
    this.values.set(key, (this.values.get(key) || 0) - value);
  }
  
  getMetrics(): string {
    const lines: string[] = [`# HELP ${this.config.name} ${this.config.help}`, `# TYPE ${this.config.name} gauge`];
    for (const [key, value] of this.values) {
      const labels = key === '{}' ? '' : key.replace(/"/g, '').replace(/[{}]/g, '').replace(/:/g, '=');
      lines.push(`${this.config.name}${labels ? `{${labels}}` : ''} ${value}`);
    }
    return lines.join('\n');
  }
  
  reset(): void { this.values.clear(); }
}

/**
 * Metrics Service
 * 
 * Provides Prometheus-compatible metrics for:
 * - HTTP request metrics (count, duration, errors)
 * - Agent task metrics (processing, success, failure)
 * - Memory system metrics (queries, cache hits)
 * - Authentication metrics (logins, failures)
 * - System metrics (CPU, memory, event loop)
 */
export class MetricsService {
  private static instance: MetricsService | null = null;
  
  private readonly metrics: Map<string, SimpleCounter | SimpleHistogram | SimpleGauge> = new Map();
  private readonly logger: Logger;
  private readonly enabled: boolean;

  // HTTP Metrics
  public readonly httpRequestsTotal: SimpleCounter;
  public readonly httpRequestDuration: SimpleHistogram;
  public readonly httpRequestsInFlight: SimpleGauge;

  // Agent Metrics
  public readonly agentTasksTotal: SimpleCounter;
  public readonly agentTaskDuration: SimpleHistogram;
  public readonly agentActiveCount: SimpleGauge;

  // Memory System Metrics
  public readonly memoryQueriesTotal: SimpleCounter;
  public readonly memoryQueryDuration: SimpleHistogram;
  public readonly memoryCacheHits: SimpleCounter;
  public readonly memoryCacheMisses: SimpleCounter;

  // Auth Metrics
  public readonly authAttemptsTotal: SimpleCounter;
  public readonly authFailuresTotal: SimpleCounter;
  public readonly activeSessions: SimpleGauge;

  // Business Metrics
  public readonly paymentsCollected: SimpleCounter;
  public readonly emailsSent: SimpleCounter;
  public readonly callsMade: SimpleCounter;
  public readonly smsSent: SimpleCounter;

  private constructor() {
    this.logger = createLogger('MetricsService');
    this.enabled = process.env.METRICS_ENABLED !== 'false';

    // Initialize HTTP metrics
    this.httpRequestsTotal = new SimpleCounter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status']
    });
    this.metrics.set('http_requests_total', this.httpRequestsTotal);

    this.httpRequestDuration = new SimpleHistogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    });
    this.metrics.set('http_request_duration_seconds', this.httpRequestDuration);

    this.httpRequestsInFlight = new SimpleGauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently in flight'
    });
    this.metrics.set('http_requests_in_flight', this.httpRequestsInFlight);

    // Initialize Agent metrics
    this.agentTasksTotal = new SimpleCounter({
      name: 'agent_tasks_total',
      help: 'Total number of agent tasks processed',
      labelNames: ['agent_type', 'task_type', 'status']
    });
    this.metrics.set('agent_tasks_total', this.agentTasksTotal);

    this.agentTaskDuration = new SimpleHistogram({
      name: 'agent_task_duration_seconds',
      help: 'Duration of agent task processing in seconds',
      labelNames: ['agent_type', 'task_type'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600]
    });
    this.metrics.set('agent_task_duration_seconds', this.agentTaskDuration);

    this.agentActiveCount = new SimpleGauge({
      name: 'agent_active_count',
      help: 'Number of currently active agents',
      labelNames: ['agent_type']
    });
    this.metrics.set('agent_active_count', this.agentActiveCount);

    // Initialize Memory metrics
    this.memoryQueriesTotal = new SimpleCounter({
      name: 'memory_queries_total',
      help: 'Total number of memory system queries',
      labelNames: ['type', 'status']
    });
    this.metrics.set('memory_queries_total', this.memoryQueriesTotal);

    this.memoryQueryDuration = new SimpleHistogram({
      name: 'memory_query_duration_seconds',
      help: 'Duration of memory queries in seconds',
      labelNames: ['type'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
    });
    this.metrics.set('memory_query_duration_seconds', this.memoryQueryDuration);

    this.memoryCacheHits = new SimpleCounter({
      name: 'memory_cache_hits_total',
      help: 'Total number of memory cache hits'
    });
    this.metrics.set('memory_cache_hits_total', this.memoryCacheHits);

    this.memoryCacheMisses = new SimpleCounter({
      name: 'memory_cache_misses_total',
      help: 'Total number of memory cache misses'
    });
    this.metrics.set('memory_cache_misses_total', this.memoryCacheMisses);

    // Initialize Auth metrics
    this.authAttemptsTotal = new SimpleCounter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'status']
    });
    this.metrics.set('auth_attempts_total', this.authAttemptsTotal);

    this.authFailuresTotal = new SimpleCounter({
      name: 'auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['method', 'reason']
    });
    this.metrics.set('auth_failures_total', this.authFailuresTotal);

    this.activeSessions = new SimpleGauge({
      name: 'active_sessions',
      help: 'Number of active user sessions'
    });
    this.metrics.set('active_sessions', this.activeSessions);

    // Initialize Business metrics
    this.paymentsCollected = new SimpleCounter({
      name: 'payments_collected_total',
      help: 'Total number of payments collected',
      labelNames: ['channel', 'campaign']
    });
    this.metrics.set('payments_collected_total', this.paymentsCollected);

    this.emailsSent = new SimpleCounter({
      name: 'emails_sent_total',
      help: 'Total number of emails sent',
      labelNames: ['template', 'status']
    });
    this.metrics.set('emails_sent_total', this.emailsSent);

    this.callsMade = new SimpleCounter({
      name: 'calls_made_total',
      help: 'Total number of phone calls made',
      labelNames: ['outcome', 'campaign']
    });
    this.metrics.set('calls_made_total', this.callsMade);

    this.smsSent = new SimpleCounter({
      name: 'sms_sent_total',
      help: 'Total number of SMS messages sent',
      labelNames: ['template', 'status']
    });
    this.metrics.set('sms_sent_total', this.smsSent);

    this.logger.info('Metrics service initialized', { enabled: this.enabled });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    const lines: string[] = [];
    for (const metric of this.metrics.values()) {
      lines.push(metric.getMetrics());
    }
    return lines.join('\n\n');
  }

  /**
   * Get metrics content type
   */
  getContentType(): string {
    return 'text/plain; version=0.0.4; charset=utf-8';
  }

  /**
   * Check if metrics are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, path: string, status: number, durationMs: number): void {
    if (!this.enabled) return;

    const normalizedPath = this.normalizePath(path);
    
    this.httpRequestsTotal.inc({ method, path: normalizedPath, status: status.toString() });
    this.httpRequestDuration.observe(
      { method, path: normalizedPath, status: status.toString() },
      durationMs / 1000
    );
  }

  /**
   * Record agent task metrics
   */
  recordAgentTask(
    agentType: string,
    taskType: string,
    status: 'success' | 'failure' | 'timeout',
    durationMs: number
  ): void {
    if (!this.enabled) return;

    this.agentTasksTotal.inc({ agent_type: agentType, task_type: taskType, status });
    this.agentTaskDuration.observe({ agent_type: agentType, task_type: taskType }, durationMs / 1000);
  }

  /**
   * Record memory query metrics
   */
  recordMemoryQuery(type: 'episodic' | 'semantic' | 'session', success: boolean, durationMs: number): void {
    if (!this.enabled) return;

    this.memoryQueriesTotal.inc({ type, status: success ? 'success' : 'failure' });
    this.memoryQueryDuration.observe({ type }, durationMs / 1000);
  }

  /**
   * Record auth attempt
   */
  recordAuthAttempt(method: 'password' | 'mfa' | 'token', success: boolean, failureReason?: string): void {
    if (!this.enabled) return;

    this.authAttemptsTotal.inc({ method, status: success ? 'success' : 'failure' });
    
    if (!success && failureReason) {
      this.authFailuresTotal.inc({ method, reason: failureReason });
    }
  }

  /**
   * Update active agents count
   */
  setActiveAgents(agentType: string, count: number): void {
    if (!this.enabled) return;
    this.agentActiveCount.set({ agent_type: agentType }, count);
  }

  /**
   * Update active sessions count
   */
  setActiveSessions(count: number): void {
    if (!this.enabled) return;
    this.activeSessions.set({}, count);
  }

  /**
   * Record payment collected
   */
  recordPayment(channel: 'email' | 'phone' | 'sms' | 'web', campaign: string): void {
    if (!this.enabled) return;
    this.paymentsCollected.inc({ channel, campaign });
  }

  /**
   * Record email sent
   */
  recordEmailSent(template: string, success: boolean): void {
    if (!this.enabled) return;
    this.emailsSent.inc({ template, status: success ? 'delivered' : 'failed' });
  }

  /**
   * Record call made
   */
  recordCallMade(outcome: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'failed', campaign: string): void {
    if (!this.enabled) return;
    this.callsMade.inc({ outcome, campaign });
  }

  /**
   * Record SMS sent
   */
  recordSmsSent(template: string, success: boolean): void {
    if (!this.enabled) return;
    this.smsSent.inc({ template, status: success ? 'delivered' : 'failed' });
  }

  /**
   * Normalize path to reduce cardinality
   */
  private normalizePath(path: string): string {
    // Replace UUIDs and numeric IDs with placeholders
    return path
      .replaceAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replaceAll(/\/\d+/g, '/:id');
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    for (const metric of this.metrics.values()) {
      metric.reset();
    }
  }
}

/**
 * Get metrics service singleton
 */
export function getMetricsService(): MetricsService {
  return MetricsService.getInstance();
}

/**
 * Express middleware for recording HTTP metrics
 */
export function metricsMiddleware() {
  const metrics = getMetricsService();

  return (req: any, res: any, next: any) => {
    if (!metrics.isEnabled()) {
      return next();
    }

    const start = Date.now();
    metrics.httpRequestsInFlight.inc();

    res.on('finish', () => {
      const duration = Date.now() - start;
      metrics.httpRequestsInFlight.dec();
      metrics.recordHttpRequest(req.method, req.path, res.statusCode, duration);
    });

    next();
  };
}
