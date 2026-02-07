# Document Loaders - Loading and Chunking Documents

**Target Audience:** Developers building RAG systems with document ingestion  
**Prerequisites:** Understanding of text processing, chunking strategies

---

## Overview

Document loaders handle the critical first step in any RAG system: loading raw documents and splitting them into manageable chunks for embedding. The framework provides specialized loaders for different document types with intelligent chunking strategies.

**Key Capabilities:**
- Load text, markdown, and HTML documents
- Configurable chunk sizes with overlap
- Preserve document structure and metadata
- Handle large documents efficiently
- Track source information for retrieval

---

## Text Loader

### Basic Usage

```typescript
import { TextLoader } from '@dcyfr/ai-rag';

const loader = new TextLoader();

const documents = await loader.load('./document.txt', {
  chunkSize: 1000,        // Maximum characters per chunk
  chunkOverlap: 200,      // Characters to overlap between chunks
  metadata: {             // Optional custom metadata
    category: 'technical',
    author: 'Jane Doe',
  },
});

console.log(`Loaded ${documents.length} chunks`);
```

**Output Structure:**
```typescript
{
  id: 'doc-123-chunk-0',
  content: 'This is the first chunk of text...',
  metadata: {
    source: './document.txt',
    chunkIndex: 0,
    totalChunks: 15,
    category: 'technical',
    author: 'Jane Doe',
  },
  embedding: null,  // Populated during ingestion
}
```

### Chunking Strategies

**Fixed-Size Chunking** (Default)

```typescript
const loader = new TextLoader();

// Split into 1000-character chunks with 200-character overlap
const docs = await loader.load('./large-doc.txt', {
  chunkSize: 1000,
  chunkOverlap: 200,
});
```

**Why Overlap?** Overlap ensures context continuity at chunk boundaries, preventing loss of meaning.

**Example:**
```
Chunk 1: "...machine learning models require large datasets..."
          |--- overlap ---|
Chunk 2: "...large datasets to train effectively. Deep learning..."
```

**Sentence-Aware Chunking**

```typescript
const loader = new TextLoader({
  sentenceAware: true,  // Don't split mid-sentence
});

const docs = await loader.load('./document.txt', {
  chunkSize: 1000,
  chunkOverlap: 200,
});

// Chunks will end at sentence boundaries
```

**Paragraph-Based Chunking**

```typescript
const loader = new TextLoader({
  chunkBy: 'paragraph',
});

const docs = await loader.load('./document.txt', {
  maxParagraphs: 3,  // Max 3 paragraphs per chunk
});
```

### Loading Multiple Files

```typescript
const loader = new TextLoader();

const files = await glob('./docs/**/*.txt');
const allDocs = [];

for (const file of files) {
  const docs = await loader.load(file, {
    chunkSize: 800,
    metadata: {
      category: path.dirname(file),
    },
  });
  allDocs.push(...docs);
}

console.log(`Loaded ${allDocs.length} chunks from ${files.length} files`);
```

### Custom Metadata

```typescript
const docs = await loader.load('./user-guide.txt', {
  chunkSize: 1000,
  metadata: {
    docType: 'user-guide',
    version: '2.0',
    lastUpdated: new Date().toISOString(),
    tags: ['documentation', 'user-facing'],
  },
});

// Metadata is searchable during retrieval
```

---

## Markdown Loader

### Basic Usage

```typescript
import { MarkdownLoader } from '@dcyfr/ai-rag';

const loader = new MarkdownLoader();

const documents = await loader.load('./README.md', {
  chunkSize: 800,
  chunkOverlap: 150,
  preserveStructure: true,  // Keep headings with content
});
```

### Preserving Document Structure

**Heading-Aware Chunking**

```typescript
const loader = new MarkdownLoader({
  preserveHeadings: true,
});

const docs = await loader.load('./api-docs.md', {
  chunkSize: 1000,
});

// Each chunk includes its heading hierarchy
```

**Example Output:**
```typescript
{
  content: '## API Reference\n\n### GET /users\n\nRetrieves all users...',
  metadata: {
    headings: ['API Reference', 'GET /users'],
    level: 3,
  },
}
```

### Code Block Handling

```typescript
const loader = new MarkdownLoader({
  preserveCodeBlocks: true,  // Don't split code blocks
});

const docs = await loader.load('./tutorial.md', {
  chunkSize: 1200,
});

// Code blocks stay intact within chunks
```

### Frontmatter Extraction

```typescript
const loader = new MarkdownLoader({
  extractFrontmatter: true,
});

const docs = await loader.load('./blog-post.md');

// Frontmatter becomes metadata
```

**Input:**
```markdown
---
title: "Getting Started with RAG"
author: "John Smith"
date: 2026-02-07
tags: [ai, rag, tutorial]
---

# Introduction

RAG systems combine retrieval and generation...
```

**Output:**
```typescript
{
  content: '# Introduction\n\nRAG systems combine...',
  metadata: {
    title: 'Getting Started with RAG',
    author: 'John Smith',
    date: '2026-02-07',
    tags: ['ai', 'rag', 'tutorial'],
  },
}
```

### Link Resolution

```typescript
const loader = new MarkdownLoader({
  resolveLinks: true,  // Track internal links
  baseUrl: 'https://docs.example.com',
});

const docs = await loader.load('./guide.md');

// Links become part of metadata for cross-document retrieval
```

---

## HTML Loader

### Basic Usage

```typescript
import { HTMLLoader } from '@dcyfr/ai-rag';

const loader = new HTMLLoader();

const documents = await loader.load('./page.html', {
  chunkSize: 600,
  chunkOverlap: 100,
  cleanHtml: true,  // Remove scripts, styles
});
```

### Content Extraction

**Extract Main Content Only**

```typescript
const loader = new HTMLLoader({
  extractMain: true,  // Extract <main> or <article> content
  selectors: ['main', 'article', '.content'],
});

const docs = await loader.load('./blog-post.html');
```

**Remove Navigation and Footers**

```typescript
const loader = new HTMLLoader({
  excludeSelectors: [
    'nav',
    'footer',
    '.sidebar',
    '#comments',
  ],
});

const docs = await loader.load('./page.html');
```

### Preserve Semantic Structure

```typescript
const loader = new HTMLLoader({
  preserveHeadings: true,
  convertTables: true,  // Convert tables to text representation
});

const docs = await loader.load('./data-table.html');
```

**Table Conversion Example:**
```html
<table>
  <tr><th>Name</th><th>Age</th></tr>
  <tr><td>Alice</td><td>30</td></tr>
  <tr><td>Bob</td><td>25</td></tr>
</table>
```

**Converted to:**
```
Name | Age
-----|----
Alice | 30
Bob | 25
```

### Loading Web Pages

```typescript
import { HTMLLoader } from '@dcyfr/ai-rag';
import axios from 'axios';

const loader = new HTMLLoader();

// Fetch HTML from URL
const response = await axios.get('https://example.com/docs');
const docs = await loader.loadFromString(response.data, {
  chunkSize: 800,
  metadata: {
    url: 'https://example.com/docs',
    fetchedAt: new Date().toISOString(),
  },
});
```

---

## Advanced Chunking Techniques

### Semantic Chunking

```typescript
import { SemanticChunker } from '@dcyfr/ai-rag';

const chunker = new SemanticChunker({
  embedder: simpleEmbedder,
  similarityThreshold: 0.85,  // Group similar sentences
});

const text = await fs.readFile('./document.txt', 'utf-8');
const chunks = await chunker.chunk(text, {
  minChunkSize: 500,
  maxChunkSize: 1500,
});

// Chunks grouped by semantic similarity
```

### Recursive Chunking

```typescript
import { RecursiveChunker } from '@dcyfr/ai-rag';

const chunker = new RecursiveChunker({
  separators: ['\n\n', '\n', '. ', ' '],  // Try these in order
});

const docs = await chunker.chunk(largeDocument, {
  chunkSize: 1000,
  chunkOverlap: 200,
});

// Intelligently splits at natural boundaries
```

### Context-Aware Chunking

```typescript
const loader = new TextLoader({
  contextWindow: 2,  // Include 2 chunks before/after as context
});

const docs = await loader.load('./document.txt', {
  chunkSize: 1000,
});

// Each chunk includes surrounding context in metadata
```

---

## Best Practices

### 1. Choose Appropriate Chunk Sizes

```typescript
// ❌ TOO SMALL - Loses context
const docs = await loader.load('./doc.txt', { chunkSize: 100 });

// ❌ TOO LARGE - Dilutes relevance
const docs = await loader.load('./doc.txt', { chunkSize: 5000 });

// ✅ GOOD - Balanced context and specificity
const docs = await loader.load('./doc.txt', { chunkSize: 1000, chunkOverlap: 200 });
```

**Recommended Sizes:**
- Technical documentation: 800-1200 characters
- Blog posts/articles: 1000-1500 characters
- Code documentation: 600-1000 characters (shorter for context)

### 2. Use Overlap for Context Continuity

```typescript
// ✅ Good - 15-20% overlap
const docs = await loader.load('./doc.txt', {
  chunkSize: 1000,
  chunkOverlap: 200,  // 20% overlap
});

// ❌ No overlap - can lose context at boundaries
const docs = await loader.load('./doc.txt', {
  chunkSize: 1000,
  chunkOverlap: 0,
});
```

### 3. Preserve Document Structure

```typescript
// ✅ Markdown - preserve headings
const mdLoader = new MarkdownLoader({ preserveHeadings: true });

// ✅ HTML - extract main content
const htmlLoader = new HTMLLoader({ extractMain: true });

// ✅ Text - sentence-aware chunking
const textLoader = new TextLoader({ sentenceAware: true });
```

### 4. Add Rich Metadata

```typescript
// ✅ Include searchable metadata
const docs = await loader.load('./guide.txt', {
  metadata: {
    docType: 'user-guide',
    version: '2.0',
    tags: ['beginner', 'tutorial'],
    language: 'en',
    lastUpdated: '2026-02-07',
  },
});

// Later: filter by metadata during retrieval
const results = await store.search(embedding, 10, {
  field: 'docType',
  operator: 'eq',
  value: 'user-guide',
});
```

### 5. Handle Large Document Collections

```typescript
// ✅ Batch processing with progress tracking
const files = await glob('./docs/**/*.txt');
const batchSize = 10;

for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  
  const batchDocs = await Promise.all(
    batch.map(file => loader.load(file, { chunkSize: 1000 }))
  );
  
  const allDocs = batchDocs.flat();
  await store.addDocuments(allDocs);
  
  console.log(`Processed ${Math.min(i + batchSize, files.length)}/${files.length} files`);
}
```

---

## Custom Loaders

### Implementing a Custom Loader

```typescript
import { DocumentLoader, Document } from '@dcyfr/ai-rag';

export class CustomLoader implements DocumentLoader {
  async load(path: string, options?: LoadOptions): Promise<Document[]> {
    // 1. Read file
    const content = await fs.readFile(path, 'utf-8');
    
    // 2. Parse content (custom logic)
    const parsed = this.parse(content);
    
    // 3. Chunk content
    const chunks = this.chunk(parsed, options?.chunkSize || 1000);
    
    // 4. Create documents
    return chunks.map((chunk, index) => ({
      id: `${path}-chunk-${index}`,
      content: chunk,
      metadata: {
        source: path,
        chunkIndex: index,
        totalChunks: chunks.length,
        ...options?.metadata,
      },
      embedding: null,
    }));
  }
  
  private parse(content: string): string {
    // Custom parsing logic
    return content.trim();
  }
  
  private chunk(content: string, size: number): string[] {
    // Custom chunking logic
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += size) {
      chunks.push(content.slice(i, i + size));
    }
    return chunks;
  }
}
```

### Using Custom Loader

```typescript
const customLoader = new CustomLoader();

const docs = await customLoader.load('./custom-format.dat', {
  chunkSize: 1200,
  metadata: {
    format: 'custom',
  },
});
```

---

## Troubleshooting

### Issue: Chunks Too Small/Large

**Problem:** Retrieval quality is poor

**Solution:** Adjust chunk size based on content type

```typescript
// For technical docs with code examples
const docs = await loader.load('./api-docs.md', {
  chunkSize: 1200,  // Larger chunks for code context
  preserveCodeBlocks: true,
});

// For conversational content
const docs = await loader.load('./faq.txt', {
  chunkSize: 600,  // Smaller chunks for Q&A
  sentenceAware: true,
});
```

### Issue: Lost Context at Boundaries

**Problem:** Important information split between chunks

**Solution:** Increase overlap

```typescript
// ✅ Increase overlap to 25-30%
const docs = await loader.load('./doc.txt', {
  chunkSize: 1000,
  chunkOverlap: 300,  // 30% overlap
});
```

### Issue: Memory Issues with Large Files

**Problem:** Out of memory when loading large documents

**Solution:** Stream processing

```typescript
import { StreamingLoader } from '@dcyfr/ai-rag';

const loader = new StreamingLoader();

// Process in chunks without loading entire file
await loader.stream('./huge-file.txt', {
  chunkSize: 1000,
  onChunk: async (chunk) => {
    await store.addDocument(chunk);
  },
});
```

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
