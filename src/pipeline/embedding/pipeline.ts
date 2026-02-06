/**
 * Embedding pipeline for processing documents
 */

import type { Document, DocumentChunk, EmbeddingGenerator } from '../../types/index.js';

export interface EmbeddingPipelineOptions {
  /** Batch size for embedding generation */
  batchSize?: number;
  /** Progress callback */
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Pipeline for generating embeddings from documents
 */
export class EmbeddingPipeline {
  constructor(private embedder: EmbeddingGenerator) {}

  /**
   * Process documents and generate embeddings
   */
  async process(
    documents: Document[],
    options: EmbeddingPipelineOptions = {}
  ): Promise<DocumentChunk[]> {
    const batchSize = options.batchSize ?? 32;
    const chunks: DocumentChunk[] = [];

    // Convert documents to chunks
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const chunk: DocumentChunk = {
        id: doc.id,
        documentId: doc.id,
        content: doc.content,
        index: i,
        metadata: {
          chunkIndex: i,
          chunkCount: documents.length,
          startChar: 0,
          endChar: doc.content.length,
          ...doc.metadata,
        },
      };
      chunks.push(chunk);
    }

    // Generate embeddings in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((chunk) => chunk.content);
      const embeddings = await this.embedder.embed(texts);

      // Assign embeddings to chunks
      for (let j = 0; j < batch.length; j++) {
        batch[j].embedding = embeddings[j];
      }

      if (options.onProgress) {
        options.onProgress(Math.min(i + batchSize, chunks.length), chunks.length);
      }
    }

    return chunks;
  }

  /**
   * Generate embedding for a single query
   */
  async embedQuery(query: string): Promise<number[]> {
    const embeddings = await this.embedder.embed([query]);
    return embeddings[0];
  }
}
