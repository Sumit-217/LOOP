"use client";

import React from "react";
import { ThemeMetrics } from "@/lib/themes/types";

interface ThemeCardProps {
  theme: ThemeMetrics;
  onSelect: (themeId: string) => void;
}

export default function ThemeCard({ theme, onSelect }: ThemeCardProps) {
  const {
    id,
    name,
    description,
    color,
    totalCount,
    positiveCount,
    neutralCount,
    negativeCount,
    unclassifiedCount,
    negativePercentage,
    averageSentimentScore,
    change,
  } = theme;

  // Calculate percentages for sentiment distribution bar
  const posWidth = totalCount > 0 ? (positiveCount / totalCount) * 100 : 0;
  const neuWidth = totalCount > 0 ? (neutralCount / totalCount) * 100 : 0;
  const negWidth = totalCount > 0 ? (negativeCount / totalCount) * 100 : 0;
  const unclassWidth = totalCount > 0 ? (unclassifiedCount / totalCount) * 100 : 0;

  return (
    <div
      onClick={() => onSelect(id)}
      className="group relative p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg shadow-black/20 hover:shadow-indigo-500/5 hover:-translate-y-0.5"
    >
      <div>
        {/* Header: Theme color pill & Name & Change badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3.5 w-3.5 rounded-md flex-shrink-0 shadow-sm"
              style={{ backgroundColor: color || "#6366F1" }}
            />
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
              {name}
            </h3>
          </div>

          {/* Change / Spike Badge */}
          {change && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                change.isSpike
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300 animate-pulse"
                  : change.direction === "UP"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : change.direction === "DOWN"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-700 bg-slate-800/60 text-slate-400"
              }`}
              title={change.description}
            >
              {change.direction === "UP" && "↑"}
              {change.direction === "DOWN" && "↓"}
              {change.direction === "FLAT" && "•"}
              {change.isSpike
                ? "Spike"
                : change.absoluteChange !== 0
                ? `${change.percentageChange > 0 ? "+" : ""}${change.percentageChange}%`
                : "Flat"}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
              Total
            </span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              {totalCount}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
              Negative
            </span>
            <span
              className={`text-lg font-bold mt-0.5 block ${
                negativePercentage >= 50
                  ? "text-rose-400"
                  : negativePercentage >= 25
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              {negativePercentage}%
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
              Avg Score
            </span>
            <span
              className={`text-lg font-bold mt-0.5 block ${
                averageSentimentScore !== null
                  ? averageSentimentScore > 0.2
                    ? "text-emerald-400"
                    : averageSentimentScore < -0.2
                    ? "text-rose-400"
                    : "text-slate-300"
                  : "text-slate-500"
              }`}
            >
              {averageSentimentScore !== null
                ? averageSentimentScore > 0
                  ? `+${averageSentimentScore.toFixed(2)}`
                  : averageSentimentScore.toFixed(2)
                : "—"}
            </span>
          </div>
        </div>

        {/* Sentiment Mini-Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              POS: {positiveCount}
            </span>
            <span className="flex items-center gap-1 text-slate-400 font-medium">
              NEU: {neutralCount}
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              NEG: {negativeCount}
            </span>
            {unclassifiedCount > 0 && (
              <span className="flex items-center gap-1 text-slate-500 italic font-mono text-[10px]">
                Unclass: {unclassifiedCount}
              </span>
            )}
          </div>

          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
            {posWidth > 0 && (
              <div
                style={{ width: `${posWidth}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Positive: ${positiveCount} (${posWidth.toFixed(1)}%)`}
              />
            )}
            {neuWidth > 0 && (
              <div
                style={{ width: `${neuWidth}%` }}
                className="bg-slate-400 h-full transition-all"
                title={`Neutral (Classified): ${neutralCount} (${neuWidth.toFixed(1)}%)`}
              />
            )}
            {negWidth > 0 && (
              <div
                style={{ width: `${negWidth}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Negative: ${negativeCount} (${negWidth.toFixed(1)}%)`}
              />
            )}
            {unclassWidth > 0 && (
              <div
                style={{ width: `${unclassWidth}%` }}
                className="bg-slate-700 border-l border-slate-800 h-full transition-all"
                title={`Unclassified: ${unclassifiedCount} (${unclassWidth.toFixed(1)}%)`}
              />
            )}
          </div>
        </div>

        {/* Action Prompt */}
        <div className="flex items-center justify-between pt-1 text-xs text-indigo-400 group-hover:text-indigo-300 font-medium">
          <span>Drill down feedback</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
    </div>
  );
}
