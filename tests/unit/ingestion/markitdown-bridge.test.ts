/**
 * Unit tests for MarkItDown TypeScript bridge
 * @module @dcyfr/ai-rag/tests/unit/ingestion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { convertToMarkdown, convertBatch, checkMarkItDownInstalled } from '../../../src/ingestion/markitdown-bridge.js';
import { ConversionError, ConversionErrorType } from '../../../src/ingestion/types.js';

// Mock child_process spawn
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  promises: {
    stat: vi.fn(),
    mkdir: vi.fn(),
    rm: vi.fn(),
  },
}));

describe('MarkItDown Bridge - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('convertToMarkdown()', () => {
    it('should successfully convert PDF to markdown', async () => {
      // Mock file stats
      const fs = await import('node:fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({
        isFile: () => true,
        size: 1024 * 100, // 100 KB
      } as any);

      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

      // Mock successful subprocess
      const mockProcess = new EventEmitter() as ChildProcess;
      mockProcess.stdout = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter() as any;
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      // Trigger conversion
      const conversionPromise = convertToMarkdown('/path/to/test.pdf');

      // Simulate subprocess output
      setTimeout(() => {
        mockProcess.stdout?.emit('data', '# Test Document\n\nConverted content here.');
        mockProcess.emit('exit', 0);
      }, 10);

      const result = await conversionPromise;

      expect(result.success).toBe(true);
      expect(result.markdown).toContain('# Test Document');
      expect(result.metadata.fileName).toBe('test.pdf');
      expect(result.metadata.format).toBe('pdf');
      expect(result.metadata.fileSize).toBe(1024 * 100);
      expect(result.error).toBeUndefined();
    });

    it('should handle timeout correctly', async () => {
      // Mock file stats
      const fs = await import('node:fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({
        isFile: () => true,
        size: 1024 * 100,
      } as any);

      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

      // Mock hanging subprocess
      const mockProcess = new EventEmitter() as ChildProcess;
      mockProcess.stdout = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter() as any;
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      // Trigger conversion with short timeout
      const conversionPromise = convertToMarkdown('/path/to/test.pdf', {
        timeout: 100, // 100ms timeout
      });

      // Don't emit exit event - simulate hanging process

      await expect(conversionPromise).rejects.toThrow(ConversionError);
      await expect(conversionPromise).rejects.toThrow(/timeout/i);

      // Verify kill was called
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should enforce file size limit', async () => {
      // Mock file that exceeds limit
      const fs = await import('node:fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({
        isFile: () => true,
        size: 100 * 1024 * 1024, // 100 MB
      } as any);

      await expect(
        convertToMarkdown('/path/to/large.pdf', {
          maxFileSize: 50 * 1024 * 1024, // 50 MB limit
        })
      ).rejects.toThrow(ConversionError);

      await expect(
        convertToMarkdown('/path/to/large.pdf', {
          maxFileSize: 50 * 1024 * 1024,
        })
      ).rejects.toThrow(/exceeds limit/i);
    });

    it('should propagate subprocess errors', async () => {
      // Mock file stats
      const fs = await import('node:fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({
        isFile: () => true,
        size: 1024 * 100,
      } as any);

      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

      // Mock subprocess that crashes
      const mockProcess = new EventEmitter() as ChildProcess;
      mockProcess.stdout = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter() as any;
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const conversionPromise = convertToMarkdown('/path/to/test.pdf');

      // Simulate subprocess error
      setTimeout(() => {
        mockProcess.stderr?.emit('data', 'Python error: MarkItDown module not found');
        mockProcess.emit('exit', 1);
      }, 10);

      await expect(conversionPromise).rejects.toThrow(ConversionError);
      await expect(conversionPromise).rejects.toThrow(/exit code 1/i);
    });

    it('should cleanup temporary directory on success', async () => {
      // Mock file stats
      const fs = await import('node:fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({
        isFile: () => true,
        size: 1024 * 100,
      } as any);

      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

      // Mock successful subprocess
      const mockProcess = new EventEmitter() as ChildProcess;
      mockProcess.stdout = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter() as any;
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const conversionPromise = convertToMarkdown('/path/to/test.pdf');

      setTimeout(() => {
        mockProcess.stdout?.emit('data', 'Converted markdown');
        mockProcess.emit('exit', 0);
      }, 10);

      await conversionPromise;

      // Verify mkdir was called (temp dir created)
      expect(fs.promises.mkdir).toHaveBeenCalled();

      // Verify rm was called (temp dir cleaned up)
      expect(fs.promises.rm).toHaveBeenCalled();
      expect(fs.promises.rm).toHaveBeenCalledWith(
        expect.stringContaining('markitdown-'),
        { recursive: true, force: true }
      );
    });

    it('should cleanup temporary directory on failure', async () => {
      // Mock file stats
      const fs = await import('node:fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({
        isFile: () => true,
        size: 1024 * 100,
      } as any);

      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

      // Mock failing subprocess
      const mockProcess = new EventEmitter() as ChildProcess;
      mockProcess.stdout = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter() as any;
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const conversionPromise = convertToMarkdown('/path/to/test.pdf');

      setTimeout(() => {
        mockProcess.emit('exit', 1);
      }, 10);

      await expect(conversionPromise).rejects.toThrow();

      // Verify cleanup still happened despite failure
      expect(fs.promises.rm).toHaveBeenCalled();
    });

    it('should throw FILE_NOT_FOUND for missing files', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.promises.stat).mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(
        convertToMarkdown('/path/to/nonexistent.pdf')
      ).rejects.toThrow(ConversionError);

      try {
        await convertToMarkdown('/path/to/nonexistent.pdf');
      } catch (error) {
        expect(error).toBeInstanceOf(ConversionError);
        expect((error as ConversionError).type).toBe(ConversionErrorType.FILE_NOT_FOUND);
      }
    });

    it('should throw UNSUPPORTED_FORMAT for unknown extensions', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({
        isFile: () => true,
        size: 1024,
      } as any);

      await expect(
        convertToMarkdown('/path/to/unknown.xyz')
      ).rejects.toThrow(ConversionError);

      try {
        await convertToMarkdown('/path/to/unknown.xyz');
      } catch (error) {
        expect(error).toBeInstanceOf(ConversionError);
        expect((error as ConversionError).type).toBe(ConversionErrorType.UNSUPPORTED_FORMAT);
      }
    });
  });

  describe('convertBatch()', () => {
    it('should process multiple files in parallel with concurrency limit', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({
        isFile: () => true,
        size: 1024,
      } as any);

      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

      // Track concurrent conversions
      let concurrentCount = 0;
      let maxConcurrent = 0;

      vi.mocked(spawn).mockImplementation(() => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        const mockProcess = new EventEmitter() as ChildProcess;
        mockProcess.stdout = new EventEmitter() as any;
        mockProcess.stderr = new EventEmitter() as any;
        mockProcess.kill = vi.fn();

        setTimeout(() => {
          mockProcess.stdout?.emit('data', 'Converted');
          mockProcess.emit('exit', 0);
          concurrentCount--;
        }, 50);

        return mockProcess;
      });

      const files = [
        '/path/file1.pdf',
        '/path/file2.pdf',
        '/path/file3.pdf',
        '/path/file4.pdf',
        '/path/file5.pdf',
      ];

      const results = await convertBatch(files);

      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
      expect(maxConcurrent).toBeLessThanOrEqual(3); // MAX_CONCURRENT = 3
    });

    it('should handle partial failures gracefully', async () => {
      const fs = await import('node:fs');
      
      // First two files succeed, third fails
      vi.mocked(fs.promises.stat)
        .mockResolvedValueOnce({ isFile: () => true, size: 1024 } as any)
        .mockResolvedValueOnce({ isFile: () => true, size: 1024 } as any)
        .mockRejectedValueOnce(new Error('File not found'));

      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        const mockProcess = new EventEmitter() as ChildProcess;
        mockProcess.stdout = new EventEmitter() as any;
        mockProcess.stderr = new EventEmitter() as any;
        mockProcess.kill = vi.fn();

        setTimeout(() => {
          mockProcess.stdout?.emit('data', `File ${callCount} converted`);
          mockProcess.emit('exit', 0);
        }, 10);

        return mockProcess;
      });

      const files = ['/path/file1.pdf', '/path/file2.pdf', '/path/missing.pdf'];
      const results = await convertBatch(files);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(false);
      expect(results[2].error).toContain('not found');
    });
  });

  describe('checkMarkItDownInstalled()', () => {
    it('should return true when MarkItDown is installed', async () => {
      const mockProcess = new EventEmitter() as ChildProcess;
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const checkPromise = checkMarkItDownInstalled();

      setTimeout(() => {
        mockProcess.emit('exit', 0);
      }, 10);

      const isInstalled = await checkPromise;
      expect(isInstalled).toBe(true);
    });

    it('should return false when MarkItDown is not installed', async () => {
      const mockProcess = new EventEmitter() as ChildProcess;
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const checkPromise = checkMarkItDownInstalled();

      setTimeout(() => {
        mockProcess.emit('exit', 1);
      }, 10);

      const isInstalled = await checkPromise;
      expect(isInstalled).toBe(false);
    });

    it('should return false on subprocess error', async () => {
      const mockProcess = new EventEmitter() as ChildProcess;
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const checkPromise = checkMarkItDownInstalled();

      setTimeout(() => {
        mockProcess.emit('error', new Error('Command not found'));
      }, 10);

      const isInstalled = await checkPromise;
      expect(isInstalled).toBe(false);
    });
  });
});
