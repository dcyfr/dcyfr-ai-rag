/**
 * Tests for TextLoader
 */

import { describe, it, expect } from 'vitest';
import { TextLoader } from '../../../src/loaders/text/index.js';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('TextLoader', () => {
  const testDir = join(process.cwd(), 'tests', 'fixtures', 'temp-text');
  const testFile = join(testDir, 'test.txt');

  const setup = (content: string) => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(testFile, content, 'utf-8');
  };

  const teardown = () => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  };

  it('should load a simple text file', async () => {
    setup('Hello, world!');
    const loader = new TextLoader();
    const docs = await loader.load(testFile);

    expect(docs).toHaveLength(1);
    expect(docs[0].content).toBe('Hello, world!');
    expect(docs[0].metadata.source).toBe(testFile);
    teardown();
  });

  it('should chunk large text', async () => {
    const longText = 'a'.repeat(2500);
    setup(longText);

    const loader = new TextLoader();
    const docs = await loader.load(testFile, { chunkSize: 1000, chunkOverlap: 200 });

    expect(docs.length).toBeGreaterThan(1);
    expect(docs[0].content.length).toBeLessThanOrEqual(1000);
    teardown();
  });

  it('should preserve overlap between chunks', async () => {
    const text = 'abcdefghijklmnopqrstuvwxyz'.repeat(50);
    setup(text);

    const loader = new TextLoader();
    const docs = await loader.load(testFile, { chunkSize: 100, chunkOverlap: 20 });

    // Check that consecutive chunks have overlap
    for (let i = 0; i < docs.length - 1; i++) {
      const currentEnd = docs[i].content.slice(-20);
      const nextStart = docs[i + 1].content.slice(0, 20);
      expect(currentEnd).toBe(nextStart);
    }
    teardown();
  });

  it('should handle empty files', async () => {
    setup('');
    const loader = new TextLoader();
    const docs = await loader.load(testFile);

    expect(docs).toHaveLength(0);
    teardown();
  });

  it('should throw on non-text files', async () => {
    setup('Test content');
    const loader = new TextLoader();

    await expect(
      loader.load(join(testDir, 'test.pdf'))
    ).rejects.toThrow();
    teardown();
  });

  it('should generate unique document IDs', async () => {
    setup('Test content for unique IDs');
    const loader = new TextLoader();
    const docs = await loader.load(testFile);

    const ids = new Set(docs.map((d) => d.id));
    expect(ids.size).toBe(docs.length);
    teardown();
  });
});
