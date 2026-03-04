---
"@dcyfr/ai-rag": minor
---

# MarkItDown Document Conversion Integration

Add MarkItDown document conversion integration for RAG pipelines.

**New Features:**

- Document conversion support via MarkItDown Python library
- TypeScript bridge for subprocess management
- RAG pipeline integration with `enableDocumentConversion` flag
- Semantic and fixed chunking strategies
- Graceful error handling with per-file callbacks
- Performance metrics (conversion time, throughput, memory)

**New Exports:**

- `convertToMarkdown()` - Convert non-text files to markdown
- `convertBatch()` - Batch conversion with concurrency control
- `checkMarkItDownInstalled()` - Installation verification
- `IngestionOptions` type with conversion flags
- `IngestionMetrics` type with performance data

**Documentation:**

- MCP server integration guide (docs/mcp/REGISTRY.md)
- Document ingestion user guide (docs/guides/DOCUMENT_INGESTION.md)
- Performance benchmarks (docs/performance/MARKITDOWN_BENCHMARKS.md)

**Testing:**

- 126 total tests (11 test files)
- Unit tests for conversion bridge and RAG integration
- Integration tests with real file conversions
- E2E tests for full ingestion workflow

**Performance:**

- Average conversion: 6.35ms per document
- Throughput: 157.40 documents/second
- Peak memory: <50MB

This is a minor bump (new features, backward compatible). All existing functionality preserved.
