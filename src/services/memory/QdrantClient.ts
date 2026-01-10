import { QdrantClient as Qdrant } from '@qdrant/js-client-rest';
import { createLogger } from '@/utils/logger';

/**
 * Qdrant Vector Database Client
 * 
 * Wrapper around Qdrant client for vector storage and retrieval.
 */
export class QdrantClient {
  private client: Qdrant;
  private logger: Logger;
  private url: string;

  constructor() {
    this.url = process.env.QDRANT_URL || 'http://localhost:6333';
    this.client = new Qdrant({ url: this.url });
    this.logger = createLogger('QdrantClient');
  }

  /**
   * Initialize collections
   */
  async initialize(): Promise<void> {
    try {
      // Create episodic memories collection
      await this.createCollection('episodic_memories', {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      });

      // Create semantic memories collection
      await this.createCollection('semantic_memories', {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      });

      this.logger.info('Qdrant collections initialized');

    } catch (error) {
      this.logger.error('Failed to initialize Qdrant collections', error);
      throw error;
    }
  }

  /**
   * Create a collection if it doesn't exist
   */
  private async createCollection(
    name: string,
    config: {
      vectors: {
        size: number;
        distance: 'Cosine' | 'Euclid' | 'Dot';
      };
    }
  ): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === name);

      if (exists) {
        this.logger.debug(`Collection ${name} already exists`);
        return;
      }

      // Create collection
      await this.client.createCollection(name, config);
      this.logger.info(`Created collection: ${name}`);

    } catch (error) {
      this.logger.error(`Failed to create collection ${name}`, error);
      throw error;
    }
  }

  /**
   * Upsert a point (vector with payload)
   */
  async upsert(
    collection: string,
    point: {
      id: string;
      vector: number[];
      payload: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await this.client.upsert(collection, {
        wait: true,
        points: [
          {
            id: point.id,
            vector: point.vector,
            payload: point.payload
          }
        ]
      });

      this.logger.debug(`Upserted point ${point.id} to ${collection}`);

    } catch (error) {
      this.logger.error(`Failed to upsert point to ${collection}`, error);
      throw error;
    }
  }

  /**
   * Upsert multiple points in batch
   */
  async upsertBatch(
    collection: string,
    points: Array<{
      id: string;
      vector: number[];
      payload: Record<string, any>;
    }>
  ): Promise<void> {
    try {
      if (points.length === 0) {
        return;
      }

      await this.client.upsert(collection, {
        wait: true,
        points: points.map(p => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload
        }))
      });

      this.logger.debug(`Upserted ${points.length} points to ${collection}`);

    } catch (error) {
      this.logger.error(`Failed to upsert batch to ${collection}`, error);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async search(options: {
    collection: string;
    vector: number[];
    limit?: number;
    filter?: Record<string, any>;
    scoreThreshold?: number;
  }): Promise<Array<{
    id: string;
    score: number;
    payload: Record<string, any>;
  }>> {
    try {
      const {
        collection,
        vector,
        limit = 10,
        filter,
        scoreThreshold
      } = options;

      const results = await this.client.search(collection, {
        vector,
        limit,
        filter,
        score_threshold: scoreThreshold,
        with_payload: true
      });

      this.logger.debug(`Found ${results.length} similar vectors in ${collection}`);

      return results.map(r => ({
        id: String(r.id),
        score: r.score,
        payload: r.payload as Record<string, any>
      }));

    } catch (error) {
      this.logger.error(`Failed to search in ${collection}`, error);
      throw error;
    }
  }

  /**
   * Get a point by ID
   */
  async getPoint(
    collection: string,
    id: string
  ): Promise<{
    id: string;
    vector: number[];
    payload: Record<string, any>;
  } | null> {
    try {
      const results = await this.client.retrieve(collection, {
        ids: [id],
        with_payload: true,
        with_vector: true
      });

      if (results.length === 0) {
        return null;
      }

      const point = results[0];
      return {
        id: String(point.id),
        vector: point.vector as number[],
        payload: point.payload as Record<string, any>
      };

    } catch (error) {
      this.logger.error(`Failed to get point ${id} from ${collection}`, error);
      throw error;
    }
  }

  /**
   * Delete a point by ID
   */
  async deletePoint(collection: string, id: string): Promise<void> {
    try {
      await this.client.delete(collection, {
        wait: true,
        points: [id]
      });

      this.logger.debug(`Deleted point ${id} from ${collection}`);

    } catch (error) {
      this.logger.error(`Failed to delete point ${id} from ${collection}`, error);
      throw error;
    }
  }

  /**
   * Delete points by filter
   */
  async deleteByFilter(
    collection: string,
    filter: Record<string, any>
  ): Promise<void> {
    try {
      await this.client.delete(collection, {
        wait: true,
        filter
      });

      this.logger.debug(`Deleted points from ${collection} by filter`);

    } catch (error) {
      this.logger.error(`Failed to delete by filter from ${collection}`, error);
      throw error;
    }
  }

  /**
   * Count points in a collection
   */
  async count(collection: string, filter?: Record<string, any>): Promise<number> {
    try {
      const result = await this.client.count(collection, {
        filter,
        exact: true
      });

      return result.count;

    } catch (error) {
      this.logger.error(`Failed to count points in ${collection}`, error);
      throw error;
    }
  }

  /**
   * Scroll through all points in a collection
   */
  async scroll(
    collection: string,
    options?: {
      limit?: number;
      filter?: Record<string, any>;
      offset?: string;
    }
  ): Promise<{
    points: Array<{
      id: string;
      vector: number[];
      payload: Record<string, any>;
    }>;
    nextOffset?: string;
  }> {
    try {
      const result = await this.client.scroll(collection, {
        limit: options?.limit || 100,
        filter: options?.filter,
        offset: options?.offset,
        with_payload: true,
        with_vector: true
      });

      return {
        points: result.points.map(p => ({
          id: String(p.id),
          vector: p.vector as number[],
          payload: p.payload as Record<string, any>
        })),
        nextOffset: result.next_page_offset
      };

    } catch (error) {
      this.logger.error(`Failed to scroll ${collection}`, error);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collection: string): Promise<{
    vectorsCount: number;
    pointsCount: number;
    status: string;
  }> {
    try {
      const info = await this.client.getCollection(collection);

      return {
        vectorsCount: info.vectors_count || 0,
        pointsCount: info.points_count || 0,
        status: info.status
      };

    } catch (error) {
      this.logger.error(`Failed to get collection info for ${collection}`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      this.logger.error('Qdrant health check failed', error);
      return false;
    }
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    // Qdrant REST client doesn't need explicit closing
    this.logger.info('Qdrant client closed');
  }
}
