/**
 * Elasticsearch Service
 * Provides log aggregation, full-text search, and analytics
 */

import { Client } from '@elastic/elasticsearch';
import { config } from '@/config';
import { createLogger, Logger } from '@/utils/logger';

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  userId?: string;
  customerId?: string;
  taskId?: string;
  agentId?: string;
}

/**
 * Communication record for search
 */
export interface CommunicationRecord {
  id: string;
  customerId: string;
  taskId: string;
  campaignId: string;
  channel: 'email' | 'phone' | 'sms';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  from: string;
  to: string;
  timestamp: Date;
  status: string;
  metadata?: Record<string, unknown>;
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  index?: string;
  from?: number;
  size?: number;
  sort?: Array<{ field: string; order: 'asc' | 'desc' }>;
  filters?: Record<string, unknown>;
  dateRange?: {
    field: string;
    gte?: Date;
    lte?: Date;
  };
  highlight?: boolean;
}

/**
 * Search result
 */
export interface SearchResult<T> {
  total: number;
  hits: Array<{
    id: string;
    score: number;
    source: T;
    highlight?: Record<string, string[]>;
  }>;
  aggregations?: Record<string, unknown>;
}

/**
 * Elasticsearch Service
 */
export class ElasticsearchService {
  private static instance: ElasticsearchService | null = null;
  
  private client: Client | null = null;
  private readonly logger: Logger;
  private readonly enabled: boolean;
  private initialized = false;

  // Index names
  private readonly indices = {
    logs: 'escalation-logs',
    communications: 'escalation-communications',
    customers: 'escalation-customers',
    tasks: 'escalation-tasks',
    audit: 'escalation-audit'
  };

  private constructor() {
    this.logger = createLogger('ElasticsearchService');
    this.enabled = Boolean(process.env.ELASTICSEARCH_URL);
    
    if (this.enabled) {
      this.client = new Client({
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        auth: process.env.ELASTICSEARCH_USERNAME ? {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD || ''
        } : undefined,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });
    }
  }

  static getInstance(): ElasticsearchService {
    if (!ElasticsearchService.instance) {
      ElasticsearchService.instance = new ElasticsearchService();
    }
    return ElasticsearchService.instance;
  }

  /**
   * Initialize service and create indices
   */
  async initialize(): Promise<void> {
    if (!this.enabled || !this.client || this.initialized) {
      return;
    }

    try {
      // Test connection
      const health = await this.client.cluster.health();
      this.logger.info('Elasticsearch cluster health', { status: health.status });

      // Create indices with mappings
      await this.createIndices();
      
      this.initialized = true;
      this.logger.info('Elasticsearch service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Elasticsearch', { error });
      // Don't throw - allow app to continue without ES
    }
  }

  /**
   * Create required indices
   */
  private async createIndices(): Promise<void> {
    if (!this.client) return;

    // Logs index
    await this.createIndexIfNotExists(this.indices.logs, {
      properties: {
        timestamp: { type: 'date' },
        level: { type: 'keyword' },
        service: { type: 'keyword' },
        message: { type: 'text', analyzer: 'standard' },
        metadata: { type: 'object', enabled: true },
        traceId: { type: 'keyword' },
        spanId: { type: 'keyword' },
        userId: { type: 'keyword' },
        customerId: { type: 'keyword' },
        taskId: { type: 'keyword' },
        agentId: { type: 'keyword' }
      }
    });

    // Communications index
    await this.createIndexIfNotExists(this.indices.communications, {
      properties: {
        id: { type: 'keyword' },
        customerId: { type: 'keyword' },
        taskId: { type: 'keyword' },
        campaignId: { type: 'keyword' },
        channel: { type: 'keyword' },
        direction: { type: 'keyword' },
        subject: { type: 'text', analyzer: 'standard' },
        content: { type: 'text', analyzer: 'standard' },
        from: { type: 'keyword' },
        to: { type: 'keyword' },
        timestamp: { type: 'date' },
        status: { type: 'keyword' },
        metadata: { type: 'object', enabled: true }
      }
    });

    // Customers index
    await this.createIndexIfNotExists(this.indices.customers, {
      properties: {
        id: { type: 'keyword' },
        companyName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        contactName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        email: { type: 'keyword' },
        phone: { type: 'keyword' },
        address: { type: 'text' },
        tags: { type: 'keyword' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' }
      }
    });

    // Audit index
    await this.createIndexIfNotExists(this.indices.audit, {
      properties: {
        id: { type: 'keyword' },
        timestamp: { type: 'date' },
        eventType: { type: 'keyword' },
        severity: { type: 'keyword' },
        userId: { type: 'keyword' },
        resourceType: { type: 'keyword' },
        resourceId: { type: 'keyword' },
        action: { type: 'keyword' },
        details: { type: 'object', enabled: true },
        ipAddress: { type: 'ip' },
        userAgent: { type: 'text' }
      }
    });
  }

  /**
   * Create index if it doesn't exist
   */
  private async createIndexIfNotExists(
    index: string, 
    mappings: Record<string, unknown>
  ): Promise<void> {
    if (!this.client) return;

    try {
      const exists = await this.client.indices.exists({ index });
      
      if (!exists) {
        await this.client.indices.create({
          index,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              refresh_interval: '5s'
            },
            mappings: { properties: mappings.properties }
          }
        });
        this.logger.info(`Created index: ${index}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create index ${index}`, { error });
    }
  }

  // ============================================================================
  // Logging
  // ============================================================================

  /**
   * Index a log entry
   */
  async indexLog(entry: LogEntry): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      await this.client.index({
        index: this.indices.logs,
        body: {
          ...entry,
          timestamp: entry.timestamp || new Date()
        }
      });
    } catch (error) {
      // Don't log errors about logging to avoid loops
      console.error('Failed to index log entry:', error);
    }
  }

  /**
   * Bulk index log entries
   */
  async bulkIndexLogs(entries: LogEntry[]): Promise<void> {
    if (!this.enabled || !this.client || entries.length === 0) return;

    try {
      const operations = entries.flatMap(entry => [
        { index: { _index: this.indices.logs } },
        { ...entry, timestamp: entry.timestamp || new Date() }
      ]);

      await this.client.bulk({ body: operations, refresh: true });
    } catch (error) {
      console.error('Failed to bulk index logs:', error);
    }
  }

  // ============================================================================
  // Communications
  // ============================================================================

  /**
   * Index a communication record
   */
  async indexCommunication(record: CommunicationRecord): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      await this.client.index({
        index: this.indices.communications,
        id: record.id,
        body: record,
        refresh: true
      });
      
      this.logger.debug('Indexed communication', { id: record.id, channel: record.channel });
    } catch (error) {
      this.logger.error('Failed to index communication', { error, id: record.id });
    }
  }

  /**
   * Search communications
   */
  async searchCommunications(
    options: SearchOptions
  ): Promise<SearchResult<CommunicationRecord>> {
    return this.search<CommunicationRecord>({
      ...options,
      index: this.indices.communications
    });
  }

  /**
   * Get communications for a customer
   */
  async getCustomerCommunications(
    customerId: string,
    options: { from?: number; size?: number; channel?: string } = {}
  ): Promise<SearchResult<CommunicationRecord>> {
    const filters: Record<string, unknown> = { customerId };
    if (options.channel) {
      filters.channel = options.channel;
    }

    return this.search<CommunicationRecord>({
      query: '*',
      index: this.indices.communications,
      from: options.from || 0,
      size: options.size || 50,
      filters,
      sort: [{ field: 'timestamp', order: 'desc' }]
    });
  }

  // ============================================================================
  // Search
  // ============================================================================

  /**
   * Generic search across indices
   */
  async search<T>(options: SearchOptions): Promise<SearchResult<T>> {
    if (!this.enabled || !this.client) {
      return { total: 0, hits: [] };
    }

    try {
      const { query, index, from = 0, size = 20, sort, filters, dateRange, highlight } = options;

      // Build query
      const must: unknown[] = [];
      const filter: unknown[] = [];

      // Full-text query
      if (query && query !== '*') {
        must.push({
          multi_match: {
            query,
            fields: ['message', 'content', 'subject', 'companyName', 'contactName'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      } else {
        must.push({ match_all: {} });
      }

      // Filters
      if (filters) {
        for (const [field, value] of Object.entries(filters)) {
          filter.push({ term: { [field]: value } });
        }
      }

      // Date range
      if (dateRange) {
        const range: Record<string, unknown> = {};
        if (dateRange.gte) range.gte = dateRange.gte.toISOString();
        if (dateRange.lte) range.lte = dateRange.lte.toISOString();
        filter.push({ range: { [dateRange.field]: range } });
      }

      // Build sort
      const sortArray = sort?.map(s => ({ [s.field]: { order: s.order } })) || [{ timestamp: { order: 'desc' } }];

      // Execute search
      const response = await this.client.search({
        index: index || '_all',
        body: {
          from,
          size,
          query: {
            bool: {
              must,
              filter
            }
          },
          sort: sortArray,
          highlight: highlight ? {
            fields: {
              content: {},
              message: {},
              subject: {}
            },
            pre_tags: ['<mark>'],
            post_tags: ['</mark>']
          } : undefined
        }
      });

      // Transform results
      const hits = response.hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score || 0,
        source: hit._source as T,
        highlight: hit.highlight
      }));

      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;

      return {
        total,
        hits,
        aggregations: response.aggregations as Record<string, unknown>
      };
    } catch (error) {
      this.logger.error('Search failed', { error, options });
      return { total: 0, hits: [] };
    }
  }

  /**
   * Search logs
   */
  async searchLogs(options: SearchOptions): Promise<SearchResult<LogEntry>> {
    return this.search<LogEntry>({
      ...options,
      index: this.indices.logs
    });
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(
    hours: number = 24,
    size: number = 100
  ): Promise<SearchResult<LogEntry>> {
    return this.search<LogEntry>({
      query: '*',
      index: this.indices.logs,
      size,
      filters: { level: 'error' },
      dateRange: {
        field: 'timestamp',
        gte: new Date(Date.now() - hours * 60 * 60 * 1000)
      },
      sort: [{ field: 'timestamp', order: 'desc' }]
    });
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Get communication statistics
   */
  async getCommunicationStats(
    campaignId?: string,
    dateRange?: { gte: Date; lte: Date }
  ): Promise<{
    total: number;
    byChannel: Record<string, number>;
    byStatus: Record<string, number>;
    byDirection: Record<string, number>;
  }> {
    if (!this.enabled || !this.client) {
      return { total: 0, byChannel: {}, byStatus: {}, byDirection: {} };
    }

    try {
      const filter: unknown[] = [];
      
      if (campaignId) {
        filter.push({ term: { campaignId } });
      }
      
      if (dateRange) {
        filter.push({
          range: {
            timestamp: {
              gte: dateRange.gte.toISOString(),
              lte: dateRange.lte.toISOString()
            }
          }
        });
      }

      const response = await this.client.search({
        index: this.indices.communications,
        body: {
          size: 0,
          query: filter.length > 0 ? { bool: { filter } } : { match_all: {} },
          aggs: {
            byChannel: { terms: { field: 'channel' } },
            byStatus: { terms: { field: 'status' } },
            byDirection: { terms: { field: 'direction' } }
          }
        }
      });

      const total = typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value || 0;

      const aggs = response.aggregations as any;

      return {
        total,
        byChannel: this.bucketsToRecord(aggs?.byChannel?.buckets),
        byStatus: this.bucketsToRecord(aggs?.byStatus?.buckets),
        byDirection: this.bucketsToRecord(aggs?.byDirection?.buckets)
      };
    } catch (error) {
      this.logger.error('Failed to get communication stats', { error });
      return { total: 0, byChannel: {}, byStatus: {}, byDirection: {} };
    }
  }

  /**
   * Get log level distribution
   */
  async getLogLevelDistribution(
    hours: number = 24
  ): Promise<Record<string, number>> {
    if (!this.enabled || !this.client) {
      return {};
    }

    try {
      const response = await this.client.search({
        index: this.indices.logs,
        body: {
          size: 0,
          query: {
            range: {
              timestamp: {
                gte: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
              }
            }
          },
          aggs: {
            byLevel: { terms: { field: 'level' } }
          }
        }
      });

      const aggs = response.aggregations as any;
      return this.bucketsToRecord(aggs?.byLevel?.buckets);
    } catch (error) {
      this.logger.error('Failed to get log level distribution', { error });
      return {};
    }
  }

  // ============================================================================
  // Utility
  // ============================================================================

  /**
   * Convert ES buckets to record
   */
  private bucketsToRecord(buckets: Array<{ key: string; doc_count: number }> = []): Record<string, number> {
    return buckets.reduce((acc, bucket) => {
      acc[bucket.key] = bucket.doc_count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.enabled && this.initialized;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; status?: string }> {
    if (!this.enabled || !this.client) {
      return { healthy: false, status: 'disabled' };
    }

    try {
      const health = await this.client.cluster.health();
      return { 
        healthy: health.status !== 'red', 
        status: health.status 
      };
    } catch (error) {
      return { healthy: false, status: 'error' };
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.initialized = false;
    }
  }
}

/**
 * Get singleton instance
 */
export function getElasticsearchService(): ElasticsearchService {
  return ElasticsearchService.getInstance();
}
