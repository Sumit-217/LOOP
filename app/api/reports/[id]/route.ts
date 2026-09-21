import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getWorkspaceReportById } from "@/lib/reports/service";

/**
 * GET /api/reports/[id]
 * Fetches a single saved VoC report by ID.
 *
 * RBAC: ADMIN, ANALYST, and VIEWER are authorized to view reports.
 * Tenant Isolation: Strictly filtered by session workspaceId.
 * Foreign or non-existent report IDs return 404 Not Found.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate caller
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  const reportId = params.id;
  const workspaceId = session.user.workspaceId;

  try {
    const report = await getWorkspaceReportById(workspaceId, reportId);

    if (!report) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ report }, { status: 200 });
  } catch (err: unknown) {
    console.error(`[GET /api/reports/${reportId}] Exception:`, err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to fetch report" },
      { status: 500 }
    );
  }
}
