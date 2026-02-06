/**
 * In-memory vector store implementation
 * For development and testing - use ChromaDB/Pinecone/etc in production
 */

import type {
  VectorStore,
  VectorStoreConfig,
  DocumentChunk,
  SearchResult,
  MetadataFilter,
} from '../../types/index.js';

/**
 * Simple in-memory vector store with cosine similarity search
 */
export class InMemoryVectorStore implements VectorStore {
  private documents: Map<string, DocumentChunk> = new Map();
  private config: VectorStoreConfig;

  constructor(config: VectorStoreConfig) {
    this.config = {
      collectionName: config.collectionName,
      embeddingDimensions: config.embeddingDimensions,
      distanceMetric: config.distanceMetric ?? 'cosine',
    };
  }

  async addDocuments(documents: DocumentChunk[]): Promise<void> {
    for (const doc of documents) {
      if (!doc.embedding) {
        throw new Error(`Document ${doc.id} is missing embedding vector`);
      }
      if (doc.embedding.length !== this.config.embeddingDimensions) {
        throw new Error(
          `Embedding dimension mismatch: expected ${this.config.embeddingDimensions}, got ${doc.embedding.length}`
        );
      }
      this.documents.set(doc.id, doc);
    }
  }

  async search(
    query: string | number[],
    limit = 10,
    filter?: MetadataFilter
  ): Promise<SearchResult[]> {
    const queryVector = typeof query === 'string' ? null : query;
    
    if (!queryVector) {
      throw new Error('Query must be an embedding vector for in-memory store');
    }

    const results: SearchResult[] = [];

    for (const [_id, doc] of this.documents) {
      // Apply metadata filter if provided
      if (filter && !this.matchesFilter(doc, filter)) {
        continue;
      }

      if (!doc.embedding) {
        continue;
      }

      const score = this.calculateSimilarity(queryVector, doc.embedding);
      const distance = this.calculateDistance(queryVector, doc.embedding);

      results.push({ document: doc, score, distance });
    }

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
  }

  async updateDocument(id: string, update: Partial<DocumentChunk>): Promise<void> {
    const existing = this.documents.get(id);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }

    this.documents.set(id, { ...existing, ...update });
  }

  async getDocument(id: string): Promise<DocumentChunk | null> {
    return this.documents.get(id) ?? null;
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateSimilarity(a: number[], b: number[]): number {
    if (this.config.distanceMetric === 'cosine') {
      return this.cosineSimilarity(a, b);
    } else if (this.config.distanceMetric === 'dot') {
      return this.dotProduct(a, b);
    } else {
      // For Euclidean, convert distance to similarity
      const distance = this.euclideanDistance(a, b);
      return 1 / (1 + distance);
    }
  }

  /**
   * Calculate distance between two vectors
   */
  private calculateDistance(a: number[], b: number[]): number {
    if (this.config.distanceMetric === 'euclidean') {
      return this.euclideanDistance(a, b);
    } else if (this.config.distanceMetric === 'cosine') {
      return 1 - this.cosineSimilarity(a, b);
    } else {
      return -this.dotProduct(a, b);
    }
  }

  /**
   * Cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Dot product
   */
  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Check if document matches metadata filter
   */
  private matchesFilter(doc: DocumentChunk, filter: MetadataFilter): boolean {
    const value = doc.metadata[filter.field];

    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'ne':
        return value !== filter.value;
      case 'gt':
        return typeof value === 'number' && value > (filter.value as number);
      case 'gte':
        return typeof value === 'number' && value >= (filter.value as number);
      case 'lt':
        return typeof value === 'number' && value < (filter.value as number);
      case 'lte':
        return typeof value === 'number' && value <= (filter.value as number);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'nin':
        return Array.isArray(filter.value) && !filter.value.includes(value);
      default:
        return false;
    }
  }

  /**
   * Get store statistics
   */
  getStats(): {
    documentCount: number;
    collectionName: string;
    dimensions: number;
  } {
    return {
      documentCount: this.documents.size,
      collectionName: this.config.collectionName,
      dimensions: this.config.embeddingDimensions,
    };
  }
}
