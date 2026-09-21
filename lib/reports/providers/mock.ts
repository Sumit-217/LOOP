import {
  AIRecommendationsOutput,
  VoCRecommendationsContext,
  VoCRecommendationsProvider,
  VoCRecommendation,
} from "../types";

/**
 * Deterministic VoC Report Synthesis Provider
 * Produces structured, grounded executive summaries and prioritized recommendations
 * derived entirely from deterministic calculations and stored feedback evidence.
 */
export class MockVoCRecommendationsProvider implements VoCRecommendationsProvider {
  public readonly name = "DeterministicMock";

  async synthesizeReport(context: VoCRecommendationsContext): Promise<AIRecommendationsOutput> {
    const { periodDays, metrics, sentimentShifts, topThemes, representativeQuotes } = context;

    // Handle empty data period gracefully
    if (metrics.totalFeedback === 0) {
      return {
        executiveSummary: `During the ${periodDays}-day reporting period, zero customer feedback records were received in this workspace. No sentiment shifts or active theme trajectories could be evaluated. Recommend verifying feedback collection channels (support tickets, surveys, and app reviews) to confirm webhook and ingestion pipelines are operational.`,
        recommendations: [
          {
            id: "rec-1",
            title: "Verify Channel Ingestion Webhooks",
            description: "Check connected ingestion channels to ensure incoming customer feedback is synchronizing normally into LOOP.",
            priority: "HIGH",
            area: "Data Operations",
            evidence: "Zero feedback items recorded in current reporting period.",
          },
        ],
      };
    }

    // Identify top negative theme and top volume theme
    const topVolumeTheme = topThemes[0] || null;
    const topNegativeTheme = [...topThemes].sort((a, b) => b.negativeCount - a.negativeCount)[0] || null;
    const positiveQuotes = representativeQuotes.filter((q) => q.sentiment === "POS");
    const negativeQuotes = representativeQuotes.filter((q) => q.sentiment === "NEG");

    // Executive Summary formulation
    const volumeChangeText =
      sentimentShifts.volumeChange > 0
        ? `an increase of +${sentimentShifts.volumeChange} items (+${sentimentShifts.volumeChangePercentage}%)`
        : sentimentShifts.volumeChange < 0
        ? `a decrease of ${sentimentShifts.volumeChange} items (${sentimentShifts.volumeChangePercentage}%)`
        : "unchanged volume";

    const sentimentTrendText =
      sentimentShifts.negativePercentageShift > 0
        ? `negative sentiment expanded by +${sentimentShifts.negativePercentageShift.toFixed(1)} percentage points`
        : sentimentShifts.negativePercentageShift < 0
        ? `negative sentiment contracted by ${Math.abs(sentimentShifts.negativePercentageShift).toFixed(1)} percentage points`
        : "negative sentiment remained stable";

    const scoreTrendText =
      sentimentShifts.averageScoreShift !== null
        ? sentimentShifts.averageScoreShift >= 0
          ? `improving by +${sentimentShifts.averageScoreShift.toFixed(2)} pts`
          : `declining by ${sentimentShifts.averageScoreShift.toFixed(2)} pts`
        : "insufficient classified comparison data";

    const topThemeSummary = topVolumeTheme
      ? `Primary customer attention centered on "${topVolumeTheme.name}" representing ${topVolumeTheme.count} feedback items (${topVolumeTheme.percentage.toFixed(1)}% of period volume).`
      : "No clustered themes were identified.";

    const executiveSummary = [
      `Over the ${periodDays}-day reporting window, the workspace captured ${metrics.totalFeedback} total feedback items (${metrics.classifiedCount} classified), reflecting ${volumeChangeText} compared with the preceding comparison period.`,
      `Overall customer sentiment scored an average of ${metrics.averageSentimentScore !== null ? metrics.averageSentimentScore.toFixed(2) : "N/A"} (-1.0 to +1.0 scale), with ${metrics.positiveCount} positive, ${metrics.neutralCount} neutral, and ${metrics.negativeCount} negative records (${metrics.negativePercentage.toFixed(1)}% negative share). Compared to the prior cycle, ${sentimentTrendText}, with average score ${scoreTrendText}.`,
      `${topThemeSummary} Evidence highlights indicate prioritized focus on mitigating top customer friction points while reinforcing recurring product strengths noted by users.`,
    ].join(" ");

    // Prioritized Recommendations Formulation
    const recommendations: VoCRecommendation[] = [];

    // Recommendation 1 (HIGH Priority - Addressing top negative theme / friction)
    if (topNegativeTheme && topNegativeTheme.negativeCount > 0) {
      const topNegQuote = negativeQuotes.find((q) => q.themeNames.includes(topNegativeTheme.name)) || negativeQuotes[0];
      recommendations.push({
        id: "rec-1",
        title: `Mitigate Customer Friction in ${topNegativeTheme.name}`,
        description: `Prioritize engineering and product triage for issues driving negative sentiment in ${topNegativeTheme.name}. Establish automated monitoring and address recurring failure modes described in customer reports.`,
        priority: "HIGH",
        area: topNegativeTheme.name,
        evidence: `Driven by ${topNegativeTheme.negativeCount} negative feedback items (${topNegativeTheme.negativePercentage.toFixed(1)}% negative rate within theme). ${
          topNegQuote ? `Customer evidence [${topNegQuote.feedbackId}]: "${topNegQuote.content.slice(0, 100)}..."` : ""
        }`.trim(),
      });
    } else {
      recommendations.push({
        id: "rec-1",
        title: "Maintain Low Churn Risk Baseline",
        description: "Customer feedback reflects minimal critical friction. Continue monitoring key ingestion streams for early negative sentiment signals.",
        priority: "LOW",
        area: "Quality Assurance",
        evidence: `Negative sentiment remained low at ${metrics.negativePercentage.toFixed(1)}% across ${metrics.classifiedCount} classified items.`,
      });
    }

    // Recommendation 2 (MEDIUM Priority - Operational workflow or high volume theme)
    if (topVolumeTheme && topVolumeTheme.name !== topNegativeTheme?.name) {
      recommendations.push({
        id: "rec-2",
        title: `Optimize Workflows Around ${topVolumeTheme.name}`,
        description: `Given high customer engagement volume in ${topVolumeTheme.name}, review feature documentation and self-serve onboarding guides to minimize customer confusion and support load.`,
        priority: "MEDIUM",
        area: topVolumeTheme.name,
        evidence: `Represents top period volume with ${topVolumeTheme.count} feedback items (${topVolumeTheme.percentage.toFixed(1)}% share) and average sentiment of ${
          topVolumeTheme.averageSentimentScore !== null ? topVolumeTheme.averageSentimentScore.toFixed(2) : "N/A"
        }.`,
      });
    } else {
      recommendations.push({
        id: "rec-2",
        title: "Expand Feedback Classification Coverage",
        description: "Ensure unclassified feedback is promptly triaged or re-classified by AI to keep theme distribution metrics up to date.",
        priority: "MEDIUM",
        area: "Customer Operations",
        evidence: `${metrics.unclassifiedCount} unclassified records identified during this period.`,
      });
    }

    // Recommendation 3 (LOW/MEDIUM Priority - Positive leverage or channel optimization)
    if (positiveQuotes.length > 0) {
      const topPosQuote = positiveQuotes[0];
      recommendations.push({
        id: "rec-3",
        title: "Amplify Customer-Validated Product Strengths",
        description: "Leverage features highlighted in positive customer testimonials across marketing collateral and product roadmaps as key differentiators.",
        priority: "LOW",
        area: topPosQuote.themeNames[0] || "Product Marketing",
        evidence: `Supported by ${metrics.positiveCount} positive feedback items. Customer testimonial [${topPosQuote.feedbackId}]: "${topPosQuote.content.slice(0, 90)}..."`,
      });
    } else {
      recommendations.push({
        id: "rec-3",
        title: "Gather Proactive NPS and Survey Feedback",
        description: "Trigger in-app satisfaction surveys following key milestone workflows to capture positive customer sentiment and retention indicators.",
        priority: "LOW",
        area: "Product Growth",
        evidence: `Zero strong positive ratings captured across ${metrics.totalFeedback} period items.`,
      });
    }

    return {
      executiveSummary,
      recommendations,
    };
  }
}
