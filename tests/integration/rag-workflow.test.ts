/**
 * End-to-end RAG integration test
 */

import { describe, it, expect } from 'vitest';
import {
  TextLoader,
  SimpleEmbeddingGenerator,
  EmbeddingPipeline,
  InMemoryVectorStore,
  IngestionPipeline,
  RetrievalPipeline,
} from '../../../src/index.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('RAG End-to-End Integration', () => {
  const testDir = join(process.cwd(), 'tests', 'fixtures', 'temp');
  const file1 = join(testDir, 'ai-basics.txt');
  const file2 = join(testDir, 'ml-guide.txt');

  const setup = () => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(
      file1,
      'Artificial Intelligence (AI) is the simulation of human intelligence by machines. ' +
        'AI systems can learn, reason, and solve problems.',
      'utf-8'
    );
    writeFileSync(
      file2,
      'Machine Learning (ML) is a subset of AI that enables systems to learn from data. ' +
        'ML algorithms improve automatically through experience.',
      'utf-8'
    );
  };

  const teardown = () => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  };

  it('should perform complete RAG workflow', async () => {
    setup();

    // 1. Initialize components
    const loader = new TextLoader();
    const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
    const store = new InMemoryVectorStore({
      collectionName: 'knowledge',
      embeddingDimensions: 384,
      distanceMetric: 'cosine',
    });

    // 2. Ingest documents
    const ingestion = new IngestionPipeline(loader, embedder, store);
    const ingestResult = await ingestion.ingest([file1, file2]);

    expect(ingestResult.documentsProcessed).toBe(2);
    expect(ingestResult.chunksGenerated).toBeGreaterThan(0);
    expect(ingestResult.errors).toHaveLength(0);

    // 3. Query for relevant information
    const retrieval = new RetrievalPipeline(store, embedder);
    const queryResult = await retrieval.query('What is machine learning?', {
      limit: 3,
    });

    expect(queryResult.results.length).toBeGreaterThan(0);
    expect(queryResult.context).toContain('Machine Learning');

    // 4. Verify search quality
    expect(queryResult.metadata.totalResults).toBeGreaterThan(0);
    expect(queryResult.metadata.averageScore).toBeGreaterThan(0);

    teardown();
  });

  it('should handle ingestion errors gracefully', async () => {
    const loader = new TextLoader();
    const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
    const store = new InMemoryVectorStore({
      collectionName: 'test',
      embeddingDimensions: 384,
    });

    const ingestion = new IngestionPipeline(loader, embedder, store);
    const result = await ingestion.ingest(['/nonexistent/file.txt']);

    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should support metadata filtering', async () => {
    setup();

    const loader = new TextLoader();
    const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
    const store = new InMemoryVectorStore({
      collectionName: 'test',
      embeddingDimensions: 384,
    });

    const ingestion = new IngestionPipeline(loader, embedder, store);
    await ingestion.ingest(file1);

    const retrieval = new RetrievalPipeline(store, embedder);
    const result = await retrieval.query('AI', {
      filter: {
        field: 'source',
        operator: 'eq',
        value: file1,
      },
    });

    expect(result.results.every((r) => r.document.metadata.source === file1)).toBe(true);

    teardown();
  });
});
