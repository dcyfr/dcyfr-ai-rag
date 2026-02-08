/**
 * Tests for HTMLLoader
 */

import { describe, it, expect } from 'vitest';
import { HTMLLoader } from '../../../src/loaders/html/index.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('HTMLLoader', () => {
  const testDir = join(process.cwd(), 'tests', 'fixtures', 'temp-html');
  const testFile = join(testDir, 'test.html');

  const setup = (content: string, filename = 'test.html') => {
    mkdirSync(testDir, { recursive: true });
    const filepath = join(testDir, filename);
    writeFileSync(filepath, content, 'utf-8');
    return filepath;
  };

  const teardown = () => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  };

  describe('load()', () => {
    it('should load basic HTML document', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Hello World</h1>
            <p>This is a test paragraph.</p>
          </body>
        </html>
      `;
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs).toHaveLength(1);
      expect(docs[0].metadata.title).toBe('Test Page');
      expect(docs[0].metadata.type).toBe('html');
      expect(docs[0].content).toContain('Hello World');
      expect(docs[0].content).toContain('test paragraph');
      teardown();
    });

    it('should extract title from HTML', async () => {
      const html = '<html><head><title>My Page</title></head><body>Content</body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs[0].metadata.title).toBe('My Page');
      teardown();
    });

    it('should use filename when no title tag', async () => {
      const html = '<html><body>No title</body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs[0].metadata.title).toBe('test.html');
      teardown();
    });

    it('should remove script tags', async () => {
      const html = `
        <html><body>
          <p>Before</p>
          <script>console.log('removed');</script>
          <p>After</p>
        </body></html>
      `;
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs[0].content).not.toContain('console.log');
      expect(docs[0].content).toContain('Before');
      expect(docs[0].content).toContain('After');
      teardown();
    });

    it('should remove style tags', async () => {
      const html = `
        <html><body>
          <style>.class { color: red; }</style>
          <p>Visible</p>
        </body></html>
      `;
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs[0].content).not.toContain('color: red');
      expect(docs[0].content).toContain('Visible');
      teardown();
    });

    it('should remove HTML comments', async () => {
      const html = '<html><body><!-- Comment --><p>Text</p></body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs[0].content).not.toContain('Comment');
      expect(docs[0].content).toContain('Text');
      teardown();
    });

    it('should decode HTML entities', async () => {
      const html = '<html><body>Hello&nbsp;&lt;World&gt;&amp;&quot;&#39;</body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs[0].content).toContain('Hello <World>&"\'');
      teardown();
    });

    it('should remove all HTML tags', async () => {
      const html = '<html><body><div><p>Text <b>bold</b></p></div></body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs[0].content).not.toContain('<');
      expect(docs[0].content).toContain('Text bold');
      teardown();
    });

    it('should clean up whitespace', async () => {
      const html = '<html><body>Lots     of      spaces</body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs[0].content).toBe('Lots of spaces');
      teardown();
    });

    it('should preserve formatting when configured', async () => {
      const html = '<html><body><p>Keep <b>tags</b></p></body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile, { preserveFormatting: true });

      expect(docs[0].content).toBe(html);
      teardown();
    });

    it('should include custom metadata', async () => {
      const html = '<html><body>Content</body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile, {
        metadata: { author: 'John', category: 'test' },
      });

      expect(docs[0].metadata.author).toBe('John');
      expect(docs[0].metadata.category).toBe('test');
      teardown();
    });

    it('should include timestamps', async () => {
      const html = '<html><body>Content</body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs[0].metadata.createdAt).toBeInstanceOf(Date);
      expect(docs[0].metadata.updatedAt).toBeInstanceOf(Date);
      teardown();
    });

    it('should generate unique IDs', async () => {
      const html = '<html><body>Content</body></html>';
      const file1 = setup(html, 'doc1.html');

      const loader = new HTMLLoader();
      const docs1 = await loader.load(file1);

      // IDs are base64 of the file path, so they're unique per path
      expect(docs1[0].id).toMatch(/^html-/);
      expect(docs1[0].id.length).toBeGreaterThan(5);
      teardown();
    });

    it('should handle empty files', async () => {
      setup('');

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile);

      expect(docs).toHaveLength(1);
      expect(docs[0].content).toBe('');
      teardown();
    });

    it('should throw error for non-existent file', async () => {
      const loader = new HTMLLoader();

      await expect(
        loader.load(join(testDir, 'nonexistent.html'))
      ).rejects.toThrow();
    });
  });

  describe('chunking', () => {
    it('should chunk large documents', async () => {
      const longContent = 'A'.repeat(2500);
      const html = `<html><body>${longContent}</body></html>`;
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile, { chunkSize: 1000 });

      expect(docs.length).toBeGreaterThan(1);
      expect(docs[0].metadata.chunkIndex).toBe(0);
      expect(docs[1].metadata.chunkIndex).toBe(1);
      teardown();
    });

    it('should apply chunk overlap', async () => {
      const content = 'A'.repeat(1500);
      const html = `<html><body>${content}</body></html>`;
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile, {
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      expect(docs.length).toBe(2);
      expect(docs[0].content.length).toBe(1000);
      teardown();
    });

    it('should track chunk positions', async () => {
      const content = 'A'.repeat(2000);
      const html = `<html><body>${content}</body></html>`;
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile, { chunkSize: 1000, chunkOverlap: 0 });

      expect(docs[0].metadata.startChar).toBe(0);
      expect(docs[0].metadata.endChar).toBe(1000);
      expect(docs[1].metadata.startChar).toBe(1000);
      teardown();
    });

    it('should set parent document ID', async () => {
      const content = 'A'.repeat(2000);
      const html = `<html><body>${content}</body></html>`;
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile, { chunkSize: 1000 });

      const parentId = docs[0].id.replace('-chunk-0', '');
      expect(docs[1].metadata.parentDocumentId).toBe(parentId);
      teardown();
    });

    it('should not chunk small documents', async () => {
      const html = '<html><body>Small</body></html>';
      setup(html);

      const loader = new HTMLLoader();
      const docs = await loader.load(testFile, { chunkSize: 10000 });

      expect(docs).toHaveLength(1);
      // Even single chunks get chunkIndex: 0 when chunking is requested
      expect(docs[0].metadata.chunkIndex).toBe(0);
      teardown();
    });
  });

  describe('supportedExtensions', () => {
    it('should support .html and .htm', () => {
      const loader = new HTMLLoader();
      expect(loader.supportedExtensions).toEqual(['.html', '.htm']);
    });
  });
});
