export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-2xl w-full text-center space-y-8 p-8 sm:p-12 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-sm">
        {/* Phase Indicator Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          Phase 1 — Database & Multi-Tenancy Foundation
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
            Relational multi-tenant schema configured with Prisma ORM and PostgreSQL. Core tenant isolation and database models established.
          </p>
        </div>

        {/* Core Database Schema Entities */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left text-xs">
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="text-slate-400 font-medium">Tenant Root</div>
            <div className="text-sm font-semibold text-white mt-0.5">Workspace</div>
          </div>
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="text-slate-400 font-medium">RBAC Users</div>
            <div className="text-sm font-semibold text-white mt-0.5">User (3 Roles)</div>
          </div>
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="text-slate-400 font-medium">Feedback Hub</div>
            <div className="text-sm font-semibold text-white mt-0.5">Feedback</div>
          </div>
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="text-slate-400 font-medium">Intelligence</div>
            <div className="text-sm font-semibold text-white mt-0.5">Theme & Report</div>
          </div>
        </div>

        {/* Multi-Tenancy Security Rule */}
        <div className="p-4 rounded-xl border border-indigo-950/60 bg-indigo-950/20 text-left text-xs text-indigo-300 space-y-1">
          <div className="font-semibold text-indigo-200 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Mandatory Tenant Isolation Rule (Section 06 & 07)
          </div>
          <p className="text-slate-400">
            Every database query touching feedback, themes, reports, or users is strictly scoped to the authenticated user’s <code className="text-indigo-300 bg-indigo-950/50 px-1 py-0.5 rounded">workspaceId</code>.
          </p>
        </div>

        {/* Health Smoke Check Button & Status */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Data Layer: <span className="text-emerald-400 font-medium">Prisma Client Ready</span>
          </div>
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium inline-flex items-center gap-1.5"
          >
            Verify DB Health <span>→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
