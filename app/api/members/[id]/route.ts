import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { updateRoleSchema } from "@/lib/validations/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/members/[id]
 * Update a workspace member's role (ADMIN only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Enforce ADMIN role server-side
  const { session, errorResponse } = await requireRole([Role.ADMIN]);
  if (errorResponse || !session) {
    return errorResponse;
  }

  const memberId = params.id;

  // 2. Validate role payload
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = updateRoleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { role: newRole } = validation.data;

  // 3. Strict tenant isolation check: target member MUST belong to caller's workspace
  const targetUser = await db.user.findFirst({
    where: {
      id: memberId,
      workspaceId: session.user.workspaceId,
    },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "Member not found in your workspace" },
      { status: 404 }
    );
  }

  // 4. Prevent self-lockout: Admin cannot demote themselves if they are the sole Admin
  if (targetUser.id === session.user.id && newRole !== Role.ADMIN) {
    const otherAdminCount = await db.user.count({
      where: {
        workspaceId: session.user.workspaceId,
        role: Role.ADMIN,
        id: { not: session.user.id },
      },
    });

    if (otherAdminCount === 0) {
      return NextResponse.json(
        {
          error:
            "Cannot demote the only administrator in the workspace. Promote another member to Admin first.",
        },
        { status: 400 }
      );
    }
  }

  // 5. Update role in database
  const updatedMember = await db.user.update({
    where: { id: targetUser.id },
    data: { role: newRole },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      workspaceId: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    message: "Member role updated successfully",
    member: updatedMember,
  });
}
