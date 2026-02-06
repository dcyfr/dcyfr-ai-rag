/**
 * Tests for EmbeddingPipeline
 */

import { describe, it, expect } from 'vitest';
import { EmbeddingPipeline } from '../../../src/pipeline/embedding/pipeline.js';
import { SimpleEmbeddingGenerator } from '../../../src/pipeline/embedding/generator.js';
import type { Document } from '../../../src/types/index.js';

describe('EmbeddingPipeline', () => {
  const generator = new SimpleEmbeddingGenerator({ dimensions: 384 });
  const pipeline = new EmbeddingPipeline(generator);

  const createDoc = (id: string, content: string): Document => ({
    id,
    content,
    metadata: { source: 'test' },
  });

  it('should process documents into chunks', async () => {
    const docs = [
      createDoc('1', 'Short content'),
      createDoc('2', 'Another short content'),
    ];

    const chunks = await pipeline.process(docs);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].embedding).toBeDefined();
    expect(chunks[0].embedding?.length).toBe(384);
  });

  it('should handle large documents', async () => {
    const largeContent = 'word '.repeat(1000);
    const docs = [createDoc('1', largeContent)];

    const chunks = await pipeline.process(docs);

    // Pipeline processes documents as-is; chunking happens in loaders
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].embedding).toBeDefined();
  });

  it('should batch process', async () => {
    const docs = Array.from({ length: 100 }, (_, i) =>
      createDoc(`${i}`, `Content ${i}`)
    );

    let progressCalls = 0;
    const chunks = await pipeline.process(docs, {
      batchSize: 10,
      onProgress: () => {
        progressCalls++;
      },
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(progressCalls).toBeGreaterThan(0);
  });

  it('should embed queries', async () => {
    const embedding = await pipeline.embedQuery('test query');

    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(384);
  });

  it('should preserve metadata', async () => {
    const docs = [
      {
        ...createDoc('1', 'Test'),
        metadata: { source: 'test', custom: 'value' },
      },
    ];

    const chunks = await pipeline.process(docs);

    expect(chunks[0].metadata.source).toBe('test');
    expect(chunks[0].metadata.custom).toBe('value');
  });

  it('should handle empty documents', async () => {
    const docs: Document[] = [];
    const chunks = await pipeline.process(docs);

    expect(chunks).toHaveLength(0);
  });
});
