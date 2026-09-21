import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { askLoopInputSchema } from "@/lib/validations/ask-loop";
import { getEmbeddingProvider } from "@/lib/embeddings";
import {
  searchRelevantFeedback,
  RELEVANCE_DISTANCE_THRESHOLD,
  RetrievedFeedbackItem,
} from "@/lib/rag/retrieval";
import { buildRagContext } from "@/lib/rag/context";
import { getRagAnswerProvider, NO_DATA_ANSWER } from "@/lib/rag";
import { EnrichedRagCitation } from "@/lib/rag/types";

/**
 * POST /api/ask-loop
 * Grounded Question-Answering over Workspace Feedback (RAG).
 *
 * RBAC: All authenticated workspace members (ADMIN, ANALYST, VIEWER) may ask questions.
 * Multi-Tenancy: Scoped strictly to the session user's workspaceId. Client cannot supply workspaceId.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate caller
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  try {
    const body = await req.json();

    // 2. Validate request payload perimeter
    const parseResult = askLoopInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { question, topK } = parseResult.data;
    const workspaceId = session.user.workspaceId;

    // 3. Generate RETRIEVAL_QUERY embedding for user question
    let queryEmbedding: number[];
    try {
      const embeddingProvider = getEmbeddingProvider();
      queryEmbedding = await embeddingProvider.embedQuery(question);
    } catch (embedErr) {
      console.error("[Ask LOOP] Failed to generate query embedding:", embedErr);
      return NextResponse.json(
        { error: "Embedding service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // 4. Perform workspace-isolated pgvector cosine similarity search
    let retrievedFeedback: RetrievedFeedbackItem[];
    try {
      retrievedFeedback = await searchRelevantFeedback({
        workspaceId,
        queryEmbedding,
        topK,
      });
    } catch (dbErr) {
      console.error("[Ask LOOP] Database vector retrieval failed:", dbErr);
      return NextResponse.json(
        { error: "Retrieval service failed to query workspace feedback." },
        { status: 500 }
      );
    }

    // 5. Relevance / No-Data perimeter check
    // If no records found OR the most relevant record exceeds the distance threshold
    const hasInsufficientEvidence =
      retrievedFeedback.length === 0 ||
      retrievedFeedback[0].cosineDistance > RELEVANCE_DISTANCE_THRESHOLD;

    if (hasInsufficientEvidence) {
      return NextResponse.json({
        answer: NO_DATA_ANSWER,
        citations: [],
        noData: true,
        queryInfo: {
          retrievedCount: 0,
          question,
        },
      });
    }

    // 6. Build bounded RAG context from retrieved evidence
    const context = buildRagContext(retrievedFeedback);
    const retrievedIds = retrievedFeedback.map((f) => f.id);

    // 7. Generate grounded answer via Gemini 2.5 Flash
    let ragResult;
    try {
      const ragProvider = getRagAnswerProvider();
      ragResult = await ragProvider.answerQuestion({
        question,
        context,
        retrievedIds,
      });
    } catch (llmErr) {
      console.error("[Ask LOOP] LLM RAG answering failed:", llmErr);
      return NextResponse.json(
        { error: "AI answer generation encountered an error. Please try again." },
        { status: 500 }
      );
    }

    // 8. Citation verification & metadata enrichment
    // Create lookup map of retrieved feedback
    const feedbackMap = new Map<string, RetrievedFeedbackItem>(
      retrievedFeedback.map((item) => [item.id, item])
    );

    const enrichedCitations: EnrichedRagCitation[] = [];
    for (const citation of ragResult.citations) {
      const matched = feedbackMap.get(citation.feedbackId);
      if (matched) {
        const cleanContent = matched.content.trim();
        const excerpt =
          cleanContent.length > 140 ? `${cleanContent.slice(0, 140)}...` : cleanContent;

        enrichedCitations.push({
          feedbackId: matched.id,
          reason: citation.reason,
          contentExcerpt: excerpt,
          channel: matched.channel,
          customerLabel: matched.customerLabel,
          createdAt:
            matched.createdAt instanceof Date
              ? matched.createdAt.toISOString()
              : String(matched.createdAt),
          similarityScore: matched.similarityScore,
        });
      }
    }

    // 9. Return validated grounded answer
    return NextResponse.json({
      answer: ragResult.answer,
      citations: enrichedCitations,
      noData: false,
      queryInfo: {
        retrievedCount: retrievedFeedback.length,
        question,
      },
    });
  } catch (err: unknown) {
    console.error("[Ask LOOP] Unexpected API exception:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Unable to process Ask LOOP request." },
      { status: 500 }
    );
  }
}
