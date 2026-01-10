import { MemoryManager } from './MemoryManager';
import { LongTermMemory } from './LongTermMemory';
import { LLMService } from '../llm/LLMService';
import { createLogger } from '@/utils/logger';

/**
 * Memory Consolidation Service
 * 
 * Responsible for:
 * - Converting short-term memories (sessions) into long-term memories
 * - Extracting patterns and strategies from successful interactions
 * - Building semantic memory from episodic experiences
 * - Continuous learning and improvement
 */
export class MemoryConsolidationService {
  private memoryManager: MemoryManager;
  private longTermMemory: LongTermMemory;
  private llmService: LLMService;
  private logger: Logger;
  private consolidationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.memoryManager = new MemoryManager();
    this.longTermMemory = new LongTermMemory();
    this.llmService = new LLMService();
    this.logger = createLogger('MemoryConsolidationService');
  }

  /**
   * Initialize the consolidation service
   */
  async initialize(): Promise<void> {
    try {
      await this.memoryManager.initialize();
      await this.longTermMemory.initialize();
      
      this.logger.info('Memory Consolidation Service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Memory Consolidation Service', error);
      throw error;
    }
  }

  /**
   * Start automatic consolidation (runs periodically)
   */
  startAutoConsolidation(intervalMinutes: number = 60): void {
    if (this.consolidationInterval) {
      this.logger.warn('Auto-consolidation already running');
      return;
    }

    this.logger.info(`Starting auto-consolidation every ${intervalMinutes} minutes`);
    
    this.consolidationInterval = setInterval(async () => {
      try {
        await this.consolidateExpiredSessions();
      } catch (error) {
        this.logger.error('Auto-consolidation failed', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic consolidation
   */
  stopAutoConsolidation(): void {
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
      this.consolidationInterval = null;
      this.logger.info('Auto-consolidation stopped');
    }
  }

  /**
   * Consolidate expired sessions into long-term memory
   */
  async consolidateExpiredSessions(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    try {
      this.logger.info('Starting consolidation of expired sessions...');

      // Get all expired sessions (older than 30 minutes)
      const expiredSessions = await this.memoryManager.getExpiredSessions();
      
      let successful = 0;
      let failed = 0;

      for (const session of expiredSessions) {
        try {
          await this.consolidateSession(session);
          successful++;
        } catch (error) {
          this.logger.error(`Failed to consolidate session ${session.sessionId}`, error);
          failed++;
        }
      }

      this.logger.info(`Consolidation complete: ${successful} successful, ${failed} failed`);

      return {
        processed: expiredSessions.length,
        successful,
        failed
      };

    } catch (error) {
      this.logger.error('Failed to consolidate expired sessions', error);
      throw error;
    }
  }

  /**
   * Consolidate a single session
   */
  private async consolidateSession(session: any): Promise<void> {
    try {
      // Step 1: Analyze the session to extract insights
      const analysis = await this.analyzeSession(session);

      // Step 2: Store as episodic memory (specific interaction)
      await this.longTermMemory.storeEpisodicMemory({
        customerId: session.customerId,
        campaignId: session.campaignId,
        agentType: session.agentType,
        conversationHistory: session.conversationHistory,
        outcome: analysis.outcome,
        sentiment: analysis.sentiment,
        context: session.metadata,
        tags: analysis.tags
      });

      // Step 3: If successful, extract strategy for semantic memory
      if (analysis.outcome.success) {
        await this.extractAndStoreStrategy(session, analysis);
      }

      // Step 4: Delete the session from short-term memory
      await this.memoryManager.deleteSession(session.sessionId);

      this.logger.debug(`Session ${session.sessionId} consolidated successfully`);

    } catch (error) {
      this.logger.error(`Failed to consolidate session ${session.sessionId}`, error);
      throw error;
    }
  }

  /**
   * Analyze a session to extract insights
   */
  private async analyzeSession(session: any): Promise<{
    outcome: {
      success: boolean;
      paymentReceived: boolean;
      paymentAmount?: number;
      paymentDate?: Date;
    };
    sentiment: 'positive' | 'neutral' | 'negative';
    tags: string[];
    keyInsights: string[];
  }> {
    try {
      // Use LLM to analyze the conversation
      const analysisPrompt = `Analyze this payment collection interaction:

Agent Type: ${session.agentType}
Customer Risk: ${session.metadata.customerRisk}
Conversation History:
${JSON.stringify(session.conversationHistory, null, 2)}

Determine:
1. Was the interaction successful? (payment commitment or received)
2. Overall sentiment: positive, neutral, or negative
3. Key tags (e.g., "payment_plan", "hardship", "dispute", "promise_to_pay")
4. Key insights learned from this interaction

Respond in JSON format:
{
  "outcome": {
    "success": true/false,
    "paymentReceived": true/false,
    "paymentAmount": number or null,
    "paymentDate": "ISO date" or null
  },
  "sentiment": "positive|neutral|negative",
  "tags": ["tag1", "tag2", ...],
  "keyInsights": ["insight1", "insight2", ...]
}`;

      const response = await this.llmService.complete({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        responseFormat: 'json'
      });

      const analysis = JSON.parse(response.content);
      
      return analysis;

    } catch (error) {
      this.logger.error('Session analysis failed', error);
      
      // Fallback to basic analysis
      return {
        outcome: {
          success: false,
          paymentReceived: false
        },
        sentiment: 'neutral',
        tags: [session.agentType],
        keyInsights: []
      };
    }
  }

  /**
   * Extract strategy from successful interaction and store in semantic memory
   */
  private async extractAndStoreStrategy(session: any, analysis: any): Promise<void> {
    try {
      // Use LLM to extract the strategy that worked
      const strategyPrompt = `Extract the successful strategy from this interaction:

Agent Type: ${session.agentType}
Customer Risk: ${session.metadata.customerRisk}
Outcome: ${JSON.stringify(analysis.outcome)}
Conversation History:
${JSON.stringify(session.conversationHistory, null, 2)}

What strategy or approach made this interaction successful?
Provide:
1. A title for the strategy
2. A description of the approach
3. When this strategy is most effective (conditions)
4. Key tactics used

Respond in JSON format:
{
  "title": "Strategy title",
  "description": "Detailed description",
  "conditions": ["condition1", "condition2", ...],
  "tactics": ["tactic1", "tactic2", ...]
}`;

      const response = await this.llmService.complete({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: strategyPrompt }],
        temperature: 0.4,
        responseFormat: 'json'
      });

      const strategy = JSON.parse(response.content);

      // Check if this strategy already exists
      const existingStrategy = await this.longTermMemory.findSimilarStrategy(
        strategy.title,
        strategy.description
      );

      if (existingStrategy) {
        // Update existing strategy with new success
        await this.longTermMemory.updateSemanticMemory(existingStrategy.id, {
          timesApplied: existingStrategy.timesApplied + 1,
          successCount: existingStrategy.successCount + 1,
          successRate: (existingStrategy.successCount + 1) / (existingStrategy.timesApplied + 1),
          lastUsed: new Date()
        });

        this.logger.debug(`Updated existing strategy: ${strategy.title}`);

      } else {
        // Store new strategy
        await this.longTermMemory.storeSemanticMemory({
          title: strategy.title,
          description: strategy.description,
          category: 'collection_strategy',
          context: {
            customerRisk: session.metadata.customerRisk,
            agentType: session.agentType,
            conditions: strategy.conditions,
            tactics: strategy.tactics
          },
          successRate: 1.0, // First time, 100% success
          timesApplied: 1,
          confidence: 0.7, // Initial confidence
          relatedConcepts: strategy.tactics
        });

        this.logger.debug(`Stored new strategy: ${strategy.title}`);
      }

    } catch (error) {
      this.logger.error('Failed to extract and store strategy', error);
    }
  }

  /**
   * Manually consolidate a specific session
   */
  async manualConsolidate(sessionId: string, outcome: {
    success: boolean;
    paymentReceived: boolean;
    paymentAmount?: number;
    notes?: string;
  }): Promise<void> {
    try {
      const session = await this.memoryManager.getCurrentSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Add outcome to session metadata
      session.metadata.outcome = outcome;

      // Consolidate
      await this.consolidateSession(session);

      this.logger.info(`Manually consolidated session ${sessionId}`);

    } catch (error) {
      this.logger.error(`Failed to manually consolidate session ${sessionId}`, error);
      throw error;
    }
  }

  /**
   * Analyze patterns across multiple sessions
   */
  async analyzePatterns(options: {
    customerRisk?: string;
    agentType?: 'email' | 'phone' | 'sms';
    timeRange?: { start: Date; end: Date };
  }): Promise<{
    totalInteractions: number;
    successRate: number;
    commonPatterns: string[];
    topStrategies: any[];
    recommendations: string[];
  }> {
    try {
      // Query episodic memories for the specified criteria
      const episodicMemories = await this.longTermMemory.queryEpisodicMemory({
        filters: {
          customerRisk: options.customerRisk,
          agentType: options.agentType,
          timeRange: options.timeRange
        },
        limit: 100
      });

      // Calculate success rate
      const successfulInteractions = episodicMemories.filter(m => m.outcome.success);
      const successRate = successfulInteractions.length / episodicMemories.length;

      // Extract common patterns using LLM
      const patternsPrompt = `Analyze these ${episodicMemories.length} payment collection interactions and identify common patterns:

Successful: ${successfulInteractions.length}
Failed: ${episodicMemories.length - successfulInteractions.length}
Success Rate: ${(successRate * 100).toFixed(1)}%

Sample interactions:
${JSON.stringify(episodicMemories.slice(0, 10), null, 2)}

Identify:
1. Common patterns in successful interactions
2. Common patterns in failed interactions
3. Recommendations for improvement

Respond in JSON format:
{
  "commonPatterns": ["pattern1", "pattern2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...]
}`;

      const response = await this.llmService.complete({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: patternsPrompt }],
        temperature: 0.4,
        responseFormat: 'json'
      });

      const analysis = JSON.parse(response.content);

      // Get top strategies
      const topStrategies = await this.longTermMemory.getTopStrategies(5);

      return {
        totalInteractions: episodicMemories.length,
        successRate,
        commonPatterns: analysis.commonPatterns,
        topStrategies,
        recommendations: analysis.recommendations
      };

    } catch (error) {
      this.logger.error('Pattern analysis failed', error);
      throw error;
    }
  }

  /**
   * Get consolidation statistics
   */
  async getStatistics(): Promise<{
    totalEpisodicMemories: number;
    totalSemanticMemories: number;
    averageSuccessRate: number;
    topStrategies: any[];
  }> {
    try {
      const stats = await this.longTermMemory.getStatistics();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get statistics', error);
      throw error;
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    this.stopAutoConsolidation();
    await this.memoryManager.close();
    await this.longTermMemory.close();
    this.logger.info('Memory Consolidation Service closed');
  }
}
