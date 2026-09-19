"use client";

import React, { useState } from "react";
import { CHANNELS, ChannelType } from "@/lib/constants/feedback";
import { Role } from "@prisma/client";

interface SingleIngestFormProps {
  userRole?: Role;
  onSuccess?: () => void;
}

export default function SingleIngestForm({ userRole, onSuccess }: SingleIngestFormProps) {
  const isViewer = userRole === Role.VIEWER;

  const [channel, setChannel] = useState<ChannelType>("SUPPORT_TICKET");
  const [content, setContent] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!content.trim() || content.trim().length < 5) {
      setErrorMsg("Feedback content must be at least 5 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          content: content.trim(),
          customerLabel: customerLabel.trim() || null,
          sourceRef: sourceRef.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      setSuccessMsg("Feedback item ingested successfully! Marked with status NEW.");
      setContent("");
      setCustomerLabel("");
      setSourceRef("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Single Feedback Submission</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log an individual customer comment, ticket, review, or sales note manually.
          </p>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
          Default Status: NEW
        </span>
      </div>

      {isViewer && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Viewer mode active: Ingestion is restricted to Admin and Analyst roles. Form is disabled.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Channel Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Ingestion Channel <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={isViewer}
                onClick={() => setChannel(c.id as ChannelType)}
                className={`text-left p-3 rounded-xl border transition-all text-xs ${
                  channel === c.id
                    ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50 text-white"
                    : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                } ${isViewer ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>{c.label}</span>
                  {channel === c.id && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{c.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Content */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="feedback-content" className="text-xs font-semibold text-slate-300">
              Customer Feedback Text <span className="text-rose-400">*</span>
            </label>
            <span className="text-[11px] text-slate-500">{content.length} characters</span>
          </div>
          <textarea
            id="feedback-content"
            disabled={isViewer || isSubmitting}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="e.g. 'Onboarding took forever — I couldn't figure out how to invite my team members from the settings view.'"
            className={`w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors resize-y ${
              isViewer ? "opacity-60 cursor-not-allowed" : ""
            }`}
            required
          />
        </div>

        {/* Customer Label & Source Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customer-label" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Customer Cohort / Tier / Segment <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              id="customer-label"
              type="text"
              disabled={isViewer || isSubmitting}
              value={customerLabel}
              onChange={(e) => setCustomerLabel(e.target.value)}
              placeholder="e.g. 'Enterprise Tier' or 'Healthcare Cohort'"
              className={`w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                isViewer ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
          </div>

          <div>
            <label htmlFor="source-ref" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Source Reference / Ticket ID <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              id="source-ref"
              type="text"
              disabled={isViewer || isSubmitting}
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="e.g. 'ZD-10492' or 'GPLAY-REV-4102'"
              className={`w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                isViewer ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isViewer || isSubmitting}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isViewer
                ? "border border-slate-800 bg-slate-800/40 text-slate-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-[0.98]"
            }`}
          >
            {isSubmitting ? "Ingesting Feedback..." : "Ingest Feedback Item →"}
          </button>
        </div>
      </form>
    </div>
  );
}
