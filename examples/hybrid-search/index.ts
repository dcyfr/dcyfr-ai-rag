/**
 * Hybrid Search Example - Combining Keyword + Semantic Search
 *
 * Demonstrates:
 * - Pure keyword search (BM25 algorithm)
 * - Pure semantic search (vector similarity)
 * - Hybrid search combining both approaches
 * - Score fusion strategies (weighted average, reciprocal rank fusion)
 * - Re-ranking with multiple criteria
 * - Performance and quality comparisons
 *
 * Hybrid search improves both precision and recall by leveraging:
 * - Keyword search: Exact term matching, good for specific queries
 * - Semantic search: Conceptual similarity, good for intent matching
 *
 * Prerequisites:
 * - None (uses SimpleEmbeddingGenerator for demo)
 */

import {
  TextLoader,
  SimpleEmbeddingGenerator,
  InMemoryVectorStore,
  RetrievalPipeline,
  type Document,
} from '../src';

/**
 * Simple BM25 implementation for keyword search
 */
class BM25 {
  private documents: Document[];
  private avgDocLength: number;
  private docLengths: number[];
  private termFreqs: Map<string, Map<string, number>>; // docId -> term -> freq
  private docFreqs: Map<string, number>; // term -> doc count
  private k1: number = 1.2;
  private b: number = 0.75;

  constructor(documents: Document[]) {
    this.documents = documents;
    this.docLengths = [];
    this.termFreqs = new Map();
    this.docFreqs = new Map();

    // Calculate statistics
    let totalLength = 0;

    documents.forEach(doc => {
      const tokens = this.tokenize(doc.content);
      const length = tokens.length;

      this.docLengths.push(length);
      totalLength += length;

      // Calculate term frequencies
      const termFreq = new Map<string, number>();

      tokens.forEach(term => {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);

        // Update document frequency
        if (!this.docFreqs.has(term)) {
          this.docFreqs.set(term, 0);
        }
      });

      // Count unique terms per document
      termFreq.forEach((_, term) => {
        this.docFreqs.set(term, (this.docFreqs.get(term) || 0) + 1);
      });

      this.termFreqs.set(doc.id, termFreq);
    });

    this.avgDocLength = totalLength / documents.length;
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2); // Remove short terms
  }

  /**
   * Search documents using BM25
   */
  search(query: string, limit: number = 10): Array<{ document: Document; score: number }> {
    const queryTerms = this.tokenize(query);
    const scores: Array<{ document: Document; score: number }> = [];

    this.documents.forEach((doc, idx) => {
      const docLength = this.docLengths[idx];
      const termFreq = this.termFreqs.get(doc.id)!;
      let score = 0;

      queryTerms.forEach(term => {
        const tf = termFreq.get(term) || 0;
        const df = this.docFreqs.get(term) || 0;

        if (tf > 0) {
          // IDF (Inverse Document Frequency)
          const idf = Math.log((this.documents.length - df + 0.5) / (df + 0.5) + 1);

          // BM25 formula
          const numerator = tf * (this.k1 + 1);
          const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));

          score += idf * (numerator / denominator);
        }
      });

      scores.push({ document: doc, score });
    });

    // Sort by score descending
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

/**
 * Hybrid search combining keyword and semantic
 */
class HybridSearch {
  private bm25: BM25;
  private pipeline: RetrievalPipeline;

  constructor(bm25: BM25, pipeline: RetrievalPipeline) {
    this.bm25 = bm25;
    this.pipeline = pipeline;
  }

  /**
   * Weighted average fusion
   */
  async searchWeighted(
    query: string,
    options: {
      limit?: number;
      keywordWeight?: number; // 0 to 1, default 0.5
      semanticWeight?: number; // 0 to 1, default 0.5
    } = {}
  ): Promise<Array<{ document: Document; score: number; breakdown: { keyword: number; semantic: number } }>> {
    const limit = options.limit || 10;
    const keywordWeight = options.keywordWeight ?? 0.5;
    const semanticWeight = options.semanticWeight ?? 0.5;

    // Get keyword results
    const keywordResults = this.bm25.search(query, limit * 2);

    // Normalize keyword scores (0 to 1)
    const maxKeywordScore = Math.max(...keywordResults.map(r => r.score), 1);
    const normalizedKeyword = new Map(
      keywordResults.map(r => [r.document.id, r.score / maxKeywordScore])
    );

    // Get semantic results
    const semanticResult = await this.pipeline.query(query, {
      limit: limit * 2,
      threshold: 0,
    });

    // Normalize semantic scores (already 0 to 1 for cosine)
    const normalizedSemantic = new Map(
      semanticResult.results.map(r => [r.document.id, r.score])
    );

    // Combine scores using weighted average
    const combinedScores = new Map<string, { 
      document: Document; 
      keyword: number; 
      semantic: number; 
      combined: number 
    }>();

    // Add keyword results
    keywordResults.forEach(r => {
      const keyword = normalizedKeyword.get(r.document.id) || 0;
      const semantic = normalizedSemantic.get(r.document.id) || 0;
      const combined = keyword * keywordWeight + semantic * semanticWeight;

      combinedScores.set(r.document.id, {
        document: r.document,
        keyword,
        semantic,
        combined,
      });
    });

    // Add semantic-only results
    semanticResult.results.forEach(r => {
      if (!combinedScores.has(r.document.id)) {
        const keyword = normalizedKeyword.get(r.document.id) || 0;
        const semantic = normalizedSemantic.get(r.document.id) || 0;
        const combined = keyword * keywordWeight + semantic * semanticWeight;

        combinedScores.set(r.document.id, {
          document: r.document,
          keyword,
          semantic,
          combined,
        });
      }
    });

    // Sort by combined score
    return Array.from(combinedScores.values())
      .sort((a, b) => b.combined - a.combined)
      .slice(0, limit)
      .map(r => ({
        document: r.document,
        score: r.combined,
        breakdown: { keyword: r.keyword, semantic: r.semantic },
      }));
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   */
  async searchRRF(
    query: string,
    options: {
      limit?: number;
      k?: number; // RRF constant, default 60
    } = {}
  ): Promise<Array<{ document: Document; score: number }>> {
    const limit = options.limit || 10;
    const k = options.k || 60;

    // Get keyword results
    const keywordResults = this.bm25.search(query, limit * 2);

    // Get semantic results
    const semanticResult = await this.pipeline.query(query, {
      limit: limit * 2,
      threshold: 0,
    });

    // Calculate RRF scores
    const rrfScores = new Map<string, { document: Document; score: number }>();

    // Add keyword contributions
    keywordResults.forEach((r, rank) => {
      const rrf = 1 / (k + rank + 1);
      rrfScores.set(r.document.id, { document: r.document, score: rrf });
    });

    // Add semantic contributions
    semanticResult.results.forEach((r, rank) => {
      const rrf = 1 / (k + rank + 1);
      const existing = rrfScores.get(r.document.id);

      if (existing) {
        existing.score += rrf;
      } else {
        rrfScores.set(r.document.id, { document: r.document, score: rrf });
      }
    });

    // Sort by RRF score
    return Array.from(rrfScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

/**
 * Sample documents for testing
 */
const SAMPLE_DOCS = [
  {
    title: 'Introduction to Machine Learning',
    content: 'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.',
  },
  {
    title: 'Neural Networks Explained',
    content: 'Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes that process information.',
  },
  {
    title: 'Deep Learning Fundamentals',
    content: 'Deep learning uses neural networks with multiple layers to progressively extract higher-level features from raw input.',
  },
  {
    title: 'Natural Language Processing',
    content: 'NLP focuses on the interaction between computers and human language, enabling machines to understand, interpret, and generate human language.',
  },
  {
    title: 'Computer Vision Applications',
    content: 'Computer vision enables machines to derive meaningful information from digital images and videos, automating tasks that human visual systems can perform.',
  },
  {
    title: 'Reinforcement Learning Guide',
    content: 'Reinforcement learning is about training agents to make sequences of decisions by rewarding desired behaviors and punishing undesired ones.',
  },
  {
    title: 'Data Science Best Practices',
    content: 'Data science combines statistics, mathematics, and programming to extract insights from data and inform decision-making processes.',
  },
  {
    title: 'Python for AI Development',
    content: 'Python is the most popular programming language for artificial intelligence due to its simplicity, extensive libraries, and strong community support.',
  },
  {
    title: 'TensorFlow Tutorial',
    content: 'TensorFlow is an open-source machine learning framework developed by Google Brain for building and training neural network models.',
  },
  {
    title: 'PyTorch Guide',
    content: 'PyTorch is a machine learning library based on Torch, providing flexible deep learning development with dynamic computational graphs.',
  },
];

/**
 * Display search results
 */
function displayResults(title: string, results: any[]) {
  console.log(`\n${title}`);
  console.log('='.repeat(70));

  results.forEach((r, idx) => {
    const docTitle = r.document.content.split('.')[0];

    console.log(`${idx + 1}. ${docTitle}`);
    console.log(`   Score: ${r.score.toFixed(4)}`);

    if (r.breakdown) {
      console.log(`   Breakdown: Keyword=${r.breakdown.keyword.toFixed(4)}, Semantic=${r.breakdown.semantic.toFixed(4)}`);
    }

    console.log();
  });
}

/**
 * Main demonstration
 */
async function main() {
  console.log('\n🚀 Hybrid Search Example - Keyword + Semantic Fusion\n');
  console.log('='.repeat(70));

  // Initialize components
  console.log('\n🔧 Initializing search systems...\n');

  const embedder = new SimpleEmbeddingGenerator({ dimensions: 384 });
  const store = new InMemoryVectorStore({
    collectionName: 'hybrid-search-demo',
    embeddingDimensions: 384,
  });

  // Ingest documents
  const documents: Document[] = [];

  for (const doc of SAMPLE_DOCS) {
    const [embedding] = await embedder.embed([doc.content]);

    const document: Document = {
      id: crypto.randomUUID(),
      content: doc.content,
      embedding,
      metadata: { title: doc.title },
    };

    await store.addDocument(document);
    documents.push(document);
  }

  console.log(`✅ Ingested ${documents.length} documents\n`);

  // Initialize search systems
  const bm25 = new BM25(documents);
  const pipeline = new RetrievalPipeline(store, embedder);
  const hybrid = new HybridSearch(bm25, pipeline);

  // Test Query 1: Exact term match
  const query1 = 'neural networks';

  console.log(`\n📋 Query 1: "${query1}" (exact term match)\n`);

  const keyword1 = bm25.search(query1, 5);
  displayResults('Keyword Search (BM25)', keyword1);

  const semantic1 = await pipeline.query(query1, { limit: 5, threshold: 0 });
  displayResults('Semantic Search (Vector Similarity)', semantic1.results);

  const hybridWeighted1 = await hybrid.searchWeighted(query1, { limit: 5 });
  displayResults('Hybrid Search (Weighted Average)', hybridWeighted1);

  const hybridRRF1 = await hybrid.searchRRF(query1, { limit: 5 });
  displayResults('Hybrid Search (Reciprocal Rank Fusion)', hybridRRF1);

  // Test Query 2: Conceptual similarity
  const query2 = 'teaching computers to see';

  console.log(`\n📋 Query 2: "${query2}" (conceptual query)\n`);

  const keyword2 = bm25.search(query2, 5);
  displayResults('Keyword Search (BM25)', keyword2);

  const semantic2 = await pipeline.query(query2, { limit: 5, threshold: 0 });
  displayResults('Semantic Search (Vector Similarity)', semantic2.results);

  const hybridWeighted2 = await hybrid.searchWeighted(query2, { limit: 5 });
  displayResults('Hybrid Search (Weighted Average)', hybridWeighted2);

  // Test Query 3: Weighted fusion comparison
  const query3 = 'python machine learning';

  console.log(`\n📋 Query 3: "${query3}" (weighted fusion comparison)\n`);

  const keywordBias = await hybrid.searchWeighted(query3, {
    limit: 5,
    keywordWeight: 0.7,
    semanticWeight: 0.3,
  });
  displayResults('Hybrid (70% Keyword, 30% Semantic)', keywordBias);

  const balanced = await hybrid.searchWeighted(query3, {
    limit: 5,
    keywordWeight: 0.5,
    semanticWeight: 0.5,
  });
  displayResults('Hybrid (50% Keyword, 50% Semantic)', balanced);

  const semanticBias = await hybrid.searchWeighted(query3, {
    limit: 5,
    keywordWeight: 0.3,
    semanticWeight: 0.7,
  });
  displayResults('Hybrid (30% Keyword, 70% Semantic)', semanticBias);

  // Summary
  console.log('\n📊 Hybrid Search Summary');
  console.log('='.repeat(70));
  console.log(`
Hybrid search combines the strengths of both approaches:

✅ Keyword Search (BM25):
   - Excellent for exact term matching
   - Fast and efficient
   - Good for queries with specific terminology
   - May miss conceptually similar content

✅ Semantic Search (Vector Similarity):
   - Captures conceptual similarity
   - Handles paraphrasing and synonyms
   - Language-agnostic (with right embeddings)
   - May miss exact term matches

✅ Hybrid Search:
   - Weighted Average: Balance precision and recall
   - RRF: Position-based fusion, less sensitive to score calibration
   - Adjustable weights for domain-specific tuning
   - Best results for diverse query types

Recommendations:
   - Use 50/50 weights as baseline
   - Increase keyword weight (0.7) for technical/exact queries
   - Increase semantic weight (0.7) for conceptual/exploratory queries
   - Use RRF when combining multiple retrieval strategies
  `);

  console.log('\n✅ Hybrid search example completed!\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export { main, BM25, HybridSearch };
