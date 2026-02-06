/**
 * Simple embedding generator (placeholder implementation)
 * In production, integrate with OpenAI, Anthropic, or local models
 */

import type { EmbeddingGenerator, EmbeddingConfig } from '../../types/index.js';

export interface SimpleEmbeddingOptions {
  dimensions?: number;
}

/**
 * Simple embedding generator using text hashing
 * For demonstration purposes - use real embeddings in production
 */
export class SimpleEmbeddingGenerator implements EmbeddingGenerator {
  private dimensions: number;

  constructor(options: SimpleEmbeddingOptions = {}) {
    this.dimensions = options.dimensions ?? 384; // Common embedding size
  }

  async embed(texts: string[], _config?: EmbeddingConfig): Promise<number[][]> {
    return texts.map((text) => this.generateEmbedding(text));
  }

  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Generate simple embedding using character-based hashing
   * This is NOT a real embedding - use OpenAI/Anthropic/local models in production
   */
  private generateEmbedding(text: string): number[] {
    const embedding = new Array(this.dimensions).fill(0);
    
    // Simple character-based features
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = charCode % this.dimensions;
      embedding[index] += 1;
    }

    // Normalize vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum  + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }
}
