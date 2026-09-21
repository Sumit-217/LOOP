import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-center transition-colors">
      <div className="w-full max-w-md p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-2xl font-bold">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Page not found
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The page you are looking for doesn&apos;t exist, has been moved, or is inaccessible in this workspace.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg font-medium text-xs text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
