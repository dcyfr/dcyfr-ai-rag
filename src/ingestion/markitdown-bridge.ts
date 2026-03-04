/**
 * TypeScript bridge to Python MarkItDown document converter
 * @module @dcyfr/ai-rag/ingestion/markitdown-bridge
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename, extname } from 'node:path';
import type {
  ConversionOptions,
  ConversionResult,
  DocumentMetadata,
  SupportedFormat,
} from './types.js';
import { ConversionError, ConversionErrorType } from './types.js';

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS:Required<Pick<ConversionOptions, 'timeout' | 'maxFileSize' | 'enableLLMDescriptions' | 'preserveMetadata'>> = {
  timeout: 30000, // 30 seconds
  maxFileSize: 52428800, // 50MB
  enableLLMDescriptions: false,
  preserveMetadata: true,
};

/**
 * Supported file extensions mapping to format types
 */
const EXTENSION_MAP: Record<string, SupportedFormat> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.pptx': 'pptx',
  '.xlsx': 'xlsx',
  '.csv': 'csv',
  '.html': 'html',
  '.htm': 'htm',
  '.xml': 'xml',
  '.json': 'json',
  '.png': 'png',
  '.jpg': 'jpg',
  '.jpeg': 'jpeg',
  '.gif': 'gif',
  '.webp': 'webp',
  '.mp3': 'mp3',
  '.wav': 'wav',
  '.m4a': 'm4a',
  '.epub': 'epub',
  '.zip': 'zip',
};

/**
 * Detect file format from extension
 */
function detectFormat(filePath: string): SupportedFormat {
  const ext = extname(filePath).toLowerCase();
  const format = EXTENSION_MAP[ext];
  if (!format) {
    throw new ConversionError(
      ConversionErrorType.UNSUPPORTED_FORMAT,
      `Unsupported file format: ${ext}`,
      { filePath, extension: ext }
    );
  }
  return format;
}

/**
 * Create temporary directory for conversion workspace
 */
async function createTempDir(): Promise<string> {
  try {
    const tempDir = join(tmpdir(), `markitdown-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  } catch (error) {
    throw new ConversionError(
      ConversionErrorType.TEMP_DIR_ERROR,
      'Failed to create temporary directory',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Clean up temporary directory
 */
async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Log warning but don't throw - cleanup failure shouldn't break the flow
    console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
  }
}

/**
 * Validate file accessibility and size
 */
async function validateFile(filePath: string, maxFileSize: number): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    
    if (!stats.isFile()) {
      throw new ConversionError(
        ConversionErrorType.FILE_NOT_FOUND,
        'Path is not a file',
        { filePath }
      );
    }

    if (stats.size > maxFileSize) {
      throw new ConversionError(
        ConversionErrorType.FILE_TOO_LARGE,
        `File size ${stats.size} bytes exceeds limit ${maxFileSize} bytes`,
        { filePath, fileSize: stats.size, maxFileSize }
      );
    }
  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }
    throw new ConversionError(
      ConversionErrorType.FILE_NOT_FOUND,
      `File not found or inaccessible: ${filePath}`,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Find Python executable in workspace .venv
 */
function getPythonExecutable(): string {
  // Workspace root is 2 levels up from dcyfr-ai-rag/src/ingestion
  const workspaceRoot = resolve(__dirname, '../../../..');
  const venvPython = join(workspaceRoot, '.venv', 'bin', 'python');
  return venvPython;
}

/**
 * Convert document to Markdown using Python MarkItDown subprocess
 * 
 * @param filePath - Absolute path to file to convert
 * @param options - Conversion options
 * @returns Conversion result with markdown and metadata
 * 
 * @throws {ConversionError} If conversion fails
 * 
 * @example
 * ```typescript
 * const result = await convertToMarkdown('/path/to/document.pdf', {
 *   timeout: 45000,
 *   enableLLMDescriptions: true
 * });
 * console.log(result.markdown);
 * ```
 */
export async function convertToMarkdown(
  filePath: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const resolvedPath = resolve(filePath);
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Validate file before processing
  await validateFile(resolvedPath, opts.maxFileSize);

  // Detect format
  const format = detectFormat(resolvedPath);
  const fileName = basename(resolvedPath);

  // Create temporary directory for processing
  let tempDir: string | null = null;
  try {
    tempDir = await createTempDir();

    // Spawn Python subprocess
    const python = getPythonExecutable();
    const startMs = Date.now();
    
    const child = spawn(python, ['-m', 'mark itdown', resolvedPath], {
      cwd: tempDir,
      timeout: opts.timeout,
      env: {
        ...process.env,
        // Pass LLM settings if enabled
        ...(opts.enableLLMDescriptions && {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          LLM_MODEL: opts.llmModel || 'gpt-4-vision-preview',
        }),
      },
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Collect subprocess output
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait for subprocess to complete or timeout
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 1000); // Force kill if SIGTERM doesn't work
        reject(new ConversionError(
          ConversionErrorType.TIMEOUT,
          `Conversion exceeded timeout of ${opts.timeout}ms`,
          { filePath: resolvedPath, timeout: opts.timeout }
        ));
      }, opts.timeout);

      child.on('exit', (code) => {
        clearTimeout(timeoutId);
        resolve(code);
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new ConversionError(
          ConversionErrorType.SUBPROCESS_ERROR,
          `Python subprocess failed: ${error.message}`,
          { error: error.message, python }
        ));
      });
    });

    // Handle subprocess errors
    if (timedOut) {
      // Timeout error already thrown above
      throw new Error('Timeout error not caught'); // Should never reach here
    }

    if (exitCode !== 0) {
      throw new ConversionError(
        ConversionErrorType.SUBPROCESS_ERROR,
        `MarkItDown conversion failed with exit code ${exitCode}`,
        { exitCode, stderr, stdout, filePath: resolvedPath }
      );
    }

    // Parse markdown output
    const markdown = stdout.trim();
    if (!markdown) {
      throw new ConversionError(
        ConversionErrorType.SUBPROCESS_ERROR,
        'MarkItDown returned empty output',
        { stderr, filePath: resolvedPath }
      );
    }

    // Get file size for metadata
    const stats = await fs.stat(resolvedPath);
    const durationMs = Date.now() - startMs;

    // Build metadata
    const metadata: DocumentMetadata = {
      fileName,
      fileSize: stats.size,
      format,
      convertedAt: new Date().toISOString(),
      durationMs,
      usedLLMDescriptions: opts.enableLLMDescriptions,
    };

    // Extract page count from stderr (MarkItDown logs this)
    const pageRegex = /(\d+)\s+pages?/i;
    const pageMatch = pageRegex.exec(stderr);
    if (pageMatch) {
      metadata.pageCount = Number.parseInt(pageMatch[1], 10);
    }

    // Return success result
    return {
      markdown,
      metadata,
      success: true,
      warnings: stderr ? [stderr] : undefined,
    };
  } catch (error) {
    // Handle conversion errors
    if (error instanceof ConversionError) {
      throw error;
    }

    throw new ConversionError(
      ConversionErrorType.SUBPROCESS_ERROR,
      `Unexpected error during conversion: ${error instanceof Error ? error.message : String(error)}`,
      { error: error instanceof Error ? error.message : String(error), filePath: resolvedPath }
    );
  } finally {
    // Always cleanup temp directory
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}

/**
 * Batch convert multiple documents
 * 
 * @param filePaths - Array of file paths to convert
 * @param options - Shared conversion options
 * @returns Array of conversion results (same order as input)
 */
export async function convertBatch(
  filePaths: string[],
  options: ConversionOptions = {}
): Promise<ConversionResult[]> {
  // Process conversions in parallel with concurrency limit
  const MAX_CONCURRENT = 3;
  const results: ConversionResult[] = [];

  for (let i = 0; i < filePaths.length; i += MAX_CONCURRENT) {
    const batch = filePaths.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.allSettled(
      batch.map((path) => convertToMarkdown(path, options))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Convert rejected promise to failed ConversionResult
        const error = result.reason;
        results.push({
          markdown: '',
          metadata: {
            fileName: '',
            fileSize: 0,
            format: 'pdf',
            convertedAt: new Date().toISOString(),
            durationMs: 0,
          },
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return results;
}

/**
 * Check if Python MarkItDown is installed and accessible
 */
export async function checkMarkItDownInstalled(): Promise<boolean> {
  try {
    const python = getPythonExecutable();
    const child = spawn(python, ['-m', 'markitdown', '--version'], {
      timeout: 5000,
    });

    return new Promise((resolve) => {
      child.on('exit', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}
