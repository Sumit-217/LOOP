import { z } from "zod";

export const trendQuerySchema = z.object({
  range: z.enum(["7d", "30d", "60d"]).default("30d"),
  themeId: z.string().optional(),
});

export const themeOverviewQuerySchema = z.object({
  range: z.enum(["7d", "30d", "60d"]).default("30d"),
});

export const drillDownQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sentiment: z.enum(["POS", "NEU", "NEG", "UNCLASSIFIED"]).optional(),
  channel: z.string().optional(),
});
