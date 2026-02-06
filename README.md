# @dcyfr/ai-rag

> **RAG (Retrieval-Augmented Generation) framework for Node.js and TypeScript**

Build production-ready RAG systems with document loading, embedding, vector stores, and semantic search.

[![npm version](https://img.shields.io/npm/v/@dcyfr/ai-rag.svg)](https://www.npmjs.com/package/@dcyfr/ai-rag)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- **📄 Document Loaders** - Load text, markdown, and HTML documents
- **🔢 Embeddings** - Generate vector embeddings (with pluggable providers)
- **🗄️ Vector Stores** - In-memory storage with cosine similarity search
- **🔍 Semantic retrieval** - Find relevant documents by meaning, not just keywords
- **🎯 Metadata Filtering** - Filter results by custom metadata
- **⚡ Batch Processing** - Efficient ingestion with progress tracking
- **📊 Built-in Examples** - Complete RAG workflows ready to run

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
const store = new InMemory VectorStore({
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

### Document Loaders

**TextLoader** - Load plain text files (`.txt`)

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

##  Examples

- **Basic RAG** - [`examples/basic-rag/`](examples/basic-rag/) - Simple document ingestion and retrieval
- **Semantic Search** - [`examples/semantic-search/`](examples/semantic-search/) - Advanced search with filtering
- **Q&A System** - [`examples/qa-system/`](examples/qa-system/) - Question answering with context assembly

Run examples:

```bash
npm run example:basic-rag
npm run example:semantic-search
npm run example:qa-system
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

## 📄 License

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
