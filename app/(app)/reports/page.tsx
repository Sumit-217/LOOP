"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { SavedReportSummary } from "@/lib/reports/types";

// Helper to format Date to YYYY-MM-DD for date inputs
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ReportsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const userRole = session?.user?.role;
  const isViewer = userRole === Role.VIEWER;

  // Preset Date range state (default 30 days)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(30);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return toDateInputValue(new Date());
  });
  const [reportTitle, setReportTitle] = useState<string>("");

  // Reports data state
  const [savedReports, setSavedReports] = useState<SavedReportSummary[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Apply preset date ranges
  const applyPreset = (days: number) => {
    setSelectedPreset(days);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(end));
  };

  // Fetch saved reports on mount
  const loadReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) {
        throw new Error(`Failed to load reports (${res.status})`);
      }
      const data = await res.json();
      setSavedReports(data.reports || []);
    } catch (err) {
      console.error("Error loading saved reports:", err);
      setErrorMessage("Failed to load saved reports. Please refresh the page.");
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Handle report generation
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGenerating(true);

    try {
      const startDateTime = new Date(`${startDate}T00:00:00.000Z`).toISOString();
      const endDateTime = new Date(`${endDate}T23:59:59.999Z`).toISOString();

      if (new Date(startDateTime) > new Date(endDateTime)) {
        throw new Error("Start date must be before or equal to end date.");
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: startDateTime,
          periodEnd: endDateTime,
          title: reportTitle.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate report.");
      }

      setSuccessMessage("Report generated and saved successfully! Redirecting...");
      router.push(`/reports/${data.report.id}`);
    } catch (err: unknown) {
      console.error("Generation error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Report generation failed.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide uppercase mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              VoC Reporting Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Voice of Customer (VoC) Reports
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Synthesize executive digests, inspect sentiment shifts against previous cycles, uncover top theme trajectories, and generate prioritized action plans grounded in real customer quotes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Your Role:</span>
            <span
              className={`px-3 py-1 rounded-lg border text-xs font-bold ${
                userRole === Role.ADMIN
                  ? "border-purple-200 dark:border-purple-500/40 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300"
                  : userRole === Role.ANALYST
                  ? "border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {userRole || "USER"}
            </span>
          </div>
        </div>

        {/* Viewer Role Info Banner */}
        {isViewer && (
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <span>👁️</span>
            <span>
              You have <strong>Viewer</strong> privileges. You can view, export, print, and share existing reports, but generating new reports requires an Analyst or Admin role.
            </span>
          </div>
        )}
      </div>

      {/* Report Generator Form Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📊</span>
            Generate New VoC Report
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select a reporting date window. LOOP will automatically calculate metrics and compare against the preceding period of identical duration.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleGenerateReport} className="space-y-5">
          {/* Quick Date Range Presets */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Quick Date Presets</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Last 7 Days", days: 7 },
                { label: "Last 14 Days", days: 14 },
                { label: "Last 30 Days", days: 30 },
                { label: "Last 60 Days", days: 60 },
                { label: "Last 90 Days", days: 90 },
              ].map((p) => (
                <button
                  type="button"
                  key={p.days}
                  onClick={() => applyPreset(p.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedPreset === p.days
                      ? "border border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Pickers & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Period Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedPreset(null);
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Period End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedPreset(null);
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Custom Title <span className="text-slate-400 dark:text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Q3 Voice-of-Customer Review"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                maxLength={120}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isGenerating || isViewer}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                isViewer
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                  : isGenerating
                  ? "bg-blue-700 text-blue-200 cursor-wait"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Synthesizing VoC Intelligence...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Generate VoC Report</span>
                </>
              )}
            </button>
            {isGenerating && (
              <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                Evaluating sentiment shifts, top themes, quotes, and recommendations...
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Saved Reports Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📁</span>
              Saved VoC Reports
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical Voice of Customer reports generated for this workspace. Reports are immutable snapshots.
            </p>
          </div>
          <button
            onClick={loadReports}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors shadow-sm"
          >
            Refresh
          </button>
        </div>

        {isLoadingReports ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="inline-block animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
            <div className="text-xs text-slate-400">Loading saved workspace reports...</div>
          </div>
        ) : savedReports.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3">
            <div className="text-3xl">📑</div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No VoC reports saved yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select a date range above and click &quot;Generate VoC Report&quot; to synthesize your workspace&apos;s first Voice-of-Customer executive digest.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedReports.map((r) => (
              <Link
                key={r.id}
                href={`/reports/${r.id}`}
                className="group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-all space-y-3 flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {r.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-semibold whitespace-nowrap">
                      {r.totalFeedback} items
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {r.executiveSummaryExcerpt || "Executive digest and prioritized action recommendations."}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span>🗓️</span>
                    <span>
                      {new Date(r.periodStart).toLocaleDateString()} — {new Date(r.periodEnd).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline transition-colors">
                    View Report →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
