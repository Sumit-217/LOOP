import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getThemeFeedbackDrillDown } from "@/lib/themes/service";
import { drillDownQuerySchema } from "@/lib/validations/themes";

/**
 * GET /api/themes/[id]/feedback
 * Server-side paginated list of feedback records associated with a theme.
 * Enforces workspace isolation (returns 404 for foreign themes).
 * Supports filters: ?page=1&limit=20&sentiment=POS|NEU|NEG|UNCLASSIFIED&channel=...
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  const themeId = params.id;
  const workspaceId = session.user.workspaceId;

  const { searchParams } = new URL(req.url);
  const parsed = drillDownQuerySchema.safeParse({
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 20,
    sentiment: searchParams.get("sentiment") || undefined,
    channel: searchParams.get("channel") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const drillDown = await getThemeFeedbackDrillDown(
      workspaceId,
      themeId,
      parsed.data
    );

    if (!drillDown) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(drillDown);
  } catch (err: unknown) {
    console.error(`[Theme Feedback Drill-Down Error] ${themeId}:`, err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to fetch theme feedback" },
      { status: 500 }
    );
  }
}
