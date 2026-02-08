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

  describe('distance metrics', () => {
    it('should use dot product metric', async () => {
      const storeDot = new InMemoryVectorStore({
        collectionName: 'test',
        embeddingDimensions: 3,
        distanceMetric: 'dot',
      });

      const chunks = [
        createChunk('1', [1, 0, 0]),
        createChunk('2', [0, 1, 0]),
      ];
      await storeDot.addDocuments(chunks);

      const results = await storeDot.search([1, 0, 0], 2);

      expect(results).toHaveLength(2);
      expect(results[0].document.id).toBe('1');
      expect(results[0].score).toBe(1); // dot product of [1,0,0] and [1,0,0]
    });

    it('should use euclidean metric', async () => {
      const storeEuclidean = new InMemoryVectorStore({
        collectionName: 'test',
        embeddingDimensions: 3,
        distanceMetric: 'euclidean',
      });

      const chunks = [
        createChunk('1', [1, 0, 0]),
        createChunk('2', [5, 0, 0]),
      ];
      await storeEuclidean.addDocuments(chunks);

      const results = await storeEuclidean.search([1, 0, 0], 2);

      expect(results).toHaveLength(2);
      expect(results[0].document.id).toBe('1'); // Closer to query
      expect(results[0].distance).toBe(0); // Same vector
    });

    it('should handle zero magnitude vectors in cosine similarity', async () => {
      const chunks = [
        createChunk('1', [0, 0, 0]), // Zero vector
        createChunk('2', [1, 0, 0]),
      ];
      await store.addDocuments(chunks);

      const results = await store.search([1, 0, 0], 2);

      expect(results).toHaveLength(2);
      // Zero vector should have similarity of 0
      expect(results[1].score).toBe(0);
    });
  });

  describe('metadata filtering', () => {
    it('should filter with ne (not equal) operator', async () => {
      const chunk1 = createChunk('1', [1, 0, 0]);
      chunk1.metadata.category = 'A';
      const chunk2 = createChunk('2', [0.9, 0.1, 0]);
      chunk2.metadata.category = 'B';

      await store.addDocuments([chunk1, chunk2]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'category',
        operator: 'ne',
        value: 'A',
      });

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('2');
    });

    it('should filter with gt (greater than) operator', async () => {
      const chunk1 = createChunk('1', [1, 0, 0]);
      chunk1.metadata.score = 5;
      const chunk2 = createChunk('2', [0.9, 0.1, 0]);
      chunk2.metadata.score = 10;

      await store.addDocuments([chunk1, chunk2]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'score',
        operator: 'gt',
        value: 7,
      });

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('2');
    });

    it('should filter with gte (greater than or equal) operator', async () => {
      const chunk1 = createChunk('1', [1, 0, 0]);
      chunk1.metadata.score = 10;
      const chunk2 = createChunk('2', [0.9, 0.1, 0]);
      chunk2.metadata.score = 5;

      await store.addDocuments([chunk1, chunk2]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'score',
        operator: 'gte',
        value: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('1');
    });

    it('should filter with lt (less than) operator', async () => {
      const chunk1 = createChunk('1', [1, 0, 0]);
      chunk1.metadata.score = 3;
      const chunk2 = createChunk('2', [0.9, 0.1, 0]);
      chunk2.metadata.score = 8;

      await store.addDocuments([chunk1, chunk2]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'score',
        operator: 'lt',
        value: 5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('1');
    });

    it('should filter with lte (less than or equal) operator', async () => {
      const chunk1 = createChunk('1', [1, 0, 0]);
      chunk1.metadata.score = 5;
      const chunk2 = createChunk('2', [0.9, 0.1, 0]);
      chunk2.metadata.score = 10;

      await store.addDocuments([chunk1, chunk2]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'score',
        operator: 'lte',
        value: 5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('1');
    });

    it('should filter with in operator', async () => {
      const chunk1 = createChunk('1', [1, 0, 0]);
      chunk1.metadata.category = 'A';
      const chunk2 = createChunk('2', [0.9, 0.1, 0]);
      chunk2.metadata.category = 'B';
      const chunk3 = createChunk('3', [0.8, 0.2, 0]);
      chunk3.metadata.category = 'C';

      await store.addDocuments([chunk1, chunk2, chunk3]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'category',
        operator: 'in',
        value: ['A', 'C'],
      });

      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.document.id);
      expect(ids).toContain('1');
      expect(ids).toContain('3');
    });

    it('should filter with nin (not in) operator', async () => {
      const chunk1 = createChunk('1', [1, 0, 0]);
      chunk1.metadata.category = 'A';
      const chunk2 = createChunk('2', [0.9, 0.1, 0]);
      chunk2.metadata.category = 'B';
      const chunk3 = createChunk('3', [0.8, 0.2, 0]);
      chunk3.metadata.category = 'C';

      await store.addDocuments([chunk1, chunk2, chunk3]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'category',
        operator: 'nin',
        value: ['A', 'C'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('2');
    });

    it('should return false for unknown filter operator', async () => {
      const chunk = createChunk('1', [1, 0, 0]);
      chunk.metadata.value = 'test';

      await store.addDocuments([chunk]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'value',
        operator: 'unknown' as any,
        value: 'test',
      });

      expect(results).toHaveLength(0);
    });

    it('should handle filters with non-numeric values for numeric operators', async () => {
      const chunk = createChunk('1', [1, 0, 0]);
      chunk.metadata.value = 'string';

      await store.addDocuments([chunk]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'value',
        operator: 'gt',
        value: 5,
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should throw error for string query', async () => {
      await expect(
        store.search('text query', 10)
      ).rejects.toThrow('Query must be an embedding vector');
    });

    it('should handle search on empty store', async () => {
      const results = await store.search([1, 0, 0], 10);

      expect(results).toHaveLength(0);
    });

    it('should skip documents without embeddings during search', async () => {
      const chunk1 = createChunk('1', [1, 0, 0]);
      const chunk2 = createChunk('2', [0, 1, 0]);
      delete chunk2.embedding;

      await store.addDocuments([chunk1]);
      // Manually add chunk without embedding (bypassing validation)
      (store as any).documents.set('2', chunk2);

      const results = await store.search([1, 0, 0], 10);

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('1');
    });

    it('should throw error when updating non-existent document', async () => {
      await expect(
        store.updateDocument('nonexistent', { content: 'new' })
      ).rejects.toThrow('Document nonexistent not found');
    });

    it('should respect search limit', async () => {
      const chunks = [
        createChunk('1', [1, 0, 0]),
        createChunk('2', [0.9, 0.1, 0]),
        createChunk('3', [0.8, 0.2, 0]),
        createChunk('4', [0.7, 0.3, 0]),
      ];
      await store.addDocuments(chunks);

      const results = await store.search([1, 0, 0], 2);

      expect(results).toHaveLength(2);
    });

    it('should return empty results when all documents filtered out', async () => {
      const chunk1 = createChunk('1', [1, 0, 0]);
      chunk1.metadata.category = 'A';

      await store.addDocuments([chunk1]);

      const results = await store.search([1, 0, 0], 10, {
        field: 'category',
        operator: 'eq',
        value: 'B',
      });

      expect(results).toHaveLength(0);
    });
  });
});

