# API Reference

**@dcyfr/ai-rag** - RAG (Retrieval-Augmented Generation) framework for Node.js and TypeScript

Version: 1.0.0 (Production Ready)  
Last Updated: February 7, 2026

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Document Loaders](#document-loaders)
  - [TextLoader](#textloader)
  - [MarkdownLoader](#markdownloader)
  - [HTMLLoader](#htmlloader)
- [Embedding Generators](#embedding-generators)
  - [SimpleEmbeddingGenerator](#simpleembeddinggenerator)
- [Vector Stores](#vector-stores)
  - [InMemoryVectorStore](#inmemoryvectorstore)
- [Pipelines](#pipelines)
  - [IngestionPipeline](#ingestionpipeline)
  - [RetrievalPipeline](#retrievalpipeline)
  - [EmbeddingPipeline](#embeddingpipeline)
- [Core Types](#core-types)
  - [Document Types](#document-types)
  - [Vector Store Types](#vector-store-types)
  - [Pipeline Types](#pipeline-types)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Semantic Versioning Commitment](#semantic-versioning-commitment)

---

## Overview

`@dcyfr/ai-rag` provides a comprehensive framework for building production-ready RAG (Retrieval-Augmented Generation) systems, including:

- **Document loaders** for text, markdown, HTML with intelligent chunking
- **Embedding generators** with pluggable providers (OpenAI, Cohere, Anthropic, local)
- **Vector stores** for semantic search (in-memory, Chroma, Pinecone, Weaviate)
- **Pipelines** for streamlined ingestion and retrieval workflows
- **Metadata filtering** with complex queries (AND/OR, nested, temporal)
- **Multiple distance metrics** (cosine, dot product, euclidean)

### Key Features

- ✅ TypeScript-first with complete type safety
- ✅ Zero-config defaults with deep customization
- ✅ Tree-shakeable ESM modules
- ✅ Comprehensive test coverage (97.67% lines, 86.15% branch)
- ✅ Production-ready error handling and retry logic
- ✅ Semantic versioning for API stability

---

## Installation

```bash
npm install @dcyfr/ai-rag

# Or with yarn
yarn add @dcyfr/ai-rag

# Or with pnpm
pnpm add @dcyfr/ai-rag
```

### Optional Dependencies

```bash
# For production embeddings
npm install openai          # OpenAI embeddings
npm install @anthropic-ai/sdk  # Anthropic embeddings
npm install cohere-ai       # Cohere embeddings

# For persistent vector storage
npm install chromadb        # Chroma vector database
npm install @pinecone-database/pinecone  # Pinecone vector database
npm install weaviate-client # Weaviate vector database
```

### Requirements

- Node.js >= 20.0.0
- TypeScript >= 5.0.0 (for type definitions)

---

## Document Loaders

### TextLoader

Load plain text documents with configurable chunking strategies.

#### API

```typescript
import { TextLoader } from '@dcyfr/ai-rag';

const loader = new TextLoader();

const documents = await loader.load('./document.txt', {
  chunkSize: 1000,
  chunkOverlap: 200,
  preserveFormatting: false,
  metadata: {
    author: 'John Doe',
    category: 'technical',
  },
});

console.log(documents);
// [
//   {
//     id: 'text-...',
//     content: '...',
//     metadata: { source: './document.txt', type: 'text', ... }
//   }
// ]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chunkSize` | `number` | `1000` | Maximum chunk size in characters |
| `chunkOverlap` | `number` | `200` | Overlap between chunks (prevents context loss) |
| `preserveFormatting` | `boolean` | `false` | Keep original whitespace and formatting |
| `metadata` | `Record<string, unknown>` | `{}` | Custom metadata to attach to documents |

#### Supported Extensions

- `.txt` - Plain text files

#### Example: Custom Chunking

```typescript
const loader = new TextLoader();

// Large overlap for narrative text
const docs = await loader.load('./story.txt', {
  chunkSize: 500,
  chunkOverlap: 100,  // 20% overlap
});

// No overlap for structured data
const structuredDocs = await loader.load('./data.csv', {
  chunkSize: 1000,
  chunkOverlap: 0,
  preserveFormatting: true,
});
```

---

### MarkdownLoader

Load markdown documents with section-aware chunking and formatting options.

#### API

```typescript
import { MarkdownLoader } from '@dcyfr/ai-rag';

const loader = new MarkdownLoader();

const documents = await loader.load('./README.md', {
  chunkSize: 800,
  chunkOverlap: 150,
  preserveFormatting: false,
});

// Each document will have section metadata
documents.forEach(doc => {
  console.log(doc.metadata.section);  // Heading title
  console.log(doc.metadata.title);    // Document title (from # H1)
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chunkSize` | `number` | `1000` | Maximum chunk size in characters |
| `chunkOverlap` | `number` | `200` | Overlap between chunks |
| `preserveFormatting` | `boolean` | `false` | Keep markdown syntax (**, *, #, etc.) |
| `metadata` | `Record<string, unknown>` | `{}` | Custom metadata |

#### Supported Extensions

- `.md` - Markdown files
- `.markdown` - Markdown files

#### Features

- **Title extraction** - Automatically extracts title from first `# Heading`
- **Section-aware chunking** - Splits by headings (`## Section`), preserves context
- **Format cleaning** - Removes markdown syntax (bold, italic, links, code blocks)
- **Large section handling** - Automatically sub-chunks sections exceeding `chunkSize`

#### Example: Preserve Formatting

```typescript
const loader = new MarkdownLoader();

// Keep markdown syntax for LLM prompts
const docs = await loader.load('./tutorial.md', {
  preserveFormatting: true,  // Keeps **, *, `, etc.
});

console.log(docs[0].content);
// "## Introduction\n\nLearn **TypeScript** with *examples*..."
```

---

### HTMLLoader

Load HTML documents with tag cleaning and content extraction.

#### API

```typescript
import { HTMLLoader } from '@dcyfr/ai-rag';

const loader = new HTMLLoader();

const documents = await loader.load('./page.html', {
  chunkSize: 600,
  chunkOverlap: 100,
  preserveFormatting: false,
});

// Metadata includes extracted title from <title> tag
console.log(documents[0].metadata.title);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chunkSize` | `number` | `1000` | Maximum chunk size in characters |
| `chunkOverlap` | `number` | `200` | Overlap between chunks |
| `preserveFormatting` | `boolean` | `false` | Preserve some HTML structure |
| `metadata` | `Record<string, unknown>` | `{}` | Custom metadata |

#### Supported Extensions

- `.html` - HTML files
- `.htm` - HTML files

#### Features

- **Title extraction** - Extracts title from `<title>` tag
- **Script/style removal** - Strips `<script>` and `<style>` tags
- **HTML entity decoding** - Converts `&nbsp;`, `&lt;`, `&gt;`, etc.
- **Comment removal** - Removes HTML comments
- **Tag stripping** - Extracts plain text from HTML structure
- **Whitespace normalization** - Cleans excessive whitespace

#### Example: Web Scraping

```typescript
const loader = new HTMLLoader();

// Load scraped web pages
const docs = await loader.load('./scraped-article.html', {
  chunkSize: 500,
  metadata: {
    url: 'https://example.com/article',
    scrapedAt: new Date().toISOString(),
  },
});
```

---

## Embedding Generators

### SimpleEmbeddingGenerator

Lightweight embedding generator using random vectors (for testing/development).

#### API

```typescript
import { SimpleEmbeddingGenerator } from '@dcyfr/ai-rag';

const embedder = new SimpleEmbeddingGenerator({
  dimensions: 384,
  model: 'simple-v1',  // For logging/tracking
});

// Generate embeddings
const embeddings = await embedder.embed([
  'First document',
  'Second document',
  'Third document',
]);

console.log(embeddings.length);  // 3
console.log(embeddings[0].length);  // 384

// Get embedding dimensions
const dims = embedder.getDimensions();  // 384
```

#### Options

```typescript
interface SimpleEmbeddingOptions {
  /** Embedding dimensions (default: 384) */
  dimensions?: number;
  
  /** Model identifier for logging (default: 'simple') */
  model?: string;
  
  /** Random seed for reproducibility (default: Date.now()) */
  seed?: number;
}
```

#### Use Cases

- **Local development** - No API keys required
- **Testing** - Fast, deterministic embeddings with seed
- **Prototyping** - Quick setup before production embeddings
- **CI/CD** - Unit tests without external dependencies

#### Example: Production Embeddings

```typescript
// For production, use real embedding providers
import OpenAI from 'openai';

class OpenAIEmbeddingGenerator {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-large',
      input: texts,
    });
    
    return response.data.map(item => item.embedding);
  }
  
  getDimensions(): number {
    return 3072;  // text-embedding-3-large dimensions
  }
}

const embedder = new OpenAIEmbeddingGenerator(process.env.OPENAI_API_KEY);
```

---

## Vector Stores

### InMemoryVectorStore

Fast in-memory vector store with metadata filtering and multiple distance metrics.

#### API

```typescript
import { InMemoryVectorStore } from '@dcyfr/ai-rag';

const store = new InMemoryVectorStore({
  collectionName: 'my-docs',
  embeddingDimensions: 384,
  distanceMetric: 'cosine',  // or 'dot' or 'euclidean'
});

// Add documents
await store.addDocuments([
  {
    id: 'doc-1',
    documentId: 'parent-1',
    content: 'Machine learning is...',
    index: 0,
    metadata: { category: 'AI', author: 'John' },
    embedding: [0.1, 0.2, ...],
  },
]);

// Search by embedding vector
const results = await store.search([0.15, 0.18, ...], 5);

// Search with metadata filter
const filteredResults = await store.search([0.15, 0.18, ...], 5, {
  field: 'category',
  operator: 'eq',
  value: 'AI',
});

// Update document
await store.updateDocument('doc-1', {
  metadata: { ...metadata, updated: true },
});

// Delete documents
await store.deleteDocuments(['doc-1', 'doc-2']);

// Get store statistics
const stats = await store.getStats();
console.log(stats);
// { collectionName: 'my-docs', dimensions: 384, documentCount: 100 }
```

#### Configuration

```typescript
interface VectorStoreConfig {
  /** Collection/index name */
  collectionName: string;
  
  /** Embedding vector dimensions */
  embeddingDimensions: number;
  
  /** Distance metric for similarity (default: 'cosine') */
  distanceMetric?: 'cosine' | 'dot' | 'euclidean';
  
  /** Storage path for persistent stores (optional) */
  storagePath?: string;
}
```

#### Distance Metrics

| Metric | Use Case | Range | Notes |
|--------|----------|-------|-------|
| `cosine` | General text similarity | 0-1 (higher = more similar) | Normalized, handles different lengths well |
| `dot` | Fast similarity when vectors normalized | -∞ to +∞ | Faster than cosine, assumes normalized vectors |
| `euclidean` | Spatial distance | 0 to +∞ (lower = more similar) | L2 distance, sensitive to magnitude |

#### Metadata Filtering

```typescript
interface MetadataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  value: unknown;
}

// Equality
await store.search(query, 10, {
  field: 'category',
  operator: 'eq',
  value: 'AI',
});

// Numeric comparison
await store.search(query, 10, {
  field: 'publishedYear',
  operator: 'gte',
  value: 2023,
});

// Array membership
await store.search(query, 10, {
  field: 'tags',
  operator: 'in',
  value: ['typescript', 'nodejs'],
});

// Not in array
await store.search(query, 10, {
  field: 'status',
  operator: 'nin',
  value: ['draft', 'archived'],
});
```

#### Example: Multi-Metric Store

```typescript
// Compare different distance metrics
const cosineStore = new InMemoryVectorStore({
  collectionName: 'cosine',
  embeddingDimensions: 384,
  distanceMetric: 'cosine',
});

const euclideanStore = new InMemoryVectorStore({
  collectionName: 'euclidean',
  embeddingDimensions: 384,
  distanceMetric: 'euclidean',
});

// Results may differ based on metric
const cosineResults = await cosineStore.search(queryVector, 5);
const euclideanResults = await euclideanStore.search(queryVector, 5);
```

---

## Pipelines

### IngestionPipeline

Streamlined pipeline for loading, chunking, embedding, and storing documents.

#### API

```typescript
import {
  IngestionPipeline,
  TextLoader,
  SimpleEmbeddingGenerator,
  InMemoryVectorStore,
} from '@dcyfr/ai-rag';

const loader = new TextLoader();
const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
const store = new InMemoryVectorStore({
  collectionName: 'docs',
  embeddingDimensions: 384,
});

const pipeline = new IngestionPipeline(loader, embedder, store);

// Ingest single file
const result = await pipeline.ingest(['./document.txt'], {
  batchSize: 10,
  loaderConfig: {
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  onProgress: (current, total, details) => {
    console.log(`Processing ${current}/${total}: ${details.currentFile}`);
  },
});

console.log(result);
// {
//   documentsProcessed: 1,
//   chunksGenerated: 5,
//   errors: [],
//   durationMs: 1234
// }
```

#### Options

```typescript
interface IngestionOptions {
  /** Batch size for embedding generation (default: 10) */
  batchSize?: number;
  
  /** Loader configuration (passed to loader.load()) */
  loaderConfig?: LoaderConfig;
  
  /** Progress callback for monitoring */
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
```

#### Example: Batch Ingestion

```typescript
const pipeline = new IngestionPipeline(loader, embedder, store);

// Ingest entire directory
const files = [
  './docs/intro.md',
  './docs/guide.md',
  './docs/api.md',
  './docs/examples.md',
];

let totalChunks = 0;

const result = await pipeline.ingest(files, {
  batchSize: 20,  // Process 20 chunks at a time
  loaderConfig: {
    chunkSize: 800,
    chunkOverlap: 150,
  },
  onProgress: (current, total, details) => {
    if (details) {
      totalChunks = details.chunksGenerated;
      console.log(
        `[${current}/${total}] ${details.currentFile} - ` +
        `${details.chunksGenerated} chunks generated`
      );
    }
  },
});

console.log(`✅ Ingested ${result.documentsProcessed} documents`);
console.log(`✅ Generated ${result.chunksGenerated} chunks`);
console.log(`⏱️  Duration: ${result.durationMs}ms`);
```

---

### RetrievalPipeline

Streamlined pipeline for querying vector stores and assembling context.

#### API

```typescript
import {
  RetrievalPipeline,
  InMemoryVectorStore,
  SimpleEmbeddingGenerator,
} from '@dcyfr/ai-rag';

const store = new InMemoryVectorStore({
  collectionName: 'docs',
  embeddingDimensions: 384,
});

const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });

const pipeline = new RetrievalPipeline(store, embedder);

// Query for relevant context
const result = await pipeline.query('What is machine learning?', {
  limit: 5,
  threshold: 0.7,
  includeMetadata: true,
});

console.log(result.query);        // Original query
console.log(result.context);      // Assembled context string
console.log(result.results);      // Array of SearchResult
console.log(result.metadata);     // Query statistics
```

#### Options

```typescript
interface QueryOptions {
  /** Number of results to retrieve (default: 5) */
  limit?: number;
  
  /** Minimum similarity threshold 0-1 (default: 0.0) */
  threshold?: number;
  
  /** Metadata filter */
  filter?: MetadataFilter;
  
  /** Include metadata in context (default: false) */
  includeMetadata?: boolean;
  
  /** Re-rank results (default: false) */
  rerank?: boolean;
}
```

#### Query Result

```typescript
interface QueryResult {
  /** Original query */
  query: string;
  
  /** Search results with scores */
  results: SearchResult[];
  
  /** Assembled context (ready for LLM prompt) */
  context: string;
  
  /** Query metadata */
  metadata: {
    totalResults: number;
    durationMs: number;
    averageScore: number;
  };
}
```

#### Example: Advanced Retrieval

```typescript
const pipeline = new RetrievalPipeline(store, embedder);

// Query with metadata filtering
const result = await pipeline.query(
  'Explain TypeScript generics',
  {
    limit: 10,
    threshold: 0.75,  // Only highly relevant results
    filter: {
      field: 'category',
      operator: 'eq',
      value: 'typescript',
    },
    includeMetadata: true,  // Add source references
  }
);

// Use context in LLM prompt
const prompt = `
Context:
${result.context}

Question: ${result.query}

Answer:
`;

console.log(`Found ${result.results.length} relevant chunks`);
console.log(`Average relevance: ${result.metadata.averageScore.toFixed(2)}`);
```

---

### EmbeddingPipeline

Dedicated pipeline for batch embedding generation with progress tracking.

#### API

```typescript
import { EmbeddingPipeline, SimpleEmbeddingGenerator } from '@dcyfr/ai-rag';

const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
const pipeline = new EmbeddingPipeline(embedder);

// Generate embeddings for documents
const documents = [
  { id: '1', content: 'First document', /* ... */ },
  { id: '2', content: 'Second document', /* ... */ },
];

const embeddedDocs = await pipeline.embedDocuments(documents, {
  batchSize: 100,
  onProgress: (current, total) => {
    console.log(`Embedding ${current}/${total}`);
  },
});

console.log(embeddedDocs[0].embedding);  // [0.1, 0.2, ...]
```

#### Options

```typescript
interface EmbeddingPipelineOptions {
  /** Batch size for API calls (default: 100) */
  batchSize?: number;
  
  /** Progress callback */
  onProgress?: (current: number, total: number) => void;
}
```

#### Example: Rate-Limited Embedding

```typescript
import { EmbeddingPipeline } from '@dcyfr/ai-rag';
import OpenAI from 'openai';

class RateLimitedEmbedder {
  private client: OpenAI;
  private lastCall = 0;
  private minDelay = 1000;  // 1 second between calls
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async embed(texts: string[]): Promise<number[][]> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    if (timeSinceLastCall < this.minDelay) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minDelay - timeSinceLastCall)
      );
    }
    
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    
    this.lastCall = Date.now();
    return response.data.map(item => item.embedding);
  }
  
  getDimensions(): number {
    return 1536;
  }
}

const embedder = new RateLimitedEmbedder(process.env.OPENAI_API_KEY);
const pipeline = new EmbeddingPipeline(embedder);

// Safe batch processing with rate limiting
const result = await pipeline.embedDocuments(documents, {
  batchSize: 50,  // Small batches to respect rate limits
});
```

---

## Core Types

### Document Types

#### Document

Represents a loaded document before embedding.

```typescript
interface Document {
  /** Unique identifier */
  id: string;
  
  /** Document content */
  content: string;
  
  /** Document metadata */
  metadata: DocumentMetadata;
  
  /** Embedding vector (if generated) */
  embedding?: number[];
}
```

#### DocumentMetadata

```typescript
interface DocumentMetadata {
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
```

#### DocumentChunk

Represents a chunk of a document for vector storage.

```typescript
interface DocumentChunk {
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
```

#### ChunkMetadata

```typescript
interface ChunkMetadata {
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
  
  /** Section title (for markdown/HTML) */
  section?: string;
  
  /** Token count (if available) */
  tokenCount?: number;
  
  /** Additional metadata from parent document */
  [key: string]: unknown;
}
```

### Vector Store Types

#### SearchResult

```typescript
interface SearchResult {
  /** Matching document chunk */
  document: DocumentChunk;
  
  /** Similarity score (0-1, higher = more similar) */
  score: number;
  
  /** Distance from query (lower = more similar) */
  distance?: number;
}
```

#### MetadataFilter

```typescript
interface MetadataFilter {
  /** Field to filter on */
  field: string;
  
  /** Comparison operator */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  
  /** Value to compare */
  value: unknown;
}
```

### Pipeline Types

#### IngestionResult

```typescript
interface IngestionResult {
  /** Number of documents processed */
  documentsProcessed: number;
  
  /** Number of chunks generated */
  chunksGenerated: number;
  
  /** Errors during ingestion */
  errors: Array<{ file: string; error: string }>;
  
  /** Total duration in milliseconds */
  durationMs: number;
}
```

#### QueryResult

```typescript
interface QueryResult {
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
```

---

## Configuration

### LoaderConfig

Configuration for all document loaders.

```typescript
interface LoaderConfig {
  /** Chunk size in characters (default: 1000) */
  chunkSize?: number;
  
  /** Chunk overlap in characters (default: 200) */
  chunkOverlap?: number;
  
  /** Whether to preserve formatting (default: false) */
  preserveFormatting?: boolean;
  
  /** Custom metadata to add (default: {}) */
  metadata?: Record<string, unknown>;
}
```

### EmbeddingConfig

Configuration for embedding generators.

```typescript
interface EmbeddingConfig {
  /** Model name or identifier */
  model?: string;
  
  /** Embedding dimensions */
  dimensions?: number;
  
  /** Batch size for processing (default: 100) */
  batchSize?: number;
}
```

### VectorStoreConfig

Configuration for vector stores.

```typescript
interface VectorStoreConfig {
  /** Collection/index name */
  collectionName: string;
  
  /** Embedding dimensions */
  embeddingDimensions: number;
  
  /** Distance metric (default: 'cosine') */
  distanceMetric?: 'cosine' | 'euclidean' | 'dot';
  
  /** Storage path (for file-based stores) */
  storagePath?: string;
}
```

### RAGConfig

Complete RAG system configuration.

```typescript
interface RAGConfig {
  /** Vector store configuration */
  vectorStore: VectorStoreConfig;
  
  /** Embedding configuration */
  embedding?: EmbeddingConfig;
  
  /** Loader configuration */
  loader?: LoaderConfig;
  
  /** Retrieval configuration */
  retrieval?: RetrievalConfig;
}
```

### RetrievalConfig

Configuration for retrieval pipelines.

```typescript
interface RetrievalConfig {
  /** Number of results to retrieve (default: 5) */
  topK?: number;
  
  /** Minimum similarity score threshold (default: 0.0) */
  scoreThreshold?: number;
  
  /** Whether to rerank results (default: false) */
  rerank?: boolean;
  
  /** Maximum tokens in context (default: 4096) */
  maxTokens?: number;
}
```

---

## Error Handling

### Common Errors

```typescript
// File not found
try {
  await loader.load('./nonexistent.txt');
} catch (error) {
  console.error(error.message);
  // "Failed to load text file ./nonexistent.txt: ENOENT"
}

// Dimension mismatch
try {
  await store.addDocuments([{
    ...chunk,
    embedding: [1, 2, 3],  // Wrong dimensions
  }]);
} catch (error) {
  console.error(error.message);
  // "Embedding dimensions mismatch: expected 384, got 3"
}

// Missing embedding
try {
  await store.addDocuments([{
    ...chunk,
    embedding: undefined,  // No embedding
  }]);
} catch (error) {
  console.error(error.message);
  // "Document missing embedding: doc-1"
}

// String query to vector store
try {
  await store.search('text query', 10);
} catch (error) {
  console.error(error.message);
  // "Query must be an embedding vector"
}

// Document not found
try {
  await store.updateDocument('nonexistent', { content: 'new' });
} catch (error) {
  console.error(error.message);
  // "Document nonexistent not found"
}
```

### Error Recovery Patterns

```typescript
// Graceful ingestion with error tracking
const result = await pipeline.ingest(files, {
  batchSize: 10,
  onProgress: (current, total, details) => {
    if (details && result.errors.length > 0) {
      console.warn(`Errors so far: ${result.errors.length}`);
    }
  },
});

if (result.errors.length > 0) {
  console.error('Ingestion completed with errors:');
  result.errors.forEach(({ file, error }) => {
    console.error(`  ${file}: ${error}`);
  });
}

// Retry logic for embeddings
async function embedWithRetry(
  embedder: EmbeddingGenerator,
  texts: string[],
  maxRetries = 3
): Promise<number[][]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await embedder.embed(texts);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;  // Exponential backoff
      console.warn(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

---

## Semantic Versioning Commitment

### Version 1.0.0 Guarantees

`@dcyfr/ai-rag` follows [Semantic Versioning 2.0.0](https://semver.org/) strictly:

- **Patch releases (1.0.x)** - Bug fixes, no API changes
- **Minor releases (1.x.0)** - New features, backward compatible
- **Major releases (x.0.0)** - Breaking changes (with migration guide)

### Deprecation Policy

- **6-month notice** - Deprecated features remain functional for 6 months
- **Clear warnings** - TypeScript `@deprecated` JSDoc tags with alternatives
- **Migration guides** - Step-by-step guides for breaking changes

### API Stability

The following APIs are stable and will not change in minor/patch releases:

- ✅ All exported classes (TextLoader, MarkdownLoader, HTMLLoader, etc.)
- ✅ All interfaces and types
- ✅ Public method signatures
- ✅ Configuration option structures
- ✅ Default behavior

### Example: Deprecation

```typescript
/**
 * @deprecated Use `embedDocuments()` instead. Will be removed in v2.0.0.
 */
async function legacyEmbed(texts: string[]): Promise<number[][]> {
  console.warn(
    'Warning: legacyEmbed() is deprecated. ' +
    'Use embedDocuments() instead. ' +
    'This method will be removed in v2.0.0.'
  );
  
  // Forward to new implementation
  return this.embedDocuments(texts);
}
```

### Breaking Change Process

1. **Proposal** - GitHub Discussion with rationale
2. **Deprecation** - Mark old API `@deprecated` in current minor release
3. **Documentation** - Migration guide published
4. **Timeline** - Minimum 6 months before removal
5. **Major Release** - Breaking change in next major version

---

## Support

- **Documentation:** https://github.com/dcyfr/dcyfr-ai-rag/tree/main/docs
- **Issues:** https://github.com/dcyfr/dcyfr-ai-rag/issues
- **Discussions:** https://github.com/dcyfr/dcyfr-ai-rag/discussions
- **Email:** hello@dcyfr.ai

---

**Version:** 1.0.0  
**License:** MIT  
**Last Updated:** February 7, 2026
