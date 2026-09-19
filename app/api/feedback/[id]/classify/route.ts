import { NextRequest, NextResponse } from "next/server";
import { Role, Sentiment } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getAIClassificationProvider } from "@/lib/ai";

/**
 * POST /api/feedback/[id]/classify
 * Runs AI classification on a single feedback item using provider abstraction (Gemini 2.5 Flash).
 *
 * RBAC: Restricted to ADMIN and ANALYST. VIEWER receives 403 Forbidden.
 * Tenant Isolation: Strictly scoped to session.user.workspaceId (foreign IDs return 404).
 * Safety: Entire update runs in a transaction. If AI classification fails, previous valid classification is preserved.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. RBAC Guard: ADMIN & ANALYST only
  const { session, errorResponse } = await requireRole([Role.ADMIN, Role.ANALYST]);
  if (errorResponse || !session) {
    return errorResponse;
  }

  const feedbackId = params.id;
  const workspaceId = session.user.workspaceId;

  try {
    // 2. Locate feedback strictly scoped to current workspace
    const feedback = await db.feedback.findFirst({
      where: {
        id: feedbackId,
        workspaceId,
      },
      include: {
        themes: {
          include: { theme: true },
        },
      },
    });

    // Foreign workspace IDs or non-existent IDs return non-disclosing 404
    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback item not found" },
        { status: 404 }
      );
    }

    // 3. Retrieve existing themes belonging to this workspace
    const existingThemes = await db.theme.findMany({
      where: { workspaceId },
    });
    const themeNames = existingThemes.map((t) => t.name);

    // 4. Resolve AI provider (Gemini 2.5 Flash or Mock fallback in dev)
    const provider = getAIClassificationProvider();

    // 5. Execute classification
    // If provider fails, error is caught and existing record is untouched
    const classification = await provider.classifyFeedback(
      feedback.content,
      themeNames
    );

    // 6. Map classified themes to existing workspace theme IDs ONLY
    // Does NOT create new themes dynamically
    const matchedThemeIds: string[] = [];
    for (const themeName of classification.themes) {
      const found = existingThemes.find(
        (t) => t.name.toLowerCase() === themeName.toLowerCase()
      );
      if (found && !matchedThemeIds.includes(found.id)) {
        matchedThemeIds.push(found.id);
      }
    }

    // 7. Atomic transaction: update Feedback fields and replace FeedbackTheme relations
    const updatedFeedback = await db.$transaction(async (tx) => {
      // Safely replace previous theme links
      await tx.feedbackTheme.deleteMany({
        where: { feedbackId: feedback.id },
      });

      if (matchedThemeIds.length > 0) {
        await tx.feedbackTheme.createMany({
          data: matchedThemeIds.map((themeId) => ({
            feedbackId: feedback.id,
            themeId,
            confidence: 0.95,
          })),
        });
      }

      // Update feedback record
      return await tx.feedback.update({
        where: { id: feedback.id },
        data: {
          sentiment: classification.sentiment as Sentiment,
          sentimentScore: classification.sentimentScore,
          featureArea: classification.featureArea,
          rationale: classification.rationale,
        },
        include: {
          themes: {
            include: { theme: true },
          },
        },
      });
    });

    return NextResponse.json({
      message: "Feedback classified successfully",
      feedback: updatedFeedback,
      provider: {
        name: provider.name,
        model: provider.model,
      },
    });
  } catch (err: unknown) {
    console.error(`[AI Classification Error] Feedback ${feedbackId}:`, err);
    return NextResponse.json(
      {
        error: "AI classification failed",
        details: err instanceof Error ? err.message : "Internal error occurred",
      },
      { status: 500 }
    );
  }
}
