# @dcyfr/ai-rag

> **RAG (Retrieval-Augmented Generation) framework for Node.js and TypeScript**

Build production-ready RAG systems with document loading, embedding, vector stores, and semantic search.

[![npm version](https://img.shields.io/npm/v/@dcyfr/ai-rag.svg)](https://www.npmjs.com/package/@dcyfr/ai-rag)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- **📄 Document Loaders** - Load text, markdown, and HTML documents with intelligent chunking
- **🔢 Embeddings** - Pluggable providers (OpenAI, Cohere, Anthropic, Ollama local)
- **🗄️ Vector Stores** - In-memory + persistent (Chroma, Pinecone, Weaviate)
- **🔍 Semantic Retrieval** - Find relevant documents by meaning, not just keywords
- **🎯 Metadata Filtering** - Complex filters (AND/OR, nested, temporal queries)
- **⚡ Batch Processing** - Efficient ingestion with progress tracking and error handling
- **🔄 Hybrid Search** - Combine keyword (BM25) + semantic search for best results
- **📊 Multiple Distance Metrics** - Cosine similarity, dot product, euclidean
- **🚀 Production Ready** - Retry logic, monitoring hooks, comprehensive error handling
- **📚 Complete Documentation** - 4 comprehensive guides + advanced examples

---

## 📦 Installation

```bash
npm install @dcyfr/ai-rag
```

### Optional Dependencies

```bash
# For production embeddings (recommended)
npm install openai  # or anthropic

# For persistent vector storage
npm install chromadb  # or pinecone-client or weaviate-client
```

---

## 🚀 Quick Start

```typescript
import {
  TextLoader,
  SimpleEmbeddingGenerator,
  InMemoryVectorStore,
  IngestionPipeline,
  RetrievalPipeline,
} from '@dcyfr/ai-rag';

// 1. Setup components
const loader = new TextLoader();
const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
const store = new InMemoryVectorStore({
  collectionName: 'my-docs',
  embeddingDimensions: 384,
});

// 2. Ingest documents
const ingestion = new IngestionPipeline(loader, embedder, store);
await ingestion.ingest(['./docs/file1.txt', './docs/file2.txt']);

// 3. Query for relevant context
const retrieval = new RetrievalPipeline(store, embedder);
const result = await retrieval.query('What is machine learning?', {
  limit: 5,
  threshold: 0.7,
});

console.log(result.context)  // Assembled context from top results
console.log(result.results); // Ranked document chunks with scores
```

---

## 📚 Documentation

### Comprehensive Guides

Explore our detailed documentation covering all aspects of RAG development:

- **[Document Loaders Guide](docs/DOCUMENT_LOADERS.md)** - Complete guide to loading and chunking documents
  - TextLoader, MarkdownLoader, HTMLLoader
  - Chunking strategies (fixed-size, sentence-aware, paragraph-based, semantic)
  - Custom loaders and streaming
 
- **[Embeddings Guide](docs/EMBEDDINGS.md)** - Vector embedding providers and techniques
  - OpenAI, Cohere, Anthropic, Ollama (local)
  - Batch processing and caching
  - Similarity metrics explained

- **[Vector Stores Guide](docs/VECTOR_STORES.md)** - Storage and retrieval optimization
  - InMemoryVectorStore, ChromaVectorStore, PineconeVectorStore, WeaviateVectorStore
  - Metadata filtering (AND/OR, nested queries)
  - Performance optimization (batching, ANN search)

- **[Pipelines Guide](docs/PIPELINES.md)** - End-to-end RAG workflows
  - Ingestion pipeline (load → chunk → embed → store)
  - Retrieval pipeline (query → search → assemble context)
  - Production patterns (hybrid search, re-ranking, error handling)

### Quick Reference

**Document Loaders** - Load and chunk documents

```typescript
import { TextLoader } from '@dcyfr/ai-rag';

const loader = new TextLoader();
const docs = await loader.load('./document.txt', {
  chunkSize: 1000,
  chunkOverlap: 200,
});
```

**MarkdownLoader** - Load markdown files (`.md`)

```typescript
import { MarkdownLoader } from '@dcyfr/ai-rag';

const loader = new MarkdownLoader();
const docs = await loader.load('./README.md', {
  chunkSize: 800,
  chunkOverlap: 150,
});
```

**HTMLLoader** - Load HTML files (`.html`)

```typescript
import { HTMLLoader } from '@dcyfr/ai-rag';

const loader = new HTMLLoader();
const docs = await loader.load('./page.html', {
  chunkSize: 600,
  chunkOverlap: 100,
});
```

### Embedding Generators

**SimpleEmbeddingGenerator** - Placeholder embeddings (for development/testing)

```typescript
import { SimpleEmbeddingGenerator } from '@dcyfr/ai-rag';

const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
const embeddings = await embedder.embed(['text 1', 'text 2']);
```

⚠️ **Production Note:** Use real embedding models in production:
- OpenAI `text-embedding-3-small` (1536 dimensions)
- Cohere `embed-english-v3.0`
- Local models via Ollama

### Vector Stores

**InMemoryVectorStore** - Fast in-memory storage

```typescript
import { InMemoryVectorStore } from '@dcyfr/ai-rag';

const store = new InMemoryVectorStore({
  collectionName: 'docs',
  embeddingDimensions: 384,
  distanceMetric: 'cosine', // 'cosine' | 'dot' | 'euclidean'
});

// Add documents
await store.addDocuments(chunks);

// Search
const results = await store.search(queryEmbedding, 10);

// Filter by metadata
const filtered = await store.search(queryEmbedding, 10, {
  field: 'category',
  operator: 'eq',
  value: 'documentation',
});
```

### Ingestion Pipeline

```typescript
import { IngestionPipeline } from '@dcyfr/ai-rag';

const pipeline = new IngestionPipeline(loader, embedder, store);

const result = await pipeline.ingest(['./docs/'], {
  batchSize: 32,
  onProgress: (current, total, details) => {
    console.log(`Processing ${current}/${total}`);
  },
});

console.log(`Processed ${result.documentsProcessed} documents`);
console.log(`Generated ${result.chunksGenerated} chunks`);
```

### Retrieval Pipeline

```typescript
import { RetrievalPipeline } from '@dcyfr/ai-rag';

const pipeline = new RetrievalPipeline(store, embedder);

// Semantic search
const result = await pipeline.query('your question here', {
  limit: 5,
  threshold: 0.7,
  includeMetadata: true,
});

console.log(result.context);         // Assembled context
console.log(result.results);         // Ranked results
console.log(result.metadata);        // Query metadata

// Find similar documents
const similar = await pipeline.findSimilar('doc-id-123', { limit: 10 });
```

---

## 💡 Examples

### Basic Examples

- **[Basic RAG](examples/basic-rag/)** - Simple document ingestion and retrieval workflow
- **[Semantic Search](examples/semantic-search/)** - Advanced search with metadata filtering
- **[Q&A System](examples/qa-system/)** - Question answering with context assembly

### Advanced Examples

- **[Advanced RAG](examples/advanced-rag/)** - Production-ready workflow with:
  - OpenAI embeddings for semantic search
  - Chroma persistent vector store
  - Metadata filtering with multiple criteria
  - Progress tracking and error handling
  - Question answering with context

- **[Metadata Filtering](examples/metadata-filtering/)** - Complex query scenarios:
  - AND/OR filter combinations
  - Nested complex filters
  - Temporal queries (date ranges)
  - Tag-based search with arrays
  - Multi-field filtering

- **[Hybrid Search](examples/hybrid-search/)** - Combine keyword + semantic:
  - BM25 keyword search implementation
  - Weighted score fusion
  - Reciprocal rank fusion (RRF)
  - Performance comparisons

### Running Examples

```bash
# Basic examples
npm run example:basic-rag
npm run example:semantic-search
npm run example:qa-system

# Advanced examples
npm run example:advanced-rag
npm run example:metadata-filtering
npm run example:hybrid-search
```

---

## 🏗️ Architecture

```
┌─────────────┐
│  Documents  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Loaders   │ (Text, Markdown, HTML)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Chunking   │ (Size + overlap)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Embeddings │ (Vector generation)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Vector Store│ (In-memory or persistent)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Retrieval  │ (Semantic search)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Context   │ (Assembled results)
└─────────────┘
```

---

## 💡 Best Practices

### Chunking Strategy

**Choose appropriate chunk sizes:**
- Technical documentation: 800-1200 characters
- Blog posts/articles: 1000-1500 characters
- Code documentation: 600-1000 characters
- Q&A pairs: 400-800 characters

**Use 15-20% overlap:**
```typescript
const loader = new TextLoader();
const docs = await loader.load('./document.txt', {
  chunkSize: 1000,
  chunkOverlap: 200,  // 20% overlap prevents context loss at boundaries
});
```

**Preserve document structure:**
- Use MarkdownLoader for `.md` files (preserves headings, code blocks)
- Use HTMLLoader for web pages (extracts main content, excludes nav/footer)
- Add rich metadata (source, category, tags, dates, author)

### Embedding Selection

**Development/Testing:**
- SimpleEmbeddingGenerator (fast, no API costs, not for production)

**Production (Recommended):**
- OpenAI `text-embedding-3-small` (1536 dim, $0.02/1M tokens, fast, good quality)
- OpenAI `text-embedding-3-large` (3072 dim, best quality, higher cost)
- Cohere `embed-english-v3.0` (1024 dim, multilingual support)
- Ollama local models (no API costs, data privacy, requires GPU)

**Critical:** Use the same embedder for both documents and queries!

### Search Optimization

**Set appropriate similarity thresholds:**
```typescript
const result = await pipeline.query('search query', {
  limit: 10,
  threshold: 0.7,  // Filter results with score < 0.7 (adjust 0.6-0.8 based on needs)
});
```

**Use metadata filtering to narrow search space:**
```typescript
const result = await pipeline.query('search query', {
  limit: 5,
  filter: {
    operator: 'and',
    filters: [
      { field: 'category', operator: 'eq', value: 'technical' },
      { field: 'published', operator: 'gte', value: '2024-01-01' },
    ],
  },
});
```

**For large collections (>100k documents):**
- Use persistent vector stores (Chroma, Pinecone, Weaviate)
- Enable Approximate Nearest Neighbor (ANN) search
- Implement caching for frequent queries

---

## 🔧 Troubleshooting

### Poor Search Results

**Problem:** Retrieved context not relevant to query

**Solutions:**
1. Verify using same embedder for docs and queries
2. Increase similarity threshold (0.75-0.8 for higher quality)
3. Test embedding quality:
   ```typescript
   const [ml, ai, pizza] = await embedder.embed(['machine learning', 'artificial intelligence', 'pizza']);
   const similarity = cosineSimilarity(ml, ai);  // Should be >0.7
   const unrelated = cosineSimilarity(ml, pizza); // Should be <0.3
   ```
4. Adjust chunk size (smaller chunks = more precise, larger = more context)
5. Add metadata filters to narrow search space

### High API Costs

**Problem:** Embedding API costs too high

**Solutions:**
1. Implement caching for frequent queries:
   ```typescript
   const cache = new LRUCache<string, number[]>({ max: 10000, ttl: 1000 * 60 * 60 });
   
   async function embedWithCache(text: string): Promise<number[]> {
     const cached = cache.get(text);
     if (cached) return cached;
     
     const [embedding] = await embedder.embed([text]);
     cache.set(text, embedding);
     return embedding;
   }
   ```
2. Use smaller embedding dimensions (OpenAI supports 512, 1024, 1536)
3. Switch to local models (Ollama) for development/testing
4. Batch process documents (100+ at a time) to reduce API calls

### Slow Performance

**Problem:** Search or ingestion too slow

**Solutions:**
1. **For ingestion:**
   - Increase batch size: `{ batchSize: 100 }`
   - Process files in parallel (use Promise.all with batches)
   - Use streaming loader for huge files

2. **For search:**
   - Reduce result limit: `{ limit: 5 }` instead of 50
   - Use metadata filters to narrow search space
   - Enable ANN search for collections >100k:
     ```typescript
     const store = new InMemoryVectorStore({
       useApproximateSearch: true,
       approximationParams: { nprobe: 10, nlist: 100 },
     });
     ```
   - Use persistent vector stores with indexing (Pinecone, Weaviate)

### Memory Issues

**Problem:** Application crashes with large document collections

**Solutions:**
1. Use persistent vector stores instead of in-memory
2. Set maxDocuments limit with LRU eviction:
   ```typescript
   const store = new InMemoryVectorStore({
     maxDocuments: 100000,
     evictionPolicy: 'lru',
   });
   ```
3. Process documents in smaller batches
4. Use streaming loader for large files

---

## 🧪 Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm run test:run

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Lint
npm run lint
```

---

## 🔧 Production Setup

### 1. Use Real Embedding Models

```typescript
import OpenAI from 'openai';

class OpenAIEmbeddingGenerator implements EmbeddingGenerator {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }

  getDimensions(): number {
    return 1536;
  }
}
```

### 2. Use Persistent Vector Stores

```typescript
import { ChromaClient } from 'chromadb';

// Initialize Chroma for persistent storage
const client = new ChromaClient({ path: './chroma-data' });
```

### 3. Add Production Monitoring

```typescript
const result = await ingestion.ingest(files, {
  onProgress: (current, total, details) => {
    // Send metrics to monitoring service
    metrics.gauge('rag.ingestion.progress', current / total);
    logger.info({ current, total, details }, 'Ingestion progress');
  },
});
```

---

## �️ Roadmap

### v1.1 (Planned)
- [ ] Additional vector stores (Qdrant, Milvus)
- [ ] Streaming ingestion pipeline
- [ ] Built-in caching layer
- [ ] Query expansion and synonyms
- [ ] Document versioning and updates

### v1.2 (Planned)
- [ ] Hybrid search (keyword + semantic) built-in
- [ ] Re-ranking strategies (cross-encoder models)
- [ ] Multi-query retrieval
- [ ] Sparse + dense vector support
- [ ] Advanced chunking (recursive, semantic)

### v2.0 (Future)
- [ ] Distributed vector search
- [ ] Graph RAG (knowledge graphs + vectors)
- [ ] Multi-modal embeddings (text + images)
- [ ] Real-time indexing
- [ ] Auto-tuning (chunk size, thresholds)

See our [GitHub Issues](https://github.com/dcyfr/ai-rag/issues) for feature requests and progress.

---

## �📄 License

MIT © [DCYFR](https://www.dcyfr.ai)

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

## 🔗 Links

- [Website](https://www.dcyfr.ai)
- [Documentation](https://www.dcyfr.ai/docs/ai-rag)
- [GitHub](https://github.com/dcyfr/ai-rag)
- [npm](https://www.npmjs.com/package/@dcyfr/ai-rag)

---

Built with ❤️ by the DCYFR team
