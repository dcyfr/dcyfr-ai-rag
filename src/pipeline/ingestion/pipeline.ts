/**
 * Document ingestion pipeline
 * Orchestrates loading, embedding, and storage
 */

import type {
  Document,
  DocumentChunk,
  DocumentLoader,
  EmbeddingGenerator,
  VectorStore,
  IngestionOptions,
  IngestionResult,
} from '../../types/index.js';
import { convertToMarkdown } from '../../ingestion/index.js';

/**
 * Pipeline for ingesting documents into vector store
 */
export class IngestionPipeline {
  private readonly loader: DocumentLoader;
  private readonly embedder: EmbeddingGenerator;
  private readonly store: VectorStore;

  constructor(
    loader: DocumentLoader,
    embedder: EmbeddingGenerator,
    store: VectorStore
  ) {
    this.loader = loader;
    this.embedder = embedder;
    this.store = store;
  }

  /**
   * Ingest one or more documents
   */
  async ingest(
    filePaths: string | string[],
    options?: IngestionOptions
  ): Promise<IngestionResult> {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const startTime = Date.now();

    const {
      batchSize = 32,
      onProgress,
      loaderConfig,
      enableDocumentConversion = false,
      conversionTimeoutMs = 30000,
      conversionMaxFileSize = 50 * 1024 * 1024,
      enableLLMDescriptions = false,
      chunkingStrategy = 'fixed',
      fixedChunkSize,
      fixedChunkOverlap,
      onConversionError,
    } = options ?? {};

    let totalDocuments = 0;
    let totalChunks = 0;
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ file: string; error: string }> = [];
    const conversionDurationsMs: number[] = [];
    let peakHeapUsedBytes = process.memoryUsage().heapUsed;
    const warnings: string[] = [];

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];

      try {
        const documents = await this.loadDocumentsForPath(path, {
          enableDocumentConversion,
          conversionTimeoutMs,
          conversionMaxFileSize,
          enableLLMDescriptions,
          loaderConfig,
          conversionDurationsMs,
        });

        totalDocuments += documents.length;

        const chunkCount = await this.processAndStoreDocuments(path, documents, {
          batchSize,
          chunkingStrategy,
          fixedChunkSize,
          fixedChunkOverlap,
          onProgress,
          fileIndex: i,
          totalFiles: paths.length,
        });

        totalChunks += chunkCount;
        successCount++;
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ file: path, error: errorMessage });

        if (enableDocumentConversion && onConversionError) {
          onConversionError({
            file: path,
            error: errorMessage,
            errorType: this.extractErrorType(error),
          });
        }
      }

      peakHeapUsedBytes = this.updateMemoryMetrics(path, peakHeapUsedBytes, warnings);
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const averageConversionMs =
      conversionDurationsMs.length > 0
        ? conversionDurationsMs.reduce((sum, ms) => sum + ms, 0) / conversionDurationsMs.length
        : undefined;
    const documentsPerSecond = durationMs > 0 ? (successCount / durationMs) * 1000 : 0;

    return {
      documentsProcessed: totalDocuments,
      successCount,
      failureCount,
      chunksGenerated: totalChunks,
      errors,
      metrics: {
        averageConversionMs,
        documentsPerSecond,
        peakHeapUsedMb: peakHeapUsedBytes / (1024 * 1024),
        warnings,
      },
      durationMs,
    };
  }

  private async loadDocumentsForPath(
    path: string,
    config: {
      enableDocumentConversion: boolean;
      conversionTimeoutMs: number;
      conversionMaxFileSize: number;
      enableLLMDescriptions: boolean;
      loaderConfig: IngestionOptions['loaderConfig'];
      conversionDurationsMs: number[];
    }
  ): Promise<Document[]> {
    if (!config.enableDocumentConversion) {
      return this.loader.load(path, config.loaderConfig);
    }

    const conversionStart = Date.now();
    const converted = await convertToMarkdown(path, {
      timeout: config.conversionTimeoutMs,
      maxFileSize: config.conversionMaxFileSize,
      enableLLMDescriptions: config.enableLLMDescriptions,
      preserveMetadata: true,
    });
    config.conversionDurationsMs.push(Date.now() - conversionStart);

    return [
      {
        id: `${path}-${Date.now()}`,
        content: converted.markdown,
        metadata: {
          source: path,
          type: this.inferDocumentType(path),
          createdAt: new Date(),
          conversionTimestamp: converted.metadata.convertedAt,
          originalFileType: converted.metadata.format,
          pageCount: converted.metadata.pageCount,
          conversionDurationMs: converted.metadata.durationMs,
          usedLLMDescriptions: converted.metadata.usedLLMDescriptions,
        },
      },
    ];
  }

  private async processAndStoreDocuments(
    path: string,
    documents: Document[],
    config: {
      batchSize: number;
      chunkingStrategy: 'semantic' | 'fixed';
      fixedChunkSize?: number;
      fixedChunkOverlap?: number;
      onProgress?: IngestionOptions['onProgress'];
      fileIndex: number;
      totalFiles: number;
    }
  ): Promise<number> {
    const allChunks: DocumentChunk[] = [];

    for (let j = 0; j < documents.length; j += config.batchSize) {
      const batch = documents.slice(j, j + config.batchSize);
      const chunks = await this.processDocuments(batch, {
        chunkingStrategy: config.chunkingStrategy,
        fixedChunkSize: config.fixedChunkSize,
        fixedChunkOverlap: config.fixedChunkOverlap,
      });
      allChunks.push(...chunks);

      if (config.onProgress) {
        config.onProgress(config.fileIndex + 1, config.totalFiles, {
          currentFile: path,
          documentsProcessed: Math.min(j + config.batchSize, documents.length),
          totalDocuments: documents.length,
          chunksGenerated: allChunks.length,
        });
      }
    }

    await this.store.addDocuments(allChunks);
    return allChunks.length;
  }

  private extractErrorType(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('type' in error)) {
      return undefined;
    }
    const rawType = (error as { type?: unknown }).type;
    return typeof rawType === 'string' ? rawType : undefined;
  }

  private updateMemoryMetrics(path: string, currentPeak: number, warnings: string[]): number {
    const currentHeap = process.memoryUsage().heapUsed;
    const nextPeak = Math.max(currentHeap, currentPeak);
    if (currentHeap > 512 * 1024 * 1024) {
      warnings.push(
        `High memory usage detected while processing ${path}: ${(currentHeap / (1024 * 1024)).toFixed(1)}MB`
      );
    }
    return nextPeak;
  }

  /**
   * Process documents: chunk and embed
   */
  private async processDocuments(
    documents: Document[],
    options?: {
      chunkingStrategy?: 'semantic' | 'fixed';
      fixedChunkSize?: number;
      fixedChunkOverlap?: number;
    }
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    for (const doc of documents) {
      // Split into chunks
      const docChunks =
        options?.chunkingStrategy === 'semantic'
          ? this.semanticChunkDocument(doc)
          : this.fixedChunkDocument(
              doc,
              options?.fixedChunkSize ?? 1000,
              options?.fixedChunkOverlap ?? 200
            );
      chunks.push(...docChunks);
    }

    // Generate embeddings
    const texts = chunks.map((chunk) => chunk.content);
    const embeddings = await this.embedder.embed(texts);

    // Attach embeddings
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].embedding = embeddings[i];
    }

    return chunks;
  }

  /**
   * Fixed-size chunking with overlap
   */
  private fixedChunkDocument(doc: Document, chunkSize: number, overlap: number): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const content = doc.content;

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const chunk = content.slice(i, i + chunkSize);
      const chunkId = `${doc.id}-chunk-${chunks.length}`;

      chunks.push({
        id: chunkId,
        documentId: doc.id,
        content: chunk,
        index: chunks.length,
        metadata: {
          chunkIndex: chunks.length,
          chunkCount: 0, // Will update after
          startChar: i,
          endChar: Math.min(i + chunkSize, content.length),
          ...doc.metadata,
        },
      });
    }

    // Update chunk counts
    for (const chunk of chunks) {
      chunk.metadata.chunkCount = chunks.length;
    }

    return chunks;
  }

  /**
   * Semantic chunking preserving heading-based sections where possible
   */
  private semanticChunkDocument(doc: Document): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sections = doc.content
      .split(/\n(?=#{1,6}\s)/g)
      .filter((section) => section.trim().length > 0);

    if (sections.length <= 1) {
      return this.fixedChunkDocument(doc, 1000, 200);
    }

    let cursor = 0;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const startChar = doc.content.indexOf(section, cursor);
      const endChar = startChar + section.length;
      const chunkId = `${doc.id}-chunk-${i}`;

      chunks.push({
        id: chunkId,
        documentId: doc.id,
        content: section,
        index: i,
        metadata: {
          chunkIndex: i,
          chunkCount: sections.length,
          startChar,
          endChar,
          chunkingStrategy: 'semantic',
          ...doc.metadata,
        },
      });

      cursor = endChar;
    }

    return chunks;
  }

  /**
   * Infer document type from file extension
   */
  private inferDocumentType(path: string): 'pdf' | 'markdown' | 'html' | 'text' | 'json' | 'other' {
    const lowerPath = path.toLowerCase();
    if (lowerPath.endsWith('.pdf')) return 'pdf';
    if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) return 'markdown';
    if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) return 'html';
    if (lowerPath.endsWith('.json')) return 'json';
    if (lowerPath.endsWith('.txt')) return 'text';
    return 'other';
  }
}
