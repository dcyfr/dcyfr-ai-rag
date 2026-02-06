/**
 * Semantic Search Example
 * Demonstrates advanced search with metadata filtering
 */

import {
  MarkdownLoader,
  SimpleEmbeddingGenerator,
  InMemoryVectorStore,
  IngestionPipeline,
  RetrievalPipeline,
} from '@dcyfr/ai-rag';

async function main() {
  console.log('🔎 Semantic Search Example\n');

  // Initialize RAG system
  const loader = new MarkdownLoader();
  const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
  const store = new InMemoryVectorStore({
    collectionName: 'documentation',
    embeddingDimensions: 384,
    distanceMetric: 'cosine',
  });

  const ingestion = new IngestionPipeline(loader, embedder, store);
  const retrieval = new RetrievalPipeline(store, embedder);

  // Ingest markdown documentation
  console.log('📚 Ingesting markdown documentation...');
  await ingestion.ingest('./docs/**/*.md', {
    loaderConfig: {
      chunkSize: 800,
      chunkOverlap: 150,
      metadata: {
        category: 'documentation',
      },
    },
  });

  // Perform semantic searches
  console.log('\n🔍 Semantic search queries:\n');

  const queries = [
    'How do I configure the API?',
    'authentication and security',
    'performance optimization tips',
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    
    const result = await retrieval.search(query, {
      limit: 2,
      threshold: 0.6,
      filter: {
        field: 'category',
        operator: 'eq',
        value: 'documentation',
      },
    });

    console.log(`  Found ${result.results.length} results`);
    result.results.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.score.toFixed(3)}] ${r.document.metadata.title || 'Untitled'}`);
    });
    console.log('');
  }

  // Find similar documents
  console.log('\n📄 Finding similar documents...');
  const similarResult = await retrieval.findSimilar('doc-123', {
    limit: 5,
  });

  console.log(`Found ${similarResult.results.length} similar documents`);
}

main().catch(console.error);
