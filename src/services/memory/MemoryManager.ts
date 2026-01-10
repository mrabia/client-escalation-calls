import { ShortTermMemory, SessionContext } from './ShortTermMemory';
import { LongTermMemory, EpisodicMemory, SemanticMemory } from './LongTermMemory';
import { Logger } from '@/utils/logger';
import { Message } from '@/types';

/**
 * Memory Query Options
 */
export interface MemoryQueryOptions {
  // Query text
  query: string;
  
  // Context filters
  customerId?: string;
  campaignId?: string;
  agentType?: 'email' | 'phone' | 'sms';
  
  // Search parameters
  limit?: number;
  includeEpisodic?: boolean;
  includeSemantic?: boolean;
  
  // Filters
  successOnly?: boolean;
  minConfidence?: number;
  customerRisk?: string;
}

/**
 * Memory Query Result
 */
export interface MemoryQueryResult {
  // Short-term context
  currentSession?: SessionContext;
  
  // Long-term memories
  episodicMemories: EpisodicMemory[];
  semanticMemories: SemanticMemory[];
  
  // Metadata
  totalResults: number;
  queryTime: number;
}

/**
 * Memory Storage Options
 */
export interface MemoryStorageOptions {
  // Session data
  sessionId: string;
  customerId: string;
  campaignId: string;
  agentType: 'email' | 'phone' | 'sms';
  
  // Conversation
  messages: Message[];
  duration?: number;
  
  // Outcome
  outcome?: {
    success: boolean;
    paymentReceived: boolean;
    amount?: number;
    nextAction?: string;
  };
  
  // Context
  context?: {
    customerRisk?: string;
    paymentHistory?: string;
    previousAttempts?: number;
  };
  
  // Metadata
  tags?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

/**
 * Memory Manager
 * 
 * Unified interface for agents to interact with the memory system.
 * Coordinates between short-term (Redis) and long-term (Qdrant) memory.
 */
export class MemoryManager {
  private shortTerm: ShortTermMemory;
  private longTerm: LongTermMemory;
  private logger: Logger;
  private initialized: boolean = false;

  constructor() {
    this.shortTerm = new ShortTermMemory();
    this.longTerm = new LongTermMemory();
    this.logger = new Logger('MemoryManager');
  }

  /**
   * Initialize the memory manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Memory manager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing memory manager...');
      
      // Initialize short-term memory (Redis)
      await this.shortTerm.connect();
      this.logger.info('Short-term memory connected');
      
      // Initialize long-term memory (Qdrant)
      await this.longTerm.initialize();
      this.logger.info('Long-term memory initialized');
      
      this.initialized = true;
      this.logger.info('Memory manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize memory manager', error);
      throw new Error(`Memory manager initialization failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Ensure the memory manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Memory manager not initialized. Call initialize() first.');
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Query memories for context
   * 
   * This is the main method agents use to retrieve relevant context.
   */
  async query(options: MemoryQueryOptions): Promise<MemoryQueryResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      const {
        query,
        customerId,
        campaignId,
        agentType,
        limit = 5,
        includeEpisodic = true,
        includeSemantic = true,
        successOnly,
        minConfidence = 0.7,
        customerRisk
      } = options;

      this.logger.debug(`Querying memories: "${query}"`);

      // 1. Get current session from short-term memory
      let currentSession: SessionContext | undefined;
      if (customerId && agentType) {
        const sessions = await this.shortTerm.getCustomerSessions(customerId);
        currentSession = sessions.find(s => s.agentType === agentType);
      }

      // 2. Search episodic memories (past interactions)
      let episodicMemories: EpisodicMemory[] = [];
      if (includeEpisodic) {
        episodicMemories = await this.longTerm.searchEpisodicMemories({
          query,
          limit,
          filter: {
            customerId,
            agentType,
            customerRisk,
            successOnly
          }
        });
      }

      // 3. Search semantic memories (strategies and patterns)
      let semanticMemories: SemanticMemory[] = [];
      if (includeSemantic) {
        semanticMemories = await this.longTerm.searchSemanticMemories({
          query,
          limit: Math.ceil(limit / 2), // Fewer semantic results
          minConfidence
        });
      }

      const queryTime = Date.now() - startTime;
      const totalResults = episodicMemories.length + semanticMemories.length;

      this.logger.debug(`Query completed in ${queryTime}ms, found ${totalResults} results`);

      return {
        currentSession,
        episodicMemories,
        semanticMemories,
        totalResults,
        queryTime
      };

    } catch (error) {
      this.logger.error('Memory query failed', error);
      throw new Error(`Memory query failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Get current session context
   */
  async getCurrentSession(sessionId: string): Promise<SessionContext | null> {
    this.ensureInitialized();
    
    try {
      return await this.shortTerm.getSession(sessionId);
    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}`, error);
      return null;
    }
  }

  /**
   * Get all sessions for a customer
   */
  async getCustomerSessions(customerId: string): Promise<SessionContext[]> {
    this.ensureInitialized();
    
    try {
      return await this.shortTerm.getCustomerSessions(customerId);
    } catch (error) {
      this.logger.error(`Failed to get sessions for customer ${customerId}`, error);
      return [];
    }
  }

  // ============================================================================
  // Storage Methods
  // ============================================================================

  /**
   * Store a new session in short-term memory
   */
  async storeSession(options: MemoryStorageOptions): Promise<string> {
    this.ensureInitialized();
    
    try {
      const {
        sessionId,
        customerId,
        campaignId,
        agentType,
        messages,
        context
      } = options;

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await this.shortTerm.storeSession({
        sessionId,
        customerId,
        campaignId,
        agentType,
        conversationHistory: messages,
        currentState: 'active',
        metadata: context || {},
        createdAt: new Date(),
        expiresAt
      });

      this.logger.debug(`Stored session ${sessionId} for customer ${customerId}`);
      return sessionId;

    } catch (error) {
      this.logger.error('Failed to store session', error);
      throw new Error(`Session storage failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Update an existing session
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionContext>
  ): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.shortTerm.updateSession(sessionId, updates);
      this.logger.debug(`Updated session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to update session ${sessionId}`, error);
      throw new Error(`Session update failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Store a completed interaction in long-term memory
   */
  async storeInteraction(options: MemoryStorageOptions): Promise<string> {
    this.ensureInitialized();
    
    try {
      const {
        customerId,
        campaignId,
        agentType,
        messages,
        duration = 0,
        outcome,
        context,
        tags = [],
        sentiment = 'neutral'
      } = options;

      // Store as episodic memory
      const memoryId = await this.longTerm.storeEpisodicMemory({
        type: 'episodic',
        timestamp: new Date(),
        customerId,
        campaignId,
        agentType,
        conversation: {
          messages,
          duration,
          channel: agentType
        },
        outcome: outcome || {
          success: false,
          paymentReceived: false
        },
        context: {
          customerRisk: context?.customerRisk || 'unknown',
          paymentHistory: context?.paymentHistory || 'unknown',
          previousAttempts: context?.previousAttempts || 0
        },
        tags,
        sentiment
      });

      this.logger.info(`Stored interaction ${memoryId} for customer ${customerId}`);
      return memoryId;

    } catch (error) {
      this.logger.error('Failed to store interaction', error);
      throw new Error(`Interaction storage failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Store a learned strategy in semantic memory
   */
  async storeStrategy(strategy: Omit<SemanticMemory, 'id' | 'embedding'>): Promise<string> {
    this.ensureInitialized();
    
    try {
      const memoryId = await this.longTerm.storeSemanticMemory(strategy);
      this.logger.info(`Stored strategy: ${strategy.title}`);
      return memoryId;
    } catch (error) {
      this.logger.error('Failed to store strategy', error);
      throw new Error(`Strategy storage failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  // ============================================================================
  // Consolidation Methods
  // ============================================================================

  /**
   * Consolidate a session from short-term to long-term memory
   * 
   * This should be called when a session completes successfully.
   */
  async consolidateSession(sessionId: string, outcome: {
    success: boolean;
    paymentReceived: boolean;
    amount?: number;
    nextAction?: string;
  }): Promise<string> {
    this.ensureInitialized();
    
    try {
      // 1. Get session from short-term memory
      const session = await this.shortTerm.getSession(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // 2. Store in long-term memory
      const memoryId = await this.storeInteraction({
        sessionId,
        customerId: session.customerId,
        campaignId: session.campaignId,
        agentType: session.agentType,
        messages: session.conversationHistory,
        outcome,
        context: session.metadata,
        tags: outcome.success ? ['successful'] : ['unsuccessful'],
        sentiment: outcome.success ? 'positive' : 'neutral'
      });

      // 3. Delete from short-term memory
      await this.shortTerm.deleteSession(sessionId);

      this.logger.info(`Consolidated session ${sessionId} to memory ${memoryId}`);
      return memoryId;

    } catch (error) {
      this.logger.error(`Failed to consolidate session ${sessionId}`, error);
      throw new Error(`Session consolidation failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    shortTerm: {
      activeSessions: number;
      totalKeys: number;
    };
    longTerm: {
      episodicCount: number;
      semanticCount: number;
    };
  }> {
    this.ensureInitialized();
    
    try {
      const [shortTermStats, longTermStats] = await Promise.all([
        this.shortTerm.getStats(),
        this.longTerm.getStats()
      ]);

      return {
        shortTerm: {
          activeSessions: shortTermStats.sessionCount,
          totalKeys: shortTermStats.totalKeys
        },
        longTerm: longTermStats
      };

    } catch (error) {
      this.logger.error('Failed to get stats', error);
      throw new Error(`Stats retrieval failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    shortTerm: boolean;
    longTerm: boolean;
    overall: boolean;
  }> {
    try {
      const [shortTermHealth, longTermHealth] = await Promise.all([
        this.shortTerm.healthCheck(),
        this.longTerm.healthCheck()
      ]);

      return {
        shortTerm: shortTermHealth,
        longTerm: longTermHealth,
        overall: shortTermHealth && longTermHealth
      };

    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        shortTerm: false,
        longTerm: false,
        overall: false
      };
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    try {
      await Promise.all([
        this.shortTerm.close(),
        this.longTerm.close()
      ]);
      
      this.initialized = false;
      this.logger.info('Memory manager closed');

    } catch (error) {
      this.logger.error('Failed to close memory manager', error);
      throw new Error(`Memory manager close failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }
}
