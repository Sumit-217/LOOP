"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";

interface ClassifyFeedbackButtonProps {
  feedbackId: string;
  isClassified: boolean;
  userRole?: Role;
  onSuccess?: () => void;
}

export default function ClassifyFeedbackButton({
  feedbackId,
  isClassified,
  userRole,
  onSuccess,
}: ClassifyFeedbackButtonProps) {
  const isViewer = userRole === Role.VIEWER;
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClassify = async () => {
    if (isViewer || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/feedback/${feedbackId}/classify`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to classify feedback");
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={isViewer || isLoading}
        onClick={handleClassify}
        title={
          isViewer
            ? "Viewer mode: Classification restricted to Analysts & Admins"
            : isClassified
            ? "Re-run AI classification with Gemini 2.5 Flash"
            : "Run AI classification with Gemini 2.5 Flash"
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
          isViewer
            ? "border-slate-800 bg-slate-900/40 text-slate-500 cursor-not-allowed"
            : isClassified
            ? "border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white"
            : "border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white active:scale-95"
        }`}
      >
        {isLoading ? (
          <>
            <svg
              className="w-3 h-3 animate-spin text-indigo-400"
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
            <span>Classifying...</span>
          </>
        ) : (
          <>
            <span className="text-[10px]">✨</span>
            <span>{isClassified ? "Re-classify" : "Classify with AI"}</span>
          </>
        )}
      </button>

      {errorMsg && (
        <span className="text-[10px] text-rose-400 mt-1 max-w-[180px] truncate" title={errorMsg}>
          {errorMsg}
        </span>
      )}
    </div>
  );
}
