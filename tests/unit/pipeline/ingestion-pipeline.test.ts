/**
 * Tests for IngestionPipeline with document conversion integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionPipeline } from '../../../src/pipeline/ingestion/pipeline.js';
import { InMemoryVectorStore } from '../../../src/stores/vector/in-memory.js';
import { SimpleEmbeddingGenerator } from '../../../src/pipeline/embedding/generator.js';
import type {
  Document,
  DocumentLoader,
  LoaderConfig,
  IngestionOptions,
} from '../../../src/types/index.js';
import { convertToMarkdown } from '../../../src/ingestion/index.js';

vi.mock('../../../src/ingestion/index.js', async () => {
  const actual = await vi.importActual('../../../src/ingestion/index.js');
  return {
    ...actual,
    convertToMarkdown: vi.fn(),
  };
});

class MockLoader implements DocumentLoader {
  supportedExtensions = ['.txt', '.md'];

  async load(source: string, _config?: LoaderConfig): Promise<Document[]> {
    if (source.includes('fail')) {
      throw new Error('Loader failure');
    }

    return [
      {
        id: `doc-${source}`,
        content: source.includes('heading')
          ? '# Section A\nSome content\n## Section B\nMore content'
          : `Content from ${source}`,
        metadata: {
          source,
          type: 'text',
          createdAt: new Date(),
        },
      },
    ];
  }
}

describe('IngestionPipeline', () => {
  const loader = new MockLoader();
  const embedder = new SimpleEmbeddingGenerator({ dimensions: 128 });
  let store: InMemoryVectorStore;
  let pipeline: IngestionPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new InMemoryVectorStore({
      collectionName: 'ingestion-test',
      embeddingDimensions: 128,
      distanceMetric: 'cosine',
    });
    pipeline = new IngestionPipeline(loader, embedder, store);
  });

  it('preserves plain text ingestion path by default', async () => {
    const result = await pipeline.ingest('plain.txt');

    expect(result.documentsProcessed).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(vi.mocked(convertToMarkdown)).not.toHaveBeenCalled();
  });

  it('enables document conversion when flag is true', async () => {
    vi.mocked(convertToMarkdown).mockResolvedValue({
      success: true,
      markdown: '# Converted PDF\n\nThis is converted',
      metadata: {
        fileName: 'report.pdf',
        fileSize: 1024,
        format: 'pdf',
        convertedAt: new Date().toISOString(),
        durationMs: 123,
      },
    } as never);

    const result = await pipeline.ingest('report.pdf', {
      enableDocumentConversion: true,
      conversionTimeoutMs: 45000,
      conversionMaxFileSize: 10 * 1024 * 1024,
      enableLLMDescriptions: true,
    });

    expect(result.documentsProcessed).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(vi.mocked(convertToMarkdown)).toHaveBeenCalledWith(
      'report.pdf',
      expect.objectContaining({
        timeout: 45000,
        maxFileSize: 10 * 1024 * 1024,
        enableLLMDescriptions: true,
      })
    );
  });

  it('handles partial conversion failures and continues pipeline', async () => {
    vi.mocked(convertToMarkdown)
      .mockResolvedValueOnce({
        success: true,
        markdown: '# OK',
        metadata: {
          fileName: 'ok.pdf',
          fileSize: 100,
          format: 'pdf',
          convertedAt: new Date().toISOString(),
          durationMs: 100,
        },
      } as never)
      .mockRejectedValueOnce(new Error('Failed to parse PDF'))
      .mockResolvedValueOnce({
        success: true,
        markdown: '# Also OK',
        metadata: {
          fileName: 'ok2.pdf',
          fileSize: 100,
          format: 'pdf',
          convertedAt: new Date().toISOString(),
          durationMs: 120,
        },
      } as never);

    const result = await pipeline.ingest(['ok.pdf', 'bad.pdf', 'ok2.pdf'], {
      enableDocumentConversion: true,
    });

    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.file).toBe('bad.pdf');
  });

  it('invokes onConversionError callback with structured error', async () => {
    const onConversionError = vi.fn();
    vi.mocked(convertToMarkdown).mockRejectedValue(new Error('Conversion exploded'));

    await pipeline.ingest(['boom.pdf'], {
      enableDocumentConversion: true,
      onConversionError,
    } as IngestionOptions);

    expect(onConversionError).toHaveBeenCalledTimes(1);
    expect(onConversionError).toHaveBeenCalledWith(
      expect.objectContaining({
        file: 'boom.pdf',
        error: expect.stringContaining('Conversion exploded'),
      })
    );
  });

  it('supports semantic chunking preserving sections', async () => {
    const result = await pipeline.ingest('heading.md', {
      chunkingStrategy: 'semantic',
    });

    expect(result.chunksGenerated).toBeGreaterThanOrEqual(2);
  });

  it('supports fixed chunking with configured limits', async () => {
    const longLoader: DocumentLoader = {
      supportedExtensions: ['.txt'],
      async load(source: string): Promise<Document[]> {
        return [
          {
            id: `doc-${source}`,
            content: 'A'.repeat(2400),
            metadata: {
              source,
              type: 'text',
              createdAt: new Date(),
            },
          },
        ];
      },
    };

    const fixedPipeline = new IngestionPipeline(longLoader, embedder, store);
    const result = await fixedPipeline.ingest('long.txt', {
      chunkingStrategy: 'fixed',
      fixedChunkSize: 500,
      fixedChunkOverlap: 50,
    });

    expect(result.chunksGenerated).toBeGreaterThan(1);
  });

  it('returns ingestion metrics including throughput and conversion latency', async () => {
    vi.mocked(convertToMarkdown).mockResolvedValue({
      success: true,
      markdown: '# Converted',
      metadata: {
        fileName: 'metrics.pdf',
        fileSize: 2048,
        format: 'pdf',
        convertedAt: new Date().toISOString(),
        durationMs: 111,
      },
    } as never);

    const result = await pipeline.ingest(['metrics.pdf'], {
      enableDocumentConversion: true,
    });

    expect(result.metrics).toBeDefined();
    expect(result.metrics?.averageConversionMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics?.documentsPerSecond).toBeGreaterThanOrEqual(0);
    expect(result.metrics?.peakHeapUsedMb).toBeGreaterThan(0);
  });
});
