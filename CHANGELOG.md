# @dcyfr/ai-rag

## 1.1.0

### Minor Changes

- # MarkItDown Document Conversion Integration

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

## 1.0.0

### Major Changes

- [`c82c59c`](https://github.com/dcyfr/dcyfr-ai-rag/commit/c82c59c24b1b5727787b820fc77e739516e09f54) Thanks [@dcyfr](https://github.com/dcyfr)! - # v1.0.0 - Production-Ready RAG Framework

  **Major version release** - Promoted from beta to production-ready status.

  ## 🎯 v1.0.0 Readiness Achievements

  ### Test Coverage

  - **97.67% line coverage** (target: ≥90%) ✅ +7.67% over target
  - **86.15% branch coverage** (target: ≥85%) ✅ +1.15% over target
  - **92 total tests** (+54 tests this release)
  - **All 92 tests passing** (100% pass rate)

  **Coverage Highlights:**

  - HTMLLoader: 100% lines, 90% branch (21 tests)
  - InMemoryVectorStore: 100% lines, 100% branch (27 tests)
  - MarkdownLoader: 93.33% lines, 70% branch (20 tests)

  ### Documentation

  - **API Documentation**: 3,457 words (+73% over 2,000+ target)

    - All document loaders documented (Text, Markdown, HTML)
    - Complete embedding generator reference
    - Vector store configuration and examples
    - All 3 pipelines (Ingestion, Retrieval, Embedding)
    - 50+ TypeScript code examples
    - Semantic versioning commitment

  - **Security Policy**: 487 lines (+143% over 150-200 target)

    - RAG-specific security considerations (6 major areas)
    - Document injection attack prevention
    - Prompt injection via context mitigation
    - Vector store access control patterns
    - OWASP, NIST AI RMF, GDPR, CCPA compliance

  - **README**: 1,866 words
    - Complete feature overview
    - Quick start guide
    - Comprehensive documentation links

  ### Code Quality

  - ✅ Zero TypeScript errors
  - ✅ Zero HIGH/CRITICAL security vulnerabilities
  - ✅ Clean build with type declarations
  - ✅ ESLint passing (all recommended rules)
  - ✅ Package configuration validated

  ### Infrastructure

  - ✅ Changesets configured for automated releases
  - ✅ GitHub Actions workflow with Trusted Publishing
  - ✅ npm provenance enabled (OIDC authentication)

  ## 🚀 Core Features (v1.0.0)

  ### Document Loaders

  - **TextLoader**: Load .txt, .md, .json, .log files
  - **MarkdownLoader**: Section-aware chunking with heading extraction
  - **HTMLLoader**: Clean HTML with script removal and entity decoding

  ### Embedding Generators

  - **SimpleEmbeddingGenerator**: Zero-dependency development/testing
  - **Pluggable providers**: OpenAI, Cohere, Anthropic, Ollama support

  ### Vector Stores

  - **InMemoryVectorStore**: Fast in-memory search with 3 distance metrics
    - Cosine similarity (default)
    - Dot product
    - Euclidean distance
  - **Metadata filtering**: 8 operators (eq, ne, gt, gte, lt, lte, in, contains)
  - **Persistent storage ready**: Chroma, Pinecone, Weaviate adapters

  ### Pipelines

  - **IngestionPipeline**: Batch document processing with progress tracking
  - **RetrievalPipeline**: Semantic search with relevance thresholding
  - **EmbeddingPipeline**: Rate-limited embedding generation

  ## 📊 Stability Guarantees

  ### Semantic Versioning v2.0.0

  - **Patch releases** (1.0.x): Bug fixes, no breaking changes
  - **Minor releases** (1.x.0): New features, backward compatible
  - **Major releases** (x.0.0): Breaking changes only

  ### Deprecation Policy

  - **6-month minimum** deprecation period for all breaking changes
  - **Clear migration guides** with automated tooling where possible
  - **Advance notice** via CHANGELOG.md and GitHub Discussions

  ### API Stability

  The following APIs are **stable** and follow semantic versioning:

  - All document loaders (`TextLoader`, `MarkdownLoader`, `HTMLLoader`)
  - All embedding generators (`SimpleEmbeddingGenerator`, provider interfaces)
  - All vector stores (`InMemoryVectorStore`, storage interfaces)
  - All pipelines (`IngestionPipeline`, `RetrievalPipeline`, `EmbeddingPipeline`)
  - Core types and interfaces

  ## 🔐 Security

  See [SECURITY.md](https://github.com/dcyfr/ai-rag/blob/main/SECURITY.md) for:

  - Vulnerability reporting process
  - Security best practices for RAG systems
  - RAG-specific threat mitigation
  - Compliance standards (OWASP, NIST AI RMF, GDPR, CCPA)

  ## 🌍 Production Use

  This release is **production-ready** and suitable for:

  - **Enterprise RAG applications**
  - **Semantic search systems**
  - **Document question-answering**
  - **Knowledge base retrieval**
  - **AI-powered content discovery**

  ## 📚 Resources

  - **Documentation**: https://www.dcyfr.ai/docs/ai-rag
  - **API Reference**: [docs/API.md](docs/API.md)
  - **Guides**:
    - [Document Loaders](docs/DOCUMENT_LOADERS.md)
    - [Embeddings](docs/EMBEDDINGS.md)
    - [Vector Stores](docs/VECTOR_STORES.md)
    - [Production Deployment](docs/PRODUCTION.md)
  - **GitHub**: https://github.com/dcyfr/ai-rag
  - **npm**: https://www.npmjs.com/package/@dcyfr/ai-rag

  ## 🙏 Acknowledgments

  Special thanks to all beta testers and early adopters who provided feedback during the 0.2.x series. Your contributions made this v1.0.0 release possible.

  ***

  **Breaking Changes:** None (first stable release)

  **Migration from 0.2.x:** No code changes required. All 0.2.x APIs remain fully compatible.

  **Next Steps:** See [ROADMAP.md](docs/roadmap/README.md) for planned v1.1.0 features.

## 0.2.0

### Minor Changes

- [`a149bb6`](https://github.com/dcyfr/dcyfr-ai-rag/commit/a149bb61262353c4e2e13effb8294ca9cd5af033) Thanks [@dcyfr](https://github.com/dcyfr)! - Migrate to changesets for automated version management and publishing via GitHub Actions OIDC Trusted Publisher
