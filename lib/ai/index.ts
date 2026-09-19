import { AIClassificationProvider } from "./types";
import { GeminiClassificationProvider } from "./providers/gemini";
import { MockClassificationProvider } from "./providers/mock";

export * from "./types";
export { GeminiClassificationProvider } from "./providers/gemini";
export { MockClassificationProvider } from "./providers/mock";

interface GetProviderOptions {
  forceMock?: boolean;
}

/**
 * AI Provider Factory
 * Resolves the active classification provider using provider abstraction.
 * Priority:
 * 1. forceMock flag (used in automated unit/integration tests)
 * 2. Gemini 2.5 Flash if GEMINI_API_KEY is configured
 * 3. In dev: deterministic MockClassificationProvider with explicit console warning
 * 4. In prod: throws explicit configuration error (no silent pretending)
 */
export function getAIClassificationProvider(options?: GetProviderOptions): AIClassificationProvider {
  if (options?.forceMock) {
    return new MockClassificationProvider();
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (apiKey) {
    return new GeminiClassificationProvider(apiKey);
  }

  // Handle missing API key based on environment
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AI classification service is misconfigured: GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in server environment variables."
    );
  }

  // Development / Test fallback
  console.warn(
    "[AI Provider Notice] GEMINI_API_KEY is not configured in local environment. Using deterministic MockClassificationProvider for local development."
  );

  return new MockClassificationProvider();
}
