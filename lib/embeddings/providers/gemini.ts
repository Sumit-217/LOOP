import { GoogleGenAI } from "@google/genai";
import { EmbeddingProvider } from "../types";
import { validateEmbedding, EMBEDDING_DIMENSION } from "../validation";

/**
 * Google Gemini Embedding Provider
 * Implements EmbeddingProvider using gemini-embedding-001 with 768 dimensions.
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  public readonly name = "GoogleGemini";
  public readonly model: string;
  public readonly dimension = EMBEDDING_DIMENSION;
  private client: GoogleGenAI;

  constructor(
    apiKey: string,
    model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001"
  ) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required to instantiate GeminiEmbeddingProvider.");
    }
    this.model = model;
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Embeds document text for storage using taskType: RETRIEVAL_DOCUMENT.
   */
  async embedDocument(text: string): Promise<number[]> {
    return this.generateEmbedding(text, "RETRIEVAL_DOCUMENT");
  }

  /**
   * Embeds search query text for semantic retrieval using taskType: RETRIEVAL_QUERY.
   */
  async embedQuery(text: string): Promise<number[]> {
    return this.generateEmbedding(text, "RETRIEVAL_QUERY");
  }

  private async generateEmbedding(
    text: string,
    taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
  ): Promise<number[]> {
    if (!text || text.trim() === "") {
      throw new Error("Cannot generate embedding for empty text.");
    }

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await this.client.models.embedContent({
          model: this.model,
          contents: text,
          config: {
            taskType,
            outputDimensionality: this.dimension,
          },
        });

        // The SDK response may return embeddings[0].values or embedding.values
        const respAny = response as unknown as {
          embeddings?: Array<{ values?: number[] }>;
          embedding?: { values?: number[] };
        };
        const rawValues = respAny.embeddings?.[0]?.values || respAny.embedding?.values;

        if (!rawValues) {
          throw new Error("Gemini embedding response did not contain vector values.");
        }

        return validateEmbedding(rawValues);
      } catch (err: unknown) {
        lastError = err;
        if (attempt === 1) {
          console.warn(`[GeminiEmbeddingProvider] Attempt 1 failed. Retrying...`, err);
        }
      }
    }

    throw new Error(
      `Gemini embedding generation failed after 2 attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }
}
