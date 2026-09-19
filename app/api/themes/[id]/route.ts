import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getWorkspaceThemesOverview } from "@/lib/themes/service";

/**
 * GET /api/themes/[id]
 * Fetches metrics for a single theme strictly scoped to the active workspace.
 * Returns 404 for non-existent or foreign workspace themes.
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

  try {
    const themes = await getWorkspaceThemesOverview(workspaceId);
    const theme = themes.find((t) => t.id === themeId);

    if (!theme) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ theme });
  } catch (err: unknown) {
    console.error(`[Theme Detail Error] ${themeId}:`, err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to fetch theme" },
      { status: 500 }
    );
  }
}
