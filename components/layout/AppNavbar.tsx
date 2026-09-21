"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import ThemeToggle from "./ThemeToggle";

export default function AppNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const role = session?.user?.role;
  const isAdmin = role === Role.ADMIN;

  const getRoleBadgeStyle = (r?: Role) => {
    switch (r) {
      case Role.ADMIN:
        return "border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case Role.ANALYST:
        return "border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case Role.VIEWER:
        return "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      default:
        return "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", active: pathname === "/dashboard" },
    { label: "Feedback Inbox", href: "/feedback", active: pathname === "/feedback" },
    { label: "Ingestion Hub", href: "/feedback/ingest", active: pathname.startsWith("/feedback/ingest") },
    { label: "Themes & Trends", href: "/themes", active: pathname.startsWith("/themes") },
    { label: "Ask LOOP", href: "/ask-loop", active: pathname.startsWith("/ask-loop"), isAi: true },
    { label: "VoC Reports", href: "/reports", active: pathname.startsWith("/reports") },
  ];

  if (isAdmin) {
    navItems.push({
      label: "Members",
      href: "/settings/members",
      active: pathname.startsWith("/settings/members"),
    });
  }

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Active Workspace */}
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
              LOOP
            </span>
          </Link>

          {/* Active Workspace Indicator */}
          {session?.user?.workspaceName && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400">Workspace:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                {session.user.workspaceName}
              </span>
            </div>
          )}

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  item.active
                    ? item.isAi
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    : item.isAi
                    ? "text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Theme Toggle, User Profile, Role Badge, Sign Out, Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle (Accessible to all) */}
          <ThemeToggle />

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
              <div className="hidden sm:block text-right">
                <div className="font-medium text-slate-800 dark:text-slate-200">{session.user.name}</div>
                <div className="text-[11px] text-slate-500">{session.user.email}</div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="hidden sm:inline-flex px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors text-xs font-medium"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
          {session?.user?.workspaceName && (
            <div className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Workspace: <span className="text-slate-800 dark:text-slate-200 font-semibold">{session.user.workspaceName}</span>
            </div>
          )}
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {session?.user && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                Sign out ({session.user.email})
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
