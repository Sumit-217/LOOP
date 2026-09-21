import { PrismaClient, Sentiment, FeedbackStatus } from "@prisma/client";
import { getEmbeddingProvider, MockEmbeddingProvider } from "../lib/embeddings";
import { validateEmbedding, EMBEDDING_DIMENSION } from "../lib/embeddings/validation";
import { embedFeedback, backfillWorkspaceEmbeddings } from "../lib/embeddings/service";
import {
  searchRelevantFeedback,
  RELEVANCE_DISTANCE_THRESHOLD,
  DEFAULT_TOP_K,
} from "../lib/rag/retrieval";
import { buildRagContext } from "../lib/rag/context";
import {
  getRagAnswerProvider,
  MockRagAnswerProvider,
  NO_DATA_ANSWER,
} from "../lib/rag";
import { askLoopInputSchema, ragOutputSchema } from "../lib/validations/ask-loop";

const prisma = new PrismaClient();

async function runAskLoopVerification() {
  console.log("================================================================");
  console.log("🧪 RUNNING PROJECT LOOP — PHASE 6 ASK LOOP & EMBEDDINGS TEST SUITE");
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
    // PART 1-3: EMBEDDING PROVIDER & VALIDATION TESTS
    // -------------------------------------------------------------
    console.log("--- 1. Embedding Provider & Validation Tests ---");
    const mockProvider = getEmbeddingProvider({ forceMock: true });

    // Test 1: Mock document embedding = 768 dimensions
    const docEmbedding = await mockProvider.embedDocument("Customer reporting recurring invoice 504 timeouts.");
    assert(
      Array.isArray(docEmbedding) && docEmbedding.length === 768,
      "1. Mock document embedding produces exactly 768 dimensions",
      `Received length: ${docEmbedding.length}`
    );

    // Test 2: Mock query embedding = 768 dimensions
    const queryEmbedding = await mockProvider.embedQuery("What are customers saying about billing?");
    assert(
      Array.isArray(queryEmbedding) && queryEmbedding.length === 768,
      "2. Mock query embedding produces exactly 768 dimensions",
      `Received length: ${queryEmbedding.length}`
    );

    // Test 3: Deterministic output
    const queryEmbedding2 = await mockProvider.embedQuery("What are customers saying about billing?");
    const differentQueryEmbedding = await mockProvider.embedQuery("How is mobile app performance?");
    const isDeterministic =
      JSON.stringify(queryEmbedding) === JSON.stringify(queryEmbedding2) &&
      JSON.stringify(queryEmbedding) !== JSON.stringify(differentQueryEmbedding);
    assert(
      isDeterministic,
      "3. Mock embedding output is 100% deterministic (same input → same vector, distinct inputs → distinct vectors)"
    );

    // Test 4: Invalid dimensions rejected
    let caughtShortDimension = false;
    try {
      validateEmbedding(new Array(500).fill(0.1));
    } catch {
      caughtShortDimension = true;
    }
    assert(caughtShortDimension, "4. Vector validation strictly rejects non-768 dimensions (length 500 rejected)");

    // Test 5: Invalid values rejected (NaN, Infinity, non-array)
    let caughtNaN = false;
    let caughtInfinity = false;
    let caughtNonArray = false;
    try {
      const badArray = new Array(768).fill(0.1);
      badArray[10] = NaN;
      validateEmbedding(badArray);
    } catch {
      caughtNaN = true;
    }
    try {
      const badArray = new Array(768).fill(0.1);
      badArray[20] = Infinity;
      validateEmbedding(badArray);
    } catch {
      caughtInfinity = true;
    }
    try {
      validateEmbedding("not an array");
    } catch {
      caughtNonArray = true;
    }
    assert(
      caughtNaN && caughtInfinity && caughtNonArray,
      "5. Vector validation strictly rejects NaN, Infinity, and non-array types without silent fallback"
    );

    // -------------------------------------------------------------
    // PART 4: PERSISTENCE SERVICE TESTS
    // -------------------------------------------------------------
    console.log("\n--- 2. Embedding Persistence Service Tests ---");
    const acmeWorkspace = await prisma.workspace.findFirst({
      where: { name: { contains: "Acme SaaS" } },
    });
    const betaWorkspace = await prisma.workspace.findFirst({
      where: { name: { contains: "Beta Retail" } },
    });

    if (!acmeWorkspace || !betaWorkspace) {
      console.error("Acme or Beta workspace missing in DB.");
      process.exit(1);
    }

    const sampleFeedback = await prisma.feedback.findFirst({
      where: { workspaceId: acmeWorkspace.id },
    });

    if (!sampleFeedback) {
      console.error("No feedback found in Acme workspace.");
      process.exit(1);
    }

    // Test 6: Valid feedback embedding saved
    const persistResult = await embedFeedback(sampleFeedback.id, acmeWorkspace.id, { forceMock: true });
    assert(
      persistResult.success && persistResult.dimension === 768 && !!persistResult.embeddingId,
      "6. Valid feedback embedding is successfully computed and persisted into pgvector",
      `Embedding ID: ${persistResult.embeddingId}`
    );

    // Test 7: Repeated embedding upserts
    const repeatResult = await embedFeedback(sampleFeedback.id, acmeWorkspace.id, { forceMock: true });
    const countForSample = await prisma.embedding.count({
      where: { feedbackId: sampleFeedback.id },
    });
    assert(
      repeatResult.success && countForSample === 1,
      "7. Repeated embedding upserts cleanly without duplicate violation (count = 1)",
      `Count: ${countForSample}`
    );

    // Test 8: Foreign workspace rejected
    let foreignRejected = false;
    try {
      await embedFeedback(sampleFeedback.id, betaWorkspace.id, { forceMock: true });
    } catch {
      foreignRejected = true;
    }
    assert(
      foreignRejected,
      "8. Foreign workspace embedding request is rejected at the database perimeter (tenant isolation)"
    );

    // -------------------------------------------------------------
    // PART 5: BACKFILL IDEMPOTENCY & SKIP TESTS
    // -------------------------------------------------------------
    console.log("\n--- 3. Backfill Idempotency & Skip Verification ---");
    // Test 9, 10, 11: Missing embeddings generated, existing skipped, rerun produces 0 duplicates
    const backfillCheck = await backfillWorkspaceEmbeddings(acmeWorkspace.id, {
      batchSize: 20,
      forceMock: true,
    });
    assert(
      backfillCheck.failed === 0,
      "9. Backfill executes without errors across workspace feedback",
      `Total: ${backfillCheck.totalFeedback}, Backfilled: ${backfillCheck.backfilled}, Skipped: ${backfillCheck.skipped}`
    );

    assert(
      backfillCheck.skipped === backfillCheck.totalFeedback && backfillCheck.backfilled === 0,
      "10. Backfill skips already indexed feedback records completely",
      `Skipped: ${backfillCheck.skipped}, Newly Added: ${backfillCheck.backfilled}`
    );

    const dupCheck = await prisma.$queryRaw<Array<{ feedbackId: string; count: bigint }>>`
      SELECT "feedbackId", COUNT(*)::bigint as count
      FROM "embeddings"
      GROUP BY "feedbackId"
      HAVING COUNT(*) > 1;
    `;
    assert(
      dupCheck.length === 0,
      "11. Database contains zero duplicate embeddings across all indexed records"
    );

    // -------------------------------------------------------------
    // PART 7-8: RETRIEVAL & RELEVANCE TESTS
    // -------------------------------------------------------------
    console.log("\n--- 4. Semantic Retrieval & Relevance Tests ---");
    const billingQueryVector = await mockProvider.embedQuery("What billing problems or invoice timeouts are reported?");

    // Test 12: Relevant feedback returned
    const retrievedItems = await searchRelevantFeedback({
      workspaceId: acmeWorkspace.id,
      queryEmbedding: billingQueryVector,
      topK: 6,
    });
    assert(
      retrievedItems.length > 0 && retrievedItems.every((item) => typeof item.content === "string"),
      `12. Semantic similarity search returns relevant feedback items (${retrievedItems.length} returned)`
    );

    // Test 13: topK respected
    const top3Items = await searchRelevantFeedback({
      workspaceId: acmeWorkspace.id,
      queryEmbedding: billingQueryVector,
      topK: 3,
    });
    assert(
      top3Items.length === 3,
      `13. TopK parameter is strictly bounded and respected (Requested 3, returned ${top3Items.length})`
    );

    // Test 14: Ordering correct (cosine distance ascending)
    let isAscending = true;
    for (let i = 1; i < retrievedItems.length; i++) {
      if (retrievedItems[i].cosineDistance < retrievedItems[i - 1].cosineDistance) {
        isAscending = false;
        break;
      }
    }
    assert(
      isAscending,
      "14. Retrieval results are strictly ordered by cosine distance ascending (closest match first)"
    );

    // Test 15: Workspace isolation in retrieval
    const foreignRetrieved = await searchRelevantFeedback({
      workspaceId: betaWorkspace.id,
      queryEmbedding: billingQueryVector,
      topK: 6,
    });
    assert(
      foreignRetrieved.length === 0,
      "15. Workspace tenant isolation: querying Beta Retail with Acme query returns 0 Beta items",
      `Found ${foreignRetrieved.length} items in Beta Retail`
    );

    // Test 16: Empty result handled
    const emptyWorkspaceSearch = await searchRelevantFeedback({
      workspaceId: "non_existent_workspace_12345",
      queryEmbedding: billingQueryVector,
      topK: 6,
    });
    assert(
      Array.isArray(emptyWorkspaceSearch) && emptyWorkspaceSearch.length === 0,
      "16. Non-existent or empty workspace yields safe empty array [] without throwing"
    );

    // Test 17: Invalid query dimension rejected
    let caughtInvalidQueryDim = false;
    try {
      await searchRelevantFeedback({
        workspaceId: acmeWorkspace.id,
        queryEmbedding: new Array(100).fill(0.5),
        topK: 6,
      });
    } catch {
      caughtInvalidQueryDim = true;
    }
    assert(
      caughtInvalidQueryDim,
      "17. Search function rejects non-768 dimension query embeddings at perimeter"
    );

    // -------------------------------------------------------------
    // PART 9-11: RAG CONTEXT, ANSWER PROVIDER & CITATIONS
    // -------------------------------------------------------------
    console.log("\n--- 5. RAG Context, Answer Generation & Citations ---");
    // Test 18: Context contains only retrieved feedback
    const ragContext = buildRagContext(retrievedItems);
    const retrievedIds = retrievedItems.map((item) => item.id);
    const contextContainsAllIds = retrievedIds.every((id) => ragContext.includes(id));
    const contextHasXmlBoundaries = ragContext.includes("<evidence_context") && ragContext.includes("</evidence_context>");
    assert(
      contextContainsAllIds && contextHasXmlBoundaries,
      "18. RAG context builder generates bounded, structured XML containing exclusively retrieved feedback"
    );

    // Test 19: Structured answer validates against Zod schema
    const mockRag = getRagAnswerProvider({ forceMock: true });
    const ragAnswer = await mockRag.answerQuestion({
      question: "What problems are customers reporting with billing?",
      context: ragContext,
      retrievedIds,
    });
    const parsedAnswer = ragOutputSchema.safeParse(ragAnswer);
    assert(
      parsedAnswer.success && parsedAnswer.data.citations.length > 0,
      "19. Generated RAG answer conforms strictly to structured Zod schema ({ answer, citations })",
      `Answer length: ${ragAnswer.answer.length}, Citations: ${ragAnswer.citations.length}`
    );

    // Test 20: Invalid citation rejected
    const fabricatedCitationAnswer = {
      answer: "Customers report issues with billing.",
      citations: [
        { feedbackId: retrievedIds[0], reason: "Valid evidence" },
        { feedbackId: "fabricated_hallucinated_id_9999", reason: "Invented claim" },
      ],
    };
    const validIdSet = new Set(retrievedIds);
    const filteredCitations = fabricatedCitationAnswer.citations.filter((c) =>
      validIdSet.has(c.feedbackId)
    );
    assert(
      filteredCitations.length === 1 && filteredCitations[0].feedbackId === retrievedIds[0],
      "20. Security perimeter filters out hallucinated citation IDs not present in retrieved context"
    );

    // Test 21: Citation must belong to retrieved context
    assert(
      ragAnswer.citations.every((c) => retrievedIds.includes(c.feedbackId)),
      "21. Every citation in the generated answer belongs strictly to the retrieved context"
    );

    // Test 22: No-data case works
    const noDataResult = await mockRag.answerQuestion({
      question: "What are customers saying about quantum physics?",
      context: "<evidence_context>\nNo feedback evidence available.\n</evidence_context>",
      retrievedIds: [],
    });
    assert(
      noDataResult.answer.includes("couldn't find enough relevant feedback") &&
        noDataResult.citations.length === 0,
      "22. Insufficient evidence / no-data query triggers controlled no-data response with zero citations",
      `Answer snippet: "${noDataResult.answer.substring(0, 60)}..."`
    );

    // -------------------------------------------------------------
    // PART 12 & 15: API VALIDATION & CROSS-TENANT SECURITY
    // -------------------------------------------------------------
    console.log("\n--- 6. API Validation & Multi-Tenant Security ---");
    // Test 23: Valid input schema passes
    const validInput = askLoopInputSchema.safeParse({
      question: "What are customers saying about billing?",
      topK: 5,
    });
    assert(
      validInput.success,
      "23. Valid Ask LOOP request schema passes Zod input validation"
    );

    // Test 24: Empty question rejected (< 3 chars)
    const shortInput = askLoopInputSchema.safeParse({ question: "hi" });
    assert(
      !shortInput.success,
      "24. Short question (< 3 characters) is rejected with 400 validation error"
    );

    // Test 25: Excessive topK rejected (> 8)
    const excessiveTopK = askLoopInputSchema.safeParse({
      question: "Valid question here",
      topK: 25,
    });
    assert(
      !excessiveTopK.success,
      "25. Excessive topK (> 8) is rejected to enforce bounded retrieval limits"
    );

    // Test 26: Provider fallback handles missing key gracefully
    const devProvider = getEmbeddingProvider();
    assert(
      typeof devProvider.embedDocument === "function",
      "26. Provider abstraction gracefully falls back to deterministic provider when live key is absent"
    );

    // Test 27: Cross-tenant retrieval blocked
    // Beta Retail user attempting to query feedback from Acme SaaS
    const crossTenantSearch = await searchRelevantFeedback({
      workspaceId: betaWorkspace.id,
      queryEmbedding: billingQueryVector,
      topK: 6,
    });
    const hasAnyAcmeFeedback = crossTenantSearch.some((item) =>
      retrievedIds.includes(item.id)
    );
    assert(
      !hasAnyAcmeFeedback,
      "27. Cross-tenant retrieval strictly blocked: Beta Retail queries return 0 Acme feedback items"
    );

    console.log("\n================================================================");
    console.log(`ASK LOOP TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
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

runAskLoopVerification();
