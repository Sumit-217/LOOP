import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/members
 * Retrieve all users in the authenticated caller's workspace
 */
export async function GET() {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return errorResponse;
  }

  const members = await db.user.findMany({
    where: {
      workspaceId: session.user.workspaceId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json({
    workspaceId: session.user.workspaceId,
    workspaceName: session.user.workspaceName,
    members,
  });
}
