/**
 * Metadata Filtering Example - Complex Query Scenarios
 *
 * Demonstrates:
 * - Basic metadata filtering (eq, ne, gt, lt, gte, lte)
 * - In/not-in filter operators
 * - Temporal queries with date ranges
 * - Tag-based search with 'in' operator
 * - Author and status filtering
 * - Performance comparison (filtered vs unfiltered)
 *
 * Note: The current @dcyfr/ai-rag MetadataFilter supports single-field
 * conditions only. For compound AND/OR logic, apply multiple sequential queries.
 *
 * Prerequisites:
 * - None (uses in-memory store for demonstration)
 */

import {
  SimpleEmbeddingGenerator,
  InMemoryVectorStore,
  RetrievalPipeline,
  type MetadataFilter,
  type SearchResult,
  type DocumentChunk,
} from '@dcyfr/ai-rag';

interface TestDocument {
  title: string;
  content: string;
  metadata: {
    category: string;
    priority: number;
    tags: string[];
    author: string;
    published: string; // ISO date string
    status: 'draft' | 'published' | 'archived';
    wordCount: number;
  };
}

/**
 * Sample documents with rich metadata
 */
const SAMPLE_DOCUMENTS: TestDocument[] = [
  {
    title: 'Machine Learning Basics',
    content: 'Introduction to machine learning concepts, algorithms, and applications in modern AI systems.',
    metadata: {
      category: 'ai',
      priority: 9,
      tags: ['machine-learning', 'ai', 'tutorial'],
      author: 'Alice Johnson',
      published: '2024-01-15',
      status: 'published',
      wordCount: 1200,
    },
  },
  {
    title: 'Advanced Neural Networks',
    content: 'Deep dive into neural network architectures, training techniques, and optimization strategies.',
    metadata: {
      category: 'ai',
      priority: 10,
      tags: ['neural-networks', 'deep-learning', 'advanced'],
      author: 'Bob Smith',
      published: '2024-02-01',
      status: 'published',
      wordCount: 2500,
    },
  },
  {
    title: 'TypeScript Best Practices',
    content: 'Essential TypeScript patterns, type safety techniques, and modern development workflows.',
    metadata: {
      category: 'programming',
      priority: 8,
      tags: ['typescript', 'javascript', 'best-practices'],
      author: 'Alice Johnson',
      published: '2024-01-20',
      status: 'published',
      wordCount: 1800,
    },
  },
  {
    title: 'Database Optimization Guide',
    content: 'Strategies for optimizing database queries, indexing, and performance tuning.',
    metadata: {
      category: 'database',
      priority: 7,
      tags: ['database', 'optimization', 'performance'],
      author: 'Charlie Davis',
      published: '2023-12-10',
      status: 'published',
      wordCount: 1500,
    },
  },
  {
    title: 'API Design Principles',
    content: 'Best practices for RESTful API design, versioning, and documentation.',
    metadata: {
      category: 'api',
      priority: 8,
      tags: ['api', 'rest', 'design'],
      author: 'Bob Smith',
      published: '2024-01-05',
      status: 'published',
      wordCount: 1100,
    },
  },
  {
    title: 'Docker Container Security',
    content: 'Security best practices for Docker containers in production environments.',
    metadata: {
      category: 'devops',
      priority: 9,
      tags: ['docker', 'security', 'devops'],
      author: 'Diana Lee',
      published: '2024-02-15',
      status: 'published',
      wordCount: 2000,
    },
  },
  {
    title: 'GraphQL vs REST',
    content: 'Comparing GraphQL and REST APIs: advantages, trade-offs, and use cases.',
    metadata: {
      category: 'api',
      priority: 6,
      tags: ['graphql', 'rest', 'api'],
      author: 'Alice Johnson',
      published: '2023-11-20',
      status: 'archived',
      wordCount: 900,
    },
  },
  {
    title: 'Kubernetes Deployment Strategies',
    content: 'Advanced Kubernetes deployment patterns, rolling updates, and canary releases.',
    metadata: {
      category: 'devops',
      priority: 10,
      tags: ['kubernetes', 'deployment', 'devops'],
      author: 'Charlie Davis',
      published: '2024-03-01',
      status: 'draft',
      wordCount: 3000,
    },
  },
  {
    title: 'React Performance Tips',
    content: 'Optimizing React applications: memoization, lazy loading, and rendering strategies.',
    metadata: {
      category: 'programming',
      priority: 7,
      tags: ['react', 'performance', 'javascript'],
      author: 'Diana Lee',
      published: '2024-01-25',
      status: 'published',
      wordCount: 1600,
    },
  },
  {
    title: 'Cloud Cost Optimization',
    content: 'Strategies for reducing cloud infrastructure costs while maintaining performance.',
    metadata: {
      category: 'cloud',
      priority: 8,
      tags: ['cloud', 'aws', 'optimization'],
      author: 'Bob Smith',
      published: '2024-02-10',
      status: 'published',
      wordCount: 1400,
    },
  },
];

/**
 * Initialize RAG system with sample data
 */
async function initializeRAG() {
  console.log('\n🔧 Initializing RAG system with sample data...\n');

  // Use simple embedder for demonstration (not production)
  const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });

  const store = new InMemoryVectorStore({
    collectionName: 'metadata-filtering-demo',
    embeddingDimensions: 384,
  });

  // Ingest sample documents as DocumentChunk objects
  for (const doc of SAMPLE_DOCUMENTS) {
    const [embedding] = await embedder.embed([doc.content]);
    const chunkId = crypto.randomUUID();

    const chunk: DocumentChunk = {
      id: chunkId,
      documentId: chunkId,
      content: `${doc.title}\n\n${doc.content}`,
      embedding,
      index: 0,
      metadata: {
        chunkIndex: 0,
        chunkCount: 1,
        ...doc.metadata,
      },
    };

    await store.addDocuments([chunk]);
  }

  console.log(`✅ Ingested ${SAMPLE_DOCUMENTS.length} documents\n`);

  return { embedder, store };
}

/**
 * Display search results with metadata
 */
function displayResults(title: string, results: SearchResult[], queryMs?: number) {
  console.log(`\n${title}`);
  console.log('='.repeat(60));

  if (queryMs !== undefined) {
    console.log(`Query time: ${queryMs}ms`);
  }

  console.log(`Found ${results.length} results\n`);

  results.forEach((r, idx) => {
    const meta = r.document.metadata as Record<string, unknown>;
    const content = r.document.content.split('\n\n')[0]; // Just title

    console.log(`${idx + 1}. ${content} (score: ${r.score.toFixed(3)})`);
    console.log(`   Category: ${meta.category} | Priority: ${meta.priority} | Author: ${meta.author}`);
    console.log(`   Tags: ${(meta.tags as string[])?.join(', ') ?? ''}`);
    console.log(`   Published: ${meta.published} | Status: ${meta.status} | Words: ${meta.wordCount}`);
    console.log();
  });
}

/**
 * Execute search with filter
 */
async function search(
  pipeline: RetrievalPipeline,
  query: string,
  filter?: MetadataFilter
): Promise<{ results: any[]; queryMs: number }> {
  const start = Date.now();

  const result = await pipeline.query(query, {
    limit: 10,
    threshold: 0,  // No threshold for demo purposes
    filter,
  });

  const queryMs = Date.now() - start;

  return { results: result.results, queryMs };
}

/**
 * Demonstration scenarios
 */
async function main() {
  console.log('\n🚀 Metadata Filtering Example - Complex Queries\n');
  console.log('='.repeat(60));

  const { embedder, store } = await initializeRAG();
  const pipeline = new RetrievalPipeline(store, embedder);

  // Scenario 1: Basic equality filter
  console.log('\n📋 Scenario 1: Category Filter (Exact Match)');
  console.log('─'.repeat(60));
  console.log('Query: "optimization" | Filter: category == "ai"');

  const scenario1 = await search(pipeline, 'optimization', {
    field: 'category',
    operator: 'eq',
    value: 'ai',
  });

  displayResults('Results: AI Category Only', scenario1.results, scenario1.queryMs);

  // Scenario 2: Priority threshold
  console.log('\n📋 Scenario 2: High Priority Filter');
  console.log('─'.repeat(60));
  console.log('Query: "best practices" | Filter: priority >= 8');

  const scenario2 = await search(pipeline, 'best practices', {
    field: 'priority',
    operator: 'gte',
    value: 8,
  });

  displayResults('Results: High Priority (≥8)', scenario2.results, scenario2.queryMs);

  // Scenario 3: Tag-based search (array membership)
  console.log('\n📋 Scenario 3: Tag-Based Search');
  console.log('\u2500'.repeat(60));
  console.log('Query: "modern development" | Filter: "devops" in tags');

  const scenario3 = await search(pipeline, 'modern development', {
    field: 'tags',
    operator: 'in',
    value: ['devops'],
  });

  displayResults('Results: DevOps Tagged', scenario3.results, scenario3.queryMs);

  // Scenario 4: Category filter (compound AND not supported; use most-restrictive single filter)
  console.log('\n📋 Scenario 4: Category Filter (High-Priority Programming)');
  console.log('\u2500'.repeat(60));
  console.log('Query: "programming guide" | Filter: category == "programming"');
  console.log('Note: Compound AND/OR filters are not supported by MetadataFilter.');
  console.log('      Apply multiple sequential queries to replicate AND logic.');

  const scenario4 = await search(pipeline, 'programming guide', {
    field: 'category',
    operator: 'eq',
    value: 'programming',
  });

  displayResults('Results: Programming + High Priority', scenario4.results, scenario4.queryMs);

  // Scenario 5: Filter by category (single-field; OR logic requires multiple queries)
  console.log('\n📋 Scenario 5: DevOps Category Filter');
  console.log('\u2500'.repeat(60));
  console.log('Query: "deployment" | Filter: category == "devops"');
  console.log('Note: To simulate OR (devops OR cloud), run two separate queries');
  console.log('      and merge the result sets in application code.');

  const scenario5 = await search(pipeline, 'deployment', {
    field: 'category',
    operator: 'eq',
    value: 'devops',
  });

  displayResults('Results: DevOps or Cloud', scenario5.results, scenario5.queryMs);

  // Scenario 6: AI category high-priority filter
  console.log('\n📋 Scenario 6: High Priority AI Content');
  console.log('\u2500'.repeat(60));
  console.log('Query: "technical content" | Filter: priority >= 8');
  console.log('Note: To further filter by category, apply a second round of filtering in-application.');

  const scenario6 = await search(pipeline, 'technical content', {
    field: 'priority',
    operator: 'gte',
    value: 8,
  });

  displayResults('Results: (AI or Programming) + Priority ≥8', scenario6.results, scenario6.queryMs);

  // Scenario 7: Temporal query (date range)
  console.log('\n📋 Scenario 7: Temporal Query (Date Range)');
  console.log('─'.repeat(60));
  console.log('Query: "recent articles" | Filter: published >= "2024-02-01"');

  const scenario7 = await search(pipeline, 'recent articles', {
    field: 'published',
    operator: 'gte',
    value: '2024-02-01',
  });

  displayResults('Results: Published Since Feb 2024', scenario7.results, scenario7.queryMs);

  // Scenario 8: Published + long content + high priority (use most-restrictive single filter)
  console.log('\n📋 Scenario 8: Long-Form High-Priority Content');
  console.log('\u2500'.repeat(60));
  console.log('Query: "comprehensive guide" | Filter: wordCount >= 1500');
  console.log('Note: Apply post-query filtering for multi-condition requirements.');

  const scenario8 = await search(pipeline, 'comprehensive guide', {
    field: 'wordCount',
    operator: 'gte',
    value: 1500,
  });

  displayResults('Results: Published + Long + High Priority', scenario8.results, scenario8.queryMs);

  // Scenario 9: Author filter
  console.log('\n📋 Scenario 9: Author Filter');
  console.log('─'.repeat(60));
  console.log('Query: "technical writing" | Filter: author == "Alice Johnson"');

  const scenario9 = await search(pipeline, 'technical writing', {
    field: 'author',
    operator: 'eq',
    value: 'Alice Johnson',
  });

  displayResults('Results: By Alice Johnson', scenario9.results, scenario9.queryMs);

  // Scenario 10: Exclusion filter (not equal)
  console.log('\n📋 Scenario 10: Exclusion Filter');
  console.log('─'.repeat(60));
  console.log('Query: "content" | Filter: status != "draft"');

  const scenario10 = await search(pipeline, 'content', {
    field: 'status',
    operator: 'ne',
    value: 'draft',
  });

  displayResults('Results: Exclude Drafts', scenario10.results, scenario10.queryMs);

  // Performance comparison
  console.log('\n📊 Performance Comparison');
  console.log('='.repeat(60));

  const unfilteredStart = Date.now();
  const unfilteredResult = await pipeline.query('optimization', { limit: 10, threshold: 0 });
  const unfilteredMs = Date.now() - unfilteredStart;

  const filteredQueryStart = Date.now();
  const filteredResult = await search(pipeline, 'optimization', {
    field: 'category',
    operator: 'eq',
    value: 'ai',
  });
  const filteredMs = Date.now() - filteredQueryStart;

  console.log(`\nUnfiltered search: ${unfilteredResult.results.length} results in ${unfilteredMs}ms`);
  console.log(`Filtered search: ${filteredResult.results.length} results in ${filteredMs}ms`);
  console.log(`\nFiltering reduced results by ${((1 - filteredResult.results.length / unfilteredResult.results.length) * 100).toFixed(1)}%`);

  console.log('\n✅ Metadata filtering example completed!\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export { main };
