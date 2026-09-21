"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Role } from "@prisma/client";

export default function AppNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const role = session?.user?.role;
  const isAdmin = role === Role.ADMIN;

  const getRoleBadgeStyle = (r?: Role) => {
    switch (r) {
      case Role.ADMIN:
        return "border-purple-500/30 bg-purple-500/10 text-purple-400";
      case Role.ANALYST:
        return "border-blue-500/30 bg-blue-500/10 text-blue-400";
      case Role.VIEWER:
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      default:
        return "border-slate-500/30 bg-slate-500/10 text-slate-400";
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Active Workspace */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              LOOP
            </span>
          </Link>

          {/* Active Workspace Indicator */}
          {session?.user?.workspaceName && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-800 bg-slate-950/60 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Workspace:</span>
              <span className="font-semibold text-white truncate max-w-[180px]">
                {session.user.workspaceName}
              </span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Overview
            </Link>

            <Link
              href="/feedback/ingest"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                pathname.startsWith("/feedback/ingest")
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Ingest Feedback
            </Link>

            <Link
              href="/themes"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                pathname.startsWith("/themes")
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Themes & Trends
            </Link>

            <Link
              href="/ask-loop"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                pathname.startsWith("/ask-loop")
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Ask LOOP
            </Link>

            {isAdmin && (
              <Link
                href="/settings/members"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.startsWith("/settings/members")
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                Team Members
              </Link>
            )}
          </nav>
        </div>

        {/* Right: User Profile, Role Badge, Sign Out */}
        <div className="flex items-center gap-3">
          {session?.user && (
            <div className="flex items-center gap-2.5 text-xs">
              {/* Role Badge */}
              <span
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${getRoleBadgeStyle(
                  role
                )}`}
              >
                {role || "USER"}
              </span>

              {/* User Name / Email */}
              <div className="hidden md:block text-right">
                <div className="font-medium text-slate-200">{session.user.name}</div>
                <div className="text-[11px] text-slate-500">{session.user.email}</div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-medium"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
