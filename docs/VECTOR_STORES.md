# Vector Stores - Efficient Semantic Search Storage

**Target Audience:** Developers building scalable RAG systems  
**Prerequisites:** Understanding of vector embeddings, distance metrics

---

## Overview

Vector stores provide efficient storage and retrieval of document embeddings, enabling fast semantic search at scale. They index high-dimensional vectors and support similarity search using various distance metrics.

**Key Capabilities:**
- Store document chunks with embeddings
- Fast k-nearest neighbor (kNN) search
- Metadata filtering
- Multiple distance metrics (cosine, dot product, euclidean)
- In-memory and persistent storage options
- Batch operations for efficiency

---

## InMemoryVectorStore

### Basic Setup

```typescript
import { InMemoryVectorStore } from '@dcyfr/ai-rag';

const store = new InMemoryVectorStore({
  collectionName: 'my-documents',
  embeddingDimensions: 1536,  // Must match your embedder
  distanceMetric: 'cosine',   // 'cosine' | 'dot' | 'euclidean'
});

console.log(`Collection: ${store.getCollectionName()}`);
console.log(`Dimensions: ${store.getDimensions()}`);
```

### Add Documents

```typescript
import { Document } from '@dcyfr/ai-rag';

const documents: Document[] = [
  {
    id: 'doc-1',
    content: 'Machine learning is a subset of artificial intelligence.',
    embedding: [0.1, 0.2, 0.3, ...],  // 1536 dimensions
    metadata: {
      source: 'ml-guide.txt',
      category: 'technical',
      tags: ['ai', 'ml'],
    },
  },
  {
    id: 'doc-2',
    content: 'Deep learning uses neural networks with multiple layers.',
    embedding: [0.2, 0.3, 0.1, ...],
    metadata: {
      source: 'dl-basics.txt',
      category: 'technical',
      tags: ['ai', 'deep-learning'],
    },
  },
];

// Add documents
await store.addDocuments(documents);
console.log(`Total documents: ${await store.count()}`);
```

### Search

```typescript
// 1. Generate query embedding
const queryEmbedding = await embedder.embed(['What is neural network?']);

// 2. Search for similar documents
const results = await store.search(queryEmbedding[0], 5);  // Top 5 results

results.forEach(result => {
  console.log(`Score: ${result.score.toFixed(3)}`);
  console.log(`Content: ${result.document.content}`);
  console.log(`Source: ${result.document.metadata.source}`);
  console.log('---');
});
```

**Output:**
```
Score: 0.952
Content: Deep learning uses neural networks with multiple layers.
Source: dl-basics.txt
---
Score: 0.847
Content: Machine learning is a subset of artificial intelligence.
Source: ml-guide.txt
---
```

---

## Distance Metrics

### Cosine Similarity (Default)

```typescript
const store = new InMemoryVectorStore({
  collectionName: 'docs',
  embeddingDimensions: 1536,
  distanceMetric: 'cosine',
});

// Cosine similarity: measures angle between vectors
// Range: -1 to 1 (1 = identical direction, 0 = orthogonal, -1 = opposite)
// Higher score = more similar
```

**Best for:** Most embedding models (OpenAI, Cohere, etc.)

**Formula:**
```
similarity = (A · B) / (||A|| * ||B||)
```

### Dot Product

```typescript
const store = new InMemoryVectorStore({
  collectionName: 'docs',
  embeddingDimensions: 1536,
  distanceMetric: 'dot',
});

// Dot product: sum of element-wise multiplication
// Range: -∞ to +∞
// Higher score = more similar
```

**Best for:** Normalized embeddings where magnitude matters

**Formula:**
```
dotProduct = Σ(Ai * Bi)
```

### Euclidean Distance

```typescript
const store = new InMemoryVectorStore({
  collectionName: 'docs',
  embeddingDimensions: 1536,
  distanceMetric: 'euclidean',
});

// Euclidean distance: straight-line distance in vector space
// Range: 0 to +∞
// Lower distance = more similar
```

**Best for:** Spatial proximity tasks

**Formula:**
```
distance = √(Σ(Ai - Bi)²)
```

---

## Metadata Filtering

### Basic Filtering

```typescript
// Search with metadata filter
const results = await store.search(queryEmbedding, 10, {
  field: 'category',
  operator: 'eq',
  value: 'technical',
});

// Only returns documents where metadata.category === 'technical'
```

### Filter Operators

```typescript
// Equality
await store.search(embedding, 10, {
  field: 'category',
  operator: 'eq',
  value: 'technical',
});

// Inequality
await store.search(embedding, 10, {
  field: 'status',
  operator: 'neq',
  value: 'archived',
});

// Greater than
await store.search(embedding, 10, {
  field: 'priority',
  operator: 'gt',
  value: 5,
});

// Less than or equal
await store.search(embedding, 10, {
  field: 'timestamp',
  operator: 'lte',
  value: Date.now(),
});

// Contains (for arrays)
await store.search(embedding, 10, {
  field: 'tags',
  operator: 'contains',
  value: 'urgent',
});
```

### Combining Filters

```typescript
// AND filters (all must match)
const results = await store.search(queryEmbedding, 10, {
  operator: 'and',
  filters: [
    { field: 'category', operator: 'eq', value: 'technical' },
    { field: 'priority', operator: 'gte', value: 7 },
    { field: 'tags', operator: 'contains', value: 'ai' },
  ],
});

// OR filters (any must match)
const results = await store.search(queryEmbedding, 10, {
  operator: 'or',
  filters: [
    { field: 'category', operator: 'eq', value: 'technical' },
    { field: 'category', operator: 'eq', value: 'tutorial' },
  ],
});

// Complex nested filters
const results = await store.search(queryEmbedding, 10, {
  operator: 'and',
  filters: [
    {
      operator: 'or',
      filters: [
        { field: 'category', operator: 'eq', value: 'technical' },
        { field: 'category', operator: 'eq', value: 'tutorial' },
      ],
    },
    { field: 'language', operator: 'eq', value: 'en' },
  ],
});
```

---

## Document Operations

### Add Single Document

```typescript
await store.addDocument({
  id: 'doc-123',
  content: 'RAG combines retrieval and generation.',
  embedding: await embedder.embed(['RAG combines...']),
  metadata: { source: 'rag-guide.txt' },
});
```

### Add Batch

```typescript
const documents = [...];  // Array of documents

await store.addDocuments(documents);
console.log(`Added ${documents.length} documents`);
```

### Get by ID

```typescript
const document = await store.getById('doc-123');

if (document) {
  console.log(document.content);
} else {
  console.log('Document not found');
}
```

### Update Document

```typescript
await store.updateDocument('doc-123', {
  content: 'Updated content',
  embedding: await embedder.embed(['Updated content']),
  metadata: {
    ...existingMetadata,
    lastUpdated: new Date().toISOString(),
  },
});
```

### Delete Document

```typescript
await store.deleteDocument('doc-123');
console.log('Document deleted');
```

### Delete Multiple

```typescript
await store.deleteDocuments(['doc-1', 'doc-2', 'doc-3']);
```

### Clear Collection

```typescript
await store.clear();
console.log('All documents deleted');
```

### Document Count

```typescript
const total = await store.count();
console.log(`Total documents: ${total}`);

// Count with filter
const technicalCount = await store.count({
  field: 'category',
  operator: 'eq',
  value: 'technical',
});
console.log(`Technical documents: ${technicalCount}`);
```

---

## Advanced Search

### Similarity Threshold

```typescript
// Only return results with score >= 0.7
const results = await store.search(queryEmbedding, 10, undefined, 0.7);

// Filter low-quality matches
const highQualityResults = results.filter(r => r.score >= 0.8);
```

### Find Similar Documents

```typescript
// Find documents similar to a specific document
const similar = await store.findSimilar('doc-123', {
  limit: 5,
  threshold: 0.75,
  excludeSelf: true,  // Don't include doc-123 in results
});
```

### Multi-Query Search

```typescript
// Search with multiple queries, combine results
const queries = [
  'What is machine learning?',
  'How does AI work?',
  'Explain neural networks',
];

const queryEmbeddings = await embedder.embed(queries);

const allResults = await Promise.all(
  queryEmbeddings.map(emb => store.search(emb, 5))
);

// Merge and deduplicate
const uniqueResults = new Map();
allResults.flat().forEach(result => {
  const existing = uniqueResults.get(result.document.id);
  if (!existing || result.score > existing.score) {
    uniqueResults.set(result.document.id, result);
  }
});

const mergedResults = Array.from(uniqueResults.values())
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);
```

---

## Persistent Vector Stores

### Chroma

#### Setup

```bash
npm install chromadb
```

```typescript
import { ChromaClient } from 'chromadb';
import { ChromaVectorStore } from '@dcyfr/ai-rag';

const client = new ChromaClient({
  path: 'http://localhost:8000',  // Chroma server URL
});

const store = new ChromaVectorStore({
  client,
  collectionName: 'my-documents',
  embeddingDimensions: 1536,
});

// Usage is identical to InMemoryVectorStore
await store.addDocuments(documents);
const results = await store.search(queryEmbedding, 10);
```

#### Run Chroma Server

```bash
# Docker
docker run -p 8000:8000 chromadb/chroma

# Or Python
pip install chromadb
chroma run --path ./chroma-data
```

### Pinecone

#### Setup

```bash
npm install @pinecone-database/pinecone
```

```typescript
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeVectorStore } from '@dcyfr/ai-rag';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Create index (one-time setup)
await pinecone.createIndex({
  name: 'my-documents',
  dimension: 1536,
  metric: 'cosine',
});

const index = pinecone.index('my-documents');

const store = new PineconeVectorStore({
  index,
  namespace: 'default',  // Optional: organize vectors
});

await store.addDocuments(documents);
```

### Weaviate

#### Setup

```bash
npm install weaviate-client
```

```typescript
import weaviate from 'weaviate-client';
import { WeaviateVectorStore } from '@dcyfr/ai-rag';

const client = await weaviate.connectToLocal();

const store = new WeaviateVectorStore({
  client,
  className: 'Document',
  vectorizer: 'none',  // We provide our own embeddings
});

await store.addDocuments(documents);
```

---

## Performance Optimization

### Batch Insertion

```typescript
// ✅ GOOD - Batch insertion
const documents = [...];  // 1000 documents
await store.addDocuments(documents);  // Single operation

// ❌ BAD - Individual insertions
for (const doc of documents) {
  await store.addDocument(doc);  // 1000 operations!
}
```

### Indexing Strategy

```typescript
// For large collections, build index upfront
const store = new InMemoryVectorStore({
  collectionName: 'large-docs',
  embeddingDimensions: 1536,
  buildIndexOnInsert: false,  // Defer index building
});

// Add all documents
await store.addDocuments(documents);

// Build index once
await store.buildIndex();

// Now search is fast
const results = await store.search(queryEmbedding, 10);
```

### Memory Management

```typescript
import { InMemoryVectorStore } from '@dcyfr/ai-rag';

// Limit memory usage with max documents
const store = new InMemoryVectorStore({
  collectionName: 'docs',
  embeddingDimensions: 1536,
  maxDocuments: 10000,  // Evict oldest when limit reached
  evictionPolicy: 'lru',  // Least Recently Used
});
```

### Approximate Nearest Neighbor (ANN)

```typescript
// For very large collections (100k+ documents), use ANN
const store = new InMemoryVectorStore({
  collectionName: 'huge-docs',
  embeddingDimensions: 1536,
  useApproximateSearch: true,  // Trade accuracy for speed
  approximationParams: {
    nprobe: 10,  // Search 10 partitions (higher = more accurate, slower)
    nlist: 100,  // Divide space into 100 partitions
  },
});

// Search is much faster with slight accuracy loss
const results = await store.search(queryEmbedding, 10);
```

---

## Best Practices

### 1. Choose Appropriate Distance Metric

```typescript
// ✅ GOOD - Use cosine for most embedding models
const store = new InMemoryVectorStore({
  distanceMetric: 'cosine',  // OpenAI, Cohere, etc. are trained for cosine
});

// ❌ BAD - Using euclidean with normalized embeddings
const store = new InMemoryVectorStore({
  distanceMetric: 'euclidean',  // May give poor results
});
```

### 2. Validate Embedding Dimensions

```typescript
// ✅ GOOD - Validate before insertion
function validateDocument(doc: Document, store: VectorStore): void {
  const expectedDim = store.getDimensions();
  const actualDim = doc.embedding?.length || 0;
  
  if (actualDim !== expectedDim) {
    throw new Error(
      `Embedding dimension mismatch: expected ${expectedDim}, got ${actualDim}`
    );
  }
}

awaitStore.addDocuments(documents.filter(doc => {
  try {
    validateDocument(doc, store);
    return true;
  } catch (error) {
    console.error(`Invalid document: ${doc.id}`, error);
    return false;
  }
}));
```

### 3. Add Rich Metadata

```typescript
// ✅ GOOD - Rich, searchable metadata
await store.addDocument({
  id: 'doc-123',
  content: 'Document content...',
  embedding: [...],
  metadata: {
    source: 'user-guide.txt',
    category: 'documentation',
    tags: ['user-facing', 'tutorial'],
    language: 'en',
    created: '2026-02-07T00:00:00Z',
    lastModified: '2026-02-07T00:00:00Z',
    author: 'Jane Doe',
    version: '2.0',
  },
});

// Filter by metadata during search
const results = await store.search(queryEmbedding, 10, {
  field: 'category',
  operator: 'eq',
  value: 'documentation',
});
```

### 4. Handle Large Collections

```typescript
// For >100k documents, use persistent store
const store = new ChromaVectorStore({
  client,
  collectionName: 'large-collection',
});

// Or use approximate search
const store = new InMemoryVectorStore({
  useApproximateSearch: true,
  approximationParams: { nprobe: 10, nlist: 100 },
});
```

### 5. Monitor Store Size

```typescript
function monitorStoreSize(store: VectorStore): void {
  const count = await store.count();
  const dimensions = store.getDimensions();
  
  // Rough memory estimate: count * dimensions * 4 bytes (float32)
  const memoryMB = (count * dimensions * 4) / (1024 * 1024);
  
  console.log(`Documents: ${count}`);
  console.log(`Estimated memory: ${memoryMB.toFixed(2)} MB`);
  
  if (memoryMB > 1000) {  // > 1GB
    console.warn('Consider using persistent vector store');
  }
}

setInterval(() => monitorStoreSize(store), 60000);  // Check every minute
```

---

## Troubleshooting

### Issue: Slow Search Performance

**Problem:** Search takes too long with large collections

**Solutions:**
```typescript
// 1. Use approximate search
const store = new InMemoryVectorStore({
  useApproximateSearch: true,
});

// 2. Reduce result limit
const results = await store.search(queryEmbedding, 5);  // Instead of 100

// 3. Add metadata filters to narrow search space
const results = await store.search(queryEmbedding, 10, {
  field: 'category',
  operator: 'eq',
  value: 'specific-category',
});

// 4. Use persistent vector store with indexing
const store = new PineconeVectorStore({ /* ... */ });
```

### Issue: High Memory Usage

**Problem:** Application using too much memory

**Solution:** Use persistent storage

```typescript
// Instead of InMemoryVectorStore
const store = new ChromaVectorStore({
  client,
  collectionName: 'docs',
});

// Or limit in-memory documents
const store = new InMemoryVectorStore({
  maxDocuments: 10000,
  evictionPolicy: 'lru',
});
```

### Issue: Poor Search Quality

**Problem:** Search returns irrelevant results

**Solutions:**
```typescript
// 1. Increase similarity threshold
const results = await store.search(queryEmbedding, 10, undefined, 0.8);

// 2. Verify same distance metric as embedder
const store = new InMemoryVectorStore({
  distanceMetric: 'cosine',  // Match embedder training
});

// 3. Check embedding quality
const testDocs = await embedder.embed([
  'artificial intelligence',
  'machine learning',
  'pizza recipe',
]);

const sim1 = cosineSimilarity(testDocs[0], testDocs[1]);  // Should be high
const sim2 = cosineSimilarity(testDocs[0], testDocs[2]);  // Should be low
```

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
