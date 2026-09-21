import { z } from "zod";

/**
 * Zod validation schema for POST /api/reports request body
 */
export const reportGenerateInputSchema = z
  .object({
    periodStart: z.string().datetime({ message: "periodStart must be a valid ISO 8601 datetime string" }),
    periodEnd: z.string().datetime({ message: "periodEnd must be a valid ISO 8601 datetime string" }),
    title: z.string().trim().max(120, "Title must be 120 characters or fewer").optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.periodStart).getTime();
      const end = new Date(data.periodEnd).getTime();
      return start <= end;
    },
    {
      message: "periodStart must be before or equal to periodEnd",
      path: ["periodEnd"],
    }
  );

export type ReportGenerateInput = z.infer<typeof reportGenerateInputSchema>;

/**
 * Zod schema for Top Themes in VoC Report
 */
export const vocTopThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
  count: z.number().int().min(0),
  percentage: z.number().min(0).max(100),
  negativeCount: z.number().int().min(0),
  negativePercentage: z.number().min(0).max(100),
  averageSentimentScore: z.number().nullable(),
  volumeChange: z.number().int(),
});

export type VoCTopTheme = z.infer<typeof vocTopThemeSchema>;

/**
 * Zod schema for Representative Quotes
 */
export const vocQuoteSchema = z.object({
  feedbackId: z.string().min(1),
  content: z.string().min(1),
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number(),
  channel: z.string(),
  customerLabel: z.string().nullable().optional(),
  createdAt: z.string(),
  themeNames: z.array(z.string()),
});

export type VoCQuote = z.infer<typeof vocQuoteSchema>;

/**
 * Zod schema for Prioritized Recommendations
 */
export const vocRecommendationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  area: z.string().min(1),
  evidence: z.string().min(1),
});

export type VoCRecommendation = z.infer<typeof vocRecommendationSchema>;

/**
 * Zod schema for Sentiment Metrics
 */
export const vocSentimentMetricsSchema = z.object({
  totalFeedback: z.number().int().min(0),
  classifiedCount: z.number().int().min(0),
  unclassifiedCount: z.number().int().min(0),
  positiveCount: z.number().int().min(0),
  neutralCount: z.number().int().min(0),
  negativeCount: z.number().int().min(0),
  negativePercentage: z.number().min(0).max(100),
  averageSentimentScore: z.number().nullable(),
});

export type VoCSentimentMetrics = z.infer<typeof vocSentimentMetricsSchema>;

/**
 * Zod schema for Sentiment Shifts
 */
export const vocSentimentShiftsSchema = z.object({
  volumeChange: z.number().int(),
  volumeChangePercentage: z.number(),
  volumeDirection: z.enum(["UP", "DOWN", "FLAT"]),
  negativePercentageShift: z.number(),
  averageScoreShift: z.number().nullable(),
  shiftDescription: z.string(),
  comparisonMetrics: vocSentimentMetricsSchema,
});

export type VoCSentimentShifts = z.infer<typeof vocSentimentShiftsSchema>;

/**
 * Zod schema for LLM-synthesized recommendations output
 */
export const aiRecommendationsOutputSchema = z.object({
  executiveSummary: z.string().min(1),
  recommendations: z.array(vocRecommendationSchema),
});

export type AIRecommendationsOutput = z.infer<typeof aiRecommendationsOutputSchema>;

/**
 * Complete, strictly typed VoC Report contentJson schema
 */
export const vocReportContentSchema = z.object({
  period: z.object({
    start: z.string(),
    end: z.string(),
    durationDays: z.number(),
  }),
  comparisonPeriod: z.object({
    start: z.string(),
    end: z.string(),
  }),
  metrics: vocSentimentMetricsSchema,
  sentimentShifts: vocSentimentShiftsSchema,
  topThemes: z.array(vocTopThemeSchema),
  representativeQuotes: z.array(vocQuoteSchema),
  executiveSummary: z.string(),
  recommendations: z.array(vocRecommendationSchema),
});

export type VoCReportContent = z.infer<typeof vocReportContentSchema>;
