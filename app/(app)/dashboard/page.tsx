import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session || !session.user) {
    return null;
  }

  const { name, role, workspaceName, workspaceId } = session.user;
  const isAdmin = role === Role.ADMIN;
  const isViewer = role === Role.VIEWER;

  // Fetch real-time count of feedback items in this tenant workspace
  const feedbackCount = await db.feedback.count({
    where: { workspaceId },
  });

  const themesCount = await db.theme.count({
    where: { workspaceId },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Phase 5 — Themes & Trends Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Welcome back, {name || "User"}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Active workspace: <span className="text-white font-medium">{workspaceName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Assigned Role:</span>
            <span
              className={`px-3 py-1 rounded-lg border text-xs font-bold ${
                role === Role.ADMIN
                  ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                  : role === Role.ANALYST
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {role}
            </span>
          </div>
        </div>

        {/* Real-time Workspace Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Ingested Feedback Items</div>
              <div className="text-2xl font-black text-white mt-0.5">{feedbackCount}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              💬
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Configured Themes</div>
              <div className="text-2xl font-black text-white mt-0.5">{themesCount}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
              🏷️
            </div>
          </div>
        </div>

        {/* Themes & Trends Intelligence Banner */}
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-indigo-300">Phase 5 Themes & Trends Intelligence</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore theme clusters, daily sentiment trajectories, volume distribution, and spike detection signals.
            </p>
          </div>
          <Link
            href="/themes"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 whitespace-nowrap active:scale-95"
          >
            Explore Themes & Trends →
          </Link>
        </div>

        {/* Quick Ingestion Action Banner */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-300">Feedback Ingestion Hub</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit single feedback items, import bulk CSV files, or trigger simulated external channel streams.
            </p>
          </div>
          <Link
            href="/feedback/ingest"
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all whitespace-nowrap"
          >
            {isViewer ? "View Ingestion Hub →" : "Ingest Feedback →"}
          </Link>
        </div>

        {/* Role Permissions Card */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs space-y-2">
          <div className="font-semibold text-slate-200">Current Role Privileges:</div>
          <p className="text-slate-400 leading-relaxed">
            {role === Role.ADMIN &&
              "As an Administrator, you have full control over this workspace. You can manage teammates, assign and modify user roles, and access all ingestion and analytics tools."}
            {role === Role.ANALYST &&
              "As an Analyst, you can submit single feedback items, upload bulk CSV files, trigger simulated channel streams, triage inbox statuses, and trigger AI re-classification."}
            {role === Role.VIEWER &&
              "As a Viewer, you have read-only access. You can view feedback, trends, charts, and Voice-of-Customer reports, but cannot modify records or manage team members."}
          </p>
        </div>

        {/* Admin Action Link */}
        {isAdmin && (
          <div className="pt-2">
            <Link
              href="/settings/members"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              Manage Workspace Members & Roles →
            </Link>
          </div>
        )}
      </div>

      {/* Session Security Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
          <div className="text-xs font-medium text-slate-400">Authenticated Tenant ID</div>
          <div className="font-mono text-xs text-indigo-300 break-all bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
            {workspaceId}
          </div>
          <p className="text-[11px] text-slate-500">
            Every database query executed on your behalf is strictly scoped to this workspace ID.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
          <div className="text-xs font-medium text-slate-400">Session Security</div>
          <div className="text-xs text-emerald-400 font-medium bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            JWT Session Active & Persistent
          </div>
          <p className="text-[11px] text-slate-500">
            Passwords remain encrypted as one-way salted hashes; passwordHash is never exposed in sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
