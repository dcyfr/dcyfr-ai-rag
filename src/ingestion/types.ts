/**
 * MarkItDown document conversion types
 * @module @dcyfr/ai-rag/ingestion
 */

/**
 * Supported file formats for conversion
 */
export type SupportedFormat = 
  | 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' 
  | 'html' | 'htm' | 'xml' | 'json' 
  | 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp'
  | 'mp3' | 'wav' | 'm4a'
  | 'epub' | 'zip';

/**
 * Options for document conversion
 */
export interface ConversionOptions {
  /**
   * Maximum time to wait for conversion (milliseconds)
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Maximum file size to process (bytes)
   * @default 52428800 (50MB)
   */
  maxFileSize?: number;

  /**
   * Enable LLM-powered image descriptions (requires API key)
   * Supports: OpenAI GPT-4 Vision, Anthropic Claude
   * @default false
   */
  enableLLMDescriptions?: boolean;

  /**
   * LLM model to use for image descriptions
   * @default "gpt-4-vision-preview" or "claude-3-opus-20240229"
   */
  llmModel?: string;

  /**
   * Preserve original file metadata in result
   * @default true
   */
  preserveMetadata?: boolean;

  /**
   * Working directory for temporary files
   * Auto-created and cleaned up after conversion
   * @default system temp directory
   */
  workDir?: string;
}

/**
 * Metadata about the converted document
 */
export interface DocumentMetadata {
  /**
   * Original file name
   */
  fileName: string;

  /**
   * File size in bytes
   */
  fileSize: number;

  /**
   * Detected or specified file format
   */
  format: SupportedFormat;

  /**
   * Conversion timestamp (ISO 8601)
   */
  convertedAt: string;

  /**
   * Conversion duration in milliseconds
   */
  durationMs: number;

  /**
   * Number of pages (PDF, DOCX, PPTX) or sections
   */
  pageCount?: number;

  /**
   * Whether LLM descriptions were used
   */
  usedLLMDescriptions?: boolean;

  /**
   * Additional format-specific metadata
   */
  [key: string]: unknown;
}

/**
 * Result of document conversion
 */
export interface ConversionResult {
  /**
   * Converted markdown content
   */
  markdown: string;

  /**
   * Document metadata
   */
  metadata: DocumentMetadata;

  /**
   * Conversion success status
   */
  success: boolean;

  /**
   * Error message if conversion failed
   */
  error?: string;

  /**
   * Warning messages (non-fatal issues)
   */
  warnings?: string[];
}

/**
 * Error types for conversion failures
 */
export enum ConversionErrorType {
  /** File not found or inaccessible */
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  
  /** File exceeds maximum size limit */
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  
  /** File format not supported by MarkItDown */
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  
  /** Conversion timeout exceeded */
  TIMEOUT = 'TIMEOUT',
  
  /** Python subprocess failed to start or crashed */
  SUBPROCESS_ERROR = 'SUBPROCESS_ERROR',
  
  /** Temporary directory creation/cleanup failed */
  TEMP_DIR_ERROR = 'TEMP_DIR_ERROR',
  
  /** Invalid conversion options provided */
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  
  /** Python environment or MarkItDown not installed */
  PYTHON_ENV_ERROR = 'PYTHON_ENV_ERROR',
  
  /** LLM API call failed (if enableLLMDescriptions=true) */
  LLM_API_ERROR = 'LLM_API_ERROR',
}

/**
 * Conversion error with typed error code
 */
export class ConversionError extends Error {
  constructor(
    public readonly type: ConversionErrorType,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}

/**
 * Internal subprocess communication message format
 */
export interface SubprocessMessage {
  /** Message type: request or response */
  type: 'request' | 'response';
  
  /** File path to convert */
  filePath?: string;
  
  /** Conversion options */
  options?: ConversionOptions;
  
  /** Conversion result */
  result?: ConversionResult;
  
  /** Error information */
  error?: {
    type: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
