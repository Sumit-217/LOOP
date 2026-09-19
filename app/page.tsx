export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-2xl w-full text-center space-y-8 p-8 sm:p-12 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-sm">
        {/* Phase Indicator Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Phase 0 — Project Foundation
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
            Close the loop on customer feedback. Ingests multi-channel customer input and transforms it into actionable themes, sentiment trends, and grounded answers.
          </p>
        </div>

        {/* Foundation Architecture Status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="text-xs text-slate-400">Framework</div>
            <div className="text-sm font-semibold text-white mt-1">Next.js 14</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="text-xs text-slate-400">Language</div>
            <div className="text-sm font-semibold text-white mt-1">TypeScript</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="text-xs text-slate-400">Styling</div>
            <div className="text-sm font-semibold text-white mt-1">Tailwind CSS</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="text-xs text-slate-400">Router</div>
            <div className="text-sm font-semibold text-white mt-1">App Router</div>
          </div>
        </div>

        {/* Health Smoke Check Button & Status */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Status: <span className="text-emerald-400 font-medium">Foundation Ready</span>
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
