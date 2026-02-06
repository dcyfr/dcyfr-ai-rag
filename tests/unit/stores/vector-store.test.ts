/**
 * Tests for InMemoryVectorStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVectorStore } from '../../../src/stores/vector/in-memory.js';
import type { DocumentChunk } from '../../../src/types/index.js';

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore({
      collectionName: 'test',
      embeddingDimensions: 3,
      distanceMetric: 'cosine',
    });
  });

  const createChunk = (id: string, embedding: number[]): DocumentChunk => ({
    id,
    documentId: `doc-${id}`,
    content: `Content for ${id}`,
    index: 0,
    metadata: { chunkIndex: 0, chunkCount: 1 },
    embedding,
  });

  it('should add documents', async () => {
    const chunk = createChunk('1', [1, 0, 0]);
    await store.addDocuments([chunk]);

    const doc = await store.getDocument('1');
    expect(doc).toEqual(chunk);
  });

  it('should search by cosine similarity', async () => {
    const chunks = [
      createChunk('1', [1, 0, 0]),
      createChunk('2', [0, 1, 0]),
      createChunk('3', [0.7, 0.7, 0]),
    ];
    await store.addDocuments(chunks);

    const results = await store.search([1, 0, 0], 2);

    expect(results).toHaveLength(2);
    expect(results[0].document.id).toBe('1');
    expect(results[0].score).toBeCloseTo(1.0, 2);
  });

  it('should filter by metadata', async () => {
    const chunk1 = createChunk('1', [1, 0, 0]);
    chunk1.metadata.category = 'A';
    const chunk2 = createChunk('2', [0, 1, 0]);
    chunk2.metadata.category = 'B';

    await store.addDocuments([chunk1, chunk2]);

    const results = await store.search([1, 0, 0], 10, {
      field: 'category',
      operator: 'eq',
      value: 'A',
    });

    expect(results).toHaveLength(1);
    expect(results[0].document.id).toBe('1');
  });

  it('should delete documents', async () => {
    const chunk = createChunk('1', [1, 0, 0]);
    await store.addDocuments([chunk]);

    await store.deleteDocuments(['1']);

    const doc = await store.getDocument('1');
    expect(doc).toBeNull();
  });

  it('should update documents', async () => {
    const chunk = createChunk('1', [1, 0, 0]);
    await store.addDocuments([chunk]);

    await store.updateDocument('1', { content: 'Updated content' });

    const doc = await store.getDocument('1');
    expect(doc?.content).toBe('Updated content');
  });

  it('should clear all documents', async () => {
    const chunks = [
      createChunk('1', [1, 0, 0]),
      createChunk('2', [0, 1, 0]),
    ];
    await store.addDocuments(chunks);

    await store.clear();

    const stats = store.getStats();
    expect(stats.documentCount).toBe(0);
  });

  it('should throw on dimension mismatch', async () => {
    const chunk = createChunk('1', [1, 0, 0, 0]); // 4D instead of 3D

    await expect(store.addDocuments([chunk])).rejects.toThrow();
  });

  it('should throw on missing embedding', async () => {
    const chunk = createChunk('1', []);
    delete chunk.embedding;

    await expect(store.addDocuments([chunk])).rejects.toThrow();
  });

  it('should return stats', () => {
    const stats = store.getStats();

    expect(stats.collectionName).toBe('test');
    expect(stats.dimensions).toBe(3);
    expect(stats.documentCount).toBe(0);
  });
});
