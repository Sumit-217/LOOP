import { RagAnswerProvider } from "./types";
import { GeminiRagAnswerProvider } from "./providers/gemini";
import { MockRagAnswerProvider } from "./providers/mock";

export * from "./types";
export * from "./retrieval";
export * from "./context";
export { GeminiRagAnswerProvider } from "./providers/gemini";
export { MockRagAnswerProvider, NO_DATA_ANSWER } from "./providers/mock";

interface GetRagAnswerProviderOptions {
  forceMock?: boolean;
}

/**
 * RAG Answer Provider Factory
 * Resolves the active answer generation provider using provider abstraction.
 * Priority:
 * 1. forceMock flag (used in automated unit/integration tests)
 * 2. Gemini 2.5 Flash if GEMINI_API_KEY is configured
 * 3. In dev: deterministic MockRagAnswerProvider with explicit console warning
 * 4. In prod: throws explicit configuration error (no silent pretending)
 */
export function getRagAnswerProvider(options?: GetRagAnswerProviderOptions): RagAnswerProvider {
  if (options?.forceMock) {
    return new MockRagAnswerProvider();
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (apiKey) {
    return new GeminiRagAnswerProvider(apiKey);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RAG answer service is misconfigured: GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in server environment variables."
    );
  }

  console.warn(
    "[RAG Provider Notice] GEMINI_API_KEY is not configured in local environment. Using deterministic MockRagAnswerProvider for local development."
  );

  return new MockRagAnswerProvider();
}
