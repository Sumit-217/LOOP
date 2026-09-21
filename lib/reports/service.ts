import { db } from "@/lib/db";
import { isFeedbackClassified } from "@/lib/themes/service";
import {
  GenerateReportParams,
  SavedReportDetail,
  SavedReportSummary,
  VoCQuote,
  VoCRecommendationsContext,
  VoCReportContent,
  VoCSentimentMetrics,
  VoCSentimentShifts,
  VoCTopTheme,
  AIRecommendationsOutput,
} from "./types";
import {
  vocReportContentSchema,
  aiRecommendationsOutputSchema,
} from "@/lib/validations/reports";
import { getVoCRecommendationsProvider } from "./index";
import { MockVoCRecommendationsProvider } from "./providers/mock";

/**
 * Formats a Date object to YYYY-MM-DD
 */
function formatDateShort(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calculates deterministic sentiment metrics for a set of feedback records
 */
function calculateSentimentMetrics(feedbackItems: Array<{
  sentiment: string;
  sentimentScore: number;
  featureArea?: string | null;
  rationale?: string | null;
}>): VoCSentimentMetrics {
  const totalFeedback = feedbackItems.length;
  let classifiedCount = 0;
  let unclassifiedCount = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let scoreSum = 0;

  for (const item of feedbackItems) {
    if (isFeedbackClassified(item)) {
      classifiedCount++;
      scoreSum += item.sentimentScore;
      if (item.sentiment === "POS") positiveCount++;
      else if (item.sentiment === "NEG") negativeCount++;
      else if (item.sentiment === "NEU") neutralCount++;
    } else {
      unclassifiedCount++;
    }
  }

  const negativePercentage =
    classifiedCount > 0
      ? Math.round((negativeCount / classifiedCount) * 1000) / 10
      : 0;

  const averageSentimentScore =
    classifiedCount > 0
      ? Math.round((scoreSum / classifiedCount) * 100) / 100
      : null;

  return {
    totalFeedback,
    classifiedCount,
    unclassifiedCount,
    positiveCount,
    neutralCount,
    negativeCount,
    negativePercentage,
    averageSentimentScore,
  };
}

/**
 * Calculates deterministic sentiment shifts comparing current period to comparison period
 */
function calculateSentimentShifts(
  current: VoCSentimentMetrics,
  comparison: VoCSentimentMetrics
): VoCSentimentShifts {
  const volumeChange = current.totalFeedback - comparison.totalFeedback;

  let volumeChangePercentage = 0;
  if (comparison.totalFeedback === 0) {
    volumeChangePercentage = current.totalFeedback > 0 ? 100 : 0;
  } else {
    volumeChangePercentage =
      Math.round(((current.totalFeedback - comparison.totalFeedback) / comparison.totalFeedback) * 1000) / 10;
  }

  let volumeDirection: "UP" | "DOWN" | "FLAT" = "FLAT";
  if (volumeChange > 0) volumeDirection = "UP";
  else if (volumeChange < 0) volumeDirection = "DOWN";

  const negativePercentageShift =
    Math.round((current.negativePercentage - comparison.negativePercentage) * 10) / 10;

  let averageScoreShift: number | null = null;
  if (current.averageSentimentScore !== null && comparison.averageSentimentScore !== null) {
    averageScoreShift =
      Math.round((current.averageSentimentScore - comparison.averageSentimentScore) * 100) / 100;
  }

  // Formulate deterministic shift description
  let shiftDescription = "Feedback volume and sentiment remained stable across reporting periods.";
  if (current.totalFeedback === 0 && comparison.totalFeedback === 0) {
    shiftDescription = "Zero customer feedback was captured in both the selected and preceding comparison periods.";
  } else if (comparison.totalFeedback === 0 && current.totalFeedback > 0) {
    shiftDescription = `Feedback volume reached ${current.totalFeedback} items (new activity compared to 0 in preceding period) with a ${current.negativePercentage.toFixed(1)}% negative sentiment share.`;
  } else if (current.totalFeedback === 0 && comparison.totalFeedback > 0) {
    shiftDescription = `Feedback volume dropped to 0 items from ${comparison.totalFeedback} in the comparison period.`;
  } else {
    const volStr =
      volumeChange > 0
        ? `increased by +${volumeChange} items (+${volumeChangePercentage}%)`
        : volumeChange < 0
        ? `decreased by ${volumeChange} items (${volumeChangePercentage}%)`
        : "remained unchanged";

    const negStr =
      negativePercentageShift > 0
        ? `Negative feedback share expanded +${negativePercentageShift.toFixed(1)} percentage points to ${current.negativePercentage.toFixed(1)}%`
        : negativePercentageShift < 0
        ? `Negative feedback share contracted ${Math.abs(negativePercentageShift).toFixed(1)} percentage points to ${current.negativePercentage.toFixed(1)}%`
        : `Negative feedback share was steady at ${current.negativePercentage.toFixed(1)}%`;

    const scoreStr =
      averageScoreShift !== null
        ? averageScoreShift >= 0
          ? `average sentiment score improved +${averageScoreShift.toFixed(2)} pts (now ${current.averageSentimentScore?.toFixed(2)})`
          : `average sentiment score declined ${averageScoreShift.toFixed(2)} pts (now ${current.averageSentimentScore?.toFixed(2)})`
        : "no classified score baseline available";

    shiftDescription = `Volume ${volStr} compared to the previous period. ${negStr}; ${scoreStr}.`;
  }

  return {
    volumeChange,
    volumeChangePercentage,
    volumeDirection,
    negativePercentageShift,
    averageScoreShift,
    shiftDescription,
    comparisonMetrics: comparison,
  };
}

/**
 * Calculates non-overlapping, contiguous comparison period [compStart, periodStart)
 */
export function calculateComparisonPeriod(periodStart: Date, periodEnd: Date) {
  const durationMs = periodEnd.getTime() - periodStart.getTime();
  const start = new Date(periodStart.getTime() - durationMs);
  const end = new Date(periodStart.getTime());
  const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));
  return { start, end, durationMs, durationDays };
}

/**
 * Server-side VoC report generation service.
 * Enforces workspace isolation, deterministic metric aggregation,
 * real quote extraction, and grounded AI recommendations.
 */
export async function generateVoCReport(params: GenerateReportParams) {
  const { workspaceId, userId, periodStart, periodEnd, title, forceMockAI } = params;

  // 1. Calculate duration and comparison window:
  // Current: [periodStart, periodEnd]
  // Comparison: [compStart, periodStart) - strictly less than periodStart so boundary feedback is not double-counted!
  const compPeriod = calculateComparisonPeriod(periodStart, periodEnd);
  const compStart = compPeriod.start;
  const compEnd = compPeriod.end;
  const durationDays = compPeriod.durationDays;

  // 2. Query workspace feedback for current period [periodStart, periodEnd]
  const currentFeedback = await db.feedback.findMany({
    where: {
      workspaceId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      themes: {
        include: {
          theme: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Query workspace feedback for comparison period [compStart, periodStart)
  const comparisonFeedback = await db.feedback.findMany({
    where: {
      workspaceId,
      createdAt: {
        gte: compStart,
        lt: periodStart, // strictly < periodStart to prevent boundary double-counting
      },
    },
    include: {
      themes: {
        include: {
          theme: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Compute deterministic sentiment metrics
  const currentMetrics = calculateSentimentMetrics(currentFeedback);
  const comparisonMetrics = calculateSentimentMetrics(comparisonFeedback);
  const sentimentShifts = calculateSentimentShifts(currentMetrics, comparisonMetrics);

  // 5. Query workspace themes & compute top themes
  const allThemes = await db.theme.findMany({
    where: { workspaceId },
    include: {
      feedback: {
        include: {
          feedback: {
            select: {
              id: true,
              sentiment: true,
              sentimentScore: true,
              featureArea: true,
              rationale: true,
              createdAt: true,
              workspaceId: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const topThemes: VoCTopTheme[] = allThemes
    .map((theme) => {
      // Isolate feedback to active workspace
      const linked = theme.feedback
        .map((tf) => tf.feedback)
        .filter((f) => f.workspaceId === workspaceId);

      let currentCount = 0;
      let comparisonCount = 0;
      let classifiedCount = 0;
      let negativeCount = 0;
      let scoreSum = 0;

      for (const f of linked) {
        if (f.createdAt >= periodStart && f.createdAt <= periodEnd) {
          currentCount++;
          if (isFeedbackClassified(f)) {
            classifiedCount++;
            scoreSum += f.sentimentScore;
            if (f.sentiment === "NEG") negativeCount++;
          }
        } else if (f.createdAt >= compStart && f.createdAt < periodStart) {
          comparisonCount++;
        }
      }

      const percentage =
        currentMetrics.totalFeedback > 0
          ? Math.round((currentCount / currentMetrics.totalFeedback) * 1000) / 10
          : 0;

      const negativePercentage =
        classifiedCount > 0
          ? Math.round((negativeCount / classifiedCount) * 1000) / 10
          : 0;

      const averageSentimentScore =
        classifiedCount > 0
          ? Math.round((scoreSum / classifiedCount) * 100) / 100
          : null;

      const volumeChange = currentCount - comparisonCount;

      return {
        id: theme.id,
        name: theme.name,
        color: theme.color,
        count: currentCount,
        percentage,
        negativeCount,
        negativePercentage,
        averageSentimentScore,
        volumeChange,
      };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  // 6. Extract representative customer quotes (3-5 items from real feedback)
  const substantiveFeedback = currentFeedback.filter(
    (f) => f.content && f.content.trim().length >= 10
  );

  const selectedQuotes: VoCQuote[] = [];
  const pickedIds = new Set<string>();

  // Pick up to 2 strong negative quotes
  const negativeCandidates = substantiveFeedback
    .filter((f) => f.sentiment === "NEG")
    .sort((a, b) => a.sentimentScore - b.sentimentScore);

  for (const f of negativeCandidates) {
    if (selectedQuotes.length >= 2) break;
    if (!pickedIds.has(f.id)) {
      pickedIds.add(f.id);
      selectedQuotes.push({
        feedbackId: f.id,
        content: f.content.trim(),
        sentiment: f.sentiment,
        sentimentScore: f.sentimentScore,
        channel: f.channel,
        customerLabel: f.customerLabel,
        createdAt: f.createdAt.toISOString(),
        themeNames: f.themes.map((t) => t.theme.name),
      });
    }
  }

  // Pick up to 2 strong positive quotes
  const positiveCandidates = substantiveFeedback
    .filter((f) => f.sentiment === "POS")
    .sort((a, b) => b.sentimentScore - a.sentimentScore);

  for (const f of positiveCandidates) {
    if (selectedQuotes.length >= 4) break;
    if (!pickedIds.has(f.id)) {
      pickedIds.add(f.id);
      selectedQuotes.push({
        feedbackId: f.id,
        content: f.content.trim(),
        sentiment: f.sentiment,
        sentimentScore: f.sentimentScore,
        channel: f.channel,
        customerLabel: f.customerLabel,
        createdAt: f.createdAt.toISOString(),
        themeNames: f.themes.map((t) => t.theme.name),
      });
    }
  }

  // Fill up to 5 quotes with remaining substantive feedback if available
  for (const f of substantiveFeedback) {
    if (selectedQuotes.length >= 5) break;
    if (!pickedIds.has(f.id)) {
      pickedIds.add(f.id);
      selectedQuotes.push({
        feedbackId: f.id,
        content: f.content.trim(),
        sentiment: f.sentiment,
        sentimentScore: f.sentimentScore,
        channel: f.channel,
        customerLabel: f.customerLabel,
        createdAt: f.createdAt.toISOString(),
        themeNames: f.themes.map((t) => t.theme.name),
      });
    }
  }

  // 7. Synthesize Executive Summary and Recommendations via AI Provider
  const aiContext: VoCRecommendationsContext = {
    periodDays: durationDays,
    metrics: currentMetrics,
    sentimentShifts,
    topThemes,
    representativeQuotes: selectedQuotes,
  };

  let aiOutput: AIRecommendationsOutput;
  try {
    const provider = getVoCRecommendationsProvider({ forceMock: forceMockAI });
    aiOutput = await provider.synthesizeReport(aiContext);
  } catch (providerError) {
    console.warn(
      "[VoC Report Service] Primary AI provider encountered error, applying deterministic fallback:",
      providerError
    );
    const mockProvider = new MockVoCRecommendationsProvider();
    aiOutput = await mockProvider.synthesizeReport(aiContext);
  }

  // Validate AI output
  const validatedAiOutput = aiRecommendationsOutputSchema.parse(aiOutput);

  // 8. Construct and validate complete contentJson
  const reportContent: VoCReportContent = {
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
      durationDays,
    },
    comparisonPeriod: {
      start: compStart.toISOString(),
      end: compEnd.toISOString(),
    },
    metrics: currentMetrics,
    sentimentShifts,
    topThemes,
    representativeQuotes: selectedQuotes,
    executiveSummary: validatedAiOutput.executiveSummary,
    recommendations: validatedAiOutput.recommendations,
  };

  const validatedContent = vocReportContentSchema.parse(reportContent);

  // 9. Persist Report to Database
  const finalTitle =
    title && title.trim().length > 0
      ? title.trim()
      : `VoC Report: ${formatDateShort(periodStart)} to ${formatDateShort(periodEnd)}`;

  const savedReport = await db.report.create({
    data: {
      title: finalTitle,
      periodStart,
      periodEnd,
      contentJson: validatedContent as unknown as import("@prisma/client").Prisma.InputJsonValue,
      workspaceId,
      generatedById: userId,
    },
    include: {
      generatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return savedReport;
}

/**
 * Retrieves list of saved reports for a given workspace
 */
export async function getWorkspaceReports(workspaceId: string): Promise<SavedReportSummary[]> {
  const reports = await db.report.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      generatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return reports.map((r) => {
    const content = r.contentJson as unknown as VoCReportContent;
    const totalFeedback = content?.metrics?.totalFeedback ?? 0;
    const rawSummary = content?.executiveSummary ?? "";
    const executiveSummaryExcerpt =
      rawSummary.length > 160 ? `${rawSummary.slice(0, 160)}...` : rawSummary;

    return {
      id: r.id,
      title: r.title,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      createdAt: r.createdAt.toISOString(),
      workspaceId: r.workspaceId,
      generatedBy: r.generatedBy,
      totalFeedback,
      executiveSummaryExcerpt,
    };
  });
}

/**
 * Retrieves a single report by ID strictly scoped to workspace
 */
export async function getWorkspaceReportById(
  workspaceId: string,
  reportId: string
): Promise<SavedReportDetail | null> {
  const report = await db.report.findFirst({
    where: {
      id: reportId,
      workspaceId,
    },
    include: {
      generatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!report) {
    return null;
  }

  return {
    id: report.id,
    title: report.title,
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    createdAt: report.createdAt.toISOString(),
    workspaceId: report.workspaceId,
    generatedBy: report.generatedBy,
    content: report.contentJson as unknown as VoCReportContent,
  };
}
