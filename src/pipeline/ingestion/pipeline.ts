/**
 * Document ingestion pipeline
 * Orchestrates loading, embedding, and storage
 */

import type {
  Document,
  DocumentChunk,
  DocumentLoader,
  EmbeddingGenerator,
  VectorStore,
  IngestionOptions,
  IngestionResult,
} from '../../types/index.js';

/**
 * Pipeline for ingesting documents into vector store
 */
export class IngestionPipeline {
  private loader: DocumentLoader;
  private embedder: EmbeddingGenerator;
  private store: VectorStore;

  constructor(
    loader: DocumentLoader,
    embedder: EmbeddingGenerator,
    store: VectorStore
  ) {
    this.loader = loader;
    this.embedder = embedder;
    this.store = store;
  }

  /**
   * Ingest one or more documents
   */
  async ingest(
    filePaths: string | string[],
    options?: IngestionOptions
  ): Promise<IngestionResult> {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const startTime = Date.now();

    const {
      batchSize = 32,
      onProgress,
      loaderConfig,
    } = options ?? {};

    let totalDocuments = 0;
    let totalChunks = 0;
    const errors: Array<{ file: string; error: string }> = [];

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];

      try {
        // Load documents
        const documents = await this.loader.load(path, loaderConfig);
        totalDocuments += documents.length;

        // Chunk and embed in batches
        const allChunks: DocumentChunk[] = [];

        for (let j = 0; j < documents.length; j += batchSize) {
          const batch = documents.slice(j, j + batchSize);
          const chunks = await this.processDocuments(batch);
          allChunks.push(...chunks);

          if (onProgress) {
            onProgress(i + 1, paths.length, {
              currentFile: path,
              documentsProcessed: Math.min(j + batchSize, documents.length),
              totalDocuments: documents.length,
              chunksGenerated: allChunks.length,
            });
          }
        }

        // Store chunks
        await this.store.addDocuments(allChunks);
        totalChunks += allChunks.length;
      } catch (error) {
        errors.push({
          file: path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const endTime = Date.now();

    return {
      documentsProcessed: totalDocuments,
      chunksGenerated: totalChunks,
      errors,
      durationMs: endTime - startTime,
    };
  }

  /**
   * Process documents: chunk and embed
   */
  private async processDocuments(documents: Document[]): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    for (const doc of documents) {
      // Split into chunks (using simple text splitting)
      const docChunks = this.chunkDocument(doc);
      chunks.push(...docChunks);
    }

    // Generate embeddings
    const texts = chunks.map((chunk) => chunk.content);
    const embeddings = await this.embedder.embed(texts);

    // Attach embeddings
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].embedding = embeddings[i];
    }

    return chunks;
  }

  /**
   * Simple chunking (override with loader-specific chunking if available)
   */
  private chunkDocument(doc: Document): DocumentChunk[] {
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: DocumentChunk[] = [];
    const content = doc.content;

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const chunk = content.slice(i, i + chunkSize);
      const chunkId = `${doc.id}-chunk-${chunks.length}`;

      chunks.push({
        id: chunkId,
        documentId: doc.id,
        content: chunk,
        index: chunks.length,
        metadata: {
          chunkIndex: chunks.length,
          chunkCount: 0, // Will update after
          startChar: i,
          endChar: Math.min(i + chunkSize, content.length),
          ...doc.metadata,
        },
      });
    }

    // Update chunk counts
    for (const chunk of chunks) {
      chunk.metadata.chunkCount = chunks.length;
    }

    return chunks;
  }
}
