import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getEmbeddingProvider } from "./index";
import { validateEmbedding } from "./validation";

export interface EmbedFeedbackResult {
  success: boolean;
  feedbackId: string;
  embeddingId?: string;
  dimension?: number;
  error?: string;
}

export interface BackfillResult {
  workspaceId: string;
  totalFeedback: number;
  alreadyEmbedded: number;
  backfilled: number;
  failed: number;
  skipped: number;
  errors?: Array<{ feedbackId: string; error: string }>;
}

export interface EmbedFeedbackOptions {
  forceMock?: boolean;
}

export interface BackfillOptions {
  batchSize?: number;
  forceMock?: boolean;
}

/**
 * Embeds a single feedback item and persists its 768-dimensional vector into Supabase pgvector.
 * Strictly enforces tenant workspace isolation.
 *
 * Process:
 * 1. Verify feedback exists and belongs to workspaceId.
 * 2. Load feedback content.
 * 3. Generate document embedding (RETRIEVAL_DOCUMENT).
 * 4. Validate exactly 768 dimensions and finite numbers.
 * 5. Persist embedding using parameterized raw SQL upsert.
 * 6. Return metadata.
 */
export async function embedFeedback(
  feedbackId: string,
  workspaceId: string,
  options?: EmbedFeedbackOptions
): Promise<EmbedFeedbackResult> {
  // 1 & 2. Verify feedback exists and belongs to authenticated workspace
  const feedback = await db.feedback.findFirst({
    where: {
      id: feedbackId,
      workspaceId,
    },
    select: {
      id: true,
      content: true,
      workspaceId: true,
    },
  });

  if (!feedback) {
    throw new Error(
      `Tenant boundary violation or feedback not found: Feedback ${feedbackId} does not belong to workspace ${workspaceId}`
    );
  }

  // 3. Generate document embedding
  const provider = getEmbeddingProvider(options);
  const vector = await provider.embedDocument(feedback.content);

  // 4. Validate exactly 768 dimensions and finite numbers
  validateEmbedding(vector);

  // 5. Format vector literal for PostgreSQL pgvector: '[0.01,0.02,...]'
  const vectorLiteral = `[${vector.join(",")}]`;
  const embeddingId = `emb_${randomUUID().replace(/-/g, "")}`;

  // 6. Parameterized upsert using Prisma $executeRaw
  // Never interpolate variables directly; use tagged template parameters
  await db.$executeRaw`
    INSERT INTO "embeddings" ("id", "feedbackId", "vector", "createdAt")
    VALUES (${embeddingId}, ${feedback.id}, ${vectorLiteral}::vector(768), NOW())
    ON CONFLICT ("feedbackId")
    DO UPDATE SET "vector" = ${vectorLiteral}::vector(768), "createdAt" = NOW()
  `;

  return {
    success: true,
    feedbackId: feedback.id,
    embeddingId,
    dimension: vector.length,
  };
}

/**
 * Backfills embeddings for all feedback in a given workspace that do not already have one.
 * Requirements:
 * - Scoped strictly to the target workspace
 * - Safe to rerun (idempotent)
 * - Skips existing embeddings
 * - Creates no duplicates
 * - Small-batch / sequential processing (no background workers or queues)
 */
export async function backfillWorkspaceEmbeddings(
  workspaceId: string,
  options?: BackfillOptions
): Promise<BackfillResult> {
  const batchSize = Math.max(1, Math.min(50, options?.batchSize || 10));

  // 1. Verify workspace exists
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found.`);
  }

  // 2. Count total feedback in workspace
  const totalFeedback = await db.feedback.count({
    where: { workspaceId },
  });

  // 3. Find feedback items that currently lack an embedding
  const unindexedFeedback = await db.feedback.findMany({
    where: {
      workspaceId,
      embedding: null,
    },
    select: {
      id: true,
      content: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const alreadyEmbedded = totalFeedback - unindexedFeedback.length;
  let backfilled = 0;
  let failed = 0;
  const errors: Array<{ feedbackId: string; error: string }> = [];

  // 4. Controlled small-batch processing
  for (let i = 0; i < unindexedFeedback.length; i += batchSize) {
    const batch = unindexedFeedback.slice(i, i + batchSize);

    for (const item of batch) {
      try {
        await embedFeedback(item.id, workspaceId, { forceMock: options?.forceMock });
        backfilled++;
      } catch (err: unknown) {
        failed++;
        errors.push({
          feedbackId: item.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return {
    workspaceId,
    totalFeedback,
    alreadyEmbedded,
    backfilled,
    failed,
    skipped: alreadyEmbedded,
    errors: errors.length > 0 ? errors : undefined,
  };
}
