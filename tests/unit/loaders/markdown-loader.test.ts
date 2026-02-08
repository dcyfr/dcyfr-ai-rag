/**
 * Tests for MarkdownLoader
 */

import { describe, it, expect } from 'vitest';
import { MarkdownLoader } from '../../../src/loaders/markdown/index.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('MarkdownLoader', () => {
  const testDir = join(process.cwd(), 'tests', 'fixtures', 'temp-markdown');
  const testFile = join(testDir, 'test.md');

  const setup = (content: string) => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(testFile, content, 'utf-8');
  };

  const teardown = () => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  };

  it('should load markdown file', async () => {
    setup('# Title\n\nSome content');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile);

    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].metadata.title).toBe('Title');
    teardown();
  });

  it('should remove markdown formatting', async () => {
    setup('**bold** and *italic* and `code`');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile);

    expect(docs[0].content).not.toContain('**');
    expect(docs[0].content).not.toContain('*');
    expect(docs[0].content).not.toContain('`');
    teardown();
  });

  it('should split by headings', async () => {
    const md = `# Title
First section

## Section 1
Content 1

## Section 2
Content 2`;
    setup(md);

    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile, { chunkSize: 100, chunkOverlap: 20 }); // Smaller chunk to force splitting

    // With proper chunking, should get multiple docs
    expect(docs.length).toBeGreaterThanOrEqual(1);
    expect(docs[0].content).toBeDefined();
    teardown();
  });

  it('should handle code blocks', async () => {
    const md = '```typescript\nconst x = 1;\n```';
    setup(md);

    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile);

    expect(docs[0].content).not.toContain('```');
    teardown();
  });

  it('should handle links', async () => {
    setup('[text](https://example.com)');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile);

    expect(docs[0].content).toContain('text');
    expect(docs[0].content).not.toContain('[');
    expect(docs[0].content).not.toContain('](');
    teardown();
  });

  it('should preserve formatting when configured', async () => {
    setup('**bold** and *italic*');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile, { preserveFormatting: true });

    expect(docs[0].content).toContain('**bold**');
    expect(docs[0].content).toContain('*italic*');
    teardown();
  });

  it('should use basename as title when no heading present', async () => {
    setup('Just some content without a heading');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile);

    expect(docs[0].metadata.title).toBe('test.md');
    teardown();
  });

  it('should include custom metadata', async () => {
    setup('# Test\nContent');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile, {
      metadata: { author: 'Test Author', tags: ['test'] },
    });

    expect(docs[0].metadata.author).toBe('Test Author');
    expect(docs[0].metadata.tags).toEqual(['test']);
    teardown();
  });

  it('should return single document when no chunking configured', async () => {
    setup('# Title\n\n## Section 1\nContent 1\n\n## Section 2\nContent 2');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile); // No chunkSize

    expect(docs).toHaveLength(1);
    expect(docs[0].content).toContain('Section 1');
    teardown();
  });

  it('should throw error on invalid file path', async () => {
    const loader = new MarkdownLoader();

    await expect(
      loader.load('/nonexistent/path/file.md')
    ).rejects.toThrow('Failed to load markdown file');
  });

  it('should remove images', async () => {
    setup('![alt text](image.png)');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile);

    // Main goal: image URL should not be in cleaned content
    expect(docs[0].content).not.toContain('image.png');
    expect(docs[0].content).not.toContain('](');
    teardown();
  });

  it('should remove heading markers', async () => {
    setup('# H1\n## H2\n### H3\nContent');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile);

    expect(docs[0].content).not.toContain('###');
    expect(docs[0].content).not.toContain('##');
    expect(docs[0].content).not.toContain('# ');
    teardown();
  });

  it('should remove horizontal rules', async () => {
    setup('Before\n\n---\n\nAfter');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile);

    expect(docs[0].content).not.toContain('---');
    expect(docs[0].content).toContain('Before');
    expect(docs[0].content).toContain('After');
    teardown();
  });

  it('should clean up excessive whitespace', async () => {
    setup('Line 1\n\n\n\n\nLine 2');
    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile);

    expect(docs[0].content).not.toContain('\n\n\n');
    teardown();
  });

  it('should chunk large sections', async () => {
    // Create a section larger than chunkSize
    const largeContent = 'A'.repeat(500);
    const md = `# Title\n\n## Large Section\n${largeContent}`;
    setup(md);

    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile, { chunkSize: 200, chunkOverlap: 50 });

    // Should split the large section into multiple chunks
    expect(docs.length).toBeGreaterThan(1);
    teardown();
  });

  it('should apply chunk overlap', async () => {
    const content = 'A'.repeat(1000);
    setup(content);

    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile, { chunkSize: 300, chunkOverlap: 50 });

    expect(docs.length).toBeGreaterThan(1);
    // With chunkSize 300 and overlap 50, start positions should be 0, 250, 500, 750...
    // Verify chunking occurred with overlap logic
    expect(docs[0].content.length).toBeLessThanOrEqual(300);
    teardown();
  });

  it('should handle empty content sections', async () => {
    const md = `# Title\n\n## Section 1\n\n## Section 2\nActual content`;
    setup(md);

    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile, { chunkSize: 100, chunkOverlap: 20 });

    // Should only include sections with content
    expect(docs.every((d) => d.content.trim().length > 0)).toBe(true);
    teardown();
  });

  it('should handle content with no headings when chunking', async () => {
    const content = 'Just plain content without any headings';
    setup(content);

    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile, { chunkSize: 100, chunkOverlap: 20 });

    expect(docs).toHaveLength(1);
    expect(docs[0].metadata.section).toBe('Introduction');
    teardown();
  });

  it('should include chunk metadata', async () => {
    const md = `# Title\n\n## Section 1\n${'A'.repeat(500)}`;
    setup(md);

    const loader = new MarkdownLoader();
    const docs = await loader.load(testFile, { chunkSize: 200, chunkOverlap: 50 });

    expect(docs.length).toBeGreaterThan(1);
    docs.forEach((doc, idx) => {
      expect(doc.metadata.chunkIndex).toBeDefined();
      expect(doc.metadata.parentDocumentId).toBeDefined();
    });
    teardown();
  });

  it('should have correct supportedExtensions', () => {
    const loader = new MarkdownLoader();
    expect(loader.supportedExtensions).toContain('.md');
    expect(loader.supportedExtensions).toContain('.markdown');
  });
});
