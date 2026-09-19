"use client";

import React, { useState } from "react";
import { CHANNELS, ChannelType } from "@/lib/constants/feedback";
import { Role } from "@prisma/client";

interface SimulateChannelBarProps {
  userRole?: Role;
  onSuccess?: () => void;
}

export default function SimulateChannelBar({ userRole, onSuccess }: SimulateChannelBarProps) {
  const isViewer = userRole === Role.VIEWER;

  const [count, setCount] = useState<number>(5);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSimulate = async (channel: ChannelType) => {
    if (isViewer) return;

    setActiveChannelId(channel);
    setIsSimulating(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/feedback/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          count,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to simulate channel ingestion");
      }

      setStatusMessage(
        `✓ Ingested ${data.count} simulated ${channel} records into your workspace!`
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSimulating(false);
      setActiveChannelId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Simulated Integration Channels</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Test automated external ingestion streams (Zendesk, App Store, NPS, CRM) with 1-click simulations.
          </p>
        </div>

        {/* Batch Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Batch Size:</span>
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs">
            <button
              type="button"
              disabled={isViewer || isSimulating}
              onClick={() => setCount(5)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                count === 5 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              5 items
            </button>
            <button
              type="button"
              disabled={isViewer || isSimulating}
              onClick={() => setCount(10)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                count === 10 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              10 items
            </button>
          </div>
        </div>
      </div>

      {isViewer && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Viewer mode active: Channel simulation is restricted to Admins and Analysts.</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Quick Simulation Preset Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>{ch.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {ch.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{ch.description}</p>
            </div>

            <button
              type="button"
              disabled={isViewer || isSimulating}
              onClick={() => handleSimulate(ch.id as ChannelType)}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                isViewer
                  ? "border-slate-800 bg-slate-900/40 text-slate-500 cursor-not-allowed"
                  : "border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white active:scale-98"
              }`}
            >
              {isSimulating && activeChannelId === ch.id
                ? "Ingesting..."
                : `Simulate ${count} ${ch.label}s →`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
