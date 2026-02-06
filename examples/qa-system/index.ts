/**
 * Q&A System Example
 * Demonstrates retrieval-augmented generation for question answering
 */

import {
  HTMLLoader,
  SimpleEmbeddingGenerator,
  InMemoryVectorStore,
  IngestionPipeline,
  RetrievalPipeline,
} from '@dcyfr/ai-rag';

async function main() {
  console.log('💬 Q&A System Example\n');

  // Initialize RAG components
  const loader = new HTMLLoader();
  const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
  const store = new InMemoryVectorStore({
    collectionName: 'qa-knowledge',
    embeddingDimensions: 384,
    distanceMetric: 'cosine',
  });

  const ingestion = new IngestionPipeline(loader, embedder, store);
  const retrieval = new RetrievalPipeline(store, embedder);

  // Ingest HTML knowledge base
  console.log('📖 Ingesting knowledge base from HTML...');
  await ingestion.ingest('./knowledge-base/**/*.html', {
    batchSize: 16,
    loaderConfig: {
      chunkSize: 600,
      chunkOverlap: 100,
    },
  });

  console.log('✅ Knowledge base ready!\n');

  // Question answering loop
  const questions = [
    'What are the business hours?',
    'How do I reset my password?',
    'What is your refund policy?',
  ];

  console.log('🤔 Answering questions:\n');

  for (const question of questions) {
    console.log(`Q: ${question}`);
    
    const result = await retrieval.query(question, {
      limit: 3,
      threshold: 0.7,
      includeMetadata: true,
    });

    if (result.results.length > 0) {
      console.log(`A: Based on ${result.results.length} relevant sources:\n`);
      console.log(result.context);
      console.log(`\n  Confidence: ${result.metadata.averageScore.toFixed(2)}/1.00`);
    } else {
      console.log('A: No relevant information found.\n');
    }
    
    console.log('\n' + '─'.repeat(60) + '\n');
  }

  console.log('✨ Q&A session complete!');
}

main().catch(console.error);
