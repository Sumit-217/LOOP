import { createHash } from "crypto";
import { EmbeddingProvider } from "../types";
import { validateEmbedding, EMBEDDING_DIMENSION } from "../validation";

/**
 * SplitMix32 PRNG
 * Fast, high-quality 32-bit deterministic pseudo-random generator.
 */
function createSplitMix32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x9e3779b9) >>> 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

/**
 * Key domain concept clusters for deterministic semantic similarity in mock mode.
 * Ensures that texts sharing core concepts have high semantic similarity (low cosine distance),
 * allowing semantic search and RAG retrieval tests to behave realistically offline.
 */
const DOMAIN_CONCEPTS: Record<string, string[]> = {
  billing: ["bill", "billing", "invoice", "invoicing", "payment", "card", "tax", "vat", "proration", "price"],
  onboarding: ["onboard", "onboarding", "invite", "invitation", "signup", "wizard", "register", "setup"],
  security: ["sso", "saml", "okta", "auth", "authentication", "password", "2fa", "rbac", "role", "permissions"],
  mobile: ["mobile", "ios", "android", "ipad", "phone", "app store", "faceid", "biometric"],
  performance: ["timeout", "speed", "fast", "slow", "latency", "uptime", "504", "load", "sluggish", "hang"],
  integrations: ["api", "webhook", "crm", "zapier", "sync", "snowflake", "linear", "slack", "export"],
  analytics: ["report", "reporting", "chart", "dashboard", "digest", "voc", "metric", "trends"],
  negative: ["hate", "unhappy", "frustrat", "broken", "bug", "crash", "terrible", "problem", "issue", "fail", "lost"],
  positive: ["love", "great", "excellent", "gorgeous", "praise", "smooth", "fantastic", "wonderful", "clean"],
};

/**
 * Deterministic Mock Embedding Provider
 * - Exactly 768 dimensions
 * - Same input → identical vector
 * - Different inputs → distinct vectors
 * - Texts sharing domain concepts exhibit high cosine similarity
 * - No network calls
 * - No Math.random()
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  public readonly name = "MockEmbeddingProvider";
  public readonly model = "mock-deterministic-768";
  public readonly dimension = EMBEDDING_DIMENSION;

  /**
   * Generates a deterministic document embedding.
   */
  async embedDocument(text: string): Promise<number[]> {
    return this.generateDeterministicVector(text, "RETRIEVAL_DOCUMENT");
  }

  /**
   * Generates a deterministic query embedding.
   */
  async embedQuery(text: string): Promise<number[]> {
    return this.generateDeterministicVector(text, "RETRIEVAL_QUERY");
  }

  private generateDeterministicVector(text: string, taskType: string): number[] {
    const cleanText = text.trim().toLowerCase();
    if (!cleanText) {
      throw new Error("Cannot generate embedding for empty text.");
    }

    // 1. Compute deterministic 32-bit seed from text + taskType
    const hash = createHash("sha256")
      .update(`${cleanText}::${taskType}`)
      .digest();
    const seed = hash.readUInt32BE(0);

    const prng = createSplitMix32(seed);

    // 2. Base vector: 768 deterministic numbers between -0.2 and 0.2
    const vector = new Float64Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      vector[i] = (prng() * 2 - 1) * 0.2;
    }

    // 3. Inject semantic concept weights so that semantic search tests work accurately
    let conceptOffset = 0;
    const tokens = cleanText.split(/[\s,.;:!?_/\-()"]+/).filter(Boolean);

    for (const [concept, keywords] of Object.entries(DOMAIN_CONCEPTS)) {
      const matchCount = keywords.filter((kw) => tokens.some((t) => t.includes(kw))).length;
      if (matchCount > 0) {
        // Concept signal injected into a dedicated 32-dimension slice
        const sliceStart = (conceptOffset * 32) % (this.dimension - 32);
        const weight = Math.min(2.0, matchCount * 0.5);

        // Concept seed from concept name
        const conceptHash = createHash("sha256").update(concept).digest();
        const conceptPrng = createSplitMix32(conceptHash.readUInt32BE(0));

        for (let j = 0; j < 32; j++) {
          const idx = sliceStart + j;
          vector[idx] += (conceptPrng() * 2 - 1) * weight;
        }
      }
      conceptOffset++;
    }

    // 4. L2-normalize to unit length (sum of squares = 1.0)
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm) || 1.0;

    const result = new Array<number>(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      result[i] = Number((vector[i] / norm).toFixed(6));
    }

    // 5. Perimeter validation: guarantees exactly 768 dimensions and finite numbers
    return validateEmbedding(result);
  }
}
