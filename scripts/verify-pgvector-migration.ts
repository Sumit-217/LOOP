import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyPgvectorMigration() {
  console.log("================================================================");
  console.log("🧪 RUNNING PGVECTOR MIGRATION VERIFICATION");
  console.log("================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.error(`❌ [FAIL] ${title}`);
      if (detail) console.error(`   Detail: ${detail}`);
    }
  }

  // 1. Verify pgvector extension and version
  console.log("--- 1. Verify pgvector extension ---");
  const ext = await prisma.$queryRaw<Array<{ extname: string; extversion: string }>>`
    SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
  `;
  const isExtValid = ext.length > 0 && ext[0].extname === "vector" && ext[0].extversion === "0.8.2";
  assert(isExtValid, "pgvector extension is installed with version 0.8.2", `Found: ${JSON.stringify(ext)}`);

  // 2. Verify information_schema.columns
  console.log("\n--- 2. Verify embeddings columns in information_schema ---");
  const cols = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; udt_name: string }>>`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'embeddings'
    ORDER BY ordinal_position;
  `;
  const vectorCol = cols.find((c) => c.column_name === "vector");
  assert(
    vectorCol !== undefined && vectorCol.data_type === "USER-DEFINED" && vectorCol.udt_name === "vector",
    "embeddings.vector column uses PostgreSQL USER-DEFINED vector type (not float8[])",
    `vector column: ${JSON.stringify(vectorCol)}`
  );

  // 3. Verify exact catalog type format_type(atttypid, atttypmod)
  console.log("\n--- 3. Verify exact PostgreSQL catalog type ---");
  const catalogTypes = await prisma.$queryRaw<Array<{ attname: string; full_type: string }>>`
    SELECT a.attname, format_type(a.atttypid, a.atttypmod) as full_type
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'embeddings' AND a.attname = 'vector' AND a.attnum > 0;
  `;
  const exactType = catalogTypes[0]?.full_type;
  assert(
    exactType === "vector(768)",
    "embeddings.vector has exact catalog type vector(768)",
    `Actual full_type: "${exactType}"`
  );

  // 4. Verify embeddings table row count accessibility
  console.log("\n--- 4. Verify embeddings row count ---");
  const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint as count FROM public.embeddings;
  `;
  const rowCount = Number(countResult[0]?.count ?? -1);
  assert(rowCount >= 0, "embeddings table is accessible and maintains valid row count", `Found count: ${rowCount}`);

  // 5. Verify _prisma_migrations record
  console.log("\n--- 5. Verify tracked Prisma migration ---");
  const migrations = await prisma.$queryRaw<Array<{ migration_name: string; applied_steps_count: number }>>`
    SELECT migration_name, applied_steps_count
    FROM _prisma_migrations
    WHERE migration_name LIKE '%convert_embedding_vector_to_pgvector';
  `;
  assert(
    migrations.length === 1 && migrations[0].applied_steps_count === 1,
    "Tracked migration record exists in _prisma_migrations with applied_steps_count = 1",
    `Found migrations: ${JSON.stringify(migrations)}`
  );

  console.log("\n================================================================");
  console.log(`PGVECTOR VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED`);
  console.log("================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

verifyPgvectorMigration()
  .catch((err) => {
    console.error("Verification crashed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
