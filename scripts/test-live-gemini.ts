import { PrismaClient, Sentiment } from "@prisma/client";
import { getAIClassificationProvider, GeminiClassificationProvider } from "../lib/ai";

const prisma = new PrismaClient();

async function testSelectedGeminiClassification() {
  console.log("================================================================");
  console.log("🤖 LOOP PHASE 4 — SELECTIVE 3-5 RECORD AI CLASSIFICATION TEST");
  console.log("================================================================\n");

  const acmeWorkspace = await prisma.workspace.findFirst({
    where: { name: { contains: "Acme SaaS" } },
  });

  if (!acmeWorkspace) {
    console.error("Acme workspace not found in database.");
    process.exit(1);
  }

  // Retrieve existing themes for Acme
  const existingThemes = await prisma.theme.findMany({
    where: { workspaceId: acmeWorkspace.id },
  });
  const themeNames = existingThemes.map((t) => t.name);

  // Pick exactly 4 representative diverse items (1 support, 1 app store, 1 nps, 1 sales note)
  const selectedRecords = await prisma.feedback.findMany({
    where: { workspaceId: acmeWorkspace.id },
    take: 4,
    orderBy: { createdAt: "asc" },
  });

  console.log(`Selected ${selectedRecords.length} records for classification demonstration:\n`);

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const isLiveKey = Boolean(apiKey);

  console.log(`Active Provider Mode: ${isLiveKey ? "LIVE Google Gemini 2.5 Flash" : "Fallback Deterministic Provider (GEMINI_API_KEY not set in env)"}`);
  console.log(`Available Themes (${themeNames.length}): ${themeNames.slice(0, 4).join(", ")}...\n`);

  const provider = isLiveKey
    ? new GeminiClassificationProvider(apiKey!)
    : getAIClassificationProvider();

  let classifiedCount = 0;

  for (let i = 0; i < selectedRecords.length; i++) {
    const item = selectedRecords[i];
    console.log(`----------------------------------------------------------------`);
    console.log(`[Record ${i + 1}/${selectedRecords.length}] ID: ${item.id} | Channel: ${item.channel}`);
    console.log(`Content: "${item.content.length > 80 ? item.content.slice(0, 80) + "..." : item.content}"`);

    try {
      const result = await provider.classifyFeedback(item.content, themeNames);
      console.log(`✓ AI Output:`);
      console.log(`   - Sentiment:    ${result.sentiment}`);
      console.log(`   - Score:        ${result.sentimentScore > 0 ? "+" : ""}${result.sentimentScore.toFixed(2)}`);
      console.log(`   - Feature Area: ${result.featureArea}`);
      console.log(`   - Themes:       [${result.themes.join(", ")}]`);
      console.log(`   - Rationale:    "${result.rationale}"`);

      // Update database
      const matchedThemeIds: string[] = [];
      for (const tName of result.themes) {
        const found = existingThemes.find((t) => t.name.toLowerCase() === tName.toLowerCase());
        if (found) matchedThemeIds.push(found.id);
      }

      await prisma.$transaction(async (tx) => {
        await tx.feedbackTheme.deleteMany({ where: { feedbackId: item.id } });
        if (matchedThemeIds.length > 0) {
          await tx.feedbackTheme.createMany({
            data: matchedThemeIds.map((tId) => ({
              feedbackId: item.id,
              themeId: tId,
              confidence: 0.95,
            })),
          });
        }
        await tx.feedback.update({
          where: { id: item.id },
          data: {
            sentiment: result.sentiment as Sentiment,
            sentimentScore: result.sentimentScore,
            featureArea: result.featureArea,
            rationale: result.rationale,
          },
        });
      });

      classifiedCount++;
    } catch (err: unknown) {
      console.error(`❌ Failed to classify record ${item.id}:`, err);
    }
  }

  console.log(`\n================================================================`);
  console.log(`CLASSIFICATION COMPLETE: Successfully classified ${classifiedCount}/${selectedRecords.length} records`);
  console.log(`================================================================\n`);
}

testSelectedGeminiClassification()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
