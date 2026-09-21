import { PrismaClient } from "@prisma/client";
import { backfillWorkspaceEmbeddings } from "../lib/embeddings/service";

const prisma = new PrismaClient();

async function runBackfill() {
  console.log("================================================================");
  console.log("🚀 STARTING FEEDBACK EMBEDDINGS BACKFILL");
  console.log("================================================================\n");

  try {
    // 1. Locate Acme SaaS demo workspace
    const acmeWorkspace = await prisma.workspace.findFirst({
      where: { name: { contains: "Acme SaaS" } },
    });

    if (!acmeWorkspace) {
      console.error("Acme SaaS workspace not found in database.");
      process.exit(1);
    }

    console.log(`Found target workspace: "${acmeWorkspace.name}" (ID: ${acmeWorkspace.id})`);

    const initialFeedbackCount = await prisma.feedback.count({
      where: { workspaceId: acmeWorkspace.id },
    });

    const initialEmbeddingsCount = await prisma.embedding.count({
      where: {
        feedback: { workspaceId: acmeWorkspace.id },
      },
    });

    console.log(`Initial Workspace State:`);
    console.log(`  - Total Feedback Items: ${initialFeedbackCount}`);
    console.log(`  - Current Embeddings:    ${initialEmbeddingsCount}`);

    // 2. Execute First Backfill Run
    console.log("\n--- Executing Backfill Run 1 ---");
    const result1 = await backfillWorkspaceEmbeddings(acmeWorkspace.id, {
      batchSize: 15,
      forceMock: !process.env.GEMINI_API_KEY,
    });

    console.log(`Run 1 Results:`);
    console.log(`  - Total Feedback:   ${result1.totalFeedback}`);
    console.log(`  - Newly Backfilled: ${result1.backfilled}`);
    console.log(`  - Skipped (Exist):  ${result1.skipped}`);
    console.log(`  - Failed:           ${result1.failed}`);

    if (result1.failed > 0) {
      console.error("Failures encountered:", result1.errors);
      process.exit(1);
    }

    // 3. Verify Database State after Run 1
    const postRun1EmbeddingsCount = await prisma.embedding.count({
      where: {
        feedback: { workspaceId: acmeWorkspace.id },
      },
    });

    console.log(`\nPost-Run 1 Database Verification:`);
    console.log(`  - Total Acme Embeddings: ${postRun1EmbeddingsCount} (Expected: ${initialFeedbackCount})`);

    if (postRun1EmbeddingsCount !== initialFeedbackCount) {
      console.error(
        `Count mismatch! Expected ${initialFeedbackCount} embeddings, found ${postRun1EmbeddingsCount}`
      );
      process.exit(1);
    }

    // 4. Verify Duplicate Prevention (1 embedding per feedback)
    console.log("\n--- Checking for Duplicate Embeddings ---");
    const duplicateCheck = await prisma.$queryRaw<Array<{ feedbackId: string; count: bigint }>>`
      SELECT "feedbackId", COUNT(*)::bigint as count
      FROM "embeddings"
      GROUP BY "feedbackId"
      HAVING COUNT(*) > 1;
    `;

    if (duplicateCheck.length > 0) {
      console.error("Duplicate embeddings detected:", duplicateCheck);
      process.exit(1);
    }
    console.log("✅ Zero duplicates found: exactly 1 embedding per feedback item.");

    // 5. Execute Second Backfill Run to verify idempotence
    console.log("\n--- Executing Backfill Run 2 (Idempotency Test) ---");
    const result2 = await backfillWorkspaceEmbeddings(acmeWorkspace.id, {
      batchSize: 15,
      forceMock: !process.env.GEMINI_API_KEY,
    });

    console.log(`Run 2 Results:`);
    console.log(`  - Total Feedback:   ${result2.totalFeedback}`);
    console.log(`  - Newly Backfilled: ${result2.backfilled} (Expected: 0)`);
    console.log(`  - Skipped (Exist):  ${result2.skipped} (Expected: ${initialFeedbackCount})`);
    console.log(`  - Failed:           ${result2.failed} (Expected: 0)`);

    if (result2.backfilled !== 0 || result2.skipped !== initialFeedbackCount || result2.failed !== 0) {
      console.error("Idempotency test failed on second backfill run!");
      process.exit(1);
    }
    console.log("✅ Idempotence verified: second run skipped all existing embeddings with 0 new additions.");

    // 6. Verify Unrelated Workspaces were untouched
    console.log("\n--- Checking Unrelated Workspace Isolation ---");
    const otherWorkspaces = await prisma.workspace.findMany({
      where: { id: { not: acmeWorkspace.id } },
    });

    for (const ws of otherWorkspaces) {
      const otherCount = await prisma.embedding.count({
        where: { feedback: { workspaceId: ws.id } },
      });
      console.log(`  - Workspace "${ws.name}": ${otherCount} embeddings (Expected: 0)`);
      if (otherCount !== 0) {
        console.error(`Unrelated workspace "${ws.name}" has ${otherCount} embeddings! Workspace leaked.`);
        process.exit(1);
      }
    }
    console.log("✅ Workspace isolation verified: other workspaces remained untouched.");

    console.log("\n================================================================");
    console.log("🎉 FEEDBACK EMBEDDINGS BACKFILL SUCCESSFULLY VERIFIED!");
    console.log("================================================================\n");
  } catch (err) {
    console.error("Backfill failed with unhandled exception:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackfill();
