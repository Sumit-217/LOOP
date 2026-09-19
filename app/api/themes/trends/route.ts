import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getWorkspaceThemesTrends } from "@/lib/themes/service";
import { trendQuerySchema } from "@/lib/validations/themes";
import { TrendRange } from "@/lib/themes/types";

/**
 * GET /api/themes/trends
 * Aggregates daily theme trends over a selectable window (7d, 30d, 60d).
 * Accessible to ADMIN, ANALYST, and VIEWER roles.
 */
export async function GET(req: NextRequest) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  const { searchParams } = new URL(req.url);
  const parsed = trendQuerySchema.safeParse({
    range: searchParams.get("range") || "30d",
    themeId: searchParams.get("themeId") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation error",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { range, themeId } = parsed.data;

  try {
    const trends = await getWorkspaceThemesTrends(
      session.user.workspaceId,
      range as TrendRange,
      themeId
    );

    return NextResponse.json(trends);
  } catch (err: unknown) {
    console.error("[Themes Trends Error]:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to fetch theme trends" },
      { status: 500 }
    );
  }
}
