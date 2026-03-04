/**
 * E2E tests for ingestion pipeline with document conversion support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionPipeline } from '../../../src/pipeline/ingestion/pipeline.js';
import { RetrievalPipeline } from '../../../src/pipeline/retrieval/pipeline.js';
import { InMemoryVectorStore } from '../../../src/stores/vector/in-memory.js';
import { SimpleEmbeddingGenerator } from '../../../src/pipeline/embedding/generator.js';
import type { DocumentLoader, Document } from '../../../src/types/index.js';
import { convertToMarkdown } from '../../../src/ingestion/index.js';

vi.mock('../../../src/ingestion/index.js', async () => {
  const actual = await vi.importActual('../../../src/ingestion/index.js');
  return {
    ...actual,
    convertToMarkdown: vi.fn(),
  };
});

class MixedLoader implements DocumentLoader {
  supportedExtensions = ['.txt', '.md'];

  async load(source: string): Promise<Document[]> {
    return [
      {
        id: `doc-${source}`,
        content: `This is plain text content from ${source}`,
        metadata: {
          source,
          type: 'text',
          createdAt: new Date(),
        },
      },
    ];
  }
}

describe('Ingestion Pipeline E2E', () => {
  let store: InMemoryVectorStore;
  let embedder: SimpleEmbeddingGenerator;
  let ingestion: IngestionPipeline;
  let retrieval: RetrievalPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new InMemoryVectorStore({
      collectionName: 'ingestion-e2e',
      embeddingDimensions: 128,
      distanceMetric: 'cosine',
    });
    embedder = new SimpleEmbeddingGenerator({ dimensions: 128 });
    ingestion = new IngestionPipeline(new MixedLoader(), embedder, store);
    retrieval = new RetrievalPipeline(store, embedder);
  });

  it('ingests converted PDF and chunks contain expected content', async () => {
    vi.mocked(convertToMarkdown).mockResolvedValue({
      success: true,
      markdown: '# PDF Report\n\nRevenue increased by 42 percent in Q4.',
      metadata: {
        fileName: 'report.pdf',
        fileSize: 1024,
        format: 'pdf',
        convertedAt: new Date().toISOString(),
        durationMs: 90,
        pageCount: 3,
      },
    } as never);

    const ingestResult = await ingestion.ingest('report.pdf', {
      enableDocumentConversion: true,
    });

    expect(ingestResult.successCount).toBe(1);

    const query = await retrieval.query('revenue increased in q4', { limit: 3 });
    expect(query.results.length).toBeGreaterThan(0);
    expect(query.context.toLowerCase()).toContain('revenue');
  });

  it('ingests converted DOCX and embeddings are queryable', async () => {
    vi.mocked(convertToMarkdown).mockResolvedValue({
      success: true,
      markdown: '# Product Plan\n\nLaunch timeline includes alpha and beta phases.',
      metadata: {
        fileName: 'plan.docx',
        fileSize: 2048,
        format: 'docx',
        convertedAt: new Date().toISOString(),
        durationMs: 120,
      },
    } as never);

    await ingestion.ingest('plan.docx', { enableDocumentConversion: true });
    const query = await retrieval.query('alpha beta launch timeline', { limit: 5 });

    expect(query.results.length).toBeGreaterThan(0);
    expect(query.context.toLowerCase()).toContain('launch');
  });

  it('handles mixed file types (TXT, PDF, DOCX) in one ingestion run', async () => {
    vi.mocked(convertToMarkdown)
      .mockResolvedValueOnce({
        success: true,
        markdown: '# Annual Report\n\nPDF insights and summary.',
        metadata: {
          fileName: 'annual.pdf',
          fileSize: 3000,
          format: 'pdf',
          convertedAt: new Date().toISOString(),
          durationMs: 110,
        },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        markdown: '# Team Handbook\n\nDOCX policies and guidelines.',
        metadata: {
          fileName: 'handbook.docx',
          fileSize: 2500,
          format: 'docx',
          convertedAt: new Date().toISOString(),
          durationMs: 140,
        },
      } as never);

    // txt path uses loader, pdf/docx use conversion
    const txtResult = await ingestion.ingest('notes.txt', {
      enableDocumentConversion: false,
    });
    const convertedResult = await ingestion.ingest(['annual.pdf', 'handbook.docx'], {
      enableDocumentConversion: true,
    });

    expect(txtResult.successCount).toBe(1);
    expect(convertedResult.successCount).toBe(2);

    const query = await retrieval.query('policies summary guidelines', { limit: 10 });
    expect(query.results.length).toBeGreaterThan(0);
  });

  it('supports metadata filtering to search only PDFs', async () => {
    vi.mocked(convertToMarkdown)
      .mockResolvedValueOnce({
        success: true,
        markdown: '# PDF Only\n\nThis content belongs to PDF',
        metadata: {
          fileName: 'pdf-only.pdf',
          fileSize: 1000,
          format: 'pdf',
          convertedAt: new Date().toISOString(),
          durationMs: 80,
        },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        markdown: '# DOCX Only\n\nThis content belongs to DOCX',
        metadata: {
          fileName: 'docx-only.docx',
          fileSize: 1000,
          format: 'docx',
          convertedAt: new Date().toISOString(),
          durationMs: 85,
        },
      } as never);

    await ingestion.ingest(['pdf-only.pdf', 'docx-only.docx'], {
      enableDocumentConversion: true,
    });

    const filtered = await retrieval.query('content belongs', {
      limit: 10,
      filter: {
        field: 'originalFileType',
        operator: 'eq',
        value: 'pdf',
      },
    });

    expect(filtered.results.length).toBeGreaterThan(0);
    expect(
      filtered.results.every((r) => r.document.metadata.originalFileType === 'pdf')
    ).toBe(true);
  });

  it('supports conversion with LLM descriptions metadata', async () => {
    vi.mocked(convertToMarkdown).mockResolvedValue({
      success: true,
      markdown: '# Slides\n\n[Image description generated by LLM]',
      metadata: {
        fileName: 'slides.pptx',
        fileSize: 5000,
        format: 'pptx',
        convertedAt: new Date().toISOString(),
        durationMs: 200,
        usedLLMDescriptions: true,
      },
    } as never);

    const result = await ingestion.ingest('slides.pptx', {
      enableDocumentConversion: true,
      enableLLMDescriptions: true,
    });

    expect(result.successCount).toBe(1);

    const query = await retrieval.query('image description', {
      filter: {
        field: 'usedLLMDescriptions',
        operator: 'eq',
        value: true,
      },
    });

    expect(query.results.length).toBeGreaterThan(0);
  });
});
