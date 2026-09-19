"use client";

import React from "react";
import { ThemeMetrics } from "@/lib/themes/types";

interface ThemesTableProps {
  themes: ThemeMetrics[];
  onSelect: (themeId: string) => void;
}

export default function ThemesTable({ themes, onSelect }: ThemesTableProps) {
  if (themes.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <p className="text-slate-400 text-sm">No themes found in this workspace.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <tr>
            <th className="py-3 px-4">Theme</th>
            <th className="py-3 px-4 text-center">Volume</th>
            <th className="py-3 px-4 text-center">Negative %</th>
            <th className="py-3 px-4 text-center">Sentiment Distribution</th>
            <th className="py-3 px-4 text-center">Avg Score</th>
            <th className="py-3 px-4 text-center">30d Change</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {themes.map((theme) => {
            const {
              id,
              name,
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

            const posWidth = totalCount > 0 ? (positiveCount / totalCount) * 100 : 0;
            const neuWidth = totalCount > 0 ? (neutralCount / totalCount) * 100 : 0;
            const negWidth = totalCount > 0 ? (negativeCount / totalCount) * 100 : 0;
            const unclassWidth = totalCount > 0 ? (unclassifiedCount / totalCount) * 100 : 0;

            return (
              <tr
                key={id}
                onClick={() => onSelect(id)}
                className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
              >
                {/* Theme Name & Color */}
                <td className="py-3 px-4 font-medium text-white flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded flex-shrink-0"
                    style={{ backgroundColor: color || "#6366F1" }}
                  />
                  <span className="group-hover:text-indigo-300 transition-colors">
                    {name}
                  </span>
                </td>

                {/* Total Volume */}
                <td className="py-3 px-4 text-center font-bold text-white">
                  {totalCount}
                  {unclassifiedCount > 0 && (
                    <span className="block text-[10px] text-slate-500 font-normal">
                      ({unclassifiedCount} unclass)
                    </span>
                  )}
                </td>

                {/* Negative % */}
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-block font-semibold px-2 py-0.5 rounded text-xs ${
                      negativePercentage >= 50
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        : negativePercentage >= 25
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {negativePercentage}%
                  </span>
                </td>

                {/* Sentiment Distribution Bar */}
                <td className="py-3 px-4">
                  <div className="w-36 mx-auto space-y-1">
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                      {posWidth > 0 && (
                        <div
                          style={{ width: `${posWidth}%` }}
                          className="bg-emerald-500 h-full"
                          title={`POS: ${positiveCount}`}
                        />
                      )}
                      {neuWidth > 0 && (
                        <div
                          style={{ width: `${neuWidth}%` }}
                          className="bg-slate-400 h-full"
                          title={`NEU: ${neutralCount}`}
                        />
                      )}
                      {negWidth > 0 && (
                        <div
                          style={{ width: `${negWidth}%` }}
                          className="bg-rose-500 h-full"
                          title={`NEG: ${negativeCount}`}
                        />
                      )}
                      {unclassWidth > 0 && (
                        <div
                          style={{ width: `${unclassWidth}%` }}
                          className="bg-slate-700 h-full"
                          title={`Unclassified: ${unclassifiedCount}`}
                        />
                      )}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span className="text-emerald-400">{positiveCount}</span>
                      <span className="text-slate-400">{neutralCount}</span>
                      <span className="text-rose-400">{negativeCount}</span>
                    </div>
                  </div>
                </td>

                {/* Average Score */}
                <td className="py-3 px-4 text-center font-mono text-xs">
                  {averageSentimentScore !== null ? (
                    <span
                      className={
                        averageSentimentScore > 0.2
                          ? "text-emerald-400 font-semibold"
                          : averageSentimentScore < -0.2
                          ? "text-rose-400 font-semibold"
                          : "text-slate-300"
                      }
                    >
                      {averageSentimentScore > 0
                        ? `+${averageSentimentScore.toFixed(2)}`
                        : averageSentimentScore.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>

                {/* Change Indicator */}
                <td className="py-3 px-4 text-center text-xs">
                  {change && (
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        change.isSpike
                          ? "text-rose-400"
                          : change.direction === "UP"
                          ? "text-amber-400"
                          : change.direction === "DOWN"
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}
                      title={change.description}
                    >
                      {change.direction === "UP" && "↑"}
                      {change.direction === "DOWN" && "↓"}
                      {change.direction === "FLAT" && "•"}
                      {change.isSpike
                        ? `Spike (+${change.absoluteChange})`
                        : change.absoluteChange !== 0
                        ? `${change.percentageChange > 0 ? "+" : ""}${change.percentageChange}%`
                        : "Flat"}
                    </span>
                  )}
                </td>

                {/* Action */}
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(id);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Drill Down →
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
