"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FeedbackStatus } from "@prisma/client";

interface RecentItem {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  sourceRef: string | null;
  status: FeedbackStatus;
  createdAt: string;
}

interface RecentIngestTableProps {
  refreshTrigger?: number;
}

export default function RecentIngestTable({ refreshTrigger }: RecentIngestTableProps) {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback?limit=10");
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

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Recently Ingested Feedback</h2>
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
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Customer Cohort</th>
                <th className="py-2.5 px-3">Content</th>
                <th className="py-2.5 px-3">Source Ref</th>
                <th className="py-2.5 px-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-bold text-[10px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${getChannelBadge(
                        item.channel
                      )}`}
                    >
                      {item.channel}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                    {item.customerLabel || "—"}
                  </td>
                  <td className="py-3 px-3 max-w-md text-slate-200">
                    <p className="line-clamp-2">{item.content}</p>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                    {item.sourceRef || "—"}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-right text-slate-500 text-[11px]">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
