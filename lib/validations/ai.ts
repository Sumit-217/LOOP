import { z } from "zod";

// Runtime perimeter validation schema for AI classification structured responses
export const aiClassificationOutputSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"], {
    message: "Sentiment must be POS, NEU, or NEG",
  }),
  sentimentScore: z
    .number()
    .min(-1.0, "Sentiment score cannot be less than -1.0")
    .max(1.0, "Sentiment score cannot exceed 1.0"),
  themes: z
    .array(z.string().trim())
    .default([]),
  featureArea: z
    .string()
    .trim()
    .min(1, "Feature area label is required")
    .max(100, "Feature area label cannot exceed 100 characters"),
  rationale: z
    .string()
    .trim()
    .min(1, "Classification rationale is required")
    .max(500, "Rationale cannot exceed 500 characters"),
});

export type AIClassificationOutput = z.infer<typeof aiClassificationOutputSchema>;
