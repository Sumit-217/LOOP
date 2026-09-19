import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { signupSchema } from "@/lib/validations/auth";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate payload with Zod
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, password, workspaceName } = validation.data;

    // 2. Check for existing user with same email (case-insensitive check)
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 400 }
      );
    }

    // 3. Hash password securely
    const passwordHash = await hashPassword(password);

    // 4. Atomic transaction: Create Workspace + Admin User
    const result = await db.$transaction(async (tx) => {
      // Step A: Create Workspace
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
        },
      });

      // Step B: Create User belonging to new Workspace with Role.ADMIN
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: Role.ADMIN, // Server-enforced initial role
          workspaceId: workspace.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          workspaceId: true,
          createdAt: true,
        },
      });

      return { workspace, user };
    });

    return NextResponse.json(
      {
        message: "Account and workspace created successfully",
        user: result.user,
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
