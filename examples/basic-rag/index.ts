/**
 * Basic RAG Example
 * Demonstrates document ingestion and semantic search
 */

import {
  TextLoader,
  SimpleEmbeddingGenerator,
  InMemoryVectorStore,
  IngestionPipeline,
  RetrievalPipeline,
} from '@dcyfr/ai-rag';

async function main() {
  console.log('🚀 Basic RAG Example\n');

  // 1. Initialize components
  console.log('📦 Initializing RAG components...');
  const loader = new TextLoader();
  const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
  const store = new InMemoryVectorStore({
    collectionName: 'knowledge-base',
    embeddingDimensions: 384,
    distanceMetric: 'cosine',
  });

  // 2. Create pipelines
  const ingestion = new IngestionPipeline(loader, embedder, store);
  const retrieval = new RetrievalPipeline(store, embedder);

  // 3. Ingest documents
  console.log('\n📄 Ingesting documents...');
  const result = await ingestion.ingest([
    './docs/ai-basics.txt',
    './docs/ml-guide.txt',
  ], {
    batchSize: 32,
    onProgress: (current, total, details) => {
      console.log(`  Progress: ${current}/${total} files`);
      if (details) {
        console.log(`    - ${details.currentFile}`);
        console.log(`    - Chunks: ${details.chunksGenerated}`);
      }
    },
  });

  console.log('\n✅ Ingestion complete!');
  console.log(`  - Documents processed: ${result.documentsProcessed}`);
  console.log(`  - Chunks generated: ${result.chunksGenerated}`);
  console.log(`  - Duration: ${result.durationMs}ms`);
  console.log(`  - Errors: ${result.errors.length}`);

  // 4. Query the knowledge base
  console.log('\n🔍 Querying knowledge base...');
  const query = 'What is machine learning?';
  console.log(`  Query: "${query}"`);

  const queryResult = await retrieval.query(query, {
    limit: 3,
    threshold: 0.5,
  });

  console.log(` Results: ${queryResult.results.length} documents found`);
  console.log(`  - Average score: ${queryResult.metadata.averageScore.toFixed(3)}`);
  console.log(`  - Duration: ${queryResult.metadata.durationMs}ms`);

  console.log('\n📚 Top results:');
  queryResult.results.forEach((result, i) => {
    console.log(`\n  ${i + 1}. Score: ${result.score.toFixed(3)}`);
    console.log(`     ${result.document.content.slice(0, 150)}...`);
  });

  console.log('\n✨ Example complete!');
}

main().catch(console.error);
