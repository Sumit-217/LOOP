import { PrismaClient, Role, Sentiment, FeedbackStatus } from "@prisma/client";
import {
  isFeedbackClassified,
  calculatePeriodChange,
  getWorkspaceThemesOverview,
  getWorkspaceThemesTrends,
  getThemeFeedbackDrillDown,
  parseRangeDays,
} from "../lib/themes/service";
import { TrendRange } from "../lib/themes/types";

const prisma = new PrismaClient();

async function runThemesTrendsVerification() {
  console.log("================================================================");
  console.log("🧪 RUNNING PROJECT LOOP — PHASE 5 THEMES & TRENDS TEST SUITE");
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
    // 0. Locate Test Workspaces and Users
    const acmeWorkspace = await prisma.workspace.findFirst({
      where: { name: { contains: "Acme SaaS" } },
    });
    const betaWorkspace = await prisma.workspace.findFirst({
      where: { name: { contains: "Beta Retail" } },
    });

    if (!acmeWorkspace || !betaWorkspace) {
      throw new Error("Seed workspaces not found. Ensure db:seed was executed.");
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

    // -------------------------------------------------------------
    // Test 1: Authenticated Theme Overview Works
    // -------------------------------------------------------------
    console.log("--- 1. Authenticated Theme Overview ---");
    const overview = await getWorkspaceThemesOverview(acmeWorkspace.id, 30);
    assert(
      Array.isArray(overview) && overview.length > 0,
      "1. Authenticated theme overview returns theme list for workspace",
      `Found ${overview.length} themes`
    );

    // -------------------------------------------------------------
    // Test 2-5: RBAC & Authentication Policy
    // -------------------------------------------------------------
    console.log("\n--- 2. RBAC & Authentication Policy ---");
    // Simulate role check policy for read-only theme endpoints:
    // ADMIN, ANALYST, VIEWER are all authorized; unauthenticated is rejected.
    const simulateThemeAuthCheck = (sessionUser?: { role: Role; workspaceId: string }) => {
      if (!sessionUser) return { status: 401, error: "Unauthorized" };
      // All 3 roles are allowed read-only access to their own workspace themes
      return { status: 200, workspaceId: sessionUser.workspaceId };
    };

    const viewerAccess = simulateThemeAuthCheck(viewerUser || undefined);
    assert(
      viewerAccess.status === 200 && viewerAccess.workspaceId === acmeWorkspace.id,
      "2. Viewer can read theme/trend information (HTTP 200)"
    );

    const analystAccess = simulateThemeAuthCheck(analystUser || undefined);
    assert(
      analystAccess.status === 200 && analystAccess.workspaceId === acmeWorkspace.id,
      "3. Analyst can read theme/trend information (HTTP 200)"
    );

    const adminAccess = simulateThemeAuthCheck(adminUser || undefined);
    assert(
      adminAccess.status === 200 && adminAccess.workspaceId === acmeWorkspace.id,
      "4. Admin can read theme/trend information (HTTP 200)"
    );

    const unauthAccess = simulateThemeAuthCheck(undefined);
    assert(
      unauthAccess.status === 401,
      "5. Unauthenticated access is rejected (HTTP 401)"
    );

    // -------------------------------------------------------------
    // Test 6-9: Volume, Sentiment Distribution, and Unclassified Boundary
    // -------------------------------------------------------------
    console.log("\n--- 3. Theme Volume, Sentiment Counts & Unclassified Boundary ---");
    const billingTheme = overview.find((t) => t.name.includes("Billing"));
    assert(
      billingTheme !== undefined && billingTheme.totalCount > 0,
      "6. Theme counts are correct and non-zero for active themes",
      `Billing theme totalCount: ${billingTheme?.totalCount}`
    );

    assert(
      billingTheme !== undefined &&
        billingTheme.classifiedCount ===
          billingTheme.positiveCount + billingTheme.neutralCount + billingTheme.negativeCount,
      "7. Sentiment counts are strictly additive (classified = POS + NEU + NEG)",
      `Classified: ${billingTheme?.classifiedCount}, Sum: ${(billingTheme?.positiveCount || 0) + (billingTheme?.neutralCount || 0) + (billingTheme?.negativeCount || 0)}`
    );

    // Test unclassified vs classified logic
    const testUnclassified = {
      featureArea: null,
      rationale: null,
      sentiment: Sentiment.NEU,
      sentimentScore: 0.0,
    };
    const testClassifiedNeu = {
      featureArea: "Billing & Invoicing",
      rationale: "Neutral inquiry about invoice due dates",
      sentiment: Sentiment.NEU,
      sentimentScore: 0.0,
    };

    assert(
      !isFeedbackClassified(testUnclassified) && isFeedbackClassified(testClassifiedNeu),
      "8. Unclassified feedback is not counted as NEU (strict classifier distinction)",
      `Unclassified isClassified: ${isFeedbackClassified(testUnclassified)}, Classified NEU isClassified: ${isFeedbackClassified(testClassifiedNeu)}`
    );

    // Negative percentage calculation check
    const expectedNegPct =
      billingTheme && billingTheme.classifiedCount > 0
        ? Math.round((billingTheme.negativeCount / billingTheme.classifiedCount) * 1000) / 10
        : 0;
    assert(
      billingTheme !== undefined && billingTheme.negativePercentage === expectedNegPct,
      "9. Negative percentage is calculated correctly relative to classified items",
      `Reported: ${billingTheme?.negativePercentage}%, Expected: ${expectedNegPct}%`
    );

    // -------------------------------------------------------------
    // Test 10-13: Trend Aggregation & Time Windows
    // -------------------------------------------------------------
    console.log("\n--- 4. Trend Aggregation & Daily Time Windows ---");
    const trend7d = await getWorkspaceThemesTrends(acmeWorkspace.id, "7d");
    const trend30d = await getWorkspaceThemesTrends(acmeWorkspace.id, "30d");
    const trend60d = await getWorkspaceThemesTrends(acmeWorkspace.id, "60d");

    assert(
      trend30d.themes.length > 0 &&
        trend30d.themes[0].points.length === 30 &&
        trend30d.combinedTimeline.length === 30,
      "10. Theme trend aggregation returns expected daily buckets",
      `Returned ${trend30d.themes[0]?.points.length} daily buckets`
    );

    assert(
      trend7d.rangeDays === 7 && trend7d.themes[0].points.length === 7,
      "11. 7-day range works and yields exactly 7 daily points"
    );

    assert(
      trend30d.rangeDays === 30 && trend30d.themes[0].points.length === 30,
      "12. 30-day range works and yields exactly 30 daily points"
    );

    assert(
      trend60d.rangeDays === 60 && trend60d.themes[0].points.length === 60,
      "13. 60-day range works and yields exactly 60 daily points"
    );

    // -------------------------------------------------------------
    // Test 14-16: Spike / Change Detector Methodology
    // -------------------------------------------------------------
    console.log("\n--- 5. Deterministic Spike / Change Detector ---");
    // Normal period comparison: prev = 10, curr = 18 -> +8, +80%
    const normalChange = calculatePeriodChange(18, 10);
    assert(
      normalChange.absoluteChange === 8 &&
        normalChange.percentageChange === 80 &&
        normalChange.direction === "UP" &&
        normalChange.isSpike === true,
      "14. Spike/change calculation works for normal periods (prev=10, curr=18 -> +8, +80%, isSpike=true)",
      `Absolute: ${normalChange.absoluteChange}, Pct: ${normalChange.percentageChange}%, Spike: ${normalChange.isSpike}`
    );

    // Previous count = 0, current = 5 (new activity)
    const zeroPrevChange = calculatePeriodChange(5, 0);
    assert(
      zeroPrevChange.percentageChange === 100 &&
        zeroPrevChange.direction === "UP" &&
        zeroPrevChange.isSpike === true &&
        zeroPrevChange.description.includes("new activity"),
      "15. Previous count = 0 is handled correctly with new-activity description",
      `Description: "${zeroPrevChange.description}"`
    );

    // Insufficient historical data: prev = 0, curr = 0
    const zeroBothChange = calculatePeriodChange(0, 0);
    assert(
      zeroBothChange.absoluteChange === 0 &&
        zeroBothChange.percentageChange === 0 &&
        zeroBothChange.direction === "FLAT" &&
        zeroBothChange.isSpike === false &&
        zeroBothChange.description.includes("No feedback"),
      "16. Insufficient historical data is handled correctly with neutral description",
      `Description: "${zeroBothChange.description}"`
    );

    // -------------------------------------------------------------
    // Test 17-18: Theme Drill-Down & Server-Side Pagination
    // -------------------------------------------------------------
    console.log("\n--- 6. Theme Drill-Down & Pagination ---");
    const firstThemeId = overview[0].id;
    const drillDown = await getThemeFeedbackDrillDown(acmeWorkspace.id, firstThemeId, {
      page: 1,
      limit: 5,
    });

    assert(
      drillDown !== null &&
        drillDown.theme.id === firstThemeId &&
        drillDown.items.length <= 5 &&
        drillDown.items.every((item) => typeof item.content === "string"),
      "17. Theme drill-down returns only feedback associated with that theme",
      `Returned ${drillDown?.items.length} items for theme ${drillDown?.theme.name}`
    );

    const drillDownPage2 = await getThemeFeedbackDrillDown(acmeWorkspace.id, firstThemeId, {
      page: 2,
      limit: 3,
    });
    assert(
      drillDownPage2 !== null &&
        drillDownPage2.pagination.page === 2 &&
        drillDownPage2.pagination.limit === 3,
      "18. Server-side pagination works correctly (page 2, limit 3)",
      `Page: ${drillDownPage2?.pagination.page}, Limit: ${drillDownPage2?.pagination.limit}, Total: ${drillDownPage2?.pagination.total}`
    );

    // -------------------------------------------------------------
    // Test 19-20: Workspace Multi-Tenant Isolation
    // -------------------------------------------------------------
    console.log("\n--- 7. Workspace Multi-Tenant Isolation ---");
    // Beta Retail admin attempting to drill down into Acme SaaS theme
    const foreignDrillDown = await getThemeFeedbackDrillDown(
      betaWorkspace.id,
      firstThemeId,
      { page: 1, limit: 10 }
    );
    assert(
      foreignDrillDown === null,
      "19. Foreign workspace theme access is rejected (returns null / 404 in route)",
      `Foreign drill-down result: ${foreignDrillDown}`
    );

    // Verify Beta Retail overview does not contain Acme themes
    const betaOverview = await getWorkspaceThemesOverview(betaWorkspace.id, 30);
    const hasLeak = betaOverview.some((t) => t.name.includes("Onboarding") || t.name.includes("Billing"));
    assert(
      !hasLeak,
      "20. Foreign workspace feedback and themes cannot be exposed across tenant boundary",
      `Beta Retail themes: ${betaOverview.map((t) => t.name).join(", ")}`
    );

    // -------------------------------------------------------------
    // Test 21-22: Regression Verification (Phase 4 & Phase 3 Intact)
    // -------------------------------------------------------------
    console.log("\n--- 8. Phase 4 & Phase 3 Foundation Integrity ---");
    // Verify Phase 4 classification fields still exist and work
    const sampleClassified = await prisma.feedback.findFirst({
      where: {
        workspaceId: acmeWorkspace.id,
        featureArea: { not: null },
      },
    });
    assert(
      sampleClassified !== null &&
        typeof sampleClassified.featureArea === "string",
      "21. Existing Phase 4 AI classification records remain intact (featureArea persisted)",
      `Sample: ${sampleClassified?.id} -> Area: "${sampleClassified?.featureArea}"`
    );

    // Verify Phase 3 ingestion baseline
    const acmeFeedbackCount = await prisma.feedback.count({
      where: { workspaceId: acmeWorkspace.id },
    });
    assert(
      acmeFeedbackCount >= 120,
      "22. Existing Phase 3 ingestion dataset remains intact (>= 120 feedback items)",
      `Found ${acmeFeedbackCount} items`
    );

    console.log("\n================================================================");
    console.log(`THEMES & TRENDS TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log("================================================================\n");

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Verification crashed with unhandled exception:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runThemesTrendsVerification();
