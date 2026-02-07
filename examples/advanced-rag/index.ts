/**
 * Advanced RAG Example - Production-Ready Workflow
 *
 * Demonstrates:
 * - OpenAI embeddings for production semantic search
 * - Chroma persistent vector store
 * - Metadata filtering with multiple criteria
 * - Progress tracking with detailed callbacks
 * - Comprehensive error handling with retry logic
 * - Question answering with context
 *
 * Prerequisites:
 * - OpenAI API key in OPENAI_API_KEY environment variable
 * - Chroma server running: docker run -p 8000:8000 chromadb/chroma
 */

import {
  TextLoader,
  MarkdownLoader,
  OpenAIEmbeddingGenerator,
  ChromaVectorStore,
  IngestionPipeline,
  RetrievalPipeline,
  type IngestOptions,
  type QueryOptions,
} from '../src';
import OpenAI from 'openai';
import { glob } from 'glob';

// Configuration
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const COLLECTION_NAME = 'advanced-rag-demo';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds

interface IngestionStats {
  totalFiles: number;
  processed: number;
  failed: number;
  totalChunks: number;
  startTime: number;
  endTime?: number;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async operations
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      console.warn(`Error: ${error instanceof Error ? error.message : String(error)}`);

      await sleep(delay * Math.pow(2, attempt - 1)); // Exponential backoff
    }
  }

  throw new Error('Retry logic failed unexpectedly');
}

/**
 * Initialize RAG components with error handling
 */
async function initializeComponents() {
  console.log('\n🔧 Initializing RAG components...\n');

  // Validate API key
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  // Initialize embedder
  console.log('📊 Creating OpenAI embedding generator...');
  const embedder = new OpenAIEmbeddingGenerator({
    apiKey: OPENAI_API_KEY,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  // Initialize vector store with retry
  console.log('🗄️  Connecting to Chroma vector store...');
  const store = await withRetry(async () => {
    const vectorStore = new ChromaVectorStore({
      url: CHROMA_URL,
      collectionName: COLLECTION_NAME,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
    });

    // Test connection
    await vectorStore.count();
    return vectorStore;
  });

  console.log('✅ Components initialized successfully\n');

  return { embedder, store };
}

/**
 * Ingest documents with progress tracking
 */
async function ingestDocuments(
  embedder: OpenAIEmbeddingGenerator,
  store: ChromaVectorStore,
  pattern: string
): Promise<IngestionStats> {
  console.log('\n📥 Starting document ingestion...\n');

  const stats: IngestionStats = {
    totalFiles: 0,
    processed: 0,
    failed: 0,
    totalChunks: 0,
    startTime: Date.now(),
  };

  // Find all documents matching pattern
  const textFiles = await glob(pattern);
  const markdownFiles = await glob(pattern.replace('*.txt', '*.md'));
  const allFiles = [...textFiles, ...markdownFiles];

  stats.totalFiles = allFiles.length;

  if (allFiles.length === 0) {
    console.warn('⚠️  No files found matching pattern:', pattern);
    return stats;
  }

  console.log(`Found ${allFiles.length} files to process\n`);

  // Group files by extension
  const filesByExt = new Map<string, string[]>();
  allFiles.forEach(file => {
    const ext = file.split('.').pop() || '';
    const group = filesByExt.get(ext) || [];
    group.push(file);
    filesByExt.set(ext, group);
  });

  // Process each file type
  for (const [ext, files] of filesByExt) {
    const loader = ext === 'md' ? new MarkdownLoader() : new TextLoader();
    const pipeline = new IngestionPipeline(loader, embedder, store);

    const options: IngestOptions = {
      batchSize: 20,
      chunkSize: 1000,
      chunkOverlap: 200,
      continueOnError: true,

      metadata: (filePath) => ({
        source: filePath,
        type: ext,
        category: filePath.includes('/api/') ? 'api-docs' : 'user-guide',
        ingestedAt: new Date().toISOString(),
      }),

      onProgress: (current, total, details) => {
        const percent = ((current / total) * 100).toFixed(1);
        const elapsed = Date.now() - stats.startTime;
        const rate = current / (elapsed / 1000);

        console.log(`[${ext.toUpperCase()}] ${current}/${total} (${percent}%)`);
        console.log(`  Current: ${details.currentFile}`);
        console.log(`  Chunks: ${details.chunksProcessed}`);
        console.log(`  Rate: ${rate.toFixed(2)} files/sec`);
        console.log();
      },

      onError: (error, file) => {
        console.error(`❌ Failed to process ${file}:`);
        console.error(`   ${error.message}`);
        stats.failed++;
      },
    };

    // Ingest with retry
    const result = await withRetry(() => pipeline.ingest(files, options));

    stats.processed += result.documentsProcessed;
    stats.totalChunks += result.chunksGenerated;
  }

  stats.endTime = Date.now();

  // Print summary
  const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);

  console.log('\n📊 Ingestion Summary:');
  console.log('─'.repeat(50));
  console.log(`Total files: ${stats.totalFiles}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Total chunks: ${stats.totalChunks}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Average: ${(stats.totalFiles / parseFloat(duration)).toFixed(2)} files/sec\n`);

  return stats;
}

/**
 * Perform semantic search with metadata filtering
 */
async function semanticSearch(
  pipeline: RetrievalPipeline,
  query: string,
  category?: string
): Promise<void> {
  console.log(`\n🔍 Searching: "${query}"`);

  if (category) {
    console.log(`   Category filter: ${category}`);
  }

  console.log();

  const options: QueryOptions = {
    limit: 5,
    threshold: 0.7,
    includeMetadata: true,
  };

  // Add category filter if specified
  if (category) {
    options.filter = {
      field: 'category',
      operator: 'eq',
      value: category,
    };
  }

  // Execute search with retry
  const result = await withRetry(() => pipeline.query(query, options));

  console.log(`Found ${result.results.length} results (query time: ${result.metadata?.queryTimeMs}ms)\n`);

  // Display results
  result.results.forEach((r, idx) => {
    console.log(`Result ${idx + 1} (Score: ${r.score.toFixed(3)})`);
    console.log(`─`.repeat(50));
    console.log(`Source: ${r.document.metadata.source}`);
    console.log(`Type: ${r.document.metadata.type}`);
    console.log(`Category: ${r.document.metadata.category}`);
    console.log(`\nContent:`);
    console.log(r.document.content.substring(0, 200) + '...');
    console.log();
  });
}

/**
 * Answer question using retrieved context
 */
async function answerQuestion(
  pipeline: RetrievalPipeline,
  openai: OpenAI,
  question: string
): Promise<string> {
  console.log(`\n❓ Question: "${question}"\n`);

  // Retrieve relevant context
  const result = await withRetry(() =>
    pipeline.query(question, {
      limit: 5,
      threshold: 0.7,
    })
  );

  if (result.results.length === 0) {
    return "I don't have enough information to answer that question.";
  }

  console.log(`Retrieved ${result.results.length} relevant documents\n`);

  // Generate answer with OpenAI
  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'Answer the question based only on the provided context. ' +
            'If the context doesn\'t contain enough information, say ' +
            '"I don\'t have enough information to answer that."',
        },
        {
          role: 'user',
          content: `Context:\n${result.context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.3,
    })
  );

  const answer = response.choices[0].message.content || '';

  console.log('💡 Answer:');
  console.log('─'.repeat(50));
  console.log(answer);
  console.log();

  console.log('📚 Sources:');
  result.results.forEach(r => {
    console.log(`  - ${r.document.metadata.source} (score: ${r.score.toFixed(3)})`);
  });
  console.log();

  return answer;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('\n🚀 Advanced RAG Example - Production Workflow\n');
    console.log('='.repeat(50));

    // Initialize components
    const { embedder, store } = await initializeComponents();

    // Check if we should ingest (optional - set INGEST=true to run)
    if (process.env.INGEST === 'true') {
      await ingestDocuments(embedder, store, './docs/**/*.txt');
    } else {
      const count = await store.count();
      console.log(`📊 Current document count: ${count}\n`);

      if (count === 0) {
        console.log('💡 Tip: Set INGEST=true to ingest documents first\n');
        console.log('   Example: INGEST=true npm run example:advanced-rag\n');
        return;
      }
    }

    // Create retrieval pipeline
    const pipeline = new RetrievalPipeline(store, embedder);

    // Example 1: Basic semantic search
    await semanticSearch(pipeline, 'How does machine learning work?');

    // Example 2: Filtered semantic search
    await semanticSearch(pipeline, 'API documentation', 'api-docs');

    // Example 3: Question answering
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    await answerQuestion(
      pipeline,
      openai,
      'What are the main benefits of using TypeScript?'
    );

    await answerQuestion(
      pipeline,
      openai,
      'How do I configure the system?'
    );

    console.log('✅ Advanced RAG example completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main };
