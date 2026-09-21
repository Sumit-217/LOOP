import { EmbeddingProvider } from "./types";
import { GeminiEmbeddingProvider } from "./providers/gemini";
import { MockEmbeddingProvider } from "./providers/mock";

export * from "./types";
export * from "./validation";
export { GeminiEmbeddingProvider } from "./providers/gemini";
export { MockEmbeddingProvider } from "./providers/mock";

interface GetEmbeddingProviderOptions {
  forceMock?: boolean;
}

/**
 * Embedding Provider Factory
 * Resolves the active embedding provider using provider abstraction.
 * Priority:
 * 1. forceMock flag (used in automated unit/integration tests)
 * 2. Gemini gemini-embedding-001 if GEMINI_API_KEY is configured
 * 3. In dev: deterministic MockEmbeddingProvider with explicit console warning
 * 4. In prod: throws explicit configuration error (no silent pretending)
 */
export function getEmbeddingProvider(options?: GetEmbeddingProviderOptions): EmbeddingProvider {
  if (options?.forceMock) {
    return new MockEmbeddingProvider();
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (apiKey) {
    return new GeminiEmbeddingProvider(apiKey);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Embedding service is misconfigured: GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in server environment variables."
    );
  }

  console.warn(
    "[Embedding Provider Notice] GEMINI_API_KEY is not configured in local environment. Using deterministic MockEmbeddingProvider for local development."
  );

  return new MockEmbeddingProvider();
}
