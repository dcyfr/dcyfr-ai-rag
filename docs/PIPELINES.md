# Pipelines - End-to-End RAG Workflows

**Target Audience:** Developers building complete RAG systems  
**Prerequisites:** Understanding of loaders, embeddings, vector stores

---

## Overview

Pipelines orchestrate the complete RAG workflow by connecting document loaders, embedding generators, and vector stores into seamless ingestion and retrieval flows.

**Key Components:**
- **Ingestion Pipeline** - Load documents → chunk → embed → store
- **Retrieval Pipeline** - Query → embed → search → assemble context
- Progress tracking and error handling
- Batch processing for efficiency
- Metadata filtering and ranking

---

## Ingestion Pipeline

### Basic Setup

```typescript
import {
  TextLoader,
  OpenAIEmbeddingGenerator,
  Ingest InMemoryVectorStore,
  IngestionPipeline,
} from '@dcyfr/ai-rag';

// 1. Setup components
const loader = new TextLoader();
const embedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
});
const store = new InMemoryVectorStore({
  collectionName: 'my-docs',
  embeddingDimensions: 1536,
});

// 2. Create pipeline
const pipeline = new IngestionPipeline(loader, embedder, store);

// 3. Ingest documents
const result = await pipeline.ingest(['./docs/file1.txt', './docs/file2.txt']);

console.log(`Documents processed: ${result.documentsProcessed}`);
console.log(`Chunks generated: ${result.chunksGenerated}`);
console.log(`Embeddings created: ${result.embeddingsCreated}`);
console.log(`Duration: ${result.durationMs}ms`);
```

### Single File Ingestion

```typescript
const result = await pipeline.ingestFile('./document.txt', {
  chunkSize: 1000,
  chunkOverlap: 200,
  metadata: {
    category: 'technical',
    priority: 'high',
  },
});
```

### Batch Ingestion

```typescript
import { glob } from 'glob';

// Find all markdown files
const files = await glob('./docs/**/*.md');

const result = await pipeline.ingest(files, {
  batchSize: 32,  // Process 32 documents at a time
  chunkSize: 800,
  chunkOverlap: 150,
});

console.log(`Processed ${result.documentsProcessed} files`);
console.log(`Generated ${result.chunksGenerated} chunks`);
```

### Progress Tracking

```typescript
const result = await pipeline.ingest(files, {
  batchSize: 50,
  onProgress: (current, total, details) => {
    const percent = ((current / total) * 100).toFixed(1);
    console.log(`Progress: ${current}/${total} (${percent}%)`);
    console.log(`Current file: ${details.currentFile}`);
    console.log(`Chunks so far: ${details.chunksProcessed}`);
    console.log(`---`);
  },
});
```

**Output:**
```
Progress: 10/100 (10.0%)
Current file: ./docs/guide-10.md
Chunks so far: 147
---
Progress: 20/100 (20.0%)
Current file: ./docs/guide-20.md
Chunks so far: 289
---
```

### Error Handling

```typescript
const result = await pipeline.ingest(files, {
  batchSize: 32,
  continueOnError: true,  // Don't stop on individual file errors
  onError: (error, file) => {
    console.error(`Failed to process ${file}:`, error.message);
    // Log to monitoring service
    logger.error({ error, file }, 'Ingestion error');
  },
});

console.log(`Successful: ${result.documentsProcessed}`);
console.log(`Failed: ${result.errors.length}`);

// Review errors
result.errors.forEach(err => {
  console.log(`${err.file}: ${err.error.message}`);
});
```

### Custom Metadata

```typescript
await pipeline.ingest(files, {
  metadata: (filePath) => ({
    source: filePath,
    category: filePath.includes('/api/') ? 'api-docs' : 'user-guide',
    ingestedAt: new Date().toISOString(),
    version: '2.0',
  }),
});

// Metadata function receives file path and returns custom metadata
```

---

## Retrieval Pipeline

### Basic Setup

```typescript
import {
  InMemoryVectorStore,
  OpenAIEmbeddingGenerator,
  RetrievalPipeline,
} from '@dcyfr/ai-rag';

const store = new InMemoryVectorStore({
  collectionName: 'my-docs',
  embeddingDimensions: 1536,
});

const embedder = new OpenAIEmbeddingGenerator({
  apiKey: process.env.OPENAI_API_KEY!,
});

const pipeline = new RetrievalPipeline(store, embedder);
```

### Semantic Search

```typescript
const result = await pipeline.query('What is machine learning?', {
  limit: 5,  // Return top 5 results
  threshold: 0.7,  // Minimum similarity score
  includeMetadata: true,
});

// Assembled context from top results
console.log(result.context);

// Individual results with scores
result.results.forEach(r => {
  console.log(`Score: ${r.score.toFixed(3)}`);
  console.log(`Content: ${r.document.content.substring(0, 100)}...`);
  console.log('---');
});

// Query metadata
console.log(`Query time: ${result.metadata.queryTimeMs}ms`);
console.log(`Total matches: ${result.metadata.totalMatches}`);
```

### Context Assembly

**Strategies:**

```typescript
// 1. Simple concatenation (default)
const result = await pipeline.query('search query', {
  contextAssembly: 'concatenate',
});

// Context: "chunk1\n\nchunk2\n\nchunk3..."

// 2. Ranked by relevance
const result = await pipeline.query('search query', {
  contextAssembly: 'ranked',
  includeScores: true,
});

// Context: "[Score: 0.95] chunk1\n\n[Score: 0.87] chunk2..."

// 3. Deduplicated
const result = await pipeline.query('search query', {
  contextAssembly: 'deduplicated',
  similarityThreshold: 0.95,  // Merge very similar chunks
});

// 4. Custom assembly
const result = await pipeline.query('search query', {
  contextAssembly: 'custom',
  assembler: (results) => {
    return results
      .map(r => `[Source: ${r.document.metadata.source}]\n${r.document.content}`)
      .join('\n\n---\n\n');
  },
});
```

### Metadata Filtering

```typescript
// Filter by category
const result = await pipeline.query('search query', {
  limit: 10,
  filter: {
    field: 'category',
    operator: 'eq',
    value: 'api-docs',
  },
});

// Only searches within API documentation

// Complex filters
const result = await pipeline.query('search query', {
  limit: 10,
  filter: {
    operator: 'and',
    filters: [
      { field: 'category', operator: 'eq', value: 'technical' },
      { field: 'priority', operator: 'gte', value: 7 },
      { field: 'tags', operator: 'contains', value: 'ai' },
    ],
  },
});
```

### Re-ranking

```typescript
// Re-rank results using different embedding model
const result = await pipeline.query('search query', {
  limit: 10,
  rerank: true,
  rerankModel: 'cohere-rerank-v2',
  rerankTopK: 5,  // Re-rank top 5 from initial 10
});

// Results are semantically re-ordered for better relevance
```

### Hybrid Search

```typescript
// Combine semantic search with keyword search
const result = await pipeline.query('search query', {
  limit: 10,
  hybrid: true,
  keywordWeight: 0.3,  // 30% keyword, 70% semantic
  bm25Params: {
    k1: 1.5,
    b: 0.75,
  },
});

// Captures both semantic meaning and keyword matches
```

---

## Advanced Pipelines

### Multi-Source Ingestion

```typescript
import { IngestionPipeline, TextLoader, MarkdownLoader, HTMLLoader } from '@dcyfr/ai-rag';

class MultiSourcePipeline {
  private pipelines: Map<string, IngestionPipeline>;

  constructor(embedder, store) {
    this.pipelines = new Map([
      ['txt', new IngestionPipeline(new TextLoader(), embedder, store)],
      ['md', new IngestionPipeline(new MarkdownLoader(), embedder, store)],
      ['html', new IngestionPipeline(new HTMLLoader(), embedder, store)],
    ]);
  }

  async ingest(files: string[]) {
    const byExtension = new Map<string, string[]>();

    // Group files by extension
    files.forEach(file => {
      const ext = file.split('.').pop() || '';
      const group = byExtension.get(ext) || [];
      group.push(file);
      byExtension.set(ext, group);
    });

    // Process each group with appropriate pipeline
    const results = [];
    for (const [ext, fileList] of byExtension) {
      const pipeline = this.pipelines.get(ext);
      if (pipeline) {
        const result = await pipeline.ingest(fileList);
        results.push(result);
      }
    }

    return results;
  }
}

// Usage
const multiPipeline = new MultiSourcePipeline(embedder, store);
await multiPipeline.ingest([
  './docs/guide.txt',
  './docs/README.md',
  './docs/page.html',
]);
```

### Incremental Updates

```typescript
class IncrementalPipeline {
  private pipeline: IngestionPipeline;
  private processedFiles: Map<string, string>;  // file -> hash

  async ingest(files: string[]) {
    const toProcess = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const hash = this.hash(content);
      const previousHash = this.processedFiles.get(file);

      if (hash !== previousHash) {
        // File changed or new
        toProcess.push(file);

        // Remove old version from store
        if (previousHash) {
          await this.removeFileDocuments(file);
        }

        this.processedFiles.set(file, hash);
      }
    }

    if (toProcess.length > 0) {
      console.log(`Processing ${toProcess.length} changed/new files`);
      await this.pipeline.ingest(toProcess);
    } else {
      console.log('No changes detected');
    }
  }

  private hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async removeFileDocuments(file: string) {
    // Remove documents with matching source metadata
    const allDocs = await this.store.getAll();
    const toDelete = allDocs
      .filter(doc => doc.metadata.source === file)
      .map(doc => doc.id);
    await this.store.deleteDocuments(toDelete);
  }
}
```

### Streaming Ingestion

```typescript
import { Readable } from 'stream';

class StreamingPipeline {
  async ingestStream(stream: Readable, options: IngestOptions) {
    const chunks: Document[] = [];
    let buffer = '';

    stream.on('data', async (chunk) => {
      buffer += chunk.toString();

      // Split into documents when buffer exceeds threshold
      if (buffer.length >= options.chunkSize) {
        const docs = await this.processBuffer(buffer, options);
        chunks.push(...docs);
        buffer = '';

        // Process batch
        if (chunks.length >= options.batchSize) {
          await this.processBatch(chunks);
          chunks.length = 0;
        }
      }
    });

    stream.on('end', async () => {
      // Process remaining buffer
      if (buffer) {
        const docs = await this.processBuffer(buffer, options);
        chunks.push(...docs);
      }

      // Process final batch
      if (chunks.length > 0) {
        await this.processBatch(chunks);
      }
    });
  }

  private async processBuffer(text: string, options): Promise<Document[]> {
    const [embedding] = await this.embedder.embed([text]);
    return [{
      id: crypto.randomUUID(),
      content: text,
      embedding,
      metadata: options.metadata || {},
    }];
  }

  private async processBatch(docs: Document[]) {
    await this.store.addDocuments(docs);
    console.log(`Processed batch of ${docs.length} documents`);
  }
}
```

---

## RAG Patterns

### Question Answering

```typescript
import OpenAI from 'openai';

async function answerQuestion(question: string): Promise<string> {
  // 1. Retrieve relevant context
  const retrieval = await pipeline.query(question, {
    limit: 5,
    threshold: 0.7,
  });

  // 2. Generate answer using context
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Answer the question based only on the provided context. If the context doesn\'t contain enough information, say "I don\'t have enough information to answer that."',
      },
      {
        role: 'user',
        content: `Context:\n${retrieval.context}\n\nQuestion: ${question}`,
      },
    ],
  });

  return response.choices[0].message.content || '';
}

// Usage
const answer = await answerQuestion('What is machine learning?');
console.log(answer);
```

### Conversational RAG

```typescript
class ConversationalRAG {
  private pipeline: RetrievalPipeline;
  private openai: OpenAI;
  private history: Array<{ role: string; content: string }> = [];

  async chat(message: string): Promise<string> {
    // 1. Generate search query from conversation history
    const searchQuery = await this.generateSearchQuery(message);

    // 2. Retrieve relevant context
    const retrieval = await this.pipeline.query(searchQuery, {
      limit: 5,
      threshold: 0.7,
    });

    // 3. Generate response with context + history
    this.history.push({ role: 'user', content: message });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant. Use the provided context to answer questions. Context:\n${retrieval.context}`,
        },
        ...this.history,
      ],
    });

    const assistantMessage = response.choices[0].message.content || '';
    this.history.push({ role: 'assistant', content: assistantMessage });

    return assistantMessage;
  }

  private async generateSearchQuery(message: string): Promise<string> {
    // Use conversation history to generate better search query
   const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Generate a semantic search query from the conversation.' },
        ...this.history.slice(-4),  // Last 2 turns
        { role: 'user', content: message },
      ],
    });

    return response.choices[0].message.content || message;
  }
}

// Usage
const rag = new ConversationalRAG(pipeline, openai);

console.log(await rag.chat('What is RAG?'));
console.log(await rag.chat('How does it work?'));  // Uses conversation context
console.log(await rag.chat('What are the benefits?'));
```

### Summarization with RAG

```typescript
async function summarizeDocuments(topic: string): Promise<string> {
  // 1. Retrieve all relevant documents
  const retrieval = await pipeline.query(topic, {
    limit: 20,  // Get more documents for comprehensive summary
    threshold: 0.6,
  });

  // 2. Generate summary
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Summarize the key points from the provided documents.',
      },
      {
        role: 'user',
        content: `Topic: ${topic}\n\nDocuments:\n${retrieval.context}`,
      },
    ],
  });

  return response.choices[0].message.content || '';
}

// Usage
const summary = await summarizeDocuments('machine learning best practices');
console.log(summary);
```

---

## Best Practices

### 1. Batch Processing for Efficiency

```typescript
// ✅ GOOD - Process in batches
await pipeline.ingest(files, {
  batchSize: 50,  // Balance throughput and memory
});

// ❌ BAD - Process one by one
for (const file of files) {
  await pipeline.ingestFile(file);
}
```

### 2. Add Progress Tracking

```typescript
// ✅ GOOD - Monitor progress
await pipeline.ingest(files, {
  onProgress: (current, total, details) => {
    metrics.gauge('ingestion.progress', current / total);
    logger.info({ current, total }, 'Ingestion progress');
  },
});
```

### 3. Handle Errors Gracefully

```typescript
// ✅ GOOD - Continue on errors, track failures
const result = await pipeline.ingest(files, {
  continueOnError: true,
  onError: (error, file) => {
    logger.error({ error, file }, 'Ingestion error');
    metrics.increment('ingestion.errors');
  },
});

console.log(`Success: ${result.documentsProcessed}`);
console.log(`Failures: ${result.errors.length}`);
```

### 4. Use Appropriate Context Size

```typescript
// ✅ GOOD - Balance context quality and cost
const result = await pipeline.query(question, {
  limit: 5,  // Enough for good context, not too much
  threshold: 0.7,  // Filter low-quality matches
});

const context = result.context.slice(0, 4000);  // Limit tokens

// ❌ BAD - Too much context
const result = await pipeline.query(question, {
  limit: 100,  // Excessive, expensive, dilutes signal
});
```

### 5. Monitor Performance

```typescript
class MonitoredPipeline {
  private pipeline: RetrievalPipeline;

  async query(query: string, options?: QueryOptions) {
    const start = Date.now();

    try {
      const result = await this.pipeline.query(query, options);
      const duration = Date.now() - start;

      // Log metrics
      metrics.histogram('query.duration', duration);
      metrics.gauge('query.results', result.results.length);

      logger.info({
        query,
        duration,
        results: result.results.length,
      }, 'Query completed');

      return result;
    } catch (error) {
      metrics.increment('query.errors');
      throw error;
    }
  }
}
```

---

## Troubleshooting

### Issue: Slow Ingestion

**Problem:** Document ingestion takes too long

**Solutions:**
```typescript
// 1. Increase batch size
await pipeline.ingest(files, {
  batchSize: 100,  // Process more at once
});

// 2. Parallel processing
const batches = chunk(files, 100);
await Promise.all(
  batches.map(batch => pipeline.ingest(batch))
);

// 3. Use faster embedding model
const embedder = new OpenAIEmbeddingGenerator({
  model: 'text-embedding-3-small',  // Faster than -large
  dimensions: 512,  // Smaller dimensions
});
```

### Issue: Poor Retrieval Quality

**Problem:** Retrieved context not relevant

**Solutions:**
```typescript
// 1. Increase threshold
const result = await pipeline.query(question, {
  threshold: 0.8,  // Higher bar for relevance
});

// 2. Get more results, filter manually
const result = await pipeline.query(question, {
  limit: 20,
});

const filtered = result.results
  .filter(r => r.score >= 0.75)
  .slice(0, 5);

// 3. Add metadata filtering
const result = await pipeline.query(question, {
  filter: {
    field: 'category',
    operator: 'eq',
    value: 'relevant-category',
  },
});
```

### Issue: Out of Memory

**Problem:** Application crashes during ingestion

**Solution:** Stream processingor smaller batches

```typescript
// Option 1: Smaller batches
await pipeline.ingest(files, {
  batchSize: 10,  // Reduce from 50
});

// Option 2: Process sequentially
for (const batch of chunks(files, 10)) {
  await pipeline.ingest(batch);
  await new Promise(resolve => setTimeout(resolve, 100));  // Brief pause
}
```

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
