"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Role } from "@prisma/client";

interface CsvUploadZoneProps {
  userRole?: Role;
  onSuccess?: () => void;
}

interface RowError {
  row: number;
  error: string;
  field?: string;
  snippet?: string;
}

interface ImportSummary {
  total: number;
  imported: number;
  failed: number;
  errors: RowError[];
}

export default function CsvUploadZone({ userRole, onSuccess }: CsvUploadZoneProps) {
  const isViewer = userRole === Role.VIEWER;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate downloadable sample CSV template for testing
  const handleDownloadTemplate = () => {
    const csvContent =
      "content,channel,customer_label,source_ref,created_at\n" +
      '"Onboarding took forever — I could not figure out how to invite my team members.",SUPPORT_TICKET,SMB Cohort,ZD-10492,2024-03-01\n' +
      '"The new dashboard is gorgeous and finally fast. Huge improvement over previous version!",APP_STORE,iOS User,AS-REV-9831,2024-03-02\n' +
      '"NPS 9/10: Love the executive VoC summary reports. Saved our VP hours of manual slide prep.",NPS_SURVEY,Enterprise Cohort,NPS-1004,2024-03-03\n' +
      '"Prospect call: FinCorp requires SAML SSO and SOC2 Type II report before signing.",SALES_NOTE,Prospect: FinCorp,CRM-301,2024-03-04\n' +
      '"Love the new export feature, saved me an hour today! The CSV download is clean.",COMMUNITY,Discord Community,DISCORD-882,2024-03-05\n';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "loop-feedback-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setErrorMessage("Please select a valid .csv file.");
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setImportSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.warn("CSV parse warnings:", results.errors);
        }
        setParsedRows(results.data as Record<string, string>[]);
      },
      error: (error) => {
        setErrorMessage(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleUpload = async () => {
    if (isViewer || parsedRows.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    setImportSummary(null);

    try {
      const res = await fetch("/api/feedback/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedRows }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 422) {
        throw new Error(data.error || "Bulk import failed");
      }

      setImportSummary({
        total: data.total || parsedRows.length,
        imported: data.imported || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });

      // Clear input state if at least some items succeeded
      if (data.imported > 0) {
        if (onSuccess) onSuccess();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred during bulk import");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setImportSummary(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Bulk CSV Ingestion</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Import hundreds of customer feedback rows simultaneously with row-by-row validation.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download CSV Template
        </button>
      </div>

      {isViewer && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Viewer mode active: CSV bulk ingestion is restricted to Admins and Analysts.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Drag & Drop File Select Area */}
      {!selectedFile ? (
        <div
          onClick={() => !isViewer && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            isViewer
              ? "border-slate-800/60 bg-slate-950/20 cursor-not-allowed opacity-60"
              : "border-slate-700 hover:border-indigo-500/70 bg-slate-950/40 hover:bg-slate-900/40 cursor-pointer"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            disabled={isViewer}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Click to browse or drop your CSV file here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Standard columns: <code className="text-indigo-300">content</code>,{" "}
                <code className="text-indigo-300">channel</code>,{" "}
                <code className="text-indigo-300">customer_label</code>,{" "}
                <code className="text-indigo-300">source_ref</code>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File Selected Card */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{selectedFile.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} rows parsed
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={isUploading}
                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200 text-xs transition-colors"
              >
                Change File
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isViewer || isUploading || parsedRows.length === 0}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              >
                {isUploading ? "Importing..." : `Import ${parsedRows.length} Rows →`}
              </button>
            </div>
          </div>

          {/* Quick Preview Table (First 3 Rows) */}
          {parsedRows.length > 0 && !importSummary && (
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-400">
                Data Preview (First {Math.min(3, parsedRows.length)} of {parsedRows.length} rows):
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-1 px-2">#</th>
                      <th className="py-1 px-2">Channel</th>
                      <th className="py-1 px-2">Customer Label</th>
                      <th className="py-1 px-2">Content Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedRows.slice(0, 3).map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-2 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-2 text-indigo-300 font-semibold">{row.channel || row.Channel || "—"}</td>
                        <td className="py-1.5 px-2 text-slate-400">{row.customer_label || row.customerLabel || "—"}</td>
                        <td className="py-1.5 px-2 truncate max-w-xs">{row.content || row.Content || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingestion Success / Failure Reporting Summary */}
      {importSummary && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              CSV Ingestion Report Summary
            </h3>
            <span className="text-[11px] text-slate-500">Processed {importSummary.total} rows</span>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
                  Successfully Imported
                </div>
                <div className="text-2xl font-black text-emerald-300 mt-1">
                  {importSummary.imported}
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                ✓
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider">
                  Failed Rows
                </div>
                <div className="text-2xl font-black text-rose-300 mt-1">
                  {importSummary.failed}
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-sm">
                ✕
              </div>
            </div>
          </div>

          {/* Diagnostic Error Log */}
          {importSummary.errors.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                <span>Row-by-Row Rejection Diagnostics ({importSummary.errors.length}):</span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/60 p-2 divide-y divide-slate-800/80 text-xs">
                {importSummary.errors.map((err, idx) => (
                  <div key={idx} className="py-2 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                        Row {err.row}
                      </span>
                      <span className="text-slate-300">{err.error}</span>
                    </div>
                    {err.snippet && (
                      <span className="text-slate-500 italic truncate max-w-xs font-mono text-[10px]">
                        &ldquo;{err.snippet}&rdquo;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
