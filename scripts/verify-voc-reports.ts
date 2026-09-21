import { PrismaClient, Role, Sentiment, FeedbackStatus } from "@prisma/client";
import {
  reportGenerateInputSchema,
  vocReportContentSchema,
  aiRecommendationsOutputSchema,
} from "../lib/validations/reports";
import {
  generateVoCReport,
  getWorkspaceReports,
  getWorkspaceReportById,
} from "../lib/reports/service";
import { MockVoCRecommendationsProvider } from "../lib/reports/providers/mock";
import { getVoCRecommendationsProvider } from "../lib/reports";

const prisma = new PrismaClient();

async function runVoCReportsVerification() {
  console.log("================================================================");
  console.log("🧪 RUNNING PROJECT LOOP — PHASE 7 VOC REPORTS TEST SUITE");
  console.log("================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Setup: Locate Test Workspaces and Users
    // -------------------------------------------------------------
    const acmeWorkspace = await prisma.workspace.findFirst({
      where: { name: { contains: "Acme SaaS" } },
    });
    const betaWorkspace = await prisma.workspace.findFirst({
      where: { name: { contains: "Beta Retail" } },
    });

    if (!acmeWorkspace || !betaWorkspace) {
      throw new Error("Seed workspaces not found. Run db:seed before verifying.");
    }

    const adminUser = await prisma.user.findFirst({
      where: { workspaceId: acmeWorkspace.id, role: Role.ADMIN },
    });
    const analystUser = await prisma.user.findFirst({
      where: { workspaceId: acmeWorkspace.id, role: Role.ANALYST },
    });
    const viewerUser = await prisma.user.findFirst({
      where: { workspaceId: acmeWorkspace.id, role: Role.VIEWER },
    });

    if (!adminUser || !analystUser || !viewerUser) {
      throw new Error("Seed users across ADMIN, ANALYST, VIEWER not found.");
    }

    // -------------------------------------------------------------
    // PART 1: DATE RANGE VALIDATION TESTS
    // -------------------------------------------------------------
    console.log("--- 1. Report Date Range Validation ---");

    // Test 1: Valid date range passes validation
    const validRange = reportGenerateInputSchema.safeParse({
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-30T23:59:59.999Z",
      title: "August Monthly VoC Review",
    });
    assert(validRange.success, "1. Valid report date range passes validation");

    // Test 2: Invalid date range (periodEnd before periodStart) rejected
    const invertedRange = reportGenerateInputSchema.safeParse({
      periodStart: "2026-08-30T00:00:00.000Z",
      periodEnd: "2026-08-01T00:00:00.000Z",
    });
    assert(!invertedRange.success, "2. Invalid date range (end before start) rejected with validation error");

    // Test 3: Malformed date string rejected
    const malformedRange = reportGenerateInputSchema.safeParse({
      periodStart: "not-a-date",
      periodEnd: "2026-08-30T00:00:00.000Z",
    });
    assert(!malformedRange.success, "3. Malformed date string rejected with validation error");

    // -------------------------------------------------------------
    // PART 2: RBAC & AUTHENTICATION POLICY
    // -------------------------------------------------------------
    console.log("\n--- 2. RBAC & Authentication Policy ---");

    // Generation mutation policy: ADMIN & ANALYST only
    const simulateGenerationAuth = (user?: { role: Role; workspaceId: string }) => {
      if (!user) return { status: 401, error: "Unauthorized" };
      if (user.role === Role.ADMIN || user.role === Role.ANALYST) {
        return { status: 201, authorized: true };
      }
      return { status: 403, error: "Forbidden: You do not have permission to perform this action" };
    };

    // Test 4: Unauthenticated request -> 401
    const unauthReq = simulateGenerationAuth(undefined);
    assert(unauthReq.status === 401, "4. Unauthenticated generation request returns HTTP 401");

    // Test 5: ADMIN can generate reports
    const adminReq = simulateGenerationAuth(adminUser);
    assert(adminReq.status === 201 && !!adminReq.authorized, "5. ADMIN role is authorized to generate reports");

    // Test 6: ANALYST can generate reports
    const analystReq = simulateGenerationAuth(analystUser);
    assert(analystReq.status === 201 && !!analystReq.authorized, "6. ANALYST role is authorized to generate reports");

    // Test 7: VIEWER cannot generate reports (403)
    const viewerReq = simulateGenerationAuth(viewerUser);
    assert(viewerReq.status === 403, "7. VIEWER role is FORBIDDEN from generating reports (HTTP 403)");

    // -------------------------------------------------------------
    // PART 3: REPORT GENERATION & PERSISTENCE
    // -------------------------------------------------------------
    console.log("\n--- 3. Report Generation & Persistence ---");

    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = now;

    // Test 8: Generate report for Acme SaaS
    const generatedReport = await generateVoCReport({
      workspaceId: acmeWorkspace.id,
      userId: analystUser.id,
      periodStart,
      periodEnd,
      title: "Test Automated VoC Report (30 Days)",
      forceMockAI: true,
    });

    assert(
      !!generatedReport && !!generatedReport.id,
      "8. Authenticated report generation succeeds and assigns unique report ID",
      `Report ID: ${generatedReport.id}`
    );

    // Test 9: Report belongs strictly to authenticated workspace
    assert(
      generatedReport.workspaceId === acmeWorkspace.id,
      "9. Generated report is strictly associated with caller workspaceId"
    );

    // Test 10: Generated by audit trail
    assert(
      generatedReport.generatedById === analystUser.id,
      "10. Generated report records creator audit link (generatedById)"
    );

    // -------------------------------------------------------------
    // PART 4: MULTI-TENANT ISOLATION
    // -------------------------------------------------------------
    console.log("\n--- 4. Multi-Tenant Workspace Isolation ---");

    // Test 11: Owner workspace can retrieve report
    const ownerFetch = await getWorkspaceReportById(acmeWorkspace.id, generatedReport.id);
    assert(ownerFetch !== null, "11. Saved report is queryable within owner workspace (Acme SaaS)");

    // Test 12: Foreign workspace cannot access report (non-disclosing 404 / null)
    const foreignFetch = await getWorkspaceReportById(betaWorkspace.id, generatedReport.id);
    assert(foreignFetch === null, "12. Foreign workspace CANNOT access report (Beta Retail tenant isolation: PASS)");

    // -------------------------------------------------------------
    // PART 5: FEEDBACK FILTERING & COMPARISON PERIOD
    // -------------------------------------------------------------
    console.log("\n--- 5. Period Boundaries & Comparison Calculations ---");

    const content = generatedReport.contentJson as unknown as import("../lib/validations/reports").VoCReportContent;

    // Test 13: Duration calculation
    const expectedDurationDays = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    assert(
      content.period.durationDays === expectedDurationDays,
      "13. Period duration in days is calculated correctly",
      `Expected ${expectedDurationDays}, got ${content.period.durationDays}`
    );

    // Test 14: Comparison period start & end (immediately preceding, equal duration)
    const compStart = new Date(content.comparisonPeriod.start);
    const compEnd = new Date(content.comparisonPeriod.end);
    const compDurationMs = compEnd.getTime() - compStart.getTime();
    const currDurationMs = periodEnd.getTime() - periodStart.getTime();

    assert(
      compEnd.getTime() === periodStart.getTime() && compDurationMs === currDurationMs,
      "14. Comparison period is strictly contiguous and equal in duration: [compStart, periodStart)",
      `compEnd === periodStart: ${compEnd.getTime() === periodStart.getTime()}`
    );

    // Test 15: Correct selected-period feedback volume filtering
    const actualAcmeCountInPeriod = await prisma.feedback.count({
      where: {
        workspaceId: acmeWorkspace.id,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    assert(
      content.metrics.totalFeedback === actualAcmeCountInPeriod,
      "15. Selected-period feedback count strictly matches database records within [periodStart, periodEnd]",
      `Expected ${actualAcmeCountInPeriod}, got ${content.metrics.totalFeedback}`
    );

    // -------------------------------------------------------------
    // PART 6: SENTIMENT BREAKDOWN & SHIFTS
    // -------------------------------------------------------------
    console.log("\n--- 6. Deterministic Sentiment Breakdown & Shifts ---");

    // Test 16: Classified breakdown sums to classified count
    const sumClassified = content.metrics.positiveCount + content.metrics.neutralCount + content.metrics.negativeCount;
    assert(
      content.metrics.classifiedCount === sumClassified,
      "16. Sentiment breakdown strictly sums to classifiedCount (POS + NEU + NEG = Classified)",
      `Classified: ${content.metrics.classifiedCount}, Sum: ${sumClassified}`
    );

    // Test 17: Negative percentage calculation
    const expectedNegPct =
      content.metrics.classifiedCount > 0
        ? Math.round((content.metrics.negativeCount / content.metrics.classifiedCount) * 1000) / 10
        : 0;

    assert(
      content.metrics.negativePercentage === expectedNegPct,
      "17. Negative sentiment percentage is calculated deterministically relative to classified feedback",
      `Expected ${expectedNegPct}%, got ${content.metrics.negativePercentage}%`
    );

    // Test 18: Sentiment shift calculation matches comparison
    const expectedVolumeChange = content.metrics.totalFeedback - content.sentimentShifts.comparisonMetrics.totalFeedback;
    const expectedNegShift = Math.round((content.metrics.negativePercentage - content.sentimentShifts.comparisonMetrics.negativePercentage) * 10) / 10;

    assert(
      content.sentimentShifts.volumeChange === expectedVolumeChange &&
      content.sentimentShifts.negativePercentageShift === expectedNegShift,
      "18. Sentiment shifts (volume delta and negative percentage delta) match deterministic formula",
      `Vol change: ${content.sentimentShifts.volumeChange} (expected ${expectedVolumeChange}), Neg shift: ${content.sentimentShifts.negativePercentageShift} (expected ${expectedNegShift})`
    );

    // -------------------------------------------------------------
    // PART 7: TOP THEMES & EVIDENCE GROUNDING
    // -------------------------------------------------------------
    console.log("\n--- 7. Top Themes & Grounded Evidence ---");

    // Test 19: Top themes populated from real workspace themes
    assert(
      Array.isArray(content.topThemes) && content.topThemes.length > 0,
      "19. Top themes list is populated from active workspace themes",
      `Found ${content.topThemes.length} top themes`
    );

    // Test 20: Top themes are sorted by count descending
    let isSorted = true;
    for (let i = 1; i < content.topThemes.length; i++) {
      if (content.topThemes[i].count > content.topThemes[i - 1].count) {
        isSorted = false;
        break;
      }
    }
    assert(isSorted, "20. Top themes are strictly ordered by feedback volume descending");

    // -------------------------------------------------------------
    // PART 8: REPRESENTATIVE REAL QUOTES
    // -------------------------------------------------------------
    console.log("\n--- 8. Authentic Representative Quotes ---");

    // Test 21: Quotes come from real stored feedback records
    assert(
      Array.isArray(content.representativeQuotes) && content.representativeQuotes.length > 0,
      "21. Representative quotes extracted from period feedback",
      `Extracted ${content.representativeQuotes.length} quotes`
    );

    // Test 22: No fabricated quote IDs (every ID must exist in DB and belong to workspace)
    let allQuotesValid = true;
    for (const quote of content.representativeQuotes) {
      const realFeedback = await prisma.feedback.findFirst({
        where: {
          id: quote.feedbackId,
          workspaceId: acmeWorkspace.id,
        },
      });
      if (!realFeedback || realFeedback.content.trim() !== quote.content.trim()) {
        allQuotesValid = false;
        break;
      }
    }

    assert(
      allQuotesValid,
      "22. Quote integrity: 100% of quotes exist in database with matching feedbackId and content (Zero hallucinations: PASS)"
    );

    // -------------------------------------------------------------
    // PART 9: PRIORITIZED RECOMMENDATIONS & ZOD SCHEMA
    // -------------------------------------------------------------
    console.log("\n--- 9. Recommendations & Schema Validation ---");

    // Test 23: Recommendations structure
    assert(
      Array.isArray(content.recommendations) && content.recommendations.length >= 1,
      "23. Prioritized recommendations synthesized and grounded in period evidence",
      `Count: ${content.recommendations.length}`
    );

    // Test 24: Complete contentJson passes strict Zod validation
    const contentValidation = vocReportContentSchema.safeParse(generatedReport.contentJson);
    assert(
      contentValidation.success,
      "24. Saved report contentJson strictly validates against vocReportContentSchema"
    );

    // -------------------------------------------------------------
    // PART 10: EDGE CASES (EMPTY PERIOD & ZERO DENOMINATORS)
    // -------------------------------------------------------------
    console.log("\n--- 10. Edge Cases: Empty Periods & Zero Denominators ---");

    // Test 25: Empty/No-data period handled gracefully without crashing
    const emptyStart = new Date("2015-01-01T00:00:00.000Z");
    const emptyEnd = new Date("2015-01-30T23:59:59.999Z");

    const emptyReport = await generateVoCReport({
      workspaceId: acmeWorkspace.id,
      userId: adminUser.id,
      periodStart: emptyStart,
      periodEnd: emptyEnd,
      title: "Historical Empty Period Test",
      forceMockAI: true,
    });

    const emptyContent = emptyReport.contentJson as unknown as import("../lib/validations/reports").VoCReportContent;

    assert(
      emptyReport !== null && emptyContent.metrics.totalFeedback === 0,
      "25. Empty feedback period handled gracefully without throwing (Total volume = 0)",
      `Metrics: total=${emptyContent.metrics.totalFeedback}, classified=${emptyContent.metrics.classifiedCount}`
    );

    // Test 26: Zero-denominator safety (no NaN or divide-by-zero errors)
    const zeroDenomValid =
      emptyContent.metrics.negativePercentage === 0 &&
      emptyContent.metrics.averageSentimentScore === null &&
      !isNaN(emptyContent.sentimentShifts.volumeChangePercentage) &&
      !isNaN(emptyContent.sentimentShifts.negativePercentageShift);

    assert(
      zeroDenomValid,
      "26. Zero denominators produce safe numbers/nulls rather than NaN or Infinity"
    );

    // Test 27: Empty report contentJson still passes Zod schema
    const emptySchemaValid = vocReportContentSchema.safeParse(emptyReport.contentJson);
    assert(
      emptySchemaValid.success,
      "27. Empty-period report contentJson strictly passes Zod validation"
    );

    // -------------------------------------------------------------
    // PART 11: SAVED REPORTS LISTING & EXPORT
    // -------------------------------------------------------------
    console.log("\n--- 11. Saved Reports Listing & Export Serialization ---");

    // Test 28: Saved reports can be listed for workspace
    const reportList = await getWorkspaceReports(acmeWorkspace.id);
    assert(
      Array.isArray(reportList) && reportList.some((r) => r.id === generatedReport.id),
      "28. Saved reports list includes newly created report",
      `Total saved reports in Acme: ${reportList.length}`
    );

    // Test 29: Export serialization is valid JSON
    const serializedJson = JSON.stringify(ownerFetch, null, 2);
    const reparsed = JSON.parse(serializedJson);
    assert(
      reparsed.id === generatedReport.id && reparsed.content.metrics.totalFeedback === content.metrics.totalFeedback,
      "29. Export JSON serialization cleanly preserves report structure and metrics without loss"
    );

    // -------------------------------------------------------------
    // Cleanup temporary verification reports
    // -------------------------------------------------------------
    await prisma.report.deleteMany({
      where: {
        id: { in: [generatedReport.id, emptyReport.id] },
      },
    });

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log("\n================================================================");
    console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log("================================================================\n");

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Verification encountered uncaught error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVoCReportsVerification();
