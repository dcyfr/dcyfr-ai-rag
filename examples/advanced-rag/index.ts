/**
 * Advanced RAG Example - Production-Ready Workflow
 *
 * Demonstrates:
 * - SimpleEmbeddingGenerator for semantic search
 * - InMemoryVectorStore for document storage
 * - Metadata filtering with multiple criteria
 * - Progress tracking with detailed callbacks
 * - Comprehensive error handling with retry logic
 * - Contextual question answering from retrieved chunks
 *
 * Note: This example uses in-memory components. For production,
 * swap SimpleEmbeddingGenerator for an API-backed generator and
 * InMemoryVectorStore for a persistent store.
 */

import {
  SimpleEmbeddingGenerator,
  InMemoryVectorStore,
  RetrievalPipeline,
  type QueryOptions,
  type DocumentChunk,
} from '@dcyfr/ai-rag';

// Configuration
const COLLECTION_NAME = 'advanced-rag-demo';
const EMBEDDING_DIMENSIONS = 384;
const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds (reduced for in-memory demo)

interface IngestionStats {
  totalDocs: number;
  processed: number;
  failed: number;
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
 * Initialize RAG components
 */
function initializeComponents() {
  console.log('\n🔧 Initializing RAG components...\n');

  console.log('📊 Creating embedding generator (SimpleEmbeddingGenerator)...');
  const embedder = new SimpleEmbeddingGenerator({ dimensions: EMBEDDING_DIMENSIONS });

  console.log('🗄️  Creating in-memory vector store...');
  const store = new InMemoryVectorStore({
    collectionName: COLLECTION_NAME,
    embeddingDimensions: EMBEDDING_DIMENSIONS,
  });

  console.log('✅ Components initialized successfully\n');

  return { embedder, store };
}

/**
 * Demo documents covering multiple categories
 */
const DEMO_DOCUMENTS = [
  {
    id: 'doc-001',
    content: 'TypeScript provides static type checking that catches errors at compile time. ' +
      'Key benefits include better IDE support, early error detection, and improved code maintainability. ' +
      'TypeScript compiles to standard JavaScript and works with any existing JavaScript library.',
    category: 'programming',
    type: 'guide' as const,
    priority: 9,
  },
  {
    id: 'doc-002',
    content: 'Machine learning models learn patterns from training data to make predictions on new data. ' +
      'The training process involves optimizing model parameters to minimize a loss function. ' +
      'Common algorithms include linear regression, decision trees, neural networks, and support vector machines.',
    category: 'ai',
    type: 'guide' as const,
    priority: 8,
  },
  {
    id: 'doc-003',
    content: 'Docker containers package applications with their dependencies for consistent deployment. ' +
      'Containers are lightweight, start quickly, and use fewer resources than virtual machines. ' +
      'Docker Compose orchestrates multi-container applications with a single configuration file.',
    category: 'devops',
    type: 'guide' as const,
    priority: 7,
  },
  {
    id: 'doc-004',
    content: 'RESTful APIs use HTTP methods (GET, POST, PUT, DELETE) to perform CRUD operations. ' +
      'Resources are identified by URLs and data is exchanged in JSON format. ' +
      'Best practices include versioning, proper status codes, and clear documentation.',
    category: 'api-docs',
    type: 'reference' as const,
    priority: 8,
  },
  {
    id: 'doc-005',
    content: 'Vector databases store embeddings for semantic similarity search. ' +
      'Unlike traditional databases, they excel at finding conceptually similar items rather than exact matches. ' +
      'Applications include RAG systems, recommendation engines, and semantic search.',
    category: 'ai',
    type: 'guide' as const,
    priority: 9,
  },
  {
    id: 'doc-006',
    content: 'Kubernetes orchestrates containerized applications across clusters of machines. ' +
      'It handles scaling, self-healing, load balancing, and rolling deployments automatically. ' +
      'Key concepts include pods, services, deployments, and namespaces.',
    category: 'devops',
    type: 'guide' as const,
    priority: 8,
  },
  {
    id: 'doc-007',
    content: 'React hooks allow functional components to use state and lifecycle features. ' +
      'useState manages local state, useEffect handles side effects, and useMemo optimizes expensive calculations. ' +
      'Custom hooks encapsulate reusable stateful logic.',
    category: 'programming',
    type: 'reference' as const,
    priority: 7,
  },
  {
    id: 'doc-008',
    content: 'Large language models (LLMs) are trained on vast text corpora to generate human-like text. ' +
      'Transformer architecture enables attention mechanisms that capture long-range dependencies. ' +
      'Fine-tuning adapts pre-trained models to specific tasks with smaller labeled datasets.',
    category: 'ai',
    type: 'guide' as const,
    priority: 10,
  },
];

/**
 * Ingest demo documents with progress tracking
 */
async function ingestDocuments(
  embedder: SimpleEmbeddingGenerator,
  store: InMemoryVectorStore
): Promise<IngestionStats> {
  console.log('\n📥 Starting document ingestion...\n');

  const stats: IngestionStats = {
    totalDocs: DEMO_DOCUMENTS.length,
    processed: 0,
    failed: 0,
    startTime: Date.now(),
  };

  console.log(`Found ${stats.totalDocs} documents to process\n`);

  let current = 0;

  for (const doc of DEMO_DOCUMENTS) {
    try {
      const [embedding] = await embedder.embed([doc.content]);

      const chunk: DocumentChunk = {
        id: doc.id,
        documentId: doc.id,
        content: doc.content,
        embedding,
        index: 0,
        metadata: {
          chunkIndex: 0,
          chunkCount: 1,
          source: `demo-${doc.id}`,
          category: doc.category,
          type: doc.type,
          priority: doc.priority,
        },
      };

      await withRetry(() => store.addDocuments([chunk]));

      stats.processed++;
      current++;

      // Simulate progress tracking
      const percent = ((current / stats.totalDocs) * 100).toFixed(1);
      console.log(`[Progress] ${current}/${stats.totalDocs} (${percent}%) — ${doc.category}/${doc.id}`);
    } catch (error) {
      console.error(`❌ Failed to ingest ${doc.id}: ${error instanceof Error ? error.message : String(error)}`);
      stats.failed++;
    }
  }

  stats.endTime = Date.now();

  const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);

  console.log('\n📊 Ingestion Summary:');
  console.log('─'.repeat(50));
  console.log(`Total documents: ${stats.totalDocs}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Duration: ${duration}s\n`);

  return stats;
}

/**
 * Perform semantic search with optional metadata filtering
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

  const options: QueryOptions = {
    limit: 3,
    threshold: 0.5,
    includeMetadata: true,
  };

  if (category) {
    options.filter = {
      field: 'category',
      operator: 'eq',
      value: category,
    };
  }

  const result = await withRetry(() => pipeline.query(query, options));

  console.log(`Found ${result.results.length} results (${result.metadata.durationMs}ms)\n`);

  result.results.forEach((r, idx) => {
    const meta = r.document.metadata as Record<string, unknown>;
    console.log(`Result ${idx + 1} (Score: ${r.score.toFixed(3)})`);
    console.log('─'.repeat(50));
    console.log(`Category: ${meta.category} | Priority: ${meta.priority}`);
    console.log(`Content: ${r.document.content.substring(0, 150)}...`);
    console.log();
  });
}

/**
 * Multi-query comprehension: retrieve context from multiple angles
 */
async function multiQuerySearch(
  pipeline: RetrievalPipeline,
  questions: string[]
): Promise<void> {
  console.log('\n🧠 Multi-Query Context Retrieval');
  console.log('='.repeat(50));
  console.log(`Running ${questions.length} queries to assemble comprehensive context...\n`);

  const allResults = new Map<string, { content: string; score: number; category: string }>();

  for (const question of questions) {
    const result = await pipeline.query(question, { limit: 2, threshold: 0.4 });

    result.results.forEach(r => {
      const meta = r.document.metadata as Record<string, unknown>;
      const existing = allResults.get(r.document.id);

      if (!existing || r.score > existing.score) {
        allResults.set(r.document.id, {
          content: r.document.content,
          score: r.score,
          category: String(meta.category ?? 'unknown'),
        });
      }
    });
  }

  const sorted = Array.from(allResults.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5);

  console.log(`Assembled ${sorted.length} unique documents from multi-query search:\n`);

  sorted.forEach(([id, { content, score, category }], idx) => {
    console.log(`${idx + 1}. [${category}] ${id} (best score: ${score.toFixed(3)})`);
    console.log(`   ${content.substring(0, 100)}...`);
    console.log();
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('\n🚀 Advanced RAG Example - Production Workflow\n');
    console.log('='.repeat(50));

    // Initialize components
    const { embedder, store } = initializeComponents();

    // Ingest demo documents
    await ingestDocuments(embedder, store);

    // Create retrieval pipeline
    const pipeline = new RetrievalPipeline(store, embedder);

    // Example 1: Basic semantic search
    await semanticSearch(pipeline, 'How does machine learning work?');

    // Example 2: Filtered semantic search (API docs only)
    await semanticSearch(pipeline, 'REST API design principles', 'api-docs');

    // Example 3: High-priority AI content
    await semanticSearch(pipeline, 'neural networks and transformers', 'ai');

    // Example 4: Multi-query context retrieval
    await multiQuerySearch(pipeline, [
      'containerization and deployment',
      'orchestration and scaling',
      'infrastructure automation',
    ]);

    // Priority-based filtering
    console.log('\n🎯 Priority Filter: High-Priority Content (priority >= 9)');
    console.log('='.repeat(50));

    const highPriorityResult = await pipeline.query('technology overview', {
      limit: 5,
      threshold: 0,
      filter: { field: 'priority', operator: 'gte', value: 9 },
    });

    console.log(`Found ${highPriorityResult.results.length} high-priority results:\n`);

    highPriorityResult.results.forEach((r, idx) => {
      const meta = r.document.metadata as Record<string, unknown>;
      console.log(`${idx + 1}. [priority: ${meta.priority}] [${meta.category}] score: ${r.score.toFixed(3)}`);
      console.log(`   ${r.document.content.substring(0, 80)}...`);
    });

    console.log('\n✅ Advanced RAG example completed successfully!\n');
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
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
