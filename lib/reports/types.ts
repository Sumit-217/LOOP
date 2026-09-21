import {
  VoCReportContent,
  VoCTopTheme,
  VoCQuote,
  VoCRecommendation,
  VoCSentimentMetrics,
  VoCSentimentShifts,
  AIRecommendationsOutput,
} from "@/lib/validations/reports";

export type {
  VoCReportContent,
  VoCTopTheme,
  VoCQuote,
  VoCRecommendation,
  VoCSentimentMetrics,
  VoCSentimentShifts,
  AIRecommendationsOutput,
};

export interface GenerateReportParams {
  workspaceId: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  title?: string;
  forceMockAI?: boolean;
}

export interface ReportAuthor {
  id: string;
  name: string;
  email: string;
}

export interface SavedReportSummary {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  workspaceId: string;
  generatedBy?: ReportAuthor | null;
  totalFeedback: number;
  executiveSummaryExcerpt: string;
}

export interface SavedReportDetail {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  workspaceId: string;
  generatedBy?: ReportAuthor | null;
  content: VoCReportContent;
}

export interface VoCRecommendationsContext {
  periodDays: number;
  metrics: VoCSentimentMetrics;
  sentimentShifts: VoCSentimentShifts;
  topThemes: VoCTopTheme[];
  representativeQuotes: VoCQuote[];
}

export interface VoCRecommendationsProvider {
  readonly name: string;
  synthesizeReport(context: VoCRecommendationsContext): Promise<AIRecommendationsOutput>;
}
