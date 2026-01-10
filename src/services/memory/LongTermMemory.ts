import { QdrantClient } from './QdrantClient';
import { EmbeddingService } from './EmbeddingService';
import { createLogger, Logger } from '@/utils/logger';
import { Message } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Episodic Memory - Specific interaction episodes
 */
export interface EpisodicMemory {
  id: string;
  type: 'episodic';
  timestamp: Date;
  customerId: string;
  campaignId: string;
  agentType: 'email' | 'phone' | 'sms';
  
  // Conversation details
  conversation: {
    messages: Message[];
    duration: number;
    channel: string;
  };
  
  // Alternative conversation format
  conversationHistory?: Message[];
  
  // Outcome
  outcome: {
    success: boolean;
    paymentReceived: boolean;
    amount?: number;
    nextAction?: string;
  };
  
  // Context
  context: {
    customerRisk: string;
    paymentHistory: string;
    previousAttempts: number;
  };
  
  // Vector embedding
  embedding: number[];
  
  // Metadata
  tags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * Semantic Memory - Generalized knowledge and patterns
 */
export interface SemanticMemory {
  id: string;
  type: 'semantic';
  category: 'strategy' | 'pattern' | 'best_practice';
  
  // Knowledge content
  title: string;
  description: string;
  content: string;
  
  // Evidence
  derivedFrom: string[]; // IDs of episodic memories
  successRate: number;
  timesApplied: number;
  
  // Applicability
  applicableWhen: {
    customerRisk?: string[];
    paymentRange?: { min: number; max: number };
    daysSinceOverdue?: number;
    previousAttempts?: number;
  };
  
  // Vector embedding
  embedding: number[];
  
  // Metadata
  createdAt: Date;
  lastUpdated: Date;
  confidence: number; // 0-1
}

/**
 * Long-Term Memory Service
 * 
 * Persistent storage of learned patterns and experiences using Qdrant vector database.
 */
export class LongTermMemory {
  private qdrant: QdrantClient;
  private embedding: EmbeddingService;
  private logger: Logger;

  constructor() {
    this.qdrant = new QdrantClient();
    this.embedding = new EmbeddingService();
    this.logger = createLogger('LongTermMemory');
  }

  /**
   * Initialize the long-term memory system
   */
  async initialize(): Promise<void> {
    try {
      await this.qdrant.initialize();
      this.logger.info('Long-term memory initialized');
    } catch (error) {
      this.logger.error('Failed to initialize long-term memory', error);
      throw error;
    }
  }

  // ============================================================================
  // Episodic Memory Methods
  // ============================================================================

  /**
   * Store an episodic memory
   */
  async storeEpisodicMemory(memory: Omit<EpisodicMemory, 'id' | 'embedding'>): Promise<string> {
    try {
      const id = uuidv4();
      
      // Generate embedding for the conversation
      const embedding = await this.embedding.embedConversation(
        memory.conversation.messages
      );

      const fullMemory: EpisodicMemory = {
        ...memory,
        id,
        embedding
      };

      // Store in Qdrant
      await this.qdrant.upsert('episodic_memories', {
        id,
        vector: embedding,
        payload: {
          type: 'episodic',
          timestamp: memory.timestamp.toISOString(),
          customerId: memory.customerId,
          campaignId: memory.campaignId,
          agentType: memory.agentType,
          conversation: memory.conversation,
          outcome: memory.outcome,
          context: memory.context,
          tags: memory.tags,
          sentiment: memory.sentiment
        }
      });

      this.logger.info(`Stored episodic memory ${id}`);
      return id;

    } catch (error) {
      this.logger.error('Failed to store episodic memory', error);
      throw new Error(`Episodic memory storage failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Search for similar episodic memories
   */
  async searchEpisodicMemories(options: {
    query: string;
    limit?: number;
    filter?: {
      customerId?: string;
      agentType?: string;
      customerRisk?: string;
      successOnly?: boolean;
      paymentReceived?: boolean;
    };
  }): Promise<EpisodicMemory[]> {
    try {
      const { query, limit = 5, filter } = options;

      // Generate query embedding
      const queryEmbedding = await this.embedding.generateEmbedding(query);

      // Build Qdrant filter
      const qdrantFilter: any = { must: [] };

      if (filter) {
        if (filter.customerId) {
          qdrantFilter.must.push({
            key: 'customerId',
            match: { value: filter.customerId }
          });
        }

        if (filter.agentType) {
          qdrantFilter.must.push({
            key: 'agentType',
            match: { value: filter.agentType }
          });
        }

        if (filter.customerRisk) {
          qdrantFilter.must.push({
            key: 'context.customerRisk',
            match: { value: filter.customerRisk }
          });
        }

        if (filter.successOnly !== undefined) {
          qdrantFilter.must.push({
            key: 'outcome.success',
            match: { value: filter.successOnly }
          });
        }

        if (filter.paymentReceived !== undefined) {
          qdrantFilter.must.push({
            key: 'outcome.paymentReceived',
            match: { value: filter.paymentReceived }
          });
        }
      }

      // Search
      const results = await this.qdrant.search({
        collection: 'episodic_memories',
        vector: queryEmbedding,
        limit,
        filter: qdrantFilter.must.length > 0 ? qdrantFilter : undefined,
        scoreThreshold: 0.7 // Only return relevant results
      });

      // Convert to EpisodicMemory objects
      const memories: EpisodicMemory[] = results.map(r => ({
        id: r.id,
        type: 'episodic',
        timestamp: new Date(r.payload.timestamp),
        customerId: r.payload.customerId,
        campaignId: r.payload.campaignId,
        agentType: r.payload.agentType,
        conversation: r.payload.conversation,
        outcome: r.payload.outcome,
        context: r.payload.context,
        embedding: [], // Don't return embedding to save memory
        tags: r.payload.tags,
        sentiment: r.payload.sentiment
      }));

      this.logger.debug(`Found ${memories.length} similar episodic memories`);
      return memories;

    } catch (error) {
      this.logger.error('Failed to search episodic memories', error);
      throw new Error(`Episodic memory search failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Get episodic memory by ID
   */
  async getEpisodicMemory(id: string): Promise<EpisodicMemory | null> {
    try {
      const point = await this.qdrant.getPoint('episodic_memories', id);

      if (!point) {
        return null;
      }

      return {
        id: point.id,
        type: 'episodic',
        timestamp: new Date(point.payload.timestamp),
        customerId: point.payload.customerId,
        campaignId: point.payload.campaignId,
        agentType: point.payload.agentType,
        conversation: point.payload.conversation,
        outcome: point.payload.outcome,
        context: point.payload.context,
        embedding: point.vector,
        tags: point.payload.tags,
        sentiment: point.payload.sentiment
      };

    } catch (error) {
      this.logger.error(`Failed to get episodic memory ${id}`, error);
      throw new Error(`Episodic memory retrieval failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  // ============================================================================
  // Semantic Memory Methods
  // ============================================================================

  /**
   * Store a semantic memory
   */
  async storeSemanticMemory(memory: Omit<SemanticMemory, 'id' | 'embedding'>): Promise<string> {
    try {
      const id = uuidv4();

      // Generate embedding for the semantic memory
      const embedding = await this.embedding.embedMemory({
        title: memory.title,
        description: memory.description,
        content: memory.content
      });

      const fullMemory: SemanticMemory = {
        ...memory,
        id,
        embedding
      };

      // Store in Qdrant
      await this.qdrant.upsert('semantic_memories', {
        id,
        vector: embedding,
        payload: {
          type: 'semantic',
          category: memory.category,
          title: memory.title,
          description: memory.description,
          content: memory.content,
          derivedFrom: memory.derivedFrom,
          successRate: memory.successRate,
          timesApplied: memory.timesApplied,
          applicableWhen: memory.applicableWhen,
          createdAt: memory.createdAt.toISOString(),
          lastUpdated: memory.lastUpdated.toISOString(),
          confidence: memory.confidence
        }
      });

      this.logger.info(`Stored semantic memory ${id}: ${memory.title}`);
      return id;

    } catch (error) {
      this.logger.error('Failed to store semantic memory', error);
      throw new Error(`Semantic memory storage failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Search for relevant semantic memories
   */
  async searchSemanticMemories(options: {
    query: string;
    limit?: number;
    category?: 'strategy' | 'pattern' | 'best_practice';
    minConfidence?: number;
    applicableFor?: {
      customerRisk?: string;
      paymentAmount?: number;
      daysSinceOverdue?: number;
    };
  }): Promise<SemanticMemory[]> {
    try {
      const { query, limit = 3, category, minConfidence = 0.7, applicableFor } = options;

      // Generate query embedding
      const queryEmbedding = await this.embedding.generateEmbedding(query);

      // Build Qdrant filter
      const qdrantFilter: any = { must: [] };

      if (category) {
        qdrantFilter.must.push({
          key: 'category',
          match: { value: category }
        });
      }

      if (minConfidence) {
        qdrantFilter.must.push({
          key: 'confidence',
          range: { gte: minConfidence }
        });
      }

      // Add applicability filters
      if (applicableFor?.customerRisk) {
        qdrantFilter.must.push({
          key: 'applicability.customerTypes',
          match: { any: [applicableFor.customerRisk] }
        });
      }

      if (applicableFor?.paymentAmount) {
        qdrantFilter.must.push({
          key: 'applicability.paymentAmountRange.min',
          range: { lte: applicableFor.paymentAmount }
        });
        qdrantFilter.must.push({
          key: 'applicability.paymentAmountRange.max',
          range: { gte: applicableFor.paymentAmount }
        });
      }

      if (applicableFor?.daysSinceOverdue) {
        qdrantFilter.must.push({
          key: 'applicability.daysSinceOverdue',
          range: { lte: applicableFor.daysSinceOverdue }
        });
      }

      // Search
      const results = await this.qdrant.search({
        collection: 'semantic_memories',
        vector: queryEmbedding,
        limit,
        filter: qdrantFilter.must.length > 0 ? qdrantFilter : undefined,
        scoreThreshold: 0.7
      });

      // Convert to SemanticMemory objects
      const memories: SemanticMemory[] = results.map(r => ({
        id: r.id,
        type: 'semantic',
        category: r.payload.category,
        title: r.payload.title,
        description: r.payload.description,
        content: r.payload.content,
        derivedFrom: r.payload.derivedFrom,
        successRate: r.payload.successRate,
        timesApplied: r.payload.timesApplied,
        applicableWhen: r.payload.applicableWhen,
        embedding: [], // Don't return embedding
        createdAt: new Date(r.payload.createdAt),
        lastUpdated: new Date(r.payload.lastUpdated),
        confidence: r.payload.confidence
      }));

      this.logger.debug(`Found ${memories.length} relevant semantic memories`);
      return memories;

    } catch (error) {
      this.logger.error('Failed to search semantic memories', error);
      throw new Error(`Semantic memory search failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Update semantic memory usage statistics
   */
  async updateSemanticMemoryUsage(id: string, success: boolean): Promise<void> {
    try {
      const memory = await this.qdrant.getPoint('semantic_memories', id);

      if (!memory) {
        throw new Error(`Semantic memory ${id} not found`);
      }

      const timesApplied = memory.payload.timesApplied + 1;
      const successCount = success 
        ? Math.round(memory.payload.successRate * memory.payload.timesApplied) + 1
        : Math.round(memory.payload.successRate * memory.payload.timesApplied);
      
      const successRate = successCount / timesApplied;

      // Update in Qdrant
      await this.qdrant.upsert('semantic_memories', {
        id,
        vector: memory.vector,
        payload: {
          ...memory.payload,
          timesApplied,
          successRate,
          lastUpdated: new Date().toISOString()
        }
      });

      this.logger.debug(`Updated semantic memory ${id} usage stats`);

    } catch (error) {
      this.logger.error(`Failed to update semantic memory ${id}`, error);
      throw new Error(`Semantic memory update failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Delete old episodic memories (data retention)
   */
  async deleteOldMemories(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // First, count how many will be deleted
      const countResult = await this.qdrant.scroll({
        collection: 'episodic_memories',
        filter: {
          must: [{
            key: 'timestamp',
            range: { lt: cutoffDate.toISOString() }
          }]
        },
        limit: 1,
        with_payload: false,
        with_vector: false
      });

      const totalCount = countResult.points.length > 0 ? countResult.points[0].id : 0;

      // Delete the memories
      const deleteResult = await this.qdrant.deleteByFilter('episodic_memories', {
        must: [{
          key: 'timestamp',
          range: { lt: cutoffDate.toISOString() }
        }]
      });

      const deletedCount = typeof deleteResult === 'object' && 'deleted' in deleteResult 
        ? deleteResult.deleted 
        : totalCount;

      this.logger.info(`Deleted ${deletedCount} episodic memories older than ${olderThanDays} days`);
      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to delete old memories', error);
      throw new Error(`Memory deletion failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    episodicCount: number;
    semanticCount: number;
  }> {
    try {
      const episodicInfo = await this.qdrant.getCollectionInfo('episodic_memories');
      const semanticInfo = await this.qdrant.getCollectionInfo('semantic_memories');

      return {
        episodicCount: episodicInfo.pointsCount,
        semanticCount: semanticInfo.pointsCount
      };

    } catch (error) {
      this.logger.error('Failed to get stats', error);
      throw new Error(`Stats retrieval failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.qdrant.healthCheck();
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.qdrant.close();
    this.logger.info('Long-term memory closed');
  }
}
