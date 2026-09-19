"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ThemeMetrics, TrendsApiResponse, TrendRange } from "@/lib/themes/types";
import ThemeCard from "./ThemeCard";
import ThemesTable from "./ThemesTable";
import ThemeTrendChart from "./ThemeTrendChart";
import ThemeDrillDownModal from "./ThemeDrillDownModal";

export default function ThemesIntelligenceClient() {
  const [themes, setThemes] = useState<ThemeMetrics[]>([]);
  const [trendsData, setTrendsData] = useState<TrendsApiResponse | null>(null);
  const [selectedRange, setSelectedRange] = useState<TrendRange>("30d");
  const [selectedThemeForTrend, setSelectedThemeForTrend] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Drill down modal state
  const [drillDownThemeId, setDrillDownThemeId] = useState<string | null>(null);

  // Loading & error states
  const [isLoadingThemes, setIsLoadingThemes] = useState<boolean>(true);
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch themes overview
  const fetchThemes = useCallback(async () => {
    setIsLoadingThemes(true);
    setError(null);
    try {
      const res = await fetch(`/api/themes?range=${selectedRange}`);
      if (!res.ok) throw new Error("Failed to load workspace themes overview");
      const data = await res.json();
      setThemes(data.themes || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching themes");
    } finally {
      setIsLoadingThemes(false);
    }
  }, [selectedRange]);

  // 2. Fetch trend intelligence
  const fetchTrends = useCallback(async () => {
    setIsLoadingTrends(true);
    try {
      const params = new URLSearchParams();
      params.set("range", selectedRange);
      if (selectedThemeForTrend !== "ALL") {
        params.set("themeId", selectedThemeForTrend);
      }
      const res = await fetch(`/api/themes/trends?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load workspace theme trends");
      const data = await res.json();
      setTrendsData(data);
    } catch (err: unknown) {
      console.error("Trends fetch error:", err);
    } finally {
      setIsLoadingTrends(false);
    }
  }, [selectedRange, selectedThemeForTrend]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // High-level workspace rollups
  const totalThemes = themes.length;
  const totalFeedbackCount = themes.reduce((acc, t) => acc + t.totalCount, 0);
  const totalClassifiedCount = themes.reduce((acc, t) => acc + t.classifiedCount, 0);
  const totalNegativeCount = themes.reduce((acc, t) => acc + t.negativeCount, 0);
  const overallNegativePct =
    totalClassifiedCount > 0
      ? Math.round((totalNegativeCount / totalClassifiedCount) * 1000) / 10
      : 0;

  const spikingThemes = themes.filter((t) => t.change?.isSpike);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Phase 5 — Themes & Trends Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Themes & Trends Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Workspace-scoped feedback clustering, volume dynamics, sentiment trajectories, and deterministic spike detection.
          </p>
        </div>

        {/* Global Date Range Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Window:</span>
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
            {(["7d", "30d", "60d"] as TrendRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedRange === r
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r === "7d" ? "Last 7 Days" : r === "30d" ? "Last 30 Days" : "Last 60 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active Themes
            </span>
            <div className="text-2xl font-black text-white mt-1">{totalThemes}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Workspace taxonomy
            </span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
            🏷️
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Theme Feedback Links
            </span>
            <div className="text-2xl font-black text-white mt-1">{totalFeedbackCount}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {totalClassifiedCount} classified
            </span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
            💬
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Overall Negative %
            </span>
            <div
              className={`text-2xl font-black mt-1 ${
                overallNegativePct >= 40
                  ? "text-rose-400"
                  : overallNegativePct >= 20
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {overallNegativePct}%
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {totalNegativeCount} negative signals
            </span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-lg">
            ⚠️
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Spike Signals
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {spikingThemes.length}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {spikingThemes.length > 0 ? "Themes with surges" : "Stable volume"}
            </span>
          </div>
          <div
            className={`h-11 w-11 rounded-xl border flex items-center justify-center font-bold text-lg ${
              spikingThemes.length > 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {spikingThemes.length > 0 ? "🔥" : "✓"}
          </div>
        </div>
      </div>

      {/* Spiking Themes Alert Banner if any */}
      {spikingThemes.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-amber-400 text-lg flex-shrink-0">⚠️</span>
            <div>
              <div className="text-xs font-bold text-amber-300">
                Volume Surge Detected in {spikingThemes.length} Theme(s)
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {spikingThemes.map((t) => `${t.name} (${t.change?.percentageChange > 0 ? "+" : ""}${t.change?.percentageChange}%)`).join(", ")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDrillDownThemeId(spikingThemes[0].id)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold whitespace-nowrap transition-colors"
          >
            Inspect {spikingThemes[0].name} →
          </button>
        </div>
      )}

      {/* Trend Visualizer */}
      <ThemeTrendChart
        trendsData={trendsData}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        selectedThemeId={selectedThemeForTrend}
        onThemeSelect={setSelectedThemeForTrend}
        isLoading={isLoadingTrends}
      />

      {/* Themes Taxonomy Overview Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h3 className="text-lg font-bold text-white">Workspace Themes</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any theme to drill down into underlying customer feedback items and sentiments.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Card Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Table View
            </button>
          </div>
        </div>

        {/* Content States */}
        {isLoadingThemes ? (
          <div className="p-12 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
            <p className="text-xs text-slate-400">Loading themes intelligence...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
            {error}
          </div>
        ) : themes.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
            <h4 className="text-sm font-semibold text-white">No themes have classified feedback yet</h4>
            <p className="text-xs text-slate-400 mt-1">
              Run AI classification on ingested feedback items to populate theme intelligence.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {themes.map((t) => (
              <ThemeCard
                key={t.id}
                theme={t}
                onSelect={(id) => setDrillDownThemeId(id)}
              />
            ))}
          </div>
        ) : (
          <ThemesTable
            themes={themes}
            onSelect={(id) => setDrillDownThemeId(id)}
          />
        )}
      </div>

      {/* Drill-Down Modal Dialog */}
      {drillDownThemeId && (
        <ThemeDrillDownModal
          themeId={drillDownThemeId}
          onClose={() => setDrillDownThemeId(null)}
        />
      )}
    </div>
  );
}
