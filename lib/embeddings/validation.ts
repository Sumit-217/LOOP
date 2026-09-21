import { z } from "zod";

export const EMBEDDING_DIMENSION = 768;

/**
 * Zod schema for validating embedding vectors.
 * Enforces:
 * - Must be an array of numbers
 * - Exactly 768 dimensions
 * - Every element must be a finite number (no NaN, no Infinity)
 */
export const embeddingVectorSchema = z
  .array(
    z.number().refine((val) => Number.isFinite(val), {
      message: "Vector values must be finite numbers (no NaN or Infinity allowed)",
    })
  )
  .length(EMBEDDING_DIMENSION, {
    message: `Embedding vector must contain exactly ${EMBEDDING_DIMENSION} dimensions`,
  });

/**
 * Validates an embedding vector at runtime.
 * Throws a descriptive error if invalid.
 * Never silently pads or truncates vectors.
 */
export function validateEmbedding(vector: unknown): number[] {
  if (!Array.isArray(vector)) {
    throw new Error("Invalid embedding: expected an array of numbers, received " + typeof vector);
  }

  if (vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Invalid embedding dimension: expected exactly ${EMBEDDING_DIMENSION} elements, received ${vector.length}`
    );
  }

  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val)) {
      throw new Error(
        `Invalid embedding value at index ${i}: expected finite number, received ${val}`
      );
    }
  }

  return vector as number[];
}
