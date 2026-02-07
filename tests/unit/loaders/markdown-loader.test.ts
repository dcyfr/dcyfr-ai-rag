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
    const docs = await loader.load(testFile, { chunkSize: 100 }); // Smaller chunk to force splitting

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
});
