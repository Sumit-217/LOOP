import { NextRequest, NextResponse } from "next/server";
import { Role, FeedbackStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.nativeEnum(FeedbackStatus),
});

/**
 * GET /api/feedback/[id]
 * Fetch single feedback item by ID, strictly scoped to authenticated workspace.
 * Accessible to ADMIN, ANALYST, and VIEWER roles.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  const { id } = params;
  const workspaceId = session.user.workspaceId;

  try {
    const feedback = await db.feedback.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ feedback });
  } catch (err: unknown) {
    console.error("Failed to fetch feedback item:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/feedback/[id]
 * Triage feedback status (NEW -> REVIEWED -> ACTIONED).
 * RBAC: Restricted to ADMIN and ANALYST. VIEWER receives 403 Forbidden.
 * Strictly scoped to workspace.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireRole([Role.ADMIN, Role.ANALYST]);
  if (errorResponse || !session) {
    return errorResponse;
  }

  const { id } = params;
  const workspaceId = session.user.workspaceId;

  try {
    const body = await req.json();
    const parseResult = updateStatusSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { status } = parseResult.data;

    // Check that feedback exists within active tenant workspace
    const existing = await db.feedback.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Feedback item not found" },
        { status: 404 }
      );
    }

    const updated = await db.feedback.update({
      where: { id },
      data: { status },
      include: {
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Feedback status updated successfully",
      feedback: updated,
    });
  } catch (err: unknown) {
    console.error("Failed to update feedback status:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
