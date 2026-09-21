// Project LOOP — Embedding Provider Abstraction Types
// Designed to decouple application routes and persistence from any specific embedding vendor

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimension: number;

  /**
   * Generates a 768-dimensional document embedding for storage.
   * Uses taskType: RETRIEVAL_DOCUMENT
   */
  embedDocument(text: string): Promise<number[]>;

  /**
   * Generates a 768-dimensional query embedding for semantic search.
   * Uses taskType: RETRIEVAL_QUERY
   */
  embedQuery(text: string): Promise<number[]>;
}
