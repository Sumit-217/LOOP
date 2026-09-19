import { FeedbackStatus, Sentiment } from "@prisma/client";

export type TrendRange = "7d" | "30d" | "60d";

export interface PeriodChange {
  currentPeriodCount: number;
  previousPeriodCount: number;
  absoluteChange: number;
  percentageChange: number;
  direction: "UP" | "DOWN" | "FLAT";
  isSpike: boolean;
  description: string;
}

export interface ThemeMetrics {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: Date;
  totalCount: number;
  classifiedCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  unclassifiedCount: number;
  negativePercentage: number;
  averageSentimentScore: number | null;
  latestFeedbackDate: Date | null;
  change: PeriodChange;
}

export interface TrendDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
  positive: number;
  neutral: number;
  negative: number;
  unclassified: number;
  averageSentimentScore: number | null;
}

export interface ThemeTrendSeries {
  themeId: string;
  themeName: string;
  color: string | null;
  points: TrendDataPoint[];
  summary: {
    totalInPeriod: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    unclassifiedCount: number;
    negativePercentage: number;
    averageSentimentScore: number | null;
    change: PeriodChange;
  };
}

export interface TrendsApiResponse {
  range: TrendRange;
  rangeDays: number;
  startDate: string;
  endDate: string;
  themes: ThemeTrendSeries[];
  combinedTimeline: Array<{
    date: string;
    total: number;
    [themeName: string]: number | string;
  }>;
}

export interface ThemeFeedbackItem {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  sourceRef: string | null;
  sentiment: Sentiment;
  sentimentScore: number;
  featureArea: string | null;
  rationale: string | null;
  status: FeedbackStatus;
  createdAt: Date;
  isClassified: boolean;
}

export interface ThemeDrillDownResponse {
  theme: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    createdAt: Date;
  };
  metrics: Omit<ThemeMetrics, "id" | "name" | "description" | "color" | "createdAt">;
  items: ThemeFeedbackItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
