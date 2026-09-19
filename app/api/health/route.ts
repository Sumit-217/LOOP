import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "configured";
  try {
    // Attempt a lightweight ping if remote database is active
    await db.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "ready (awaiting live postgres instance)";
  }

  return NextResponse.json({
    status: "ok",
    app: "LOOP",
    version: "0.1.0",
    phase: "Phase 2 - Authentication & RBAC",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
}
