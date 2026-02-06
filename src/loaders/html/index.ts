/**
 * HTML document loader
 * Handles HTML files (.html, .htm)
 */

import type { Document, DocumentLoader, LoaderConfig } from '../../types/index.js';
import { promises as fs } from 'node:fs';
import { basename } from 'node:path';

/**
 * Load HTML documents
 */
export class HTMLLoader implements DocumentLoader {
  supportedExtensions = ['.html', '.htm'];

  async load(source: string, config?: LoaderConfig): Promise<Document[]> {
    try {
      const content = await fs.readFile(source, 'utf-8');
      const stats = await fs.stat(source);

      // Extract title from <title> tag if present
      const titleMatch = content.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : basename(source);

      // Extract text content
      const textContent = config?.preserveFormatting 
        ? content 
        : this.extractText(content);

      const document: Document = {
        id: this.generateId(source),
        content: textContent,
        metadata: {
          source,
          type: 'html',
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          title,
          ...config?.metadata,
        },
      };

      // Apply chunking if configured
      if (config?.chunkSize) {
        return this.chunkDocument(document, config);
      }

      return [document];
    } catch (error) {
      throw new Error(`Failed to load HTML file ${source}: ${error}`);
    }
  }

  /**
   * Extract text content from HTML
   * This is a simple implementation - for production use a proper HTML parser
   */
  private extractText(html: string): string {
    return html
      // Remove script and style tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities (basic)
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Split document into chunks
   */
  private chunkDocument(document: Document, config: LoaderConfig): Document[] {
    const chunkSize = config.chunkSize ?? 1000;
    const chunkOverlap = config.chunkOverlap ?? 200;
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
    return `html-${Buffer.from(source).toString('base64').slice(0, 16)}`;
  }
}
