import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-2xl w-full text-center space-y-8 p-8 sm:p-12 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-sm">
        {/* Phase Indicator Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold tracking-wide uppercase">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
          Phase 2 — Authentication & RBAC
        </div>

        {/* Brand & Pitch */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            Project LOOP
          </h1>
          <p className="text-lg sm:text-xl font-medium text-slate-300">
            AI Customer-Feedback Intelligence Platform
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Multi-tenant credentials authentication with NextAuth.js, secure salted password hashing, and server-side role-based access control (ADMIN, ANALYST, VIEWER).
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/25"
          >
            Sign In to Workspace
          </Link>
          <Link
            href="/signup"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-sm text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            Create New Workspace
          </Link>
        </div>

        {/* Role Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-xs">
          <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5">
            <div className="text-purple-300 font-bold uppercase tracking-wider text-[10px]">ADMIN</div>
            <div className="text-slate-300 font-medium mt-1">Full Workspace Control</div>
            <div className="text-slate-500 mt-0.5">Manage team members, change roles, all analyst & viewer actions.</div>
          </div>
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <div className="text-blue-300 font-bold uppercase tracking-wider text-[10px]">ANALYST</div>
            <div className="text-slate-300 font-medium mt-1">Feedback Triage</div>
            <div className="text-slate-500 mt-0.5">Ingest single/CSV items, triage status, reclassify. Cannot manage members.</div>
          </div>
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="text-emerald-300 font-bold uppercase tracking-wider text-[10px]">VIEWER</div>
            <div className="text-slate-300 font-medium mt-1">Read-Only Insights</div>
            <div className="text-slate-500 mt-0.5">Explore dashboards, trends, and VoC reports without mutation rights.</div>
          </div>
        </div>

        {/* Health Smoke Check Button & Status */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Auth Layer: <span className="text-emerald-400 font-medium">NextAuth Credentials Ready</span>
          </div>
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium inline-flex items-center gap-1.5"
          >
            Check API Health <span>→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
