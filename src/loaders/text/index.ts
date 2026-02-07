/**
 * Text document loader
 * Handles plain text files (.txt)
 */

import type { Document, DocumentLoader, LoaderConfig } from '../../types/index.js';
import { promises as fs } from 'node:fs';
import { basename } from 'node:path';
import { Buffer } from 'node:buffer';

/**
 * Load plain text documents
 */
export class TextLoader implements DocumentLoader {
  supportedExtensions = ['.txt', '.text'];

  async load(source: string, config?: LoaderConfig): Promise<Document[]> {
    try {
      const content = await fs.readFile(source, 'utf-8');
      const stats = await fs.stat(source);

      const document: Document = {
        id: this.generateId(source),
        content,
        metadata: {
          source,
          type: 'text',
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          title: basename(source),
          ...config?.metadata,
        },
      };

      // Skip empty documents
      if (!content.trim()) {
        return [];
      }

      // Apply chunking if configured
      if (config?.chunkSize) {
        return this.chunkDocument(document, config);
      }

      return [document];
    } catch (error) {
      throw new Error(`Failed to load text file ${source}: ${error}`);
    }
  }

  /**
   * Split document into chunks
   */
  private chunkDocument(document: Document, config: LoaderConfig): Document[] {
    const chunkSize = config.chunkSize ?? 1000;
    const chunkOverlap = Math.min(config.chunkOverlap ?? 200, chunkSize - 1);
    const content = document.content;
    const chunks: Document[] = [];

    let start = 0;
    let chunkIndex = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunkContent = content.slice(start, end);

      chunks.push({
        id: `${document.id}-chunk-${chunkIndex}`,
        content: chunkContent,
        metadata: {
          ...document.metadata,
          chunkIndex,
          startChar: start,
          endChar: end,
          parentDocumentId: document.id,
        },
      });

      start += chunkSize - chunkOverlap;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Generate document ID from source
   */
  private generateId(source: string): string {
    return `text-${Buffer.from(source, 'utf-8').toString('base64').slice(0, 16)}`;
  }
}
