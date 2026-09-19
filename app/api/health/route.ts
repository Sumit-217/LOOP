import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "LOOP",
    version: "0.1.0",
    phase: "Phase 0 - Project Foundation",
    timestamp: new Date().toISOString(),
  });
}
