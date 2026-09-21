import { db } from "@/lib/db";
import { validateEmbedding } from "@/lib/embeddings/validation";

export const DEFAULT_TOP_K = 6;
export const MIN_TOP_K = 3;
export const MAX_TOP_K = 8;
export const RELEVANCE_DISTANCE_THRESHOLD = 0.85; // Cosine distance > 0.85 indicates insufficient semantic relevance

export interface RetrievedFeedbackItem {
  id: string;
  content: string;
  channel: string;
  sourceRef: string | null;
  customerLabel: string | null;
  sentiment: string;
  sentimentScore: number;
  status: string;
  featureArea: string | null;
  createdAt: Date;
  themeNames: string[];
  cosineDistance: number;
  similarityScore: number; // 1 - cosineDistance (cosine similarity metric, not a probability)
}

export interface SearchRelevantFeedbackParams {
  workspaceId: string;
  queryEmbedding: number[];
  topK?: number;
}

interface RawRetrievalRow {
  id: string;
  content: string;
  channel: string;
  sourceRef: string | null;
  customerLabel: string | null;
  sentiment: string;
  sentimentScore: number;
  status: string;
  featureArea: string | null;
  createdAt: Date;
  cosineDistance: number;
}

/**
 * Executes a workspace-scoped semantic similarity search against pgvector.
 *
 * CRITICAL TENANT RULE:
 * Workspace filtering happens strictly within the PostgreSQL query:
 *   WHERE f."workspaceId" = ${workspaceId}
 * Never loads other workspaces' data into application memory.
 */
export async function searchRelevantFeedback(
  params: SearchRelevantFeedbackParams
): Promise<RetrievedFeedbackItem[]> {
  const { workspaceId, queryEmbedding, topK = DEFAULT_TOP_K } = params;

  if (!workspaceId) {
    throw new Error("workspaceId is required for semantic retrieval.");
  }

  // 1. Validate query embedding dimension (must be exactly 768)
  validateEmbedding(queryEmbedding);

  // 2. Bound topK between 3 and 8 to prevent unbounded queries
  const boundedTopK = Math.max(MIN_TOP_K, Math.min(MAX_TOP_K, topK));

  // 3. Format vector as PostgreSQL vector literal
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  // 4. Parameterized pgvector cosine search strictly isolated to workspace
  const rows = await db.$queryRaw<RawRetrievalRow[]>`
    SELECT
      f.id,
      f.content,
      f.channel,
      f."sourceRef",
      f."customerLabel",
      f.sentiment,
      f."sentimentScore",
      f.status,
      f."featureArea",
      f."createdAt",
      (e.vector <=> ${vectorLiteral}::vector(768)) AS "cosineDistance"
    FROM "embeddings" e
    JOIN "feedback" f ON f.id = e."feedbackId"
    WHERE f."workspaceId" = ${workspaceId}
    ORDER BY (e.vector <=> ${vectorLiteral}::vector(768)) ASC
    LIMIT ${boundedTopK};
  `;

  if (!rows || rows.length === 0) {
    return [];
  }

  // 5. Fetch associated theme names for the retrieved items
  const retrievedIds = rows.map((r) => r.id);
  const feedbackThemes = await db.feedbackTheme.findMany({
    where: {
      feedbackId: { in: retrievedIds },
    },
    include: {
      theme: {
        select: { name: true },
      },
    },
  });

  const themeMap: Record<string, string[]> = {};
  for (const ft of feedbackThemes) {
    if (!themeMap[ft.feedbackId]) {
      themeMap[ft.feedbackId] = [];
    }
    if (ft.theme?.name) {
      themeMap[ft.feedbackId].push(ft.theme.name);
    }
  }

  // 6. Map and enrich rows
  return rows.map((row) => {
    const dist = Number(row.cosineDistance);
    const clampedDist = Math.max(0, Math.min(2, dist));
    // Cosine similarity in [-1, 1], with 1.0 being identical
    const similarity = Number((1 - clampedDist).toFixed(4));

    return {
      id: row.id,
      content: row.content,
      channel: row.channel,
      sourceRef: row.sourceRef,
      customerLabel: row.customerLabel,
      sentiment: row.sentiment,
      sentimentScore: Number(row.sentimentScore),
      status: row.status,
      featureArea: row.featureArea,
      createdAt: row.createdAt,
      themeNames: themeMap[row.id] || [],
      cosineDistance: Number(clampedDist.toFixed(4)),
      similarityScore: similarity,
    };
  });
}
