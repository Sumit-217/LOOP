import { execSync } from "child_process";

interface TestSuite {
  name: string;
  command: string;
}

const SUITES: TestSuite[] = [
  { name: "Phase 3 Ingestion Suite", command: "npx tsx scripts/verify-ingestion.ts" },
  { name: "Phase 4 AI Classification Suite", command: "npx tsx scripts/verify-ai-classification.ts" },
  { name: "Phase 5 Themes & Trends Suite", command: "npx tsx scripts/verify-themes-trends.ts" },
  { name: "Phase 6 pgvector Migration Suite", command: "npx tsx scripts/verify-pgvector-migration.ts" },
  { name: "Phase 6 Ask LOOP & Embeddings Suite", command: "npx tsx scripts/verify-ask-loop.ts" },
  { name: "Phase 7 VoC Reports Suite", command: "npx tsx scripts/verify-voc-reports.ts" },
  { name: "Phase 8 Final Hardening Suite", command: "npx tsx scripts/verify-final-hardening.ts" },
];

async function main() {
  console.log("================================================================");
  console.log("🏁 RUNNING COMPLETE PROJECT LOOP VERIFICATION SUITE");
  console.log("================================================================\n");

  const results: Array<{ name: string; success: boolean; durationMs: number }> = [];

  for (const suite of SUITES) {
    console.log(`\n▶️  Running ${suite.name}...`);
    const start = Date.now();
    try {
      execSync(suite.command, { stdio: "inherit", cwd: process.cwd() });
      const durationMs = Date.now() - start;
      results.push({ name: suite.name, success: true, durationMs });
    } catch {
      const durationMs = Date.now() - start;
      results.push({ name: suite.name, success: false, durationMs });
      console.error(`❌ ${suite.name} failed!`);
      process.exit(1);
    }
  }

  console.log("\n================================================================");
  console.log("🎉 ALL PROJECT LOOP TEST SUITES PASSED SUCCESSFULLY!");
  console.log("================================================================");
  results.forEach((r) => {
    console.log(`  ✅ ${r.name} (${(r.durationMs / 1000).toFixed(1)}s)`);
  });
  console.log("================================================================\n");
}

main().catch((err) => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
