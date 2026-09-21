import { NextRequest, NextResponse } from "next/server";
import { Sentiment } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/dashboard
 * Computes live, real database metrics and chart analytics for C5 Dashboard.
 * Strictly scoped to authenticated user's workspaceId.
 * Accessible to ADMIN, ANALYST, and VIEWER roles.
 */
export async function GET(req: NextRequest) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range") || "30d";
  const rangeDays = rangeParam === "7d" ? 7 : rangeParam === "90d" ? 90 : 30;

  const workspaceId = session.user.workspaceId;
  const now = new Date();
  const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(now.getTime() - rangeDays * 2 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // 1. Stat Cards queries
    const [
      totalFeedbackAllTime,
      currentPeriodFeedback,
      prevPeriodCount,
      newThisWeekCount,
      activeThemesCount,
      recentItems,
    ] = await Promise.all([
      db.feedback.count({ where: { workspaceId } }),
      db.feedback.findMany({
        where: {
          workspaceId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          sentiment: true,
          sentimentScore: true,
          featureArea: true,
          createdAt: true,
        },
      }),
      db.feedback.count({
        where: {
          workspaceId,
          createdAt: {
            gte: prevStartDate,
            lt: startDate,
          },
        },
      }),
      db.feedback.count({
        where: {
          workspaceId,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      db.theme.count({ where: { workspaceId } }),
      db.feedback.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          content: true,
          channel: true,
          customerLabel: true,
          sentiment: true,
          sentimentScore: true,
          featureArea: true,
          createdAt: true,
        },
      }),
    ]);

    // Sentiment breakdown in current period
    let posCount = 0;
    let neuCount = 0;
    let negCount = 0;
    let classifiedCount = 0;

    for (const item of currentPeriodFeedback) {
      if (item.sentiment === Sentiment.POS) posCount++;
      else if (item.sentiment === Sentiment.NEG) negCount++;
      else neuCount++;

      if (item.featureArea || item.sentimentScore !== 0.0 || item.sentiment !== Sentiment.NEU) {
        classifiedCount++;
      }
    }

    const currentCount = currentPeriodFeedback.length;
    // % Negative calculation: across classified items if available, or across total in period
    const divisor = classifiedCount > 0 ? classifiedCount : currentCount;
    const pctNegative = divisor > 0 ? (negCount / divisor) * 100 : 0;

    // Period volume delta
    const volumeDeltaPct =
      prevPeriodCount > 0
        ? ((currentCount - prevPeriodCount) / prevPeriodCount) * 100
        : currentCount > 0
        ? 100
        : 0;

    // 2. Chart 1: Volume Over Time (Daily buckets)
    const dayMap = new Map<string, { date: string; label: string; total: number; positive: number; neutral: number; negative: number }>();

    // Initialize all days in the range so the chart is contiguous without missing dates
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dayMap.set(key, { date: key, label, total: 0, positive: 0, neutral: 0, negative: 0 });
    }

    for (const item of currentPeriodFeedback) {
      const key = item.createdAt.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        entry.total++;
        if (item.sentiment === Sentiment.POS) entry.positive++;
        else if (item.sentiment === Sentiment.NEG) entry.negative++;
        else entry.neutral++;
      }
    }

    const volumeOverTime = Array.from(dayMap.values());

    // 3. Chart 2: Sentiment Distribution
    const sentimentTotal = posCount + neuCount + negCount;
    const sentimentDistribution = [
      {
        name: "Positive",
        value: posCount,
        percentage: sentimentTotal > 0 ? Math.round((posCount / sentimentTotal) * 100) : 0,
        color: "#10b981", // emerald-500
      },
      {
        name: "Neutral",
        value: neuCount,
        percentage: sentimentTotal > 0 ? Math.round((neuCount / sentimentTotal) * 100) : 0,
        color: "#94a3b8", // slate-400
      },
      {
        name: "Negative",
        value: negCount,
        percentage: sentimentTotal > 0 ? Math.round((negCount / sentimentTotal) * 100) : 0,
        color: "#f43f5e", // rose-500
      },
    ];

    // 4. Chart 3: Top Themes by Volume in this range
    const themesWithFeedback = await db.theme.findMany({
      where: { workspaceId },
      include: {
        feedback: {
          where: {
            feedback: {
              createdAt: { gte: startDate },
            },
          },
          include: {
            feedback: {
              select: {
                sentiment: true,
                sentimentScore: true,
              },
            },
          },
        },
      },
    });

    const topThemes = themesWithFeedback
      .map((t) => {
        const volume = t.feedback.length;
        let p = 0;
        let neu = 0;
        let n = 0;
        let totalScore = 0;

        for (const f of t.feedback) {
          if (f.feedback.sentiment === Sentiment.POS) p++;
          else if (f.feedback.sentiment === Sentiment.NEG) n++;
          else neu++;
          totalScore += f.feedback.sentimentScore;
        }

        const avgScore = volume > 0 ? totalScore / volume : 0;

        return {
          id: t.id,
          name: t.name,
          volume,
          positive: p,
          neutral: neu,
          negative: n,
          avgSentimentScore: Number(avgScore.toFixed(2)),
        };
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 6);

    return NextResponse.json({
      range: rangeParam,
      rangeDays,
      stats: {
        totalFeedbackAllTime,
        currentPeriodTotal: currentCount,
        prevPeriodTotal: prevPeriodCount,
        volumeDeltaPct: Number(volumeDeltaPct.toFixed(1)),
        pctNegative: Number(pctNegative.toFixed(1)),
        newThisWeek: newThisWeekCount,
        activeThemes: activeThemesCount,
      },
      volumeOverTime,
      sentimentDistribution,
      topThemes,
      recentItems,
    });
  } catch (err: unknown) {
    console.error("Dashboard Analytics calculation error:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to compute dashboard analytics" },
      { status: 500 }
    );
  }
}
