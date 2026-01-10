import { OpenAI } from 'openai';
import { Logger } from '@/utils/logger';
import { Message } from '@/types';

/**
 * Embedding Service
 * 
 * Converts text to vector embeddings using OpenAI's text-embedding-3-small model.
 * Used for semantic search in the vector database.
 */
export class EmbeddingService {
  private openai: OpenAI;
  private logger: Logger;
  private model: string = 'text-embedding-3-small';
  private dimensions: number = 1536;
  private cache: Map<string, number[]> = new Map();
  private maxCacheSize: number = 1000;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.logger = new Logger('EmbeddingService');
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Check cache first
      const cached = this.cache.get(text);
      if (cached) {
        this.logger.debug('Embedding cache hit');
        return cached;
      }

      // Generate embedding
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimensions
      });

      const embedding = response.data[0].embedding;

      // Cache the result
      this.cacheEmbedding(text, embedding);

      this.logger.debug(`Generated embedding for text (${text.length} chars)`);
      return embedding;

    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatch(texts: string[]): Promise<number[][]> {
    try {
      if (texts.length === 0) {
        return [];
      }

      // Check cache for all texts
      const cachedResults: (number[] | null)[] = texts.map(text => 
        this.cache.get(text) || null
      );

      // Find texts that need embedding
      const uncachedIndices: number[] = [];
      const uncachedTexts: string[] = [];
      
      cachedResults.forEach((cached, index) => {
        if (!cached) {
          uncachedIndices.push(index);
          uncachedTexts.push(texts[index]);
        }
      });

      // If all cached, return immediately
      if (uncachedTexts.length === 0) {
        this.logger.debug(`All ${texts.length} embeddings found in cache`);
        return cachedResults as number[][];
      }

      // Generate embeddings for uncached texts
      this.logger.debug(`Generating embeddings for ${uncachedTexts.length}/${texts.length} texts`);
      
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: uncachedTexts,
        dimensions: this.dimensions
      });

      // Cache new embeddings
      response.data.forEach((item, i) => {
        const text = uncachedTexts[i];
        const embedding = item.embedding;
        this.cacheEmbedding(text, embedding);
      });

      // Combine cached and new embeddings
      const results: number[][] = [];
      let uncachedIndex = 0;

      for (let i = 0; i < texts.length; i++) {
        if (cachedResults[i]) {
          results.push(cachedResults[i]!);
        } else {
          results.push(response.data[uncachedIndex].embedding);
          uncachedIndex++;
        }
      }

      return results;

    } catch (error) {
      this.logger.error('Failed to generate batch embeddings', error);
      throw new Error(`Batch embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a conversation
   */
  async embedConversation(messages: Message[]): Promise<number[]> {
    try {
      // Format conversation as text
      const conversationText = messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      return await this.generateEmbedding(conversationText);

    } catch (error) {
      this.logger.error('Failed to embed conversation', error);
      throw new Error(`Conversation embedding failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a memory object
   */
  async embedMemory(memory: {
    title?: string;
    description?: string;
    content: string;
  }): Promise<number[]> {
    try {
      // Combine all text fields
      const parts: string[] = [];
      
      if (memory.title) {
        parts.push(`Title: ${memory.title}`);
      }
      
      if (memory.description) {
        parts.push(`Description: ${memory.description}`);
      }
      
      parts.push(memory.content);

      const memoryText = parts.join('\n\n');
      return await this.generateEmbedding(memoryText);

    } catch (error) {
      this.logger.error('Failed to embed memory', error);
      throw new Error(`Memory embedding failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a query with context
   */
  async embedQuery(query: string, context?: Record<string, any>): Promise<number[]> {
    try {
      let queryText = query;

      // Add context if provided
      if (context) {
        const contextParts: string[] = [query];
        
        if (context.customerRisk) {
          contextParts.push(`Customer Risk: ${context.customerRisk}`);
        }
        
        if (context.paymentHistory) {
          contextParts.push(`Payment History: ${context.paymentHistory}`);
        }
        
        if (context.previousAttempts !== undefined) {
          contextParts.push(`Previous Attempts: ${context.previousAttempts}`);
        }

        queryText = contextParts.join(' | ');
      }

      return await this.generateEmbedding(queryText);

    } catch (error) {
      this.logger.error('Failed to embed query', error);
      throw new Error(`Query embedding failed: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Cache an embedding
   */
  private cacheEmbedding(text: string, embedding: number[]): void {
    // Implement LRU cache: remove oldest if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(text, embedding);
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Embedding cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0 // TODO: Track hits/misses for accurate rate
    };
  }

  /**
   * Estimate cost for embedding generation
   */
  estimateCost(textLength: number): number {
    // OpenAI text-embedding-3-small: $0.00002 per 1K tokens
    // Rough estimate: 1 token ≈ 4 characters
    const tokens = Math.ceil(textLength / 4);
    const costPer1KTokens = 0.00002;
    return (tokens / 1000) * costPer1KTokens;
  }

  /**
   * Get model information
   */
  getModelInfo(): {
    model: string;
    dimensions: number;
    costPer1KTokens: number;
  } {
    return {
      model: this.model,
      dimensions: this.dimensions,
      costPer1KTokens: 0.00002
    };
  }
}
