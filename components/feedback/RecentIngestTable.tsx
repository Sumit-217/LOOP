"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FeedbackStatus, Sentiment, Role } from "@prisma/client";
import ClassifyFeedbackButton from "./ClassifyFeedbackButton";

interface RecentItem {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  sourceRef: string | null;
  sentiment: Sentiment;
  sentimentScore: number;
  featureArea: string | null;
  rationale: string | null;
  status: FeedbackStatus;
  createdAt: string;
  themes?: Array<{
    theme: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
}

interface RecentIngestTableProps {
  refreshTrigger?: number;
  userRole?: Role;
}

export default function RecentIngestTable({ refreshTrigger, userRole }: RecentIngestTableProps) {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback?limit=15");
      if (!res.ok) throw new Error("Failed to load workspace feedback");
      const data = await res.json();
      setItems(data.items || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentItems();
  }, [fetchRecentItems, refreshTrigger]);

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

  const renderSentimentBadge = (item: RecentItem) => {
    const isClassified = Boolean(item.featureArea || item.sentimentScore !== 0.0 || item.sentiment !== "NEU");

    if (!isClassified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-slate-700 bg-slate-900/60 text-slate-400 text-[10px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          Unclassified
        </span>
      );
    }

    if (item.sentiment === "POS") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          POS {item.sentimentScore > 0 ? `+${item.sentimentScore.toFixed(2)}` : item.sentimentScore.toFixed(2)}
        </span>
      );
    }

    if (item.sentiment === "NEG") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-300 font-bold text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          NEG {item.sentimentScore.toFixed(2)}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold text-[10px]">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        NEU {item.sentimentScore >= 0 ? `+${item.sentimentScore.toFixed(2)}` : item.sentimentScore.toFixed(2)}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Recently Ingested & Classified Feedback</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Showing latest {items.length} items from {totalCount} total in active workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRecentItems}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Feed
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Loading workspace feedback...
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          No feedback items found in this workspace yet. Ingest your first item above!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Sentiment</th>
                <th className="py-2.5 px-3">Feature Area</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Content & Rationale</th>
                <th className="py-2.5 px-3">Themes</th>
                <th className="py-2.5 px-3 text-right">AI Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item) => {
                const isClassified = Boolean(item.featureArea || item.sentimentScore !== 0.0 || item.sentiment !== "NEU");

                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Sentiment & Score */}
                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      {renderSentimentBadge(item)}
                    </td>

                    {/* Feature Area */}
                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      {item.featureArea ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold text-[10px]">
                          {item.featureArea}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Channel */}
                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${getChannelBadge(
                          item.channel
                        )}`}
                      >
                        {item.channel}
                      </span>
                    </td>

                    {/* Content & Rationale */}
                    <td className="py-3 px-3 max-w-sm align-top space-y-1">
                      <p className="text-slate-200 line-clamp-2">{item.content}</p>
                      {item.rationale && (
                        <p className="text-[11px] text-indigo-300/80 italic line-clamp-1">
                          💡 {item.rationale}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        {item.customerLabel && <span>{item.customerLabel}</span>}
                        {item.sourceRef && <span>• {item.sourceRef}</span>}
                      </div>
                    </td>

                    {/* Themes */}
                    <td className="py-3 px-3 align-top">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {item.themes && item.themes.length > 0 ? (
                          item.themes.map((t) => (
                            <span
                              key={t.theme.id}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-700 bg-slate-800 text-slate-300"
                            >
                              {t.theme.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">—</span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 whitespace-nowrap text-right align-top">
                      <ClassifyFeedbackButton
                        feedbackId={item.id}
                        isClassified={isClassified}
                        userRole={userRole}
                        onSuccess={fetchRecentItems}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
