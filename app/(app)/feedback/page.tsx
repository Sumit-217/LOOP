"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FeedbackStatus, Sentiment, Role } from "@prisma/client";
import ClassifyFeedbackButton from "@/components/feedback/ClassifyFeedbackButton";

interface ThemeItem {
  theme: {
    id: string;
    name: string;
    color: string | null;
  };
}

interface FeedbackItem {
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
  themes?: ThemeItem[];
}

interface AvailableTheme {
  themeId: string;
  name: string;
}

export default function FeedbackInboxPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isViewer = userRole === Role.VIEWER;

  // Filter and Query States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [channel, setChannel] = useState("ALL");
  const [sentiment, setSentiment] = useState("ALL");
  const [themeId, setThemeId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Data States
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableThemes, setAvailableThemes] = useState<AvailableTheme[]>([]);

  // Inline Triage Status Transition States
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [triageError, setTriageError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to first page on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load available themes for filter dropdown
  useEffect(() => {
    async function loadThemes() {
      try {
        const res = await fetch("/api/themes?range=90d");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.themes)) {
            setAvailableThemes(
              data.themes.map((t: { themeId: string; name: string }) => ({
                themeId: t.themeId,
                name: t.name,
              }))
            );
          }
        }
      } catch {
        // Silently fallback if themes fail
      }
    }
    loadThemes();
  }, []);

  // Fetch Feedback Items
  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    if (debouncedSearch) params.set("search", debouncedSearch);
    if (channel !== "ALL") params.set("channel", channel);
    if (sentiment !== "ALL") params.set("sentiment", sentiment);
    if (themeId !== "ALL") params.set("themeId", themeId);
    if (status !== "ALL") params.set("status", status);

    try {
      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load feedback items");
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, channel, sentiment, themeId, status]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Handle inline status triage mutation
  const handleStatusChange = async (itemId: string, newStatus: FeedbackStatus) => {
    if (isViewer) return;

    // Optimistically update UI
    const previousItems = [...items];
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
    );
    setUpdatingId(itemId);
    setTriageError(null);

    try {
      const res = await fetch(`/api/feedback/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update status");
      }
    } catch (err: unknown) {
      // Revert optimistic update
      setItems(previousItems);
      setTriageError(err instanceof Error ? err.message : "Failed to update triage status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case "SUPPORT_TICKET":
        return "border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "APP_STORE":
        return "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
      case "NPS_SURVEY":
        return "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400";
      case "SALES_NOTE":
        return "border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400";
      case "COMMUNITY":
        return "border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400";
      default:
        return "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
    }
  };

  const renderSentimentBadge = (item: FeedbackItem) => {
    const isClassified = Boolean(item.featureArea || item.sentimentScore !== 0.0 || item.sentiment !== "NEU");

    if (!isClassified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[10px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
          Unclassified
        </span>
      );
    }

    if (item.sentiment === "POS") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          POS {item.sentimentScore > 0 ? `+${item.sentimentScore.toFixed(2)}` : item.sentimentScore.toFixed(2)}
        </span>
      );
    }

    if (item.sentiment === "NEG") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          NEG {item.sentimentScore.toFixed(2)}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[10px]">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        NEU {item.sentimentScore.toFixed(2)}
      </span>
    );
  };

  const getStatusBadgeStyle = (st: FeedbackStatus) => {
    switch (st) {
      case "NEW":
        return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "REVIEWED":
        return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "ACTIONED":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setChannel("ALL");
    setSentiment("ALL");
    setThemeId("ALL");
    setStatus("ALL");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            C4 Feedback Triage
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Feedback Inbox
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Search, filter, and triage real customer feedback across all channels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total records: <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span>
          </div>
          {isViewer && (
            <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium">
              Viewer (Read-Only)
            </span>
          )}
        </div>
      </div>

      {/* Triage Error Alert if PATCH fails */}
      {triageError && (
        <div className="p-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
          <span>{triageError}</span>
          <button
            onClick={() => setTriageError(null)}
            className="text-xs font-bold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Search Content / Customer
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search feedback keywords..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Channel Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="ALL">All Channels</option>
              <option value="SUPPORT_TICKET">Support Ticket</option>
              <option value="APP_STORE">App Store</option>
              <option value="NPS_SURVEY">NPS Survey</option>
              <option value="SALES_NOTE">Sales Note</option>
              <option value="COMMUNITY">Community</option>
            </select>
          </div>

          {/* Sentiment Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Sentiment
            </label>
            <select
              value={sentiment}
              onChange={(e) => {
                setSentiment(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="ALL">All Sentiments</option>
              <option value="POS">Positive (POS)</option>
              <option value="NEU">Neutral (NEU)</option>
              <option value="NEG">Negative (NEG)</option>
            </select>
          </div>

          {/* Theme Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Theme
            </label>
            <select
              value={themeId}
              onChange={(e) => {
                setThemeId(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="ALL">All Themes</option>
              {availableThemes.map((t) => (
                <option key={t.themeId} value={t.themeId}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Triage Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="ACTIONED">Actioned</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(debouncedSearch || channel !== "ALL" || sentiment !== "ALL" || themeId !== "ALL" || status !== "ALL") && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Active filters applied. Showing matching records.
            </span>
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Table & List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="inline-block h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading feedback records...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-xs text-rose-500">
            <p className="font-semibold mb-2">{error}</p>
            <button
              onClick={fetchFeedback}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <div className="text-2xl">📭</div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No feedback found</div>
            <p>No customer feedback matches the current search or filter combination.</p>
            <button
              onClick={resetFilters}
              className="mt-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">Customer / Channel</th>
                  <th className="py-3 px-4 font-semibold">Feedback Content</th>
                  <th className="py-3 px-4 font-semibold">Sentiment</th>
                  <th className="py-3 px-4 font-semibold">Feature Area / Themes</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Status Triage</th>
                  {!isViewer && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Customer / Channel */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-slate-200">
                        {item.customerLabel || "Anonymous"}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getChannelBadge(
                            item.channel
                          )}`}
                        >
                          {item.channel}
                        </span>
                      </div>
                    </td>

                    {/* Content */}
                    <td className="py-3 px-4 align-top max-w-md">
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {item.content}
                      </p>
                      {item.rationale && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-1">
                          AI Reasoning: {item.rationale}
                        </p>
                      )}
                    </td>

                    {/* Sentiment */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      {renderSentimentBadge(item)}
                    </td>

                    {/* Feature Area & Themes */}
                    <td className="py-3 px-4 align-top">
                      {item.featureArea && (
                        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mb-1">
                          {item.featureArea}
                        </div>
                      )}
                      {item.themes && item.themes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.themes.map(({ theme }) => (
                            <span
                              key={theme.id}
                              className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]"
                            >
                              {theme.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 align-top whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Inline Status Triage */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      {isViewer ? (
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      ) : (
                        <select
                          value={item.status}
                          disabled={updatingId === item.id}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value as FeedbackStatus)
                          }
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${getStatusBadgeStyle(
                            item.status
                          )}`}
                        >
                          <option value="NEW">NEW</option>
                          <option value="REVIEWED">REVIEWED</option>
                          <option value="ACTIONED">ACTIONED</option>
                        </select>
                      )}
                    </td>

                    {/* Actions (Classify) */}
                    {!isViewer && (
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <ClassifyFeedbackButton
                          feedbackId={item.id}
                          isClassified={item.featureArea !== null}
                          userRole={userRole}
                          onSuccess={() => fetchFeedback()}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && items.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-900 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(page * limit, totalCount)}
              </span>{" "}
              of <span className="font-semibold text-slate-900 dark:text-white">{totalCount}</span> items
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Previous
              </button>

              <span className="px-2 text-slate-700 dark:text-slate-300 font-medium">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
