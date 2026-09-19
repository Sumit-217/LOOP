"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendsApiResponse, TrendRange } from "@/lib/themes/types";

interface ThemeTrendChartProps {
  trendsData: TrendsApiResponse | null;
  selectedRange: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  selectedThemeId: string;
  onThemeSelect: (themeId: string) => void;
  isLoading: boolean;
}

export default function ThemeTrendChart({
  trendsData,
  selectedRange,
  onRangeChange,
  selectedThemeId,
  onThemeSelect,
  isLoading,
}: ThemeTrendChartProps) {
  const [metricMode, setMetricMode] = useState<"volume" | "sentiment">("volume");

  if (isLoading) {
    return (
      <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center min-h-[360px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
        <p className="text-xs text-slate-400">Loading trend intelligence...</p>
      </div>
    );
  }

  if (!trendsData || trendsData.themes.length === 0) {
    return (
      <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/60 text-center min-h-[360px] flex flex-col items-center justify-center">
        <span className="text-2xl mb-2">📊</span>
        <h4 className="text-sm font-semibold text-white">Not enough historical data to display a trend</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Once feedback records are ingested and linked to workspace themes, daily trend volume and sentiment trajectories will appear here.
        </p>
      </div>
    );
  }

  // Determine active theme series or combined
  const isSingleTheme = selectedThemeId !== "ALL";
  const activeThemeSeries = isSingleTheme
    ? trendsData.themes.find((t) => t.themeId === selectedThemeId)
    : null;

  // Format chart data based on selection
  let chartData: Array<Record<string, string | number>> = [];
  if (isSingleTheme && activeThemeSeries) {
    if (metricMode === "sentiment") {
      chartData = activeThemeSeries.points.map((p) => ({
        date: p.date.slice(5), // MM-DD
        Positive: p.positive,
        Neutral: p.neutral,
        Negative: p.negative,
        Unclassified: p.unclassified,
        total: p.count,
      }));
    } else {
      chartData = activeThemeSeries.points.map((p) => ({
        date: p.date.slice(5),
        Volume: p.count,
      }));
    }
  } else {
    // Combined multi-theme timeline
    chartData = trendsData.combinedTimeline.map((item) => {
      const formatted: Record<string, string | number> = {
        date: item.date.slice(5),
        Total: item.total,
      };
      trendsData.themes.forEach((t) => {
        formatted[t.themeName] = item[t.themeName] || 0;
      });
      return formatted;
    });
  }

  const hasAnyData = chartData.some((item) => {
    return Object.keys(item).some(
      (k) => k !== "date" && typeof item[k] === "number" && item[k] > 0
    );
  });

  return (
    <div className="p-5 sm:p-6 rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            <h3 className="text-base font-bold text-white">Trend Intelligence</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSingleTheme && activeThemeSeries
              ? `Displaying trajectory for "${activeThemeSeries.themeName}"`
              : "Aggregated workspace feedback trajectory over time"}
          </p>
        </div>

        {/* Filters & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Theme Selector */}
          <select
            value={selectedThemeId}
            onChange={(e) => onThemeSelect(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="ALL">All Themes (Combined)</option>
            {trendsData.themes.map((t) => (
              <option key={t.themeId} value={t.themeId}>
                {t.themeName}
              </option>
            ))}
          </select>

          {/* Metric Mode Toggle (Visible when single theme selected) */}
          {isSingleTheme && (
            <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setMetricMode("volume")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  metricMode === "volume"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Volume
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("sentiment")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  metricMode === "sentiment"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sentiment
              </button>
            </div>
          )}

          {/* Date Range Selector */}
          <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            {(["7d", "30d", "60d"] as TrendRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedRange === r
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r === "7d" ? "7D" : r === "30d" ? "30D" : "60D"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Visualization */}
      {!hasAnyData ? (
        <div className="h-[280px] rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-xs text-slate-400">
            No feedback activity recorded in the selected {trendsData.rangeDays}-day window.
          </p>
        </div>
      ) : (
        <div className="h-[300px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {isSingleTheme && metricMode === "sentiment" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorNeu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Area
                  type="monotone"
                  dataKey="Positive"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorPos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Neutral"
                  stroke="#94A3B8"
                  fillOpacity={1}
                  fill="url(#colorNeu)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="Negative"
                  stroke="#F43F5E"
                  fillOpacity={1}
                  fill="url(#colorNeg)"
                  strokeWidth={2}
                />
              </AreaChart>
            ) : isSingleTheme ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSingle" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={activeThemeSeries?.color || "#6366F1"}
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="95%"
                      stopColor={activeThemeSeries?.color || "#6366F1"}
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Volume"
                  stroke={activeThemeSeries?.color || "#6366F1"}
                  fillOpacity={1}
                  fill="url(#colorSingle)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke="#6366F1"
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
