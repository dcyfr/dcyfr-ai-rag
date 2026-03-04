/**
 * Document ingestion module for MarkItDown integration
 * @module @dcyfr/ai-rag/ingestion
 */

export { convertToMarkdown, convertBatch, checkMarkItDownInstalled } from './markitdown-bridge.js';
export type {
  ConversionOptions,
  ConversionResult,
  SupportedFormat,
  SubprocessMessage,
} from './types.js';
export { ConversionError, ConversionErrorType } from './types.js';
