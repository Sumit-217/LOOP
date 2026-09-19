"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";
import SingleIngestForm from "./SingleIngestForm";
import CsvUploadZone from "./CsvUploadZone";
import SimulateChannelBar from "./SimulateChannelBar";
import RecentIngestTable from "./RecentIngestTable";

interface IngestionHubClientProps {
  userRole?: Role;
  workspaceName?: string;
}

export default function IngestionHubClient({ userRole, workspaceName }: IngestionHubClientProps) {
  const [activeTab, setActiveTab] = useState<"single" | "csv" | "simulate">("single");
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleIngestSuccess = () => {
    // Trigger table refresh
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Phase 3 — Feedback Ingestion Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Customer Feedback Ingestion
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Ingest feedback across support tickets, app reviews, NPS surveys, sales notes, and community posts for{" "}
              <span className="text-white font-medium">{workspaceName}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Permissions:</span>
            <span
              className={`px-3 py-1 rounded-lg border text-xs font-bold ${
                userRole === Role.ADMIN
                  ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                  : userRole === Role.ANALYST
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {userRole || "USER"}
            </span>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "single"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            1. Single Submission
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("csv")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "csv"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            2. Bulk CSV Import
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("simulate")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "simulate"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            3. Simulated Channel Feeds
          </button>
        </div>
      </div>

      {/* Active Tab Panel */}
      <div>
        {activeTab === "single" && (
          <SingleIngestForm userRole={userRole} onSuccess={handleIngestSuccess} />
        )}
        {activeTab === "csv" && (
          <CsvUploadZone userRole={userRole} onSuccess={handleIngestSuccess} />
        )}
        {activeTab === "simulate" && (
          <SimulateChannelBar userRole={userRole} onSuccess={handleIngestSuccess} />
        )}
      </div>

      {/* Real-time Workspace Feedback Feed */}
      <div>
        <RecentIngestTable refreshTrigger={refreshKey} />
      </div>
    </div>
  );
}
