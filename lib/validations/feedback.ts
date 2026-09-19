import { z } from "zod";
import { VALID_CHANNEL_IDS } from "@/lib/constants/feedback";

// Single feedback submission validation schema
export const singleFeedbackSchema = z.object({
  content: z
    .string()
    .trim()
    .min(5, "Content must be at least 5 characters")
    .max(10000, "Content must not exceed 10,000 characters"),
  channel: z
    .string()
    .min(1, "Feedback channel is required")
    .refine((val) => VALID_CHANNEL_IDS.includes(val), {
      message: `Invalid channel. Supported channels: ${VALID_CHANNEL_IDS.join(", ")}`,
    }),
  customerLabel: z
    .string()
    .trim()
    .max(100, "Customer label must not exceed 100 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  sourceRef: z
    .string()
    .trim()
    .max(200, "Source reference must not exceed 200 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type SingleFeedbackInput = z.infer<typeof singleFeedbackSchema>;

// CSV normalized row validator
export const csvRowSchema = z.object({
  content: z
    .string()
    .trim()
    .min(5, "Content must be at least 5 characters"),
  channel: z
    .string()
    .trim()
    .min(1, "Channel is required")
    .transform((val) => {
      // Normalize common channel formats
      const upper = val.toUpperCase().replace(/\s+/g, "_");
      if (upper === "SUPPORT" || upper === "ZENDESK" || upper === "TICKET") return "SUPPORT_TICKET";
      if (upper === "APP" || upper === "APPSTORE" || upper === "REVIEW") return "APP_STORE";
      if (upper === "NPS" || upper === "CSAT" || upper === "SURVEY") return "NPS_SURVEY";
      if (upper === "SALES" || upper === "CRM" || upper === "CALL") return "SALES_NOTE";
      if (upper === "COMMUNITY" || upper === "FORUM" || upper === "DISCORD") return "COMMUNITY";
      return upper;
    })
    .refine((val) => VALID_CHANNEL_IDS.includes(val), {
      message: `Invalid channel. Expected one of: ${VALID_CHANNEL_IDS.join(", ")}`,
    }),
  customerLabel: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  sourceRef: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  createdAt: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim().length === 0) return undefined;
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }),
});

export type CsvRowInput = z.infer<typeof csvRowSchema>;

// Bulk feedback payload schema
export const bulkFeedbackPayloadSchema = z.object({
  items: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "At least one row must be provided for import")
    .max(1000, "Bulk imports are limited to 1,000 rows per batch"),
});

// Channel simulation payload schema
export const simulateChannelSchema = z.object({
  channel: z
    .string()
    .optional()
    .refine((val) => !val || VALID_CHANNEL_IDS.includes(val), {
      message: `Invalid channel. Supported channels: ${VALID_CHANNEL_IDS.join(", ")}`,
    }),
  count: z
    .number()
    .int()
    .min(1, "Count must be at least 1")
    .max(20, "Count cannot exceed 20 items per simulation")
    .optional()
    .default(5),
});

export type SimulateChannelInput = z.infer<typeof simulateChannelSchema>;
