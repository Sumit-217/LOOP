import { db } from "@/lib/db";
import { Prisma, Sentiment } from "@prisma/client";
import {
  PeriodChange,
  ThemeDrillDownResponse,
  ThemeFeedbackItem,
  ThemeMetrics,
  ThemeTrendSeries,
  TrendDataPoint,
  TrendRange,
  TrendsApiResponse,
} from "./types";

/**
 * Determines whether a feedback record has been classified by AI or pre-classified.
 * An unclassified feedback record has:
 * - featureArea === null
 * - rationale === null
 * - sentiment === "NEU"
 * - sentimentScore === 0.0
 */
export function isFeedbackClassified(item: {
  featureArea?: string | null;
  rationale?: string | null;
  sentiment?: Sentiment | string;
  sentimentScore?: number;
}): boolean {
  if (item.featureArea !== null && item.featureArea !== undefined && item.featureArea !== "") {
    return true;
  }
  if (item.rationale !== null && item.rationale !== undefined && item.rationale !== "") {
    return true;
  }
  if (item.sentiment !== "NEU") {
    return true;
  }
  if (item.sentimentScore !== 0.0 && item.sentimentScore !== 0) {
    return true;
  }
  return false;
}

/**
 * Deterministic, explainable spike and change detector.
 * Compares current period with preceding period of equal length.
 */
export function calculatePeriodChange(
  currentPeriodCount: number,
  previousPeriodCount: number
): PeriodChange {
  const absoluteChange = currentPeriodCount - previousPeriodCount;

  // Case 1: Insufficient historical data / zero in both periods
  if (previousPeriodCount === 0 && currentPeriodCount === 0) {
    return {
      currentPeriodCount,
      previousPeriodCount,
      absoluteChange: 0,
      percentageChange: 0,
      direction: "FLAT",
      isSpike: false,
      description: "No feedback recorded in the current or previous period.",
    };
  }

  // Case 2: Zero in previous period, positive in current period (new activity)
  if (previousPeriodCount === 0 && currentPeriodCount > 0) {
    const isSpike = currentPeriodCount >= 3;
    return {
      currentPeriodCount,
      previousPeriodCount,
      absoluteChange,
      percentageChange: 100,
      direction: "UP",
      isSpike,
      description: `Feedback volume reached ${currentPeriodCount} (new activity compared with zero in previous period).`,
    };
  }

  // Case 3: Positive count in previous period
  const percentageChange = Math.round(
    ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 1000
  ) / 10;

  let direction: "UP" | "DOWN" | "FLAT" = "FLAT";
  if (absoluteChange > 0) direction = "UP";
  else if (absoluteChange < 0) direction = "DOWN";

  // Spike criteria: absolute change >= 3 and relative change >= 50%
  const isSpike = absoluteChange >= 3 && percentageChange >= 50;

  let description = "Feedback volume remained unchanged compared with the previous period.";
  if (absoluteChange > 0) {
    description = `Feedback volume increased ${percentageChange}% (+${absoluteChange}) compared with the previous period.`;
  } else if (absoluteChange < 0) {
    description = `Feedback volume decreased ${Math.abs(percentageChange)}% (${absoluteChange}) compared with the previous period.`;
  }

  return {
    currentPeriodCount,
    previousPeriodCount,
    absoluteChange,
    percentageChange,
    direction,
    isSpike,
    description,
  };
}

/**
 * Returns formatted daily date string (YYYY-MM-DD)
 */
function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converts range string to number of days
 */
export function parseRangeDays(range: TrendRange = "30d"): number {
  switch (range) {
    case "7d":
      return 7;
    case "60d":
      return 60;
    case "30d":
    default:
      return 30;
  }
}

/**
 * Fetches workspace-scoped theme overview with volume, sentiment, and period changes.
 */
export async function getWorkspaceThemesOverview(
  workspaceId: string,
  rangeDays: number = 30
): Promise<ThemeMetrics[]> {
  const now = new Date();
  const currentStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 2 * rangeDays * 24 * 60 * 60 * 1000);

  // Strictly query workspace-owned themes
  const themes = await db.theme.findMany({
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

  return themes.map((theme) => {
    // Isolate feedback to active workspace strictly
    const linkedFeedback = theme.feedback
      .map((ft) => ft.feedback)
      .filter((f) => f.workspaceId === workspaceId);

    const totalCount = linkedFeedback.length;
    let latestFeedbackDate: Date | null = null;
    let currentPeriodCount = 0;
    let previousPeriodCount = 0;

    let classifiedCount = 0;
    let unclassifiedCount = 0;
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let scoreSum = 0;

    for (const f of linkedFeedback) {
      if (!latestFeedbackDate || f.createdAt > latestFeedbackDate) {
        latestFeedbackDate = f.createdAt;
      }

      if (f.createdAt >= currentStart && f.createdAt <= now) {
        currentPeriodCount++;
      } else if (f.createdAt >= previousStart && f.createdAt < currentStart) {
        previousPeriodCount++;
      }

      if (isFeedbackClassified(f)) {
        classifiedCount++;
        scoreSum += f.sentimentScore;
        if (f.sentiment === "POS") positiveCount++;
        else if (f.sentiment === "NEG") negativeCount++;
        else if (f.sentiment === "NEU") neutralCount++;
      } else {
        // Strict boundary: Unclassified is NOT counted as neutral
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

    const change = calculatePeriodChange(currentPeriodCount, previousPeriodCount);

    return {
      id: theme.id,
      name: theme.name,
      description: theme.description,
      color: theme.color,
      createdAt: theme.createdAt,
      totalCount,
      classifiedCount,
      positiveCount,
      neutralCount,
      negativeCount,
      unclassifiedCount,
      negativePercentage,
      averageSentimentScore,
      latestFeedbackDate,
      change,
    };
  });
}

/**
 * Aggregates daily trends across themes for a selected date window.
 */
export async function getWorkspaceThemesTrends(
  workspaceId: string,
  range: TrendRange = "30d",
  themeIdFilter?: string
): Promise<TrendsApiResponse> {
  const rangeDays = parseRangeDays(range);
  const now = new Date();
  const startDate = new Date(now.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  // Generate daily bucket keys
  const dailyDates: string[] = [];
  const curr = new Date(startDate);
  while (curr <= now) {
    dailyDates.push(formatDateKey(curr));
    curr.setDate(curr.getDate() + 1);
  }

  // Strictly query workspace-owned themes
  const whereTheme: Prisma.ThemeWhereInput = { workspaceId };
  if (themeIdFilter) {
    whereTheme.id = themeIdFilter;
  }

  const themes = await db.theme.findMany({
    where: whereTheme,
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

  const previousStart = new Date(startDate.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  // Build per-theme series and combined timeline
  const combinedMap: Record<string, { date: string; total: number; [key: string]: number | string }> = {};
  for (const d of dailyDates) {
    combinedMap[d] = { date: d, total: 0 };
  }

  const themeSeries: ThemeTrendSeries[] = themes.map((theme) => {
    const linkedFeedback = theme.feedback
      .map((ft) => ft.feedback)
      .filter((f) => f.workspaceId === workspaceId);

    // Group feedback by day
    const dayBuckets: Record<
      string,
      {
        count: number;
        positive: number;
        neutral: number;
        negative: number;
        unclassified: number;
        scoreSum: number;
        classifiedCount: number;
      }
    > = {};

    for (const d of dailyDates) {
      dayBuckets[d] = {
        count: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        unclassified: 0,
        scoreSum: 0,
        classifiedCount: 0,
      };
    }

    let currentPeriodCount = 0;
    let previousPeriodCount = 0;
    let totalInPeriod = 0;
    let posInPeriod = 0;
    let neuInPeriod = 0;
    let negInPeriod = 0;
    let unclassifiedInPeriod = 0;
    let scoreSumInPeriod = 0;
    let classifiedInPeriod = 0;

    for (const f of linkedFeedback) {
      const fDate = f.createdAt;
      const key = formatDateKey(fDate);

      // Period change counters
      if (fDate >= startDate && fDate <= now) {
        currentPeriodCount++;
        totalInPeriod++;
        if (isFeedbackClassified(f)) {
          classifiedInPeriod++;
          scoreSumInPeriod += f.sentimentScore;
          if (f.sentiment === "POS") posInPeriod++;
          else if (f.sentiment === "NEG") negInPeriod++;
          else if (f.sentiment === "NEU") neuInPeriod++;
        } else {
          unclassifiedInPeriod++;
        }
      } else if (fDate >= previousStart && fDate < startDate) {
        previousPeriodCount++;
      }

      // Daily bucket population
      if (dayBuckets[key]) {
        dayBuckets[key].count++;
        combinedMap[key].total = (combinedMap[key].total as number) + 1;
        combinedMap[key][theme.name] = ((combinedMap[key][theme.name] as number) || 0) + 1;

        if (isFeedbackClassified(f)) {
          dayBuckets[key].classifiedCount++;
          dayBuckets[key].scoreSum += f.sentimentScore;
          if (f.sentiment === "POS") dayBuckets[key].positive++;
          else if (f.sentiment === "NEG") dayBuckets[key].negative++;
          else if (f.sentiment === "NEU") dayBuckets[key].neutral++;
        } else {
          dayBuckets[key].unclassified++;
        }
      }
    }

    const points: TrendDataPoint[] = dailyDates.map((d) => {
      const b = dayBuckets[d];
      return {
        date: d,
        count: b.count,
        positive: b.positive,
        neutral: b.neutral,
        negative: b.negative,
        unclassified: b.unclassified,
        averageSentimentScore:
          b.classifiedCount > 0
            ? Math.round((b.scoreSum / b.classifiedCount) * 100) / 100
            : null,
      };
    });

    const change = calculatePeriodChange(currentPeriodCount, previousPeriodCount);

    return {
      themeId: theme.id,
      themeName: theme.name,
      color: theme.color,
      points,
      summary: {
        totalInPeriod,
        positiveCount: posInPeriod,
        neutralCount: neuInPeriod,
        negativeCount: negInPeriod,
        unclassifiedCount: unclassifiedInPeriod,
        negativePercentage:
          classifiedInPeriod > 0
            ? Math.round((negInPeriod / classifiedInPeriod) * 1000) / 10
            : 0,
        averageSentimentScore:
          classifiedInPeriod > 0
            ? Math.round((scoreSumInPeriod / classifiedInPeriod) * 100) / 100
            : null,
        change,
      },
    };
  });

  const combinedTimeline = dailyDates.map((d) => combinedMap[d]);

  return {
    range,
    rangeDays,
    startDate: formatDateKey(startDate),
    endDate: formatDateKey(now),
    themes: themeSeries,
    combinedTimeline,
  };
}

/**
 * Fetches feedback items associated with a theme with server-side pagination and filters.
 */
export async function getThemeFeedbackDrillDown(
  workspaceId: string,
  themeId: string,
  options: {
    page?: number;
    limit?: number;
    sentiment?: "POS" | "NEU" | "NEG" | "UNCLASSIFIED";
    channel?: string;
  } = {}
): Promise<ThemeDrillDownResponse | null> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  // 1. Verify theme ownership strictly by workspaceId
  const theme = await db.theme.findFirst({
    where: {
      id: themeId,
      workspaceId,
    },
    include: {
      feedback: {
        include: {
          feedback: true,
        },
      },
    },
  });

  if (!theme) {
    return null;
  }

  // 2. Compute theme metrics for this theme
  const linkedFeedback = theme.feedback
    .map((ft) => ft.feedback)
    .filter((f) => f.workspaceId === workspaceId);

  const totalCount = linkedFeedback.length;
  let latestFeedbackDate: Date | null = null;
  let classifiedCount = 0;
  let unclassifiedCount = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let scoreSum = 0;

  for (const f of linkedFeedback) {
    if (!latestFeedbackDate || f.createdAt > latestFeedbackDate) {
      latestFeedbackDate = f.createdAt;
    }
    if (isFeedbackClassified(f)) {
      classifiedCount++;
      scoreSum += f.sentimentScore;
      if (f.sentiment === "POS") positiveCount++;
      else if (f.sentiment === "NEG") negativeCount++;
      else if (f.sentiment === "NEU") neutralCount++;
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

  // 3. Build paginated query for feedback records
  const where: Prisma.FeedbackWhereInput = {
    workspaceId,
    themes: {
      some: {
        themeId,
      },
    },
  };

  if (options.channel) {
    where.channel = options.channel;
  }

  if (options.sentiment) {
    if (options.sentiment === "UNCLASSIFIED") {
      where.featureArea = null;
      where.rationale = null;
      where.sentiment = "NEU";
      where.sentimentScore = 0.0;
    } else {
      where.sentiment = options.sentiment;
      // Exclude unclassified records when querying NEU
      if (options.sentiment === "NEU") {
        where.OR = [
          { featureArea: { not: null } },
          { rationale: { not: null } },
          { sentimentScore: { not: 0.0 } },
        ];
      }
    }
  }

  const [rawItems, totalFiltered] = await Promise.all([
    db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.feedback.count({ where }),
  ]);

  const items: ThemeFeedbackItem[] = rawItems.map((f) => ({
    id: f.id,
    content: f.content,
    channel: f.channel,
    customerLabel: f.customerLabel,
    sourceRef: f.sourceRef,
    sentiment: f.sentiment,
    sentimentScore: f.sentimentScore,
    featureArea: f.featureArea,
    rationale: f.rationale,
    status: f.status,
    createdAt: f.createdAt,
    isClassified: isFeedbackClassified(f),
  }));

  const now = new Date();
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  let currentPeriodCount = 0;
  let previousPeriodCount = 0;
  for (const f of linkedFeedback) {
    if (f.createdAt >= currentStart && f.createdAt <= now) currentPeriodCount++;
    else if (f.createdAt >= previousStart && f.createdAt < currentStart) previousPeriodCount++;
  }
  const change = calculatePeriodChange(currentPeriodCount, previousPeriodCount);

  return {
    theme: {
      id: theme.id,
      name: theme.name,
      description: theme.description,
      color: theme.color,
      createdAt: theme.createdAt,
    },
    metrics: {
      totalCount,
      classifiedCount,
      positiveCount,
      neutralCount,
      negativeCount,
      unclassifiedCount,
      negativePercentage,
      averageSentimentScore,
      latestFeedbackDate,
      change,
    },
    items,
    pagination: {
      total: totalFiltered,
      page,
      limit,
      totalPages: Math.ceil(totalFiltered / limit) || 1,
    },
  };
}
