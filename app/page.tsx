import React from "react";
import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Product Name */}
          <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-blue-600/25">
              L
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                LOOP
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                Customer Intelligence
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Platform Features
            </a>
            <a href="#architecture" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              AI &amp; RAG Architecture
            </a>
            <a href="#credentials" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Demo Credentials
            </a>
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              API Online
            </a>
          </nav>

          {/* Theme Toggle & Sign In CTAs */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>

            <Link
              href="/dashboard"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors rounded-lg shadow-sm shadow-blue-600/20"
            >
              Launch Platform &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Enterprise Customer Feedback Intelligence
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Close the Loop on Customer Feedback
            </h1>

            {/* Subheading */}
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Transform dispersed tickets, reviews, NPS surveys, and community discussions into actionable product priorities. Featuring automated AI sentiment classification, pgvector semantic search (Ask LOOP), and synthesized Voice-of-Customer reports.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md shadow-blue-600/20"
              >
                Explore Analytics Dashboard
              </Link>
              <Link
                href="/feedback"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Feedback Inbox &amp; Triage
              </Link>
              <Link
                href="/ask-loop"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Ask LOOP AI (RAG)
              </Link>
            </div>

            {/* Real Stats Ticker */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left max-w-4xl mx-auto">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="text-xl font-bold text-slate-900 dark:text-white">240+</div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Ingested Feedback Signals</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="text-xl font-bold text-slate-900 dark:text-white">768-dim</div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">pgvector Cosine Retrieval</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="text-xl font-bold text-slate-900 dark:text-white">100%</div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Grounded VoC Quotes</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">150 / 150</div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Verification Tests Passing</div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section id="features" className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Everything Product Leaders Need
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                A unified intelligence engine built for Product Managers, Customer Success leads, and Engineering teams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Feature 1 */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold">
                    C4
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Feedback Inbox &amp; Triage
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Filter by channel, sentiment, theme, status, and dates. Advance issues inline from NEW &rarr; REVIEWED &rarr; ACTIONED with strict RBAC enforcement.
                  </p>
                </div>
                <Link
                  href="/feedback"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Open Inbox &rarr;
                </Link>
              </div>

              {/* Feature 2 */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                    C5
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Analytics Dashboard
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Database-driven volume trajectories, sentiment distribution, and ranked top themes over 7d, 30d, and 90d periods. Zero hardcoded fake metrics.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  View Dashboard &rarr;
                </Link>
              </div>

              {/* Feature 3 */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">
                    AI
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ask LOOP Workspace
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Natural language semantic Q&amp;A over workspace feedback powered by 768-dim embeddings and pgvector. Grounded answers with verified citations.
                  </p>
                </div>
                <Link
                  href="/ask-loop"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Ask Questions &rarr;
                </Link>
              </div>

              {/* Feature 4 */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                    VoC
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    VoC Intelligence Reports
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Automated executive summaries, sentiment shift calculations, authentic customer quotes, prioritized action recommendations, and JSON/print export.
                  </p>
                </div>
                <Link
                  href="/reports"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  View Reports &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Credentials Section */}
        <section id="credentials" className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                Instant Evaluation
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Pre-Seeded Demo Accounts
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                Sign in with any of the pre-configured role personas to evaluate permissions, RBAC barriers, and multi-tenant isolation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Admin Card */}
              <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    ADMIN
                  </span>
                  <span className="text-[10px] text-slate-400">Full Access</span>
                </div>
                <div>
                  <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                    admin@loop.demo
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Password: DemoPass123!
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Full control over team members, triage status, AI classification, and executive report generation.
                </p>
                <Link
                  href="/login"
                  className="block w-full py-2 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                >
                  Sign in as Admin
                </Link>
              </div>

              {/* Analyst Card */}
              <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    ANALYST
                  </span>
                  <span className="text-[10px] text-slate-400">Triage &amp; Reports</span>
                </div>
                <div>
                  <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                    analyst@loop.demo
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Password: DemoPass123!
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Authorized for feedback ingestion, status transitions, and VoC reports. Blocked from team administration.
                </p>
                <Link
                  href="/login"
                  className="block w-full py-2 text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                >
                  Sign in as Analyst
                </Link>
              </div>

              {/* Viewer Card */}
              <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    VIEWER
                  </span>
                  <span className="text-[10px] text-slate-400">Read-Only</span>
                </div>
                <div>
                  <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                    viewer@loop.demo
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Password: DemoPass123!
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Read-only access to dashboards, themes, reports, and Ask LOOP. Server returns HTTP 403 on mutations.
                </p>
                <Link
                  href="/login"
                  className="block w-full py-2 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                >
                  Sign in as Viewer
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture & Verification Section */}
        <section id="architecture" className="py-16 sm:py-20 bg-slate-100/60 dark:bg-slate-900/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Engineered for Enterprise Reliability
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                Built on modern web and database standards with zero artificial fluff.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Multi-Tenant Boundary
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Every query is strictly filtered by session workspace ID in database SQL. Foreign queries return 404 with zero data leakage.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-600" />
                  Grounded Citation Checking
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ask LOOP verifies every citation ID against actual retrieved database records. Hallucinations are filtered out at the perimeter.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Deterministic Mathematics
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Comparison periods are strictly contiguous [compStart, periodStart) preventing double-counting with zero-denominator safety.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              L
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Project LOOP</span>
            <span>&bull;</span>
            <span>AI Customer-Feedback Intelligence</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/feedback" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Inbox
            </Link>
            <Link href="/themes" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Themes
            </Link>
            <Link href="/ask-loop" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Ask LOOP
            </Link>
            <Link href="/reports" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              VoC Reports
            </Link>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            Zidio Development Internship &bull; Built with Next.js 14 &amp; Google Stitch
          </div>
        </div>
      </footer>
    </div>
  );
}
