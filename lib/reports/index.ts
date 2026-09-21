import { VoCRecommendationsProvider } from "./types";
import { GeminiVoCRecommendationsProvider } from "./providers/gemini";
import { MockVoCRecommendationsProvider } from "./providers/mock";

export * from "./types";
export * from "./service";
export { GeminiVoCRecommendationsProvider } from "./providers/gemini";
export { MockVoCRecommendationsProvider } from "./providers/mock";

interface GetVoCProviderOptions {
  forceMock?: boolean;
}

/**
 * VoC Recommendations Provider Factory
 * Resolves the active provider for VoC synthesis.
 */
export function getVoCRecommendationsProvider(
  options?: GetVoCProviderOptions
): VoCRecommendationsProvider {
  if (options?.forceMock) {
    return new MockVoCRecommendationsProvider();
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (apiKey) {
    return new GeminiVoCRecommendationsProvider(apiKey);
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[VoC Recommendations Notice] GEMINI_API_KEY is missing in production. Falling back to deterministic synthesis engine."
    );
    return new MockVoCRecommendationsProvider();
  }

  return new MockVoCRecommendationsProvider();
}
