import { NextRequest, NextResponse } from "next/server";
import { Role, Sentiment, FeedbackStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { csvRowSchema, bulkFeedbackPayloadSchema } from "@/lib/validations/feedback";

interface BulkRowError {
  row: number;
  error: string;
  field?: string;
  snippet?: string;
}

/**
 * Helper to normalize raw CSV object keys regardless of capitalization/underscores
 */
function normalizeCsvRow(raw: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, "");

    if (cleanKey === "content" || cleanKey === "text" || cleanKey === "feedback" || cleanKey === "comment") {
      normalized.content = value;
    } else if (cleanKey === "channel" || cleanKey === "source" || cleanKey === "type") {
      normalized.channel = value;
    } else if (cleanKey === "customerlabel" || cleanKey === "customer" || cleanKey === "user" || cleanKey === "tier" || cleanKey === "segment") {
      normalized.customerLabel = value;
    } else if (cleanKey === "sourceref" || cleanKey === "ref" || cleanKey === "ticketid" || cleanKey === "reviewid" || cleanKey === "url") {
      normalized.sourceRef = value;
    } else if (cleanKey === "createdat" || cleanKey === "date" || cleanKey === "timestamp") {
      normalized.createdAt = value;
    }
  }

  // Fallback to direct properties if present
  if (!normalized.content && raw.content) normalized.content = raw.content;
  if (!normalized.channel && raw.channel) normalized.channel = raw.channel;
  if (!normalized.customerLabel && (raw.customer_label || raw.customerLabel)) {
    normalized.customerLabel = raw.customer_label || raw.customerLabel;
  }
  if (!normalized.sourceRef && (raw.source_ref || raw.sourceRef)) {
    normalized.sourceRef = raw.source_ref || raw.sourceRef;
  }
  if (!normalized.createdAt && (raw.created_at || raw.createdAt)) {
    normalized.createdAt = raw.created_at || raw.createdAt;
  }

  return normalized;
}

/**
 * POST /api/feedback/bulk
 * Bulk ingestion of feedback items (from CSV import).
 * RBAC: Restricted to ADMIN and ANALYST roles. VIEWER receives 403 Forbidden.
 * Reports exact counts of imported vs. failed items with line-by-line error diagnostics.
 */
export async function POST(req: NextRequest) {
  // 1. RBAC Guard: Only ADMIN and ANALYST may perform bulk imports
  const { session, errorResponse } = await requireRole([Role.ADMIN, Role.ANALYST]);
  if (errorResponse || !session) {
    return errorResponse;
  }

  try {
    const body = await req.json();

    // 2. Validate payload envelope
    const envelopeResult = bulkFeedbackPayloadSchema.safeParse(body);
    if (!envelopeResult.success) {
      return NextResponse.json(
        {
          error: "Invalid bulk import payload",
          details: envelopeResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const rawRows = envelopeResult.data.items;
    const workspaceId = session.user.workspaceId;

    const validRecords: Array<{
      content: string;
      channel: string;
      customerLabel: string | null;
      sourceRef: string | null;
      sentiment: Sentiment;
      sentimentScore: number;
      status: FeedbackStatus;
      workspaceId: string;
      createdAt?: Date;
    }> = [];

    const errors: BulkRowError[] = [];

    // 3. Row-by-row perimeter validation
    for (let index = 0; index < rawRows.length; index++) {
      const raw = rawRows[index];
      const rowNumber = index + 1; // 1-indexed row representation

      // Skip completely empty rows
      if (!raw || Object.values(raw).every((val) => val === null || val === undefined || String(val).trim() === "")) {
        continue;
      }

      const normalized = normalizeCsvRow(raw);
      const parseResult = csvRowSchema.safeParse(normalized);

      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0];
        const fieldName = firstIssue?.path[0] ? String(firstIssue.path[0]) : "unknown";
        const message = firstIssue?.message || "Validation failed";
        const rawContent = normalized.content ? String(normalized.content) : "";
        const snippet = rawContent.length > 50 ? `${rawContent.substring(0, 50)}...` : rawContent;

        errors.push({
          row: rowNumber,
          field: fieldName,
          error: message,
          snippet: snippet || undefined,
        });
      } else {
        const { content, channel, customerLabel, sourceRef, createdAt } = parseResult.data;

        validRecords.push({
          content,
          channel,
          customerLabel: customerLabel || null,
          sourceRef: sourceRef || null,
          sentiment: Sentiment.NEU,
          sentimentScore: 0.0,
          status: FeedbackStatus.NEW,
          workspaceId,
          ...(createdAt ? { createdAt } : {}),
        });
      }
    }

    // 4. Batch insert valid records
    let importedCount = 0;
    if (validRecords.length > 0) {
      const result = await db.feedback.createMany({
        data: validRecords,
      });
      importedCount = result.count;
    }

    const failedCount = errors.length;
    const totalProcessed = importedCount + failedCount;

    // 5. Build detailed reporting summary
    const responsePayload = {
      message: `Bulk import completed: ${importedCount} imported, ${failedCount} failed`,
      total: totalProcessed,
      imported: importedCount,
      failed: failedCount,
      errors,
    };

    if (importedCount === 0 && failedCount > 0) {
      return NextResponse.json(responsePayload, { status: 422 });
    }

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (err: unknown) {
    console.error("Failed to process bulk import:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to process bulk feedback import" },
      { status: 500 }
    );
  }
}
