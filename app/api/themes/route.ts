import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getWorkspaceThemesOverview, parseRangeDays } from "@/lib/themes/service";
import { themeOverviewQuerySchema } from "@/lib/validations/themes";
import { TrendRange } from "@/lib/themes/types";

/**
 * GET /api/themes
 * Fetches workspace-scoped theme overview with volume, sentiment metrics, and period changes.
 * Accessible to ADMIN, ANALYST, and VIEWER roles.
 */
export async function GET(req: NextRequest) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  const { searchParams } = new URL(req.url);
  const parsed = themeOverviewQuerySchema.safeParse({
    range: searchParams.get("range") || "30d",
  });

  const range = parsed.success ? (parsed.data.range as TrendRange) : "30d";
  const rangeDays = parseRangeDays(range);

  try {
    const themes = await getWorkspaceThemesOverview(
      session.user.workspaceId,
      rangeDays
    );

    return NextResponse.json({
      themes,
      range,
      rangeDays,
    });
  } catch (err: unknown) {
    console.error("[Themes Overview Error]:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to fetch themes overview" },
      { status: 500 }
    );
  }
}
