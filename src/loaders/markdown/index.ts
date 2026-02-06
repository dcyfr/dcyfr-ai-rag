/**
 * Markdown document loader
 * Handles Markdown files (.md, .markdown)
 */

import type { Document, DocumentLoader, LoaderConfig } from '../../types/index.js';
import { promises as fs } from 'node:fs';
import { basename } from 'node:path';

/**
 * Load Markdown documents
 */
export class MarkdownLoader implements DocumentLoader {
  supportedExtensions = ['.md', '.markdown'];

  async load(source: string, config?: LoaderConfig): Promise<Document[]> {
    try {
      const content = await fs.readFile(source, 'utf-8');
      const stats = await fs.stat(source);

      // Extract title from first heading if present
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : basename(source);

      const document: Document = {
        id: this.generateId(source),
        content: config?.preserveFormatting ? content : this.removeFormatting(content),
        metadata: {
          source,
          type: 'markdown',
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          title,
          ...config?.metadata,
        },
      };

      // Apply chunking if configured
      if (config?.chunkSize) {
        return this.chunkBySection(document, config);
      }

      return [document];
    } catch (error) {
      throw new Error(`Failed to load markdown file ${source}: ${error}`);
    }
  }

  /**
   * Remove markdown formatting for pure text
   */
  private removeFormatting(content: string): string {
    return content
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove bold/italic
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Chunk document by sections (headings)
   */
  private chunkBySection(document: Document, config: LoaderConfig): Document[] {
    const content = document.content;
    const sections = this.splitByHeadings(content);
    const chunks: Document[] = [];

    sections.forEach((section, index) => {
      // Further chunk if section is too large
      if (config.chunkSize && section.content.length > config.chunkSize) {
        const subChunks = this.chunkText(section.content, config);
        subChunks.forEach((chunk, subIndex) => {
          chunks.push({
            id: `${document.id}-${index}-${subIndex}`,
            content: chunk,
            metadata: {
              ...document.metadata,
              section: section.title,
              chunkIndex: chunks.length,
              parentDocumentId: document.id,
            },
          });
        });
      } else {
        chunks.push({
          id: `${document.id}-${index}`,
          content: section.content,
          metadata: {
            ...document.metadata,
            section: section.title,
            chunkIndex: index,
            parentDocumentId: document.id,
          },
        });
      }
    });

    return chunks;
  }

  /**
   * Split content by headings
   */
  private splitByHeadings(content: string): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];
    const lines = content.split('\n');
    let currentSection = { title: 'Introduction', content: '' };

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        currentSection = { title: headingMatch[2], content: '' };
      } else {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Chunk text by size with overlap
   */
  private chunkText(text: string, config: LoaderConfig): string[] {
    const chunkSize = config.chunkSize ?? 1000;
    const chunkOverlap = config.chunkOverlap ?? 200;
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += chunkSize - chunkOverlap;
    }

    return chunks;
  }

  /**
   * Generate document ID from source
   */
  private generateId(source: string): string {
    return `md-${Buffer.from(source).toString('base64').slice(0, 16)}`;
  }
}
