/**
 * Tests for RetrievalPipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RetrievalPipeline } from '../../../src/pipeline/retrieval/pipeline.js';
import { InMemoryVectorStore } from '../../../src/stores/vector/in-memory.js';
import { SimpleEmbeddingGenerator } from '../../../src/pipeline/embedding/generator.js';
import type { DocumentChunk } from '../../../src/types/index.js';

describe('RetrievalPipeline', () => {
  let store: InMemoryVectorStore;
  let embedder: SimpleEmbeddingGenerator;
  let pipeline: RetrievalPipeline;

  beforeEach(async () => {
    store = new InMemoryVectorStore({
      collectionName: 'test',
      embeddingDimensions: 384,
      distanceMetric: 'cosine',
    });
    embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
    pipeline = new RetrievalPipeline(store, embedder);

    // Add some test documents
    const texts = [
      'Machine learning is a subset of artificial intelligence',
      'Deep learning uses neural networks with multiple layers',
      'Natural language processing helps computers understand text',
    ];

    const embeddings = await embedder.embed(texts);
    const chunks: DocumentChunk[] = texts.map((text, i) => ({
      id: `chunk-${i}`,
      documentId: `doc-${i}`,
      content: text,
      index: i,
      metadata: { chunkIndex: i, chunkCount: 1, topic: 'AI' },
      embedding: embeddings[i],
    }));

    await store.addDocuments(chunks);
  });

  it('should query for relevant documents', async () => {
    const result = await pipeline.query('what is machine learning?');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.context).toBeDefined();
    expect(result.metadata.totalResults).toBeGreaterThan(0);
  });

  it('should limit results', async () => {
    const result = await pipeline.query('AI and neural networks', { limit: 2 });

    expect(result.results.length).toBeLessThanOrEqual(2);
  });

  it('should filter by metadata', async () => {
    const result = await pipeline.query('machine learning', {
      filter: { field: 'topic', operator: 'eq', value: 'AI' },
    });

    expect(result.results.every((r) => r.document.metadata.topic === 'AI')).toBe(true);
  });

  it('should apply score threshold', async () => {
    const result = await pipeline.query('irrelevant query xyz', {
      threshold: 0.8,
    });

    expect(result.results.every((r) => r.score >= 0.8)).toBe(true);
  });

  it('should assemble context', async () => {
    const result = await pipeline.query('neural networks');

    expect(result.context).toContain('Document');
    expect(result.context).toContain('score:');
  });

  it('should find similar documents', async () => {
    const result = await pipeline.findSimilar('chunk-0', { limit: 2 });

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.every((r) => r.document.id !== 'chunk-0')).toBe(true);
  });

  it('should throw on missing document in findSimilar', async () => {
    await expect(
      pipeline.findSimilar('nonexistent')
    ).rejects.toThrow('not found');
  });

  it('should calculate average score', async () => {
    const result = await pipeline.query('deep learning');

    expect(result.metadata.averageScore).toBeGreaterThan(0);
    expect(result.metadata.averageScore).toBeLessThanOrEqual(1);
  });

  it('should track duration', async () => {
    const result = await pipeline.query('test query');

    expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
  });
});
