/**
 * Memory Services
 * 
 * Provides short-term and long-term memory capabilities for AI agents.
 * Includes Agentic RAG for intelligent context retrieval and memory consolidation.
 */

// Core Memory Components
export { EmbeddingService } from './EmbeddingService';
export { QdrantClient } from './QdrantClient';
export { ShortTermMemory, SessionContext } from './ShortTermMemory';
export { LongTermMemory, EpisodicMemory, SemanticMemory } from './LongTermMemory';

// Advanced Memory Services
export { MemoryManager } from './MemoryManager';
export { AgenticRAGService } from './AgenticRAGService';
export { MemoryConsolidationService } from './MemoryConsolidationService';

// Type Exports
export type {
  MemoryQueryResult,
  MemoryQueryOptions,
  MemoryStorageOptions
} from './MemoryManager';

export type {
  QueryIntent,
  RetrievalStrategy,
  AssembledContext,
  QualityAssessment
} from './AgenticRAGService';
