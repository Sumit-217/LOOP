import { NextRequest, NextResponse } from "next/server";
import { Role, Sentiment, FeedbackStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { singleFeedbackSchema } from "@/lib/validations/feedback";
import { embedFeedback } from "@/lib/embeddings/service";

/**
 * GET /api/feedback
 * Fetch feedback items scoped to the authenticated user's workspace.
 * Accessible to ADMIN, ANALYST, and VIEWER roles.
 */
export async function GET(req: NextRequest) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");

  const skip = (page - 1) * limit;
  const workspaceId = session.user.workspaceId;

  // Build filter condition strictly scoped to tenant workspace
  const where: Prisma.FeedbackWhereInput = {
    workspaceId,
  };

  if (channel) {
    where.channel = channel;
  }

  if (status && Object.values(FeedbackStatus).includes(status as FeedbackStatus)) {
    where.status = status as FeedbackStatus;
  }

  try {
    const [items, total] = await Promise.all([
      db.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          themes: {
            include: {
              theme: true,
            },
          },
        },
      }),
      db.feedback.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: unknown) {
    console.error("Failed to fetch feedback:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback
 * Ingest a single feedback item.
 * RBAC: Restricted to ADMIN and ANALYST roles. VIEWER receives 403 Forbidden.
 */
export async function POST(req: NextRequest) {
  // 1. Role enforcement: only ADMIN and ANALYST may ingest feedback
  const { session, errorResponse } = await requireRole([Role.ADMIN, Role.ANALYST]);
  if (errorResponse || !session) {
    return errorResponse;
  }

  try {
    const body = await req.json();

    // 2. Validate input using Zod perimeter defense
    const parseResult = singleFeedbackSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { content, channel, customerLabel, sourceRef } = parseResult.data;

    // 3. Create feedback record strictly scoped to the active workspace
    // Initialized with default status NEW, sentiment NEU, score 0.0
    // Ready for downstream AI classification (Phase 6 boundary)
    const feedback = await db.feedback.create({
      data: {
        content,
        channel,
        customerLabel,
        sourceRef,
        sentiment: Sentiment.NEU,
        sentimentScore: 0.0,
        status: FeedbackStatus.NEW,
        workspaceId: session.user.workspaceId,
      },
    });

    // Attempt document embedding non-blockingly; failure must not abort or roll back feedback ingestion
    try {
      await embedFeedback(feedback.id, session.user.workspaceId);
    } catch (embedErr) {
      console.error(
        `[Feedback Ingestion] Non-blocking embedding generation failed for feedback ${feedback.id}:`,
        embedErr
      );
    }

    return NextResponse.json(
      {
        message: "Feedback ingested successfully",
        feedback,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Failed to create feedback:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to create feedback" },
      { status: 500 }
    );
  }
}
