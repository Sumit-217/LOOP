import { z } from "zod";

/**
 * Zod validation schema for POST /api/ask-loop request payload
 */
export const askLoopInputSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Question must be at least 3 characters long")
    .max(500, "Question cannot exceed 500 characters"),
  topK: z
    .number()
    .int("topK must be an integer")
    .min(3, "topK must be between 3 and 8")
    .max(8, "topK must be between 3 and 8")
    .optional(),
});

export type AskLoopInput = z.infer<typeof askLoopInputSchema>;

/**
 * Zod schema for runtime validation of structured RAG answer responses from LLM
 */
export const ragOutputSchema = z.object({
  answer: z.string().trim().min(1, "Answer cannot be empty"),
  citations: z
    .array(
      z.object({
        feedbackId: z.string().trim().min(1, "feedbackId is required"),
        reason: z.string().trim().min(1, "reason is required"),
      })
    )
    .default([]),
});

export type RagOutput = z.infer<typeof ragOutputSchema>;
