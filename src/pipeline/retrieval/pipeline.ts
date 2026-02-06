/**
 * Retrieval pipeline for querying vector stores
 */

import type {
  VectorStore,
  EmbeddingGenerator,
  QueryOptions,
  QueryResult,
  SearchResult,
} from '../../types/index.js';

/**
 * Pipeline for retrieving relevant documents
 */
export class RetrievalPipeline {
  private store: VectorStore;
  private embedder: EmbeddingGenerator;

  constructor(store: VectorStore, embedder: EmbeddingGenerator) {
    this.store = store;
    this.embedder = embedder;
  }

  /**
   * Query the vector store for relevant documents
   */
  async query(query: string, options?: QueryOptions): Promise<QueryResult> {
    const startTime = Date.now();

    const {
      limit = 10,
      filter,
      threshold = 0.0,
      includeMetadata = true,
    } = options ?? {};

    // Generate query embedding
    const queryEmbedding = await this.embedder.embed([query]);

    // Search vector store
    const searchResults = await this.store.search(
      queryEmbedding[0],
      limit,
      filter
    );

    // Filter by threshold
    const filteredResults = searchResults.filter(
      (result) => result.score >= threshold
    );

    // Assemble context
    const context = this.assembleContext(filteredResults, includeMetadata);

    const endTime = Date.now();

    return {
      query,
      results: filteredResults,
      context,
      metadata: {
        totalResults: filteredResults.length,
        durationMs: endTime - startTime,
        averageScore:
          filteredResults.length > 0
            ? filteredResults.reduce((sum, r) => sum + r.score, 0) /
              filteredResults.length
            : 0,
      },
    };
  }

  /**
   * Assemble context from search results
   */
  private assembleContext(
    results: SearchResult[],
    includeMetadata: boolean
  ): string {
    return results
      .map((result, index) => {
        const { document, score } = result;
        let context = `[Document ${index + 1}] (score: ${score.toFixed(3)})\n`;

        if (includeMetadata) {
          const metadata = Object.entries(document.metadata)
            .filter(([key]) => !key.startsWith('chunk'))
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          
          if (metadata) {
            context += `Metadata: ${metadata}\n`;
          }
        }

        context += `${document.content}\n`;
        return context;
      })
      .join('\n---\n\n');
  }

  /**
   * Perform semantic search (alias for query)
   */
  async search(query: string, options?: QueryOptions): Promise<QueryResult> {
    return this.query(query, options);
  }

  /**
   * Get similar documents to a given document ID
   */
  async findSimilar(
    documentId: string,
    options?: Omit<QueryOptions, 'query'>
  ): Promise<QueryResult> {
    const document = await this.store.getDocument(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    if (!document.embedding) {
      throw new Error(`Document ${documentId} has no embedding`);
    }

    const startTime = Date.now();

    const {
      limit = 10,
      filter,
      threshold = 0.0,
    } = options ?? {};

    // Search using document's embedding
    const searchResults = await this.store.search(
      document.embedding,
      limit + 1, // +1 to exclude the document itself
      filter
    );

    // Filter out the query document and apply threshold
    const filteredResults = searchResults
      .filter((result) => result.document.id !== documentId)
      .filter((result) => result.score >= threshold)
      .slice(0, limit);

    const context = this.assembleContext(filteredResults, true);

    const endTime = Date.now();

    return {
      query: `[Similar to ${documentId}]`,
      results: filteredResults,
      context,
      metadata: {
        totalResults: filteredResults.length,
        durationMs: endTime - startTime,
        averageScore:
          filteredResults.length > 0
            ? filteredResults.reduce((sum, r) => sum + r.score, 0) /
              filteredResults.length
            : 0,
      },
    };
  }
}
