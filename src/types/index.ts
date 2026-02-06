/**
 * Core types for RAG (Retrieval-Augmented Generation) system
 */

/**
 * Document representation
 */
export interface Document {
  /** Unique identifier */
  id: string;
  /** Document content */
  content: string;
  /** Document metadata */
  metadata: DocumentMetadata;
  /** Embedding vector (if generated) */
  embedding?: number[];
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  /** Source file path or URL */
  source: string;
  /** Document type */
  type: 'pdf' | 'markdown' | 'html' | 'text' | 'json' | 'other';
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  updatedAt?: Date;
  /** Author information */
  author?: string;
  /** Document title */
  title?: string;
  /** Additional custom metadata */
  [key: string]: unknown;
}

/**
 * Document chunk for processing
 */
export interface DocumentChunk {
  /** Chunk identifier */
  id: string;
  /** Parent document ID */
  documentId: string;
  /** Chunk content */
  content: string;
  /** Chunk index in document */
  index: number;
  /** Chunk metadata */
  metadata: ChunkMetadata;
  /** Embedding vector */
  embedding?: number[];
}

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  /** Chunk index */
  chunkIndex: number;
  /** Total chunks in document */
  chunkCount: number;
  /** Character start position in original document */
  startChar?: number;
  /** Character end position in original document */
  endChar?: number;
  /** Parent document ID */
  parentDocumentId?: string;
  /** Token count (if available) */
  tokenCount?: number;
  /** Additional metadata from parent document */
  [key: string]: unknown;
}

/**
 * Document loader configuration
 */
export interface LoaderConfig {
  /** Chunk size in characters */
  chunkSize?: number;
  /** Chunk overlap in characters */
  chunkOverlap?: number;
  /** Whether to preserve formatting */
  preserveFormatting?: boolean;
  /** Custom metadata to add */
  metadata?: Record<string, unknown>;
}

/**
 * Document loader interface
 */
export interface DocumentLoader {
  /** Load document from source */
  load(source: string, config?: LoaderConfig): Promise<Document[]>;
  /** Supported file extensions */
  supportedExtensions: string[];
}

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  /** Model name or identifier */
  model?: string;
  /** Embedding dimensions */
  dimensions?: number;
  /** Batch size for processing */
  batchSize?: number;
}

/**
 * Embedding generator interface
 */
export interface EmbeddingGenerator {
  /** Generate embeddings for text */
  embed(texts: string[], config?: EmbeddingConfig): Promise<number[][]>;
  /** Get embedding dimensions */
  getDimensions(): number;
}

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
  /** Collection/index name */
  collectionName: string;
  /** Embedding dimensions */
  embeddingDimensions: number;
  /** Distance metric */
  distanceMetric?: 'cosine' | 'euclidean' | 'dot';
  /** Storage path (for file-based stores) */
  storagePath?: string;
}

/**
 * Vector store interface
 */
export interface VectorStore {
  /** Add documents to the store */
  addDocuments(documents: DocumentChunk[]): Promise<void>;
  /** Search for similar documents */
  search(query: string | number[], limit?: number, filter?: MetadataFilter): Promise<SearchResult[]>;
  /** Delete documents by ID */
  deleteDocuments(ids: string[]): Promise<void>;
  /** Update document */
  updateDocument(id: string, document: Partial<DocumentChunk>): Promise<void>;
  /** Get document by ID */
  getDocument(id: string): Promise<DocumentChunk | null>;
  /** Clear all documents */
  clear(): Promise<void>;
}

/**
 * Metadata filter for search
 */
export interface MetadataFilter {
  /** Field to filter on */
  field: string;
  /** Operator */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  /** Value to compare */
  value: unknown;
}

/**
 * Search result
 */
export interface SearchResult {
  /** Matching document chunk */
  document: DocumentChunk;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
  /** Distance from query (lower is more similar) */
  distance?: number;
}

/**
 * RAG pipeline configuration
 */
export interface RAGConfig {
  /** Vector store configuration */
  vectorStore: VectorStoreConfig;
  /** Embedding configuration */
  embedding?: EmbeddingConfig;
  /** Loader configuration */
  loader?: LoaderConfig;
  /** Retrieval configuration */
  retrieval?: RetrievalConfig;
}

/**
 * Retrieval configuration
 */
export interface RetrievalConfig {
  /** Number of results to retrieve */
  topK?: number;
  /** Minimum similarity score threshold */
  scoreThreshold?: number;
  /** Whether to rerank results */
  rerank?: boolean;
  /** Maximum tokens in context */
  maxTokens?: number;
}

/**
 * RAG query options
 */
export interface QueryOptions {
  /** Number of results to retrieve */
  limit?: number;
  /** Minimum similarity score threshold (0-1) */
  threshold?: number;
  /** Metadata filters */
  filter?: MetadataFilter;
  /** Include metadata in context */
  includeMetadata?: boolean;
  /** Rerank results */
  rerank?: boolean;
}

/**
 * RAG query result
 */
export interface QueryResult {
  /** Original query */
  query: string;
  /** Search results */
  results: SearchResult[];
  /** Assembled context */
  context: string;
  /** Metadata about the query */
  metadata: {
    /** Total results returned */
    totalResults: number;
    /** Query execution time in ms */
    durationMs: number;
    /** Average relevance score */
    averageScore: number;
  };
}

/**
 * Ingestion pipeline options
 */
export interface IngestionOptions {
  /** Batch size for processing */
  batchSize?: number;
  /** Loader configuration */
  loaderConfig?: LoaderConfig;
  /** Progress callback */
  onProgress?: (
    current: number,
    total: number,
    details?: {
      currentFile: string;
      documentsProcessed: number;
      totalDocuments: number;
      chunksGenerated: number;
    }
  ) => void;
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  /** Number of documents processed */
  documentsProcessed: number;
  /** Number of chunks generated */
  chunksGenerated: number;
  /** Errors during ingestion */
  errors: Array<{ file: string; error: string }>;
  /** Total duration in milliseconds */
  durationMs: number;
}
