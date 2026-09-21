"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Role } from "@prisma/client";

interface DashboardStats {
  totalFeedbackAllTime: number;
  currentPeriodTotal: number;
  prevPeriodTotal: number;
  volumeDeltaPct: number;
  pctNegative: number;
  newThisWeek: number;
  activeThemes: number;
}

interface VolumeDataPoint {
  date: string;
  label: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

interface SentimentSlice {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface TopThemeItem {
  id: string;
  name: string;
  volume: number;
  positive: number;
  neutral: number;
  negative: number;
  avgSentimentScore: number;
}

interface RecentFeedbackItem {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  sentiment: string;
  sentimentScore: number;
  featureArea: string | null;
  createdAt: string;
}

interface DashboardApiResponse {
  range: string;
  rangeDays: number;
  stats: DashboardStats;
  volumeOverTime: VolumeDataPoint[];
  sentimentDistribution: SentimentSlice[];
  topThemes: TopThemeItem[];
  recentItems: RecentFeedbackItem[];
}

interface DashboardClientProps {
  userRole?: Role;
  userName?: string | null;
  workspaceName?: string | null;
}

export default function DashboardClient({
  userRole,
  userName,
  workspaceName,
}: DashboardClientProps) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (selectedRange: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?range=${selectedRange}`);
      if (!res.ok) throw new Error("Failed to load dashboard analytics");
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching analytics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(range);
  }, [fetchAnalytics, range]);

  return (
    <div className="space-y-6">
      {/* Top Header: Title, Description, Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Executive Feedback Telemetry
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Customer Intelligence Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time synthesized customer signals across all inbound touchpoints for{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {workspaceName || "Active Workspace"}
            </span>
            {userName && (
              <span className="ml-1 text-slate-400 dark:text-slate-500">
                • {userName} ({userRole || "MEMBER"})
              </span>
            )}
            .
          </p>
        </div>

        {/* Date Range Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm self-start sm:self-auto">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                range === r
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse p-4"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
            <div className="h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-8 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-center space-y-3">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{error}</p>
          <button
            onClick={() => fetchAnalytics(range)}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
          >
            Retry Loading Analytics
          </button>
        </div>
      )}

      {/* Main Analytics Content */}
      {data && (
        <>
          {/* C5 Required Stat Cards (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Feedback */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Total Feedback</span>
                <span className="text-base">💬</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {data.stats.totalFeedbackAllTime.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                <span
                  className={`font-semibold px-1.5 py-0.5 rounded ${
                    data.stats.volumeDeltaPct >= 0
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {data.stats.volumeDeltaPct >= 0 ? "+" : ""}
                  {data.stats.volumeDeltaPct}%
                </span>
                <span className="text-slate-400 dark:text-slate-500">vs prev {data.range}</span>
              </div>
            </div>

            {/* 2. % Negative */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>% Negative</span>
                <span className="text-base">⚠️</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {data.stats.pctNegative}%
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Friction index across period
              </div>
            </div>

            {/* 3. New This Week */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>New This Week</span>
                <span className="text-base">📥</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {data.stats.newThisWeek.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Created in last 7 days
              </div>
            </div>

            {/* 4. Active Themes */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Active Themes</span>
                <span className="text-base">🏷️</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {data.stats.activeThemes}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Tracking customer topics
              </div>
            </div>
          </div>

          {/* Charts Row 1: Volume Over Time & Sentiment Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Volume Over Time (Area Chart) */}
            <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Feedback Volume Over Time
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Daily inflow trajectory over the selected {data.range} window
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Total
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Negative
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.volumeOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "0.5rem",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Volume"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                    <Area
                      type="monotone"
                      dataKey="negative"
                      name="Negative Volume"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorNeg)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Sentiment Distribution (Donut Chart) */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sentiment Distribution
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Customer polarity breakdown for period
                </p>
              </div>

              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sentimentDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {data.sentimentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "0.5rem",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                {data.sentimentDistribution.map((s) => (
                  <div key={s.name} className="space-y-0.5">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {s.percentage}%
                    </div>
                    <div className="text-[10px] text-slate-400">({s.value})</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2: Top Themes Ranking & Recent Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 3: Top Themes by Volume (Bar Chart) */}
            <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Top Customer Themes by Volume
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Primary topics driving customer sentiment in this window
                  </p>
                </div>
                <Link
                  href="/themes"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View All Themes →
                </Link>
              </div>

              {data.topThemes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No theme data available for this range.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={data.topThemes}
                      margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                      <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#1e293b",
                          borderRadius: "0.5rem",
                          color: "#f8fafc",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="volume" name="Feedback Volume" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Quick Actions & Recent Signals */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quick Actions
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Key workflows in the LOOP platform
                </p>
              </div>

              <div className="space-y-2">
                <Link
                  href="/feedback"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 bg-slate-50 dark:bg-slate-950/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-xs group"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Feedback Inbox
                    </div>
                    <div className="text-[10px] text-slate-500">Triage incoming feedback items</div>
                  </div>
                  <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>

                <Link
                  href="/ask-loop"
                  className="flex items-center justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-900/40 hover:border-blue-500/60 bg-blue-50/40 dark:bg-blue-950/20 transition-all text-xs group"
                >
                  <div>
                    <div className="font-semibold text-blue-700 dark:text-blue-300">
                      Ask LOOP AI
                    </div>
                    <div className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
                      Conversational semantic synthesis
                    </div>
                  </div>
                  <span className="text-blue-500 group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>

                <Link
                  href="/reports"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 bg-slate-50 dark:bg-slate-950/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-xs group"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      VoC Reports
                    </div>
                    <div className="text-[10px] text-slate-500">Generate executive summaries</div>
                  </div>
                  <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>

                <Link
                  href="/feedback/ingest"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 bg-slate-50 dark:bg-slate-950/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-xs group"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Ingestion Hub
                    </div>
                    <div className="text-[10px] text-slate-500">CSV import & channel simulator</div>
                  </div>
                  <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
