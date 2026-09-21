"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SavedReportDetail } from "@/lib/reports/types";

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<SavedReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Report not found or you do not have permission to view it.");
          }
          throw new Error(`Failed to load report (HTTP ${res.status})`);
        }
        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        console.error("Failed to load report detail:", err);
        setError(err instanceof Error ? err.message : "Error loading report");
      } finally {
        setIsLoading(false);
      }
    }

    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  // Export report as JSON file
  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanTitle = (report.title || "voc-report")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    link.download = `${cleanTitle}-${report.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Copy shareable protected link
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareNotice("Shareable report link copied to clipboard! (Authentication required to view)");
      setTimeout(() => setShareNotice(null), 4000);
    } catch {
      setShareNotice("Could not auto-copy. URL: " + window.location.href);
      setTimeout(() => setShareNotice(null), 6000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="inline-block animate-spin h-8 w-8 border-3 border-indigo-500 border-t-transparent rounded-full" />
        <div className="text-sm text-slate-400">Loading Voice of Customer report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-lg font-bold text-rose-200">Unable to View Report</h2>
        <p className="text-xs text-rose-300/80">{error || "Report does not exist or has been deleted."}</p>
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            ← Return to Reports Hub
          </Link>
        </div>
      </div>
    );
  }

  const { content } = report;
  const metrics = content.metrics;
  const shifts = content.sentimentShifts;

  // Sentiment bar distribution
  const totalClassified = metrics.classifiedCount || 1;
  const posPct = Math.round((metrics.positiveCount / totalClassified) * 100);
  const neuPct = Math.round((metrics.neutralCount / totalClassified) * 100);
  const negPct = 100 - posPct - neuPct;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 report-print-container">
      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header,
          nav,
          .no-print {
            display: none !important;
          }
          .report-print-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-card {
            border: 1px solid #e2e8f0 !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
          .print-text-muted {
            color: #475569 !important;
          }
        }
      `}</style>

      {/* Breadcrumb & Navigation (hidden in print) */}
      <div className="flex items-center justify-between no-print">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <span>←</span> Back to VoC Reports Hub
        </Link>
      </div>

      {/* Action Notice (hidden in print) */}
      {shareNotice && (
        <div className="p-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 text-xs flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span>🔗</span>
            <span>{shareNotice}</span>
          </div>
          <button onClick={() => setShareNotice(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Report Header & Action Bar */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm space-y-5 print-card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Voice of Customer Executive Report
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight print-text-dark">
              {report.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 print-text-muted">
              <div>
                <strong>Reporting Period:</strong> {new Date(report.periodStart).toLocaleDateString()} —{" "}
                {new Date(report.periodEnd).toLocaleDateString()} ({content.period.durationDays} days)
              </div>
              <span className="text-slate-600">•</span>
              <div>
                <strong>Prior Comparison:</strong> {new Date(content.comparisonPeriod.start).toLocaleDateString()} —{" "}
                {new Date(content.comparisonPeriod.end).toLocaleDateString()}
              </div>
              <span className="text-slate-600">•</span>
              <div>
                <strong>Generated:</strong> {new Date(report.createdAt).toLocaleDateString()}
              </div>
              {report.generatedBy && (
                <>
                  <span className="text-slate-600">•</span>
                  <div>
                    <strong>Author:</strong> {report.generatedBy.name} ({report.generatedBy.email})
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons (hidden in print) */}
          <div className="flex items-center gap-2 no-print self-start">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              title="Copy shareable URL"
            >
              <span>🔗</span> Share Link
            </button>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              title="Export raw report data as JSON"
            >
              <span>💾</span> Export JSON
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
              title="Print report or save as PDF"
            >
              <span>🖨️</span> Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* 1. Executive Summary */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-3 print-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 print-text-dark flex items-center gap-2">
          <span>📋</span> Executive Summary
        </h2>
        <div className="text-xs sm:text-sm text-slate-300 print-text-dark leading-relaxed whitespace-pre-line space-y-2">
          {content.executiveSummary}
        </div>
      </div>

      {/* 2. Feedback Volume & Sentiment Shifts KPIs */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 print-text-dark flex items-center gap-2">
          <span>📈</span> Feedback Volume & Sentiment Trajectory
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Volume */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 print-card space-y-1.5">
            <div className="text-xs text-slate-400 print-text-muted font-medium">Total Feedback Volume</div>
            <div className="text-2xl font-black text-white print-text-dark">{metrics.totalFeedback}</div>
            <div className="text-[11px] flex items-center gap-1.5 font-medium">
              <span
                className={
                  shifts.volumeChange > 0
                    ? "text-indigo-400"
                    : shifts.volumeChange < 0
                    ? "text-slate-400"
                    : "text-slate-500"
                }
              >
                {shifts.volumeChange > 0 ? "▲" : shifts.volumeChange < 0 ? "▼" : "•"}
                {shifts.volumeChange > 0 ? `+${shifts.volumeChange}` : shifts.volumeChange} ({shifts.volumeChangePercentage}%)
              </span>
              <span className="text-slate-500 print-text-muted">vs prior period ({shifts.comparisonMetrics.totalFeedback})</span>
            </div>
          </div>

          {/* Negative Sentiment Share */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 print-card space-y-1.5">
            <div className="text-xs text-slate-400 print-text-muted font-medium">Negative Sentiment Share</div>
            <div className="text-2xl font-black text-rose-400">{metrics.negativePercentage.toFixed(1)}%</div>
            <div className="text-[11px] flex items-center gap-1.5 font-medium">
              <span
                className={
                  shifts.negativePercentageShift > 0
                    ? "text-rose-400"
                    : shifts.negativePercentageShift < 0
                    ? "text-emerald-400"
                    : "text-slate-500"
                }
              >
                {shifts.negativePercentageShift > 0 ? "▲" : shifts.negativePercentageShift < 0 ? "▼" : "•"}
                {shifts.negativePercentageShift > 0 ? `+${shifts.negativePercentageShift.toFixed(1)}` : shifts.negativePercentageShift.toFixed(1)} pts
              </span>
              <span className="text-slate-500 print-text-muted">vs prior ({shifts.comparisonMetrics.negativePercentage.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Average Sentiment Score */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 print-card space-y-1.5">
            <div className="text-xs text-slate-400 print-text-muted font-medium">Average Sentiment Score</div>
            <div className="text-2xl font-black text-white print-text-dark">
              {metrics.averageSentimentScore !== null ? (metrics.averageSentimentScore >= 0 ? `+${metrics.averageSentimentScore.toFixed(2)}` : metrics.averageSentimentScore.toFixed(2)) : "N/A"}
            </div>
            <div className="text-[11px] flex items-center gap-1.5 font-medium">
              {shifts.averageScoreShift !== null ? (
                <>
                  <span
                    className={
                      shifts.averageScoreShift > 0
                        ? "text-emerald-400"
                        : shifts.averageScoreShift < 0
                        ? "text-rose-400"
                        : "text-slate-500"
                    }
                  >
                    {shifts.averageScoreShift > 0 ? "▲" : shifts.averageScoreShift < 0 ? "▼" : "•"}
                    {shifts.averageScoreShift > 0 ? `+${shifts.averageScoreShift.toFixed(2)}` : shifts.averageScoreShift.toFixed(2)} pts
                  </span>
                  <span className="text-slate-500 print-text-muted">vs prior</span>
                </>
              ) : (
                <span className="text-slate-500 print-text-muted">No comparison baseline</span>
              )}
            </div>
          </div>

          {/* Classification Coverage */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 print-card space-y-1.5">
            <div className="text-xs text-slate-400 print-text-muted font-medium">Classification Coverage</div>
            <div className="text-2xl font-black text-white print-text-dark">
              {metrics.classifiedCount}{" "}
              <span className="text-xs font-normal text-slate-400 print-text-muted">/ {metrics.totalFeedback}</span>
            </div>
            <div className="text-[11px] text-slate-500 print-text-muted">
              {metrics.unclassifiedCount} unclassified records
            </div>
          </div>
        </div>

        {/* Sentiment Distribution Bar */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 print-card space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300 print-text-dark">
            <span className="font-semibold">Sentiment Breakdown (Classified: {metrics.classifiedCount})</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Positive ({metrics.positiveCount})
              </span>
              <span className="text-slate-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400" /> Neutral ({metrics.neutralCount})
              </span>
              <span className="text-rose-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Negative ({metrics.negativeCount})
              </span>
            </div>
          </div>

          {metrics.classifiedCount > 0 ? (
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-950">
              <div style={{ width: `${posPct}%` }} className="bg-emerald-500 transition-all" title={`Positive: ${posPct}%`} />
              <div style={{ width: `${neuPct}%` }} className="bg-slate-500 transition-all" title={`Neutral: ${neuPct}%`} />
              <div style={{ width: `${negPct}%` }} className="bg-rose-500 transition-all" title={`Negative: ${negPct}%`} />
            </div>
          ) : (
            <div className="h-3 w-full rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">
              No classified records in period
            </div>
          )}

          <div className="pt-1 text-xs text-slate-400 print-text-muted italic">
            &quot;{shifts.shiftDescription}&quot;
          </div>
        </div>
      </div>

      {/* 3. Top Themes */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 print-text-dark flex items-center gap-2">
          <span>🏷️</span> Top Customer Themes
        </h2>

        {content.topThemes.length === 0 ? (
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500 print-card">
            No themes classified for feedback in this reporting period.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 print-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Theme Name</th>
                  <th className="py-3 px-3 text-right">Volume</th>
                  <th className="py-3 px-3 text-right">% Period</th>
                  <th className="py-3 px-3 text-right">Neg Items</th>
                  <th className="py-3 px-3 text-right">Neg Rate</th>
                  <th className="py-3 px-3 text-right">Avg Score</th>
                  <th className="py-3 px-4 text-right">Volume Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 print-text-dark">
                {content.topThemes.map((theme) => (
                  <tr key={theme.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: theme.color || "#6366F1" }}
                      />
                      <span className="truncate max-w-[200px]">{theme.name}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white print-text-dark">
                      {theme.count}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400 print-text-muted">
                      {theme.percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-400">
                      {theme.negativeCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-400">
                      {theme.negativePercentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {theme.averageSentimentScore !== null ? (
                        <span
                          className={
                            theme.averageSentimentScore > 0
                              ? "text-emerald-400"
                              : theme.averageSentimentScore < 0
                              ? "text-rose-400"
                              : "text-slate-400"
                          }
                        >
                          {theme.averageSentimentScore >= 0 ? `+${theme.averageSentimentScore.toFixed(2)}` : theme.averageSentimentScore.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-600">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      <span
                        className={
                          theme.volumeChange > 0
                            ? "text-indigo-400"
                            : theme.volumeChange < 0
                            ? "text-slate-400"
                            : "text-slate-500"
                        }
                      >
                        {theme.volumeChange > 0 ? `+${theme.volumeChange}` : theme.volumeChange}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Representative Customer Quotes */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 print-text-dark flex items-center gap-2">
          <span>💬</span> Representative Customer Quotes
        </h2>
        <p className="text-xs text-slate-500 print-text-muted">
          Actual feedback items captured in this period, preserving authentic customer voices and IDs.
        </p>

        {content.representativeQuotes.length === 0 ? (
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500 print-card">
            No customer quotes available for this period.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {content.representativeQuotes.map((q) => (
              <div
                key={q.feedbackId}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 print-card space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                        q.sentiment === "NEG"
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                          : q.sentiment === "POS"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-slate-500/40 bg-slate-500/10 text-slate-300"
                      }`}
                    >
                      {q.sentiment} ({q.sentimentScore >= 0 ? `+${q.sentimentScore.toFixed(2)}` : q.sentimentScore.toFixed(2)})
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 print-text-muted">
                      #{q.feedbackId.slice(-8)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 print-text-dark italic leading-relaxed">
                    &quot;{q.content}&quot;
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-400 print-text-muted">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {q.channel}
                    </span>
                    {q.customerLabel && (
                      <span className="text-slate-500">[{q.customerLabel}]</span>
                    )}
                  </div>
                  {q.themeNames.length > 0 && (
                    <div className="flex items-center gap-1">
                      {q.themeNames.slice(0, 2).map((tn) => (
                        <span key={tn} className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {tn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Prioritized Recommendations */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 print-text-dark flex items-center gap-2">
          <span>🎯</span> Prioritized Recommendations
        </h2>
        <p className="text-xs text-slate-500 print-text-muted">
          Action items synthesized from feedback trends, negative themes, and customer evidence.
        </p>

        {content.recommendations.length === 0 ? (
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500 print-card">
            No recommendations generated.
          </div>
        ) : (
          <div className="space-y-3">
            {content.recommendations.map((rec, idx) => (
              <div
                key={rec.id || idx}
                className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 print-card space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold tracking-wide ${
                        rec.priority === "HIGH"
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                          : rec.priority === "MEDIUM"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border-blue-500/40 bg-blue-500/10 text-blue-300"
                      }`}
                    >
                      {rec.priority} PRIORITY
                    </span>
                    <span className="text-xs font-semibold text-indigo-400 print-text-dark">
                      Area: {rec.area}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 print-text-muted">
                    ID: {rec.id}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white print-text-dark">{rec.title}</h3>
                <p className="text-xs text-slate-300 print-text-dark leading-relaxed">
                  {rec.description}
                </p>

                <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/60 print-card text-[11px] text-slate-400 print-text-muted">
                  <strong className="text-slate-300 print-text-dark">Traceable Evidence: </strong>
                  {rec.evidence}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
