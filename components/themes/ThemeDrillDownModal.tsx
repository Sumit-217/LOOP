"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ThemeDrillDownResponse, ThemeFeedbackItem } from "@/lib/themes/types";

interface ThemeDrillDownModalProps {
  themeId: string | null;
  onClose: () => void;
}

export default function ThemeDrillDownModal({
  themeId,
  onClose,
}: ThemeDrillDownModalProps) {
  const [data, setData] = useState<ThemeDrillDownResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and pagination state
  const [page, setPage] = useState<number>(1);
  const [sentimentFilter, setSentimentFilter] = useState<string>("ALL");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  const fetchDrillDownData = useCallback(async () => {
    if (!themeId) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "10");
      if (sentimentFilter !== "ALL") params.set("sentiment", sentimentFilter);
      if (channelFilter !== "ALL") params.set("channel", channelFilter);

      const res = await fetch(`/api/themes/${themeId}/feedback?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Theme not found or inaccessible in this workspace.");
        throw new Error("Failed to load theme feedback records.");
      }

      const json: ThemeDrillDownResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching drill-down data");
    } finally {
      setIsLoading(false);
    }
  }, [themeId, page, sentimentFilter, channelFilter]);

  useEffect(() => {
    fetchDrillDownData();
  }, [fetchDrillDownData]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!themeId) return null;

  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case "SUPPORT_TICKET":
        return "border-blue-500/30 bg-blue-500/10 text-blue-400";
      case "APP_STORE":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      case "NPS_SURVEY":
        return "border-amber-500/30 bg-amber-500/10 text-amber-400";
      case "SALES_NOTE":
        return "border-purple-500/30 bg-purple-500/10 text-purple-400";
      case "COMMUNITY":
        return "border-cyan-500/30 bg-cyan-500/10 text-cyan-400";
      default:
        return "border-slate-500/30 bg-slate-500/10 text-slate-400";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="h-4 w-4 rounded-md flex-shrink-0 shadow-sm"
                style={{ backgroundColor: data?.theme.color || "#6366F1" }}
              />
              <h2 className="text-xl font-bold text-white">
                {data?.theme.name || "Theme Drill-Down"}
              </h2>
            </div>
            {data?.theme.description && (
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {data.theme.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Theme Metrics Quick Summary Bar */}
        {data?.metrics && (
          <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                Total: <strong className="text-white">{data.metrics.totalCount}</strong>
              </span>
              <span className="text-slate-400">
                Negative:{" "}
                <strong
                  className={
                    data.metrics.negativePercentage >= 50
                      ? "text-rose-400"
                      : data.metrics.negativePercentage >= 25
                      ? "text-amber-400"
                      : "text-slate-200"
                  }
                >
                  {data.metrics.negativePercentage}%
                </strong>
              </span>
              <span className="text-slate-400">
                Avg Score:{" "}
                <strong className="text-indigo-300">
                  {data.metrics.averageSentimentScore !== null
                    ? data.metrics.averageSentimentScore > 0
                      ? `+${data.metrics.averageSentimentScore.toFixed(2)}`
                      : data.metrics.averageSentimentScore.toFixed(2)
                    : "—"}
                </strong>
              </span>
            </div>

            {/* Change text */}
            {data.metrics.change && (
              <div className="text-[11px] text-slate-400 italic">
                {data.metrics.change.description}
              </div>
            )}
          </div>
        )}

        {/* Filter Controls */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sentiment Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Sentiment:</span>
              <select
                value={sentimentFilter}
                onChange={(e) => {
                  setSentimentFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Sentiments</option>
                <option value="POS">Positive (POS)</option>
                <option value="NEU">Neutral (Classified NEU)</option>
                <option value="NEG">Negative (NEG)</option>
                <option value="UNCLASSIFIED">Unclassified</option>
              </select>
            </div>

            {/* Channel Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Channel:</span>
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Channels</option>
                <option value="SUPPORT_TICKET">Support Tickets</option>
                <option value="APP_STORE">App Store</option>
                <option value="NPS_SURVEY">NPS Survey</option>
                <option value="SALES_NOTE">Sales Note</option>
                <option value="COMMUNITY">Community</option>
              </select>
            </div>
          </div>

          {/* Records count indicator */}
          {data?.pagination && (
            <span className="text-slate-400 font-mono text-[11px]">
              Showing {data.items.length} of {data.pagination.total} items
            </span>
          )}
        </div>

        {/* Modal Body: Feedback Items List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
              <p className="text-xs text-slate-400">Loading theme feedback...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
              {error}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <p className="text-sm font-semibold text-slate-300">
                No feedback is currently associated with this theme
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {sentimentFilter !== "ALL" || channelFilter !== "ALL"
                  ? "Try resetting the sentiment or channel filter to view other records."
                  : "Newly ingested feedback classified with this theme will appear here."}
              </p>
            </div>
          ) : (
            data.items.map((item: ThemeFeedbackItem) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-2 hover:border-slate-700 transition-colors"
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded border font-semibold ${getChannelBadge(
                        item.channel
                      )}`}
                    >
                      {item.channel}
                    </span>

                    {item.customerLabel && (
                      <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800/60 text-slate-300">
                        {item.customerLabel}
                      </span>
                    )}

                    {item.sourceRef && (
                      <span className="text-slate-500 font-mono text-[10px]">
                        Ref: {item.sourceRef}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Sentiment Badge */}
                    {!item.isClassified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-slate-700 bg-slate-900/60 text-slate-400 text-[10px] font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        Unclassified
                      </span>
                    ) : item.sentiment === "POS" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        POS {item.sentimentScore > 0 ? `+${item.sentimentScore.toFixed(2)}` : item.sentimentScore.toFixed(2)}
                      </span>
                    ) : item.sentiment === "NEG" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-300 font-bold text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        NEG {item.sentimentScore.toFixed(2)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-500/30 bg-slate-500/10 text-slate-300 font-bold text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        NEU {item.sentimentScore.toFixed(2)}
                      </span>
                    )}

                    {/* Feature Area */}
                    {item.featureArea && (
                      <span className="px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-medium text-[10px]">
                        {item.featureArea}
                      </span>
                    )}

                    {/* Date */}
                    <span className="text-slate-500 text-[10px]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs text-slate-200 leading-relaxed">{item.content}</p>

                {/* Rationale if available */}
                {item.rationale && (
                  <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-900 flex items-start gap-1">
                    <span className="text-slate-500 font-semibold flex-shrink-0">AI Note:</span>
                    <span className="italic text-slate-400">{item.rationale}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer: Server-Side Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            <span className="text-slate-400 font-mono">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= data.pagination.totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
