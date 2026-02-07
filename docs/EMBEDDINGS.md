# Embeddings - Vector Representation for Semantic Search

**Target Audience:** Developers implementing semantic search and RAG systems  
**Prerequisites:** Understanding of vector embeddings, cosine similarity

---

## Overview

Embeddings convert text into dense vector representations that capture semantic meaning. Similar concepts have similar vectors, enabling semantic search that understands meaning rather than just matching keywords.

**Key Concepts:**
- Transform text → fixed-length numeric vectors
- Semantic similarity measured by vector distance
- Pluggable providers (Simple, OpenAI, Anthropic, local models)
- Batch processing for efficiency
- Dimension consistency across documents and queries

---

## Quick Start

### Simple Embedding Generator (Development/Testing)

```typescript
import { SimpleEmbeddingGenerator } from '@dcyfr/ai-rag';

const embedder = new SimpleEmbeddingGenerator({
  dimensions: 384,  // Vector size
});

// Embed single text
const [embedding] = await embedder.embed(['Hello world']);
console.log(embedding.length);  // 384

// Embed multiple texts (batched)
const embeddings = await embedder.embed([
  'Machine learning is fascinating',
  'AI transforms industries',
  'The weather is nice today',
]);

console.log(embeddings.length);  // 3 vectors
console.log(embeddings[0].length);  // 384 dimensions each
```

⚠️ **Note:** `SimpleEmbeddingGenerator` uses random vectors and is **not suitable for production**. Use real embedding models for actual semantic search.

---

## Production Embedding Providers

### OpenAI Embeddings

#### Setup

```bash
npm install openai
```

```typescript
import OpenAI from 'openai';
import { EmbeddingGenerator } from '@dcyfr/ai-rag';

export class OpenAIEmbeddingGenerator implements EmbeddingGenerator {
  private client: OpenAI;
  private model: string;
  private dimensions: number;

  constructor(config: {
    apiKey: string;
    model?: string;
    dimensions?: number;
  }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions || 1536;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions,
    });

    return response.data.map((item) => item.embedding);
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
```

#### Usage

```typescript
const embedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small',  // 1536 dimensions
  dimensions: 1536,
});

const embeddings = await embedder.embed([
  'What is machine learning?',
  'How does AI work?',
]);

console.log(embeddings[0].length);  // 1536
```

#### Model Options

| Model | Dimensions | Performance | Cost |
|-------|-----------|-------------|------|
| `text-embedding-3-small` | 1536 | Fast, good quality | Low |
| `text-embedding-3-large` | 3072 | Best quality | Medium |
| `text-embedding-ada-002` | 1536 | Legacy, still good | Low |

**Recommendation:** Use `text-embedding-3-small` for most applications. Only use `-large` if you need maximum accuracy.

### Anthropic (Claude) Embeddings

#### Setup

```bash
npm install @anthropic-ai/sdk
```

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { EmbeddingGenerator } from '@dcyfr/ai-rag';

export class AnthropicEmbeddingGenerator implements EmbeddingGenerator {
  private client: Anthropic;

  constructor(config: { apiKey: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1,
        messages: [{
          role: 'user',
          content: `Generate embedding for: ${text}`,
        }],
      });

      // Extract embedding from response
      // (Note: Anthropic doesn't have dedicated embedding endpoint yet)
      // This is a placeholder - use a proper embedding service
      embeddings.push(this.generatePlaceholder());
    }

    return embeddings;
  }

  getDimensions(): number {
    return 1024;
  }

  private generatePlaceholder(): number[] {
    // Placeholder implementation
    return Array.from({ length: 1024 }, () => Math.random());
  }
}
```

### Cohere Embeddings

#### Setup

```bash
npm install cohere-ai
```

```typescript
import { CohereClient } from 'cohere-ai';
import { EmbeddingGenerator } from '@dcyfr/ai-rag';

export class CohereEmbeddingGenerator implements EmbeddingGenerator {
  private client: CohereClient;
  private model: string;

  constructor(config: {
    apiKey: string;
    model?: string;
  }) {
    this.client = new CohereClient({ token: config.apiKey });
    this.model = config.model || 'embed-english-v3.0';
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embed({
      texts,
      model: this.model,
      inputType: 'search_document',
    });

    return response.embeddings;
  }

  getDimensions(): number {
    return 1024;  // embed-english-v3.0
  }
}
```

#### Usage

```typescript
const embedder = new CohereEmbeddingGenerator({
  apiKey: process.env.COHERE_API_KEY!,
  model: 'embed-english-v3.0',
});

const embeddings = await embedder.embed([
  'Document chunk 1',
  'Document chunk 2',
]);
```

**Cohere Input Types:**
- `search_document` - For documents being indexed
- `search_query` - For search queries
- `classification` - For classification tasks
- `clustering` - For clustering tasks

### Local Embeddings (Ollama)

#### Setup

```bash
# Install Ollama: https://ollama.ai
ollama pull nomic-embed-text
```

```typescript
import { Ollama } from 'ollama';
import { EmbeddingGenerator } from '@dcyfr/ai-rag';

export class OllamaEmbeddingGenerator implements EmbeddingGenerator {
  private client: Ollama;
  private model: string;

  constructor(config: {
    model?: string;
    baseUrl?: string;
  }) {
    this.client = new Ollama({ host: config.baseUrl || 'http://localhost:11434' });
    this.model = config.model || 'nomic-embed-text';
  }

  async embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await this.client.embeddings({
        model: this.model,
        prompt: text,
      });

      embeddings.push(response.embedding);
    }

    return embeddings;
  }

  getDimensions(): number {
    return 768;  // nomic-embed-text dimensions
  }
}
```

**Local Model Options:**
- `nomic-embed-text` - 768 dimensions, English
- `mxbai-embed-large` - 1024 dimensions, multilingual
- `all-minilm` - 384 dimensions, fast

**Benefits:**
- ✅ No API costs
- ✅ Data privacy (runs locally)
- ✅ No rate limits
- ❌ Slower than cloud APIs
- ❌ Requires GPU for good performance

---

## Batch Processing

### Efficient Batch Embedding

```typescript
const embedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Process 1000 documents in batches of 100
const documents = loadDocuments();  // 1000 documents
const batchSize = 100;
const batches = [];

for (let i = 0; i < documents.length; i += batchSize) {
  const batch = documents.slice(i, i + batchSize);
  batches.push(batch);
}

for (const batch of batches) {
  const texts = batch.map(doc => doc.content);
  const embeddings = await embedder.embed(texts);
  
  // Attach embeddings to documents
  batch.forEach((doc, index) => {
    doc.embedding = embeddings[index];
  });
  
  // Save to vector store
  await store.addDocuments(batch);
  
  console.log(`Processed ${Math.min(i + batchSize, documents.length)}/${documents.length}`);
}
```

### Rate Limiting

```typescript
import pLimit from 'p-limit';

const embedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
});

const limit = pLimit(5);  // Max 5 concurrent requests

const tasks = batches.map(batch =>
  limit(async () => {
    const texts = batch.map(doc => doc.content);
    return embedder.embed(texts);
  })
);

const results = await Promise.all(tasks);
```

---

## Embedding Dimensions

### Choosing Dimensions

```typescript
// Low dimensions (384-512) - faster, less storage
const smallEmbedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small',
  dimensions: 512,  // Reduced from default 1536
});

// High dimensions (1536-3072) - better accuracy
const largeEmbedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-large',
  dimensions: 3072,
});
```

**Trade-offs:**

| Dimensions | Storage | Speed | Accuracy |
|-----------|---------|-------|----------|
| 384 | Low | Fast | Good |
| 768 | Medium | Medium | Better |
| 1536 | High | Slower | Best (OpenAI small) |
| 3072 | Very High | Slowest | Best (OpenAI large) |

### Dimension Consistency

```typescript
// ❌ WRONG - Mismatched dimensions
const docEmbedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
const queryEmbedder = new SimpleEmbeddingGenerator({ dimensions: 512 });

// Vectors have different dimensions - can't compare!

// ✅ CORRECT - Same dimensions
const embedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
  dimensions: 1536,
});

// Use same embedder for both documents and queries
await store.addDocuments(docs);  // Embedding with dimensions=1536
const results = await pipeline.query('search query');  // Same dimensions=1536
```

---

## Similarity Metrics

### Cosine Similarity (Recommended)

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

const similarity = cosineSimilarity(embedding1, embedding2);
// Returns: 0 to 1 (1 = identical, 0 = orthogonal)
```

**Best for:** Most embedding models (OpenAI, Cohere, etc.) are optimized for cosine similarity.

### Dot Product

```typescript
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

const similarity = dotProduct(embedding1, embedding2);
```

**Best for:** Normalized embeddings where magnitude matters.

### Euclidean Distance

```typescript
function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
}

const distance = euclideanDistance(embedding1, embedding2);
// Lower distance = more similar
```

**Best for:** Spatial proximity tasks, though cosine is generally better for text.

---

## Advanced Techniques

### Query vs Document Embeddings

Some models support different modes for queries and documents:

```typescript
class DualModeEmbedder implements EmbeddingGenerator {
  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.client.embed({
      texts,
      inputType: 'search_document',  // Optimize for indexing
    });
  }

  async embedQuery(text: string): Promise<number[]> {
    const [embedding] = await this.client.embed({
      texts: [text],
      inputType: 'search_query',  // Optimize for searching
    });
    return embedding;
  }
}
```

### Multilingual Embeddings

```typescript
const embedder = new CohereEmbeddingGenerator({
  apiKey: process.env.COHERE_API_KEY!,
  model: 'embed-multilingual-v3.0',  // Supports 100+ languages
});

const embeddings = await embedder.embed([
  'Hello world',           // English
  'Bonjour le monde',     // French
  'Hola mundo',           // Spanish
  '你好世界',              // Chinese
]);

// All embeddings in same vector space - can compare across languages!
```

### Embedding Caching

```typescript
import { LRUCache } from 'lru-cache';

class CachedEmbeddingGenerator implements EmbeddingGenerator {
  private embedder: EmbeddingGenerator;
  private cache: LRUCache<string, number[]>;

  constructor(embedder: EmbeddingGenerator) {
    this.embedder = embedder;
    this.cache = new LRUCache({
      max: 10000,  // Cache 10k embeddings
      ttl: 1000 * 60 * 60,  // 1 hour TTL
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const toEmbed: string[] = [];
    const toEmbedIndices: number[] = [];

    // Check cache
    texts.forEach((text, index) => {
      const cached = this.cache.get(text);
      if (cached) {
        results[index] = cached;
      } else {
        toEmbed.push(text);
        toEmbedIndices.push(index);
      }
    });

    // Embed uncached texts
    if (toEmbed.length > 0) {
      const newEmbeddings = await this.embedder.embed(toEmbed);
      
      newEmbeddings.forEach((embedding, i) => {
        const text = toEmbed[i];
        const originalIndex = toEmbedIndices[i];
        
        this.cache.set(text, embedding);
        results[originalIndex] = embedding;
      });
    }

    return results;
  }

  getDimensions(): number {
    return this.embedder.getDimensions();
  }
}
```

**Usage:**
```typescript
const baseEmbedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
});

const cachedEmbedder = new CachedEmbeddingGenerator(baseEmbedder);

// Subsequent calls with same text use cache
await cachedEmbedder.embed(['repeated text']);  // API call
await cachedEmbedder.embed(['repeated text']);  // Cache hit!
```

---

## Best Practices

### 1. Use Consistent Embeddings

```typescript
// ✅ CORRECT - Same embedder for documents and queries
const embedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
});

await store.addDocuments(docs);  // Use embedder
const results = await pipeline.query('search', { embedder });  // Same embedder

// ❌ WRONG - Different embedders
const docEmbedder = new OpenAIEmbeddingGenerator({ model: 'text-embedding-3-small' });
const queryEmbedder = new CohereEmbeddingGenerator({ model: 'embed-english' });
// Results will be poor - incompatible vector spaces!
```

### 2. Batch for Efficiency

```typescript
// ✅ GOOD - Batch processing
const embeddings = await embedder.embed(texts);  // Single API call for 100 texts

// ❌ BAD - Individual calls
for (const text of texts) {
  const [embedding] = await embedder.embed([text]);  // 100 API calls!
}
```

### 3. Monitor Costs

```typescript
class CostTrackingEmbedder implements EmbeddingGenerator {
  private embedder: EmbeddingGenerator;
  private tokensUsed = 0;

  async embed(texts: string[]): Promise<number[][]> {
    const totalTokens = texts.reduce((sum, text) =>
      sum + this.estimateTokens(text), 0
    );
    
    this.tokensUsed += totalTokens;
    
    console.log(`Tokens used: ${this.tokensUsed}`);
    console.log(`Estimated cost: $${this.estimateCost()}`);
    
    return this.embedder.embed(texts);
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private estimateCost(): number {
    // OpenAI text-embedding-3-small: $0.02 per 1M tokens
    return (this.tokensUsed / 1_000_000) * 0.02;
  }
}
```

### 4. Handle Errors Gracefully

```typescript
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
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### 5. Validate Dimensions

```typescript
function validateEmbedding(
  embedding: number[],
  expectedDimensions: number
): void {
  if (embedding.length !== expectedDimensions) {
    throw new Error(
      `Expected ${expectedDimensions} dimensions, got ${embedding.length}`
    );
  }
  
  if (embedding.some(val => !isFinite(val))) {
    throw new Error('Embedding contains invalid values (NaN or Infinity)');
  }
}

// Usage
const embeddings = await embedder.embed(texts);
embeddings.forEach(emb =>
  validateEmbedding(emb, embedder.getDimensions())
);
```

---

## Troubleshooting

### Issue: Poor Search Results

**Problem:** Semantic search returns irrelevant results

**Solutions:**
```typescript
// 1. Verify same embedder for docs and queries
// 2. Check embedding quality
const testEmbeddings = await embedder.embed([
  'machine learning',
  'artificial intelligence',
  'pizza recipe',
]);

const sim1 = cosineSimilarity(testEmbeddings[0], testEmbeddings[1]);  // Should be high
const sim2 = cosineSimilarity(testEmbeddings[0], testEmbeddings[2]);  // Should be low

console.log(`ML vs AI similarity: ${sim1}`);  // Expect > 0.7
console.log(`ML vs Pizza similarity: ${sim2}`);  // Expect < 0.3
```

### Issue: High API Costs

**Solution:** Implement caching and batch processing

```typescript
const cachedEmbedder = new CachedEmbeddingGenerator(
  new OpenAIEmbeddingGenerator({ apiKey: process.env.OPENAI_API_KEY! })
);

// Cache frequently searched queries
```

### Issue: Slow Embedding Generation

**Solution:** Use local models or smaller dimensions

```typescript
// Option 1: Local model
const localEmbedder = new OllamaEmbeddingGenerator({
  model: 'all-minilm',  // Fast, 384 dimensions
});

// Option 2: Reduce dimensions
const fastEmbedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
  dimensions: 512,  // Reduced from 1536
});
```

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
