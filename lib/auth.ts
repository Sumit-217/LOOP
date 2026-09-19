import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. Validate credentials format
        const parseResult = loginSchema.safeParse(credentials);
        if (!parseResult.success) {
          return null;
        }

        const { email, password } = parseResult.data;

        // 2. Find user in database with associated workspace
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { workspace: true },
        });

        // 3. Generic rejection without leaking whether email exists
        if (!user || !user.passwordHash) {
          return null;
        }

        // 4. Verify password with bcrypt
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // 5. Return user details (passwordHash excluded)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId,
          workspaceName: user.workspace.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
        token.workspaceName = user.workspaceName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.workspaceId = token.workspaceId as string;
        session.user.workspaceName = token.workspaceName as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Retrieve current session in Server Components and Route Handlers
 */
export async function getCurrentSession() {
  return await getServerSession(authOptions);
}

/**
 * Server-side authorization guard: requires an active authenticated session
 */
export async function requireAuth() {
  const session = await getCurrentSession();
  if (!session || !session.user || !session.user.workspaceId) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Please log in to access this resource" },
        { status: 401 }
      ),
    };
  }
  return { session, errorResponse: null };
}

/**
 * Server-side RBAC guard: requires active session with role in allowedRoles
 */
export async function requireRole(allowedRoles: Role[]) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse || !session) {
    return { session: null, errorResponse };
  }

  if (!allowedRoles.includes(session.user.role)) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          error: "Forbidden: You do not have permission to perform this action",
          requiredRoles: allowedRoles,
          currentRole: session.user.role,
        },
        { status: 403 }
      ),
    };
  }

  return { session, errorResponse: null };
}

/**
 * Helper to securely hash passwords
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}
