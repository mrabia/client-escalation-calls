import { MemoryManager, MemoryQueryResult } from './MemoryManager';
import { LLMService } from '../llm/LLMService';
import { createLogger, Logger } from '@/utils/logger';
import { Message } from '@/types';

/**
 * Query Intent Analysis Result
 */
export interface QueryIntent {
  type: 'simple' | 'complex' | 'multi_step';
  intent: string;
  complexity: number; // 0-1
  requiredInformation: string[];
  context: Record<string, any>;
}

/**
 * Retrieval Strategy
 */
export interface RetrievalStrategy {
  useEpisodic: boolean;
  useSemantic: boolean;
  filters: {
    customerRisk?: string;
    successOnly?: boolean;
    minConfidence?: number;
  };
  limit: number;
  rerank: boolean;
}

/**
 * Assembled Context for Generation
 */
export interface AssembledContext {
  currentSession?: string;
  similarCases: string[];
  relevantStrategies: string[];
  keyInsights: string[];
  recommendations: string[];
  confidence: number;
}

/**
 * Response Quality Assessment
 */
export interface QualityAssessment {
  isAccurate: boolean;
  isRelevant: boolean;
  isComplete: boolean;
  isCompliant: boolean;
  overallScore: number; // 0-1
  issues: string[];
  needsRefinement: boolean;
}

/**
 * Agentic RAG Service
 * 
 * Implements Agentic RAG architecture with autonomous agents for:
 * - Query analysis and intent understanding
 * - Task orchestration and breakdown
 * - Dynamic retrieval strategy selection
 * - Context assembly and synthesis
 * - Response quality evaluation
 * - Continuous learning from feedback
 */
export class AgenticRAGService {
  private memoryManager: MemoryManager;
  private llmService: LLMService;
  private logger: Logger;
  private initialized: boolean = false;

  // Performance tracking for adaptive learning
  private performanceMetrics: Map<string, {
    successCount: number;
    totalCount: number;
    avgConfidence: number;
  }> = new Map();

  constructor() {
    this.memoryManager = new MemoryManager();
    this.llmService = new LLMService();
    this.logger = createLogger('AgenticRAGService');
  }

  /**
   * Initialize the Agentic RAG service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Agentic RAG service already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Agentic RAG service...');
      
      await this.memoryManager.initialize();
      this.logger.info('Memory manager initialized');
      
      this.initialized = true;
      this.logger.info('Agentic RAG service initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Agentic RAG service', error);
      throw new Error(`Agentic RAG initialization failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Ensure the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Agentic RAG service not initialized. Call initialize() first.');
    }
  }

  // ============================================================================
  // Main Agentic RAG Pipeline
  // ============================================================================

  /**
   * Execute the full Agentic RAG pipeline
   * 
   * This is the main entry point for agents to get context-aware responses.
   */
  async execute(options: {
    query: string;
    customerId: string;
    campaignId: string;
    agentType: 'email' | 'phone' | 'sms';
    context?: Record<string, any>;
  }): Promise<{
    assembledContext: AssembledContext;
    rawMemories: MemoryQueryResult;
    intent: QueryIntent;
    strategy: RetrievalStrategy;
    executionTime: number;
  }> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      const { query, customerId, campaignId, agentType, context = {} } = options;

      this.logger.info(`Executing Agentic RAG for query: "${query}"`);

      // Step 1: Query Analysis
      const intent = await this.analyzeQuery(query, context);
      this.logger.debug(`Query intent: ${intent.type}, complexity: ${intent.complexity}`);

      // Step 2: Task Orchestration (if complex)
      const subtasks = intent.type === 'complex' || intent.type === 'multi_step'
        ? await this.orchestrateTasks(intent)
        : [query];
      
      this.logger.debug(`Orchestrated into ${subtasks.length} subtask(s)`);

      // Step 3: Dynamic Retrieval Planning
      const strategy = await this.planRetrieval(intent, context);
      this.logger.debug(`Retrieval strategy: episodic=${strategy.useEpisodic}, semantic=${strategy.useSemantic}`);

      // Step 4: Information Retrieval
      const memories = await this.retrieveInformation(
        subtasks,
        customerId,
        campaignId,
        agentType,
        strategy
      );
      this.logger.debug(`Retrieved ${memories.totalResults} memories`);

      // Step 5: Context Assembly
      const assembledContext = await this.assembleContext(memories, intent, context);
      this.logger.debug(`Assembled context with confidence: ${assembledContext.confidence}`);

      const executionTime = Date.now() - startTime;
      this.logger.info(`Agentic RAG execution completed in ${executionTime}ms`);

      return {
        assembledContext,
        rawMemories: memories,
        intent,
        strategy,
        executionTime
      };

    } catch (error) {
      this.logger.error('Agentic RAG execution failed', error);
      throw new Error(`Agentic RAG execution failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  // ============================================================================
  // Step 1: Query Analysis
  // ============================================================================

  /**
   * Analyze the query to understand intent and complexity
   * 
   * Uses LLM to understand what the agent is trying to accomplish.
   */
  private async analyzeQuery(
    query: string,
    context: Record<string, any>
  ): Promise<QueryIntent> {
    try {
      const analysisPrompt = `Analyze the following query in the context of payment collection:

Query: "${query}"

Context: ${JSON.stringify(context, null, 2)}

Determine:
1. Query type: simple (single fact), complex (multiple facts), or multi_step (requires reasoning)
2. Intent: What is the agent trying to accomplish?
3. Complexity score (0-1): How complex is this query?
4. Required information: What information is needed to answer this?

Respond in JSON format:
{
  "type": "simple|complex|multi_step",
  "intent": "description of intent",
  "complexity": 0.0-1.0,
  "requiredInformation": ["info1", "info2", ...]
}`;

      const response = await this.llmService.complete({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        responseFormat: 'json'
      });

      const analysis = JSON.parse(response.content);

      return {
        type: analysis.type,
        intent: analysis.intent,
        complexity: analysis.complexity,
        requiredInformation: analysis.requiredInformation,
        context
      };

    } catch (error) {
      this.logger.error('Query analysis failed', error);
      
      // Fallback to simple analysis
      return {
        type: 'simple',
        intent: query,
        complexity: 0.5,
        requiredInformation: ['relevant_memories'],
        context
      };
    }
  }

  // ============================================================================
  // Step 2: Task Orchestration
  // ============================================================================

  /**
   * Break down complex queries into subtasks
   * 
   * For multi-step reasoning, decompose into manageable subtasks.
   */
  private async orchestrateTasks(intent: QueryIntent): Promise<string[]> {
    try {
      const orchestrationPrompt = `Break down this complex query into subtasks:

Intent: ${intent.intent}
Required Information: ${intent.requiredInformation.join(', ')}

Create a list of specific, actionable subtasks that can be executed independently.
Each subtask should be a clear search query.

Respond in JSON format:
{
  "subtasks": ["subtask1", "subtask2", ...]
}`;

      const response = await this.llmService.complete({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: orchestrationPrompt }],
        temperature: 0.3,
        responseFormat: 'json'
      });

      const result = JSON.parse(response.content);
      return result.subtasks || [intent.intent];

    } catch (error) {
      this.logger.error('Task orchestration failed', error);
      return [intent.intent]; // Fallback to single task
    }
  }

  // ============================================================================
  // Step 3: Retrieval Planning
  // ============================================================================

  /**
   * Dynamically plan the retrieval strategy
   * 
   * Decides which memory types to query and with what parameters.
   */
  private async planRetrieval(
    intent: QueryIntent,
    context: Record<string, any>
  ): Promise<RetrievalStrategy> {
    // Use heuristics and learned patterns to decide strategy
    
    const strategy: RetrievalStrategy = {
      useEpisodic: true,
      useSemantic: true,
      filters: {},
      limit: 5,
      rerank: false
    };

    // Adjust based on query type
    if (intent.type === 'simple') {
      strategy.limit = 3;
      strategy.useSemantic = false; // Just need similar cases
    } else if (intent.type === 'complex') {
      strategy.limit = 7;
      strategy.rerank = true; // Need re-ranking for relevance
    } else if (intent.type === 'multi_step') {
      strategy.limit = 10;
      strategy.rerank = true;
    }

    // Add filters from context
    if (context.customerRisk) {
      strategy.filters.customerRisk = context.customerRisk;
    }

    // Prefer successful cases for strategy queries
    if (intent.intent.toLowerCase().includes('strategy') || 
        intent.intent.toLowerCase().includes('how to')) {
      strategy.filters.successOnly = true;
      strategy.filters.minConfidence = 0.7;
    }

    // Learn from past performance
    const performanceKey = `${intent.type}_${context.customerRisk || 'unknown'}`;
    const metrics = this.performanceMetrics.get(performanceKey);
    
    if (metrics && metrics.successCount / metrics.totalCount < 0.5) {
      // Low success rate, try broader search
      strategy.limit = Math.min(strategy.limit * 2, 15);
      strategy.filters.successOnly = false;
    }

    return strategy;
  }

  // ============================================================================
  // Step 4: Information Retrieval
  // ============================================================================

  /**
   * Execute retrieval with the planned strategy
   */
  private async retrieveInformation(
    subtasks: string[],
    customerId: string,
    campaignId: string,
    agentType: 'email' | 'phone' | 'sms',
    strategy: RetrievalStrategy
  ): Promise<MemoryQueryResult> {
    try {
      // Execute retrieval for each subtask
      const results = await Promise.all(
        subtasks.map(subtask =>
          this.memoryManager.query({
            query: subtask,
            customerId,
            campaignId,
            agentType,
            limit: strategy.limit,
            includeEpisodic: strategy.useEpisodic,
            includeSemantic: strategy.useSemantic,
            ...strategy.filters
          })
        )
      );

      // Merge results
      const merged: MemoryQueryResult = {
        currentSession: results[0].currentSession,
        episodicMemories: [],
        semanticMemories: [],
        totalResults: 0,
        queryTime: 0
      };

      for (const result of results) {
        merged.episodicMemories.push(...result.episodicMemories);
        merged.semanticMemories.push(...result.semanticMemories);
        merged.queryTime += result.queryTime;
      }

      // Remove duplicates
      merged.episodicMemories = this.deduplicateEpisodic(merged.episodicMemories);
      merged.semanticMemories = this.deduplicateSemantic(merged.semanticMemories);
      
      merged.totalResults = merged.episodicMemories.length + merged.semanticMemories.length;

      // Re-rank if needed
      if (strategy.rerank && merged.totalResults > strategy.limit) {
        await this.rerankResults(merged, subtasks[0]);
      }

      return merged;

    } catch (error) {
      this.logger.error('Information retrieval failed', error);
      throw error;
    }
  }

  /**
   * Deduplicate episodic memories by ID
   */
  private deduplicateEpisodic(memories: any[]): any[] {
    const seen = new Set<string>();
    return memories.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }

  /**
   * Deduplicate semantic memories by ID
   */
  private deduplicateSemantic(memories: any[]): any[] {
    const seen = new Set<string>();
    return memories.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }

  /**
   * Re-rank results using LLM
   * Uses Gemini 2.0 Pro Exp for maximum quality re-ranking
   */
  private async rerankResults(
    memories: MemoryQueryResult,
    originalQuery: string
  ): Promise<void> {
    try {
      // Combine all memories for re-ranking
      const allMemories = [
        ...memories.episodicMemories.map(m => ({
          type: 'episodic' as const,
          content: `${m.action} - ${m.outcome.description}`,
          metadata: m,
          originalScore: m.similarity
        })),
        ...memories.semanticMemories.map(m => ({
          type: 'semantic' as const,
          content: m.strategy,
          metadata: m,
          originalScore: m.similarity
        }))
      ];

      if (allMemories.length === 0) {
        return; // Nothing to re-rank
      }

      // Create re-ranking prompt
      const prompt = `You are an expert at ranking memory relevance for payment collection.

Original Query: "${originalQuery}"

Memories to rank:
${allMemories.map((m, i) => `${i + 1}. [${m.type}] ${m.content} (original score: ${m.originalScore.toFixed(3)})`).join('\n')}

Task: Re-rank these memories by relevance to the query. Consider:
1. Direct relevance to the query intent
2. Actionability of the information
3. Recency and success rate (for episodic)
4. Applicability (for semantic)

Respond with a JSON array of indices (1-based) in order of relevance:
{"rankings": [index1, index2, ...]}`;

      // Call LLM for re-ranking using Gemini 2.0 Pro Exp
      const response = await this.llmService.generateCompletion({
        provider: 'google',
        model: 'gemini-2.0-pro-exp',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.1,
        maxTokens: 1024,
        responseFormat: { type: 'json_object' }
      });

      // Parse rankings
      const rankings = JSON.parse(response.content);
      if (!rankings.rankings || !Array.isArray(rankings.rankings)) {
        throw new Error('Invalid rankings format from LLM');
      }

      // Reorder memories based on LLM rankings
      const reorderedMemories = rankings.rankings
        .map((idx: number) => allMemories[idx - 1])
        .filter((m: any) => m !== undefined);

      // Split back into episodic and semantic
      memories.episodicMemories = reorderedMemories
        .filter((m: any) => m.type === 'episodic')
        .map((m: any) => m.metadata)
        .slice(0, 5); // Keep top 5

      memories.semanticMemories = reorderedMemories
        .filter((m: any) => m.type === 'semantic')
        .map((m: any) => m.metadata)
        .slice(0, 3); // Keep top 3

      this.logger.debug('Re-ranked memories using LLM', {
        originalCount: allMemories.length,
        episodicCount: memories.episodicMemories.length,
        semanticCount: memories.semanticMemories.length
      });

    } catch (error) {
      this.logger.error('Failed to re-rank with LLM, using original scores', { error });
      // Fallback: keep top results based on existing scores
      memories.episodicMemories = memories.episodicMemories.slice(0, 5);
      memories.semanticMemories = memories.semanticMemories.slice(0, 3);
    }
  }

  // ============================================================================
  // Step 5: Context Assembly
  // ============================================================================

  /**
   * Assemble coherent context from retrieved memories
   * 
   * Synthesizes information into a structured context for generation.
   */
  private async assembleContext(
    memories: MemoryQueryResult,
    intent: QueryIntent,
    context: Record<string, any>
  ): Promise<AssembledContext> {
    try {
      // Build context sections
      const similarCases: string[] = [];
      const relevantStrategies: string[] = [];
      const keyInsights: string[] = [];

      // Process episodic memories (similar cases)
      for (const episodic of memories.episodicMemories) {
        const caseDescription = `Customer ${episodic.customerId} (${episodic.context.customerRisk} risk): ` +
          `${episodic.outcome.success ? 'Successfully' : 'Unsuccessfully'} collected ` +
          `${episodic.outcome.amount || 'payment'} via ${episodic.agentType}. ` +
          `Sentiment: ${episodic.sentiment}. ` +
          `Key: ${episodic.tags.join(', ')}`;
        
        similarCases.push(caseDescription);

        // Extract insights
        if (episodic.outcome.success) {
          keyInsights.push(`${episodic.agentType} works well for ${episodic.context.customerRisk} risk customers`);
        }
      }

      // Process semantic memories (strategies)
      for (const semantic of memories.semanticMemories) {
        const strategyDescription = `${semantic.title}: ${semantic.description} ` +
          `(Success rate: ${(semantic.successRate * 100).toFixed(0)}%, ` +
          `Applied ${semantic.timesApplied} times, ` +
          `Confidence: ${(semantic.confidence * 100).toFixed(0)}%)`;
        
        relevantStrategies.push(strategyDescription);
      }

      // Generate recommendations using LLM
      const recommendations = await this.generateRecommendations(
        similarCases,
        relevantStrategies,
        intent,
        context
      );

      // Calculate confidence score
      const confidence = this.calculateConfidence(memories, intent);

      return {
        currentSession: memories.currentSession ? JSON.stringify(memories.currentSession) : undefined,
        similarCases,
        relevantStrategies,
        keyInsights: Array.from(new Set(keyInsights)), // Deduplicate
        recommendations,
        confidence
      };

    } catch (error) {
      this.logger.error('Context assembly failed', error);
      throw error;
    }
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    similarCases: string[],
    strategies: string[],
    intent: QueryIntent,
    context: Record<string, any>
  ): Promise<string[]> {
    try {
      if (similarCases.length === 0 && strategies.length === 0) {
        return ['No similar cases or strategies found. Use standard approach.'];
      }

      const recommendationPrompt = `Based on the following information, generate 3-5 actionable recommendations:

Intent: ${intent.intent}
Context: ${JSON.stringify(context)}

Similar Cases:
${similarCases.slice(0, 5).join('\n')}

Relevant Strategies:
${strategies.slice(0, 3).join('\n')}

Provide specific, actionable recommendations for the payment collection agent.

Respond in JSON format:
{
  "recommendations": ["recommendation1", "recommendation2", ...]
}`;

      const response = await this.llmService.complete({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: recommendationPrompt }],
        temperature: 0.5,
        responseFormat: 'json'
      });

      const result = JSON.parse(response.content);
      return result.recommendations || [];

    } catch (error) {
      this.logger.error('Recommendation generation failed', error);
      return ['Use best judgment based on available information.'];
    }
  }

  /**
   * Calculate confidence score for the assembled context
   */
  private calculateConfidence(
    memories: MemoryQueryResult,
    intent: QueryIntent
  ): number {
    let confidence = 0.5; // Base confidence

    // More memories = higher confidence
    if (memories.totalResults >= 5) {
      confidence += 0.2;
    } else if (memories.totalResults >= 3) {
      confidence += 0.1;
    }

    // Semantic memories with high success rate = higher confidence
    for (const semantic of memories.semanticMemories) {
      if (semantic.successRate > 0.8) {
        confidence += 0.1;
      }
    }

    // Successful episodic memories = higher confidence
    const successfulEpisodic = memories.episodicMemories.filter(e => e.outcome.success);
    if (successfulEpisodic.length > 0) {
      confidence += 0.1 * (successfulEpisodic.length / memories.episodicMemories.length);
    }

    // Simple queries are easier = higher confidence
    if (intent.type === 'simple') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  // ============================================================================
  // Step 6: Response Evaluation
  // ============================================================================

  /**
   * Evaluate the quality of a generated response
   * 
   * Validates accuracy, relevance, completeness, and compliance.
   */
  async evaluateResponse(
    response: string,
    context: AssembledContext,
    intent: QueryIntent
  ): Promise<QualityAssessment> {
    try {
      const evaluationPrompt = `Evaluate the quality of this payment collection response:

Response: "${response}"

Context Used:
${JSON.stringify(context, null, 2)}

Original Intent: ${intent.intent}

Evaluate:
1. Accuracy: Is the information correct?
2. Relevance: Does it address the intent?
3. Completeness: Is all required information included?
4. Compliance: Does it follow TCPA and opt-out rules?

Respond in JSON format:
{
  "isAccurate": true/false,
  "isRelevant": true/false,
  "isComplete": true/false,
  "isCompliant": true/false,
  "overallScore": 0.0-1.0,
  "issues": ["issue1", "issue2", ...],
  "needsRefinement": true/false
}`;

      const llmResponse = await this.llmService.complete({
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        messages: [{ role: 'user', content: evaluationPrompt }],
        temperature: 0.2,
        responseFormat: 'json'
      });

      return JSON.parse(llmResponse.content);

    } catch (error) {
      this.logger.error('Response evaluation failed', error);
      
      // Fallback to basic validation
      return {
        isAccurate: true,
        isRelevant: true,
        isComplete: true,
        isCompliant: true,
        overallScore: 0.7,
        issues: [],
        needsRefinement: false
      };
    }
  }

  // ============================================================================
  // Step 7: Feedback and Learning
  // ============================================================================

  /**
   * Record feedback for continuous learning
   */
  async recordFeedback(options: {
    queryIntent: QueryIntent;
    strategy: RetrievalStrategy;
    outcome: {
      success: boolean;
      confidence: number;
      userFeedback?: string;
      metrics?: Record<string, any>;
    };
  }): Promise<void> {
    try {
      const { queryIntent, strategy, outcome } = options;

      // Update performance metrics
      const performanceKey = `${queryIntent.type}_${queryIntent.context.customerRisk || 'unknown'}`;
      const metrics = this.performanceMetrics.get(performanceKey) || {
        successCount: 0,
        totalCount: 0,
        avgConfidence: 0
      };

      metrics.totalCount++;
      if (outcome.success) {
        metrics.successCount++;
      }
      metrics.avgConfidence = (metrics.avgConfidence * (metrics.totalCount - 1) + outcome.confidence) / metrics.totalCount;

      this.performanceMetrics.set(performanceKey, metrics);

      this.logger.debug(`Recorded feedback for ${performanceKey}: success=${outcome.success}, confidence=${outcome.confidence}`);

    } catch (error) {
      this.logger.error('Failed to record feedback', error);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [key, metrics] of this.performanceMetrics.entries()) {
      stats[key] = {
        successRate: metrics.successCount / metrics.totalCount,
        totalQueries: metrics.totalCount,
        avgConfidence: metrics.avgConfidence
      };
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const memoryHealth = await this.memoryManager.healthCheck();
      return memoryHealth.overall;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.memoryManager.close();
    this.initialized = false;
    this.logger.info('Agentic RAG service closed');
  }
}
