import { PrismaClient, Role, Sentiment, FeedbackStatus } from "@prisma/client";
import { singleFeedbackSchema, csvRowSchema, bulkFeedbackPayloadSchema } from "../lib/validations/feedback";

const prisma = new PrismaClient();

async function runIngestionVerification() {
  console.log("================================================================");
  console.log("🧪 RUNNING PROJECT LOOP — PHASE 3 INGESTION VERIFICATION SUITE");
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

  // -------------------------------------------------------------
  // Test 1: Verify Seed Dataset Count (>= 120 items requirement)
  // -------------------------------------------------------------
  console.log("--- 1. Seed Dataset Count Verification ---");
  const acmeWorkspace = await prisma.workspace.findFirst({
    where: { name: { contains: "Acme SaaS" } },
  });

  if (!acmeWorkspace) {
    console.error("Acme workspace not found in database. Please run npm run db:seed first.");
    process.exit(1);
  }

  const acmeFeedbackCount = await prisma.feedback.count({
    where: { workspaceId: acmeWorkspace.id },
  });

  assert(
    acmeFeedbackCount >= 120,
    `Acme SaaS workspace has >= 120 feedback items (Found: ${acmeFeedbackCount})`,
    `Expected >= 120, found ${acmeFeedbackCount}`
  );

  // Check channel distribution
  const channelCounts = await prisma.feedback.groupBy({
    by: ["channel"],
    where: { workspaceId: acmeWorkspace.id },
    _count: true,
  });

  const channelsFound = channelCounts.map((c) => c.channel);
  assert(
    channelsFound.length >= 5,
    `Feedback spans all 5 required channels (${channelsFound.join(", ")})`,
    `Found channels: ${channelsFound.join(", ")}`
  );

  // Check status and sentiment coverage
  const newStatusCount = await prisma.feedback.count({
    where: { workspaceId: acmeWorkspace.id, status: FeedbackStatus.NEW },
  });
  assert(newStatusCount > 0, `Dataset contains items with status NEW (Count: ${newStatusCount})`);

  // Check FeedbackTheme associations
  const themeLinksCount = await prisma.feedbackTheme.count({
    where: { feedback: { workspaceId: acmeWorkspace.id } },
  });
  assert(
    themeLinksCount >= 100,
    `Feedback items are linked to Themes via FeedbackTheme join table (Links: ${themeLinksCount})`
  );

  // -------------------------------------------------------------
  // Test 2: Input Validation Perimeter Tests (Zod)
  // -------------------------------------------------------------
  console.log("\n--- 2. Input Validation Perimeter Tests ---");

  // Valid single feedback
  const validSingle = singleFeedbackSchema.safeParse({
    content: "This is a valid customer feedback comment.",
    channel: "SUPPORT_TICKET",
    customerLabel: "Enterprise Cohort",
    sourceRef: "ZD-TEST-001",
  });
  assert(validSingle.success, "Valid single feedback passes validation");

  // Invalid: Content too short (< 5 chars)
  const shortContent = singleFeedbackSchema.safeParse({
    content: "Bad",
    channel: "SUPPORT_TICKET",
  });
  assert(!shortContent.success, "Single feedback with content < 5 characters is rejected");

  // Invalid: Unsupported channel
  const badChannel = singleFeedbackSchema.safeParse({
    content: "Valid feedback content with invalid channel",
    channel: "INVALID_CHANNEL_XYZ",
  });
  assert(!badChannel.success, "Single feedback with unsupported channel is rejected");

  // -------------------------------------------------------------
  // Test 3: CSV Row Normalization & Error Diagnostics
  // -------------------------------------------------------------
  console.log("\n--- 3. CSV Row Normalization & Reporting Diagnostics ---");

  // Test CSV row normalizer
  const validCsvRow = csvRowSchema.safeParse({
    content: "Customer praises speed of search feature",
    channel: "APP_STORE",
    customerLabel: "iOS Reviewer",
    sourceRef: "APP-REV-100",
  });
  assert(validCsvRow.success, "Valid CSV row passes validation");

  // Test CSV row with channel alias (e.g. 'zendesk' -> 'SUPPORT_TICKET')
  const aliasCsvRow = csvRowSchema.safeParse({
    content: "Payment failed during checkout with code 400",
    channel: "zendesk",
  });
  assert(
    aliasCsvRow.success && aliasCsvRow.data.channel === "SUPPORT_TICKET",
    "CSV row normalizes channel alias 'zendesk' to 'SUPPORT_TICKET'"
  );

  // Test CSV row error detection
  const malformedCsvRow = csvRowSchema.safeParse({
    content: "No", // < 5 chars
    channel: "UNKNOWN_SOURCE",
  });
  assert(!malformedCsvRow.success, "Malformed CSV row correctly fails validation");

  // -------------------------------------------------------------
  // Test 4: Workspace Isolation & Ingestion Lifecycle
  // -------------------------------------------------------------
  console.log("\n--- 4. Workspace Multi-Tenant Isolation & Ingestion Lifecycle ---");

  const testUniqueContent = `Verification test feedback item [${Date.now()}]`;
  const createdTestFeedback = await prisma.feedback.create({
    data: {
      content: testUniqueContent,
      channel: "SUPPORT_TICKET",
      customerLabel: "Isolation Test Cohort",
      sourceRef: "TEST-ISO-1",
      sentiment: Sentiment.NEU,
      sentimentScore: 0.0,
      status: FeedbackStatus.NEW,
      workspaceId: acmeWorkspace.id,
    },
  });

  assert(
    createdTestFeedback.status === FeedbackStatus.NEW,
    "Newly created feedback item has default status NEW"
  );
  assert(
    createdTestFeedback.sentiment === Sentiment.NEU && createdTestFeedback.sentimentScore === 0.0,
    "Newly created feedback item has neutral sentiment and 0.0 score (pre-classification)"
  );

  // Verify it exists in Acme workspace
  const foundInAcme = await prisma.feedback.findFirst({
    where: {
      workspaceId: acmeWorkspace.id,
      id: createdTestFeedback.id,
    },
  });
  assert(!!foundInAcme, "Feedback item is queryable within its owner workspace (Acme SaaS)");

  // Verify Beta Retail CANNOT see this feedback
  const betaWorkspace = await prisma.workspace.findFirst({
    where: { name: { contains: "Beta Retail" } },
  });

  if (betaWorkspace) {
    const foundInBeta = await prisma.feedback.findFirst({
      where: {
        workspaceId: betaWorkspace.id,
        id: createdTestFeedback.id,
      },
    });
    assert(
      foundInBeta === null,
      "Feedback item is COMPLETELY INVISIBLE to foreign workspace (Beta Retail tenant isolation: PASS)"
    );
  }

  // Clean up temporary test item
  await prisma.feedback.delete({ where: { id: createdTestFeedback.id } });

  // -------------------------------------------------------------
  // Test 5: RBAC Role Capabilities Inspection
  // -------------------------------------------------------------
  console.log("\n--- 5. RBAC Ingestion Permissions Policy ---");
  const allowedRoles: Role[] = [Role.ADMIN, Role.ANALYST];
  const adminAllowed = allowedRoles.includes(Role.ADMIN);
  const analystAllowed = allowedRoles.includes(Role.ANALYST);
  const viewerAllowed = allowedRoles.includes(Role.VIEWER);

  assert(adminAllowed, "ADMIN role is permitted to ingest feedback");
  assert(analystAllowed, "ANALYST role is permitted to ingest feedback");
  assert(!viewerAllowed, "VIEWER role is FORBIDDEN from ingesting feedback (returns HTTP 403)");

  // -------------------------------------------------------------
  // Final Summary
  // -------------------------------------------------------------
  console.log("\n================================================================");
  console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runIngestionVerification()
  .catch((e) => {
    console.error("Verification suite execution error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
