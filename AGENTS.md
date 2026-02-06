# AGENTS.md - AI Agent Instructions for @dcyfr/ai-rag

## Project Context

**Package Name:** `@dcyfr/ai-rag`  
**Type:** Public npm package (RAG framework)  
**Language:** TypeScript 5.3+ (strict mode)  
**Runtime:** Node.js 20+

---

## Architecture Patterns

### 1. DocumentLoader Interface

All loaders MUST implement:

```typescript
interface DocumentLoader {
  supportedExtensions: string[];
  load(source: string, config?: LoaderConfig): Promise<Document[]>;
}
```

**Rules:**
- Return array of `Document` objects (even for single documents)
- Handle chunking internally if `config.chunkSize` is provided
- Include source path in metadata
- Generate unique document IDs

### 2. EmbeddingGenerator Interface

```typescript
interface EmbeddingGenerator {
  embed(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}
```

**Rules:**
- Batch process texts efficiently
- Return normalized vectors
- Dimensions MUST match vector store configuration
- SimpleEmbeddingGenerator is for demo only - document production alternatives

### 3. VectorStore Interface

```typescript
interface VectorStore {
  addDocuments(documents: DocumentChunk[]): Promise<void>;
  search(query: string | number[], limit?: number, filter?: MetadataFilter): Promise<SearchResult[]>;
  // ... other CRUD operations
}
```

**Rules:**
- Support cosine, dot product, and Euclidean distance
- Validate embedding dimensions on add
- Filter by metadata using operators (eq, ne, gt, gte, lt, lte, in, nin)
- Return results sorted by score (descending)

### 4. Pipeline Pattern

**Ingestion:**
```
Loader → Chunker → Embedder → Vector Store
```

**Retrieval:**
```
Query → Embedder → Vector Search → Context Assembly
```

**Rules:**
- Pipelines orchestrate components, don't duplicate logic
- Provide progress callbacks for long operations
- Handle errors gracefully, report in results

---

## Code Patterns

### Document Loading

```typescript
// ✅ CORRECT - Chunking in loader
const docs = await loader.load('./file.md', {
  chunkSize: 1000,
  chunkOverlap: 200,
});

// ❌ WRONG - Manual chunking after loading
const docs = await loader.load('./file.md');
const chunks = manuallyChunkDocuments(docs); // Don't do this
```

### Embedding Generation

```typescript
// ✅ CORRECT - Batch processing
const texts = chunks.map((c) => c.content);
const embeddings = await embedder.embed(texts);

// ❌ WRONG - Sequential embeddings
for (const chunk of chunks) {
  const embedding = await embedder.embed([chunk.content]); // Inefficient
}
```

### Vector Search

```typescript
// ✅ CORRECT - Use query embedding
const queryEmbedding = await embedder.embed([query]);
const results = await store.search(queryEmbedding[0], 10);

// ❌ WRONG - Raw query string
const results = await store.search(query, 10); // Won't work for in-memory store
```

---

## Testing Requirements

- **Unit Tests**: Every loader, pipeline, store
- **Integration Tests**: End-to-end RAG workflows
- **Target Coverage**: 99%+
- **Test Naming**: Descriptive (`should chunk documents with correct overlap`)

---

## Production Considerations

When advising users on production deployments:

1. **Replace SimpleEmbeddingGenerator** with:
   - OpenAI `text-embedding-3-small`
   - Cohere embeddings
   - Local models (Ollama)

2. **Replace InMemoryVectorStore** with:
   - ChromaDB (persistent, local)
   - Pinecone (cloud, scalable)
   - Weaviate (cloud, GraphQL API)

3. **Add monitoring**:
   - Progress tracking metrics
   - Error rates
   - Query latency

4. **Security**:
   - Never log API keys
   - Validate all file paths
   - Sanitize user queries

---

## Common Modification Patterns

### Adding a New Loader

1. Create `src/loaders/<name>/index.ts`
2. Implement `DocumentLoader` interface
3. Add tests in `tests/unit/loaders/<name>-loader.test.ts`
4. Export from `src/loaders/index.ts`
5. Document in README

### Adding Metadata Filters

Extend `MetadataFilter` type:

```typescript
export type MetadataOperator = 
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' 
  | 'in' | 'nin'
  | 'contains' | 'startsWith' | 'endsWith'; // New operators
```

Implement in vector store's `matchesFilter()` method.

### Optimizing Performance

- **Batch size**: Default 32, tune based on embedding provider rate limits
- **Chunk overlap**: 10-20% of chunk size recommended
- **Embedding dimensions**: Smaller = faster, larger = more accurate

---

## Error Handling

```typescript
// ✅ CORRECT - Detailed error messages
throw new Error(`Failed to load ${source}: ${error.message}`);

// ❌ WRONG - Generic errors
throw new Error('Load failed');
```

Log errors during ingestion but continue processing:

```typescript
catch (error) {
  errors.push({ file: path, error: error.message });
  continue; // Don't fail entire batch
}
```

---

## File Naming Conventions

- **Loaders**: `src/loaders/<type>/index.ts` (e.g., `text/index.ts`)
- **Pipelines**: `src/pipeline/<name>/pipeline.ts`
- **Tests**: `tests/unit/<category>/<name>.test.ts`
- **Examples**: `examples/<use-case>/index.ts`

---

## Quality Gates

Before approving changes, verify:

- [ ] TypeScript compiles (`npm run build`)
- [ ] Tests pass (`npm run test:run`)
- [ ] Linting passes (`npm run lint`)
- [ ] No hardcoded credentials
- [ ] documentation updated

---

**Last Updated:** February 5, 2026  
**Maintained By:** DCYFR AI Team

