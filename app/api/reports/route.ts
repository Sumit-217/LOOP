import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { reportGenerateInputSchema } from "@/lib/validations/reports";
import { generateVoCReport, getWorkspaceReports } from "@/lib/reports/service";

/**
 * POST /api/reports
 * Generates and saves a new Voice-of-Customer (VoC) report for the active workspace.
 *
 * RBAC: ADMIN and ANALYST only. VIEWER receives 403 Forbidden.
 * Tenant Isolation: workspaceId and userId derived strictly from authenticated session.
 */
export async function POST(req: NextRequest) {
  // 1. Enforce RBAC: only ADMIN and ANALYST can generate reports
  const { session, errorResponse } = await requireRole([Role.ADMIN, Role.ANALYST]);
  if (errorResponse || !session) {
    return errorResponse;
  }

  try {
    const body = await req.json();

    // 2. Validate request payload perimeter
    const parseResult = reportGenerateInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { periodStart, periodEnd, title } = parseResult.data;
    const workspaceId = session.user.workspaceId;
    const userId = session.user.id;

    // 3. Generate and persist report
    const report = await generateVoCReport({
      workspaceId,
      userId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      title,
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/reports] Exception generating VoC report:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Unable to generate VoC report." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports
 * Lists all saved VoC reports for the authenticated workspace.
 *
 * RBAC: ADMIN, ANALYST, and VIEWER are authorized to view reports.
 * Tenant Isolation: Strictly filtered by session workspaceId.
 */
export async function GET() {
  // 1. Authenticate caller
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  try {
    const workspaceId = session.user.workspaceId;
    const reports = await getWorkspaceReports(workspaceId);

    return NextResponse.json({ reports }, { status: 200 });
  } catch (err: unknown) {
    console.error("[GET /api/reports] Exception fetching saved reports:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Unable to fetch reports." },
      { status: 500 }
    );
  }
}
