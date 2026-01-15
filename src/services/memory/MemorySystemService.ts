import { MemoryManager } from './MemoryManager';
import { AgenticRAGService } from './AgenticRAGService';
import { MemoryConsolidationService } from './MemoryConsolidationService';
import { config } from '@/config';
import { createLogger, Logger } from '@/utils/logger';

/**
 * Memory System Service
 * 
 * Singleton service that manages all memory components:
 * - MemoryManager: Unified interface for short/long-term memory
 * - AgenticRAGService: Context assembly for agents
 * - MemoryConsolidationService: Auto-move sessions to long-term memory
 * 
 * Provides a single point of initialization and access for the entire memory system.
 */
export class MemorySystemService {
  private static instance: MemorySystemService | null = null;
  
  private memoryManager: MemoryManager;
  private ragService: AgenticRAGService;
  private consolidationService: MemoryConsolidationService;
  private logger: Logger;
  private initialized: boolean = false;
  
  private constructor() {
    this.memoryManager = new MemoryManager();
    this.ragService = new AgenticRAGService();
    this.consolidationService = new MemoryConsolidationService();
    this.logger = createLogger('MemorySystemService');
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MemorySystemService {
    if (!MemorySystemService.instance) {
      MemorySystemService.instance = new MemorySystemService();
    }
    return MemorySystemService.instance;
  }
  
  /**
   * Initialize all memory system components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Memory system already initialized');
      return;
    }
    
    // Check if memory features are enabled
    if (!config.features.vectorMemory) {
      this.logger.info('Vector memory feature is disabled - memory system will not initialize');
      return;
    }
    
    try {
      this.logger.info('Initializing memory system...');
      
      // Initialize memory manager (connects to Redis and Qdrant)
      await this.memoryManager.initialize();
      this.logger.info('Memory manager initialized');
      
      // Initialize RAG service (uses memory manager)
      await this.ragService.initialize();
      this.logger.info('Agentic RAG service initialized');
      
      // Initialize consolidation service
      await this.consolidationService.initialize();
      this.logger.info('Memory consolidation service initialized');
      
      // Start auto-consolidation (every 60 minutes by default)
      this.consolidationService.startAutoConsolidation(60);
      this.logger.info('Auto-consolidation started');
      
      this.initialized = true;
      this.logger.info('Memory system initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize memory system', error);
      throw error;
    }
  }
  
  /**
   * Check if memory system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Check if memory system is enabled
   */
  isEnabled(): boolean {
    return config.features.vectorMemory;
  }
  
  /**
   * Get the memory manager for direct access
   */
  getMemoryManager(): MemoryManager {
    if (!this.initialized) {
      throw new Error('Memory system not initialized');
    }
    return this.memoryManager;
  }
  
  /**
   * Get the RAG service for context assembly
   */
  getRAGService(): AgenticRAGService {
    if (!this.initialized) {
      throw new Error('Memory system not initialized');
    }
    return this.ragService;
  }
  
  /**
   * Get the consolidation service
   */
  getConsolidationService(): MemoryConsolidationService {
    if (!this.initialized) {
      throw new Error('Memory system not initialized');
    }
    return this.consolidationService;
  }
  
  /**
   * Get memory system health status
   */
  async healthCheck(): Promise<{
    enabled: boolean;
    initialized: boolean;
    memoryManager: boolean;
    ragService: boolean;
    consolidationActive: boolean;
  }> {
    if (!this.initialized) {
      return {
        enabled: this.isEnabled(),
        initialized: false,
        memoryManager: false,
        ragService: false,
        consolidationActive: false
      };
    }
    
    try {
      const memoryHealth = await this.memoryManager.healthCheck();
      
      return {
        enabled: true,
        initialized: true,
        memoryManager: memoryHealth.overall,
        ragService: true, // RAG depends on memory manager
        consolidationActive: true
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        enabled: true,
        initialized: true,
        memoryManager: false,
        ragService: false,
        consolidationActive: false
      };
    }
  }
  
  /**
   * Get memory system statistics
   */
  async getStats(): Promise<{
    shortTerm: { activeSessions: number; totalKeys: number };
    longTerm: { episodicCount: number; semanticCount: number };
  } | null> {
    if (!this.initialized) {
      return null;
    }
    
    try {
      return await this.memoryManager.getStats();
    } catch (error) {
      this.logger.error('Failed to get stats', error);
      return null;
    }
  }
  
  /**
   * Shutdown the memory system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    try {
      this.logger.info('Shutting down memory system...');
      
      // Stop auto-consolidation
      this.consolidationService.stopAutoConsolidation();
      
      // Close memory manager connections
      await this.memoryManager.close();
      
      this.initialized = false;
      this.logger.info('Memory system shut down successfully');
      
    } catch (error) {
      this.logger.error('Error during memory system shutdown', error);
      throw error;
    }
  }
}

/**
 * Get the memory system service singleton
 */
export function getMemorySystem(): MemorySystemService {
  return MemorySystemService.getInstance();
}

/**
 * Initialize memory system (convenience function)
 */
export async function initializeMemorySystem(): Promise<void> {
  const memorySystem = getMemorySystem();
  await memorySystem.initialize();
}
