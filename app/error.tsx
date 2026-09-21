"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled client error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-center transition-colors">
      <div className="w-full max-w-md p-8 sm:p-10 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 shadow-xl space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-2xl font-bold">
          ⚠️
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            An unexpected error occurred while processing your request. Please try again or return to the overview.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-xs text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
          >
            Try Again
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg font-medium text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
