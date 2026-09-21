"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  MessageSquare,
  AlertCircle,
  CornerDownLeft,
  RefreshCw,
  Tag,
  ShieldCheck,
  Clock,
  ChevronRight,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { EnrichedRagCitation } from "@/lib/rag/types";

const SUGGESTED_QUESTIONS = [
  "What are customers most unhappy about?",
  "What problems are customers reporting with billing?",
  "What are customers saying about onboarding?",
  "Which issues are appearing repeatedly?",
  "What are customers saying about SSO?",
];

interface AskLoopResponse {
  answer: string;
  citations: EnrichedRagCitation[];
  noData: boolean;
  queryInfo: {
    retrievedCount: number;
    question: string;
  };
}

export default function AskLoopClient() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AskLoopResponse | null>(null);

  const handleAsk = async (queryText?: string) => {
    const textToSubmit = (queryText !== undefined ? queryText : question).trim();
    if (!textToSubmit || isLoading) return;

    setIsLoading(true);
    setError(null);
    if (queryText !== undefined) {
      setQuestion(queryText);
    }

    try {
      const res = await fetch("/api/ask-loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: textToSubmit }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      setResponse(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const getChannelBadge = (channel: string) => {
    const formatted = channel.replace(/_/g, " ");
    let colorClass = "bg-slate-800 text-slate-300 border-slate-700";
    if (channel === "SUPPORT_TICKET") {
      colorClass = "bg-amber-950/40 text-amber-300 border-amber-800/40";
    } else if (channel === "APP_STORE") {
      colorClass = "bg-blue-950/40 text-blue-300 border-blue-800/40";
    } else if (channel === "NPS_SURVEY") {
      colorClass = "bg-emerald-950/40 text-emerald-300 border-emerald-800/40";
    } else if (channel === "COMMUNITY") {
      colorClass = "bg-purple-950/40 text-purple-300 border-purple-800/40";
    } else if (channel === "SALES_NOTE") {
      colorClass = "bg-rose-950/40 text-rose-300 border-rose-800/40";
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase border ${colorClass}`}>
        {formatted}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            AI RAG Intelligence
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Workspace Isolated & Grounded
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Ask LOOP
        </h1>
        <p className="text-slate-400 text-sm">
          Query your customer feedback in natural language. LOOP retrieves semantically relevant feedback with pgvector and generates factual, cited answers using Gemini 2.5 Flash.
        </p>
      </div>

      {/* Question Input Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask anything about customer complaints, praise, onboarding friction, or feature requests..."
            rows={3}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-xs text-slate-500">
            <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
            <button
              onClick={() => handleAsk()}
              disabled={isLoading || !question.trim()}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Ask LOOP
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Suggested Questions:
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((sq, i) => (
              <button
                key={i}
                onClick={() => handleAsk(sq)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all text-left flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{sq}</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-indigo-500/40 animate-ping" />
            <span className="text-xs font-medium text-indigo-300">
              Retrieving feedback & generating grounded answer...
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-800 rounded w-5/6" />
            <div className="h-4 bg-slate-800 rounded w-full" />
            <div className="h-4 bg-slate-800 rounded w-4/6" />
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && !isLoading && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-start gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-200">Failed to generate response</p>
            <p className="text-xs text-rose-300/90">{error}</p>
          </div>
          <button
            onClick={() => handleAsk()}
            className="ml-auto px-3 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-xs text-rose-200 border border-rose-700/50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Answer & Citations Area */}
      {response && !isLoading && !error && (
        <div className="space-y-6">
          {/* Answer Card */}
          <div className="p-5 sm:p-6 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">
                  {response.noData ? "Insufficient Evidence" : "Grounded Answer"}
                </h2>
              </div>
              {response.queryInfo && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Search className="w-3 h-3 text-slate-500" />
                  {response.queryInfo.retrievedCount} evidence items examined
                </span>
              )}
            </div>

            <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
              {response.answer}
            </div>

            {response.noData && (
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>
                  Tip: Ask about specific themes such as Billing, Onboarding, Mobile App, SSO, or Performance for more targeted evidence.
                </span>
              </div>
            )}
          </div>

          {/* Citations / Evidence Section */}
          {response.citations && response.citations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  Supporting Evidence Citations ({response.citations.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Direct quotes & metadata from your workspace
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-1">
                {response.citations.map((citation, idx) => (
                  <div
                    key={citation.feedbackId || idx}
                    className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {getChannelBadge(citation.channel)}
                        {citation.customerLabel && (
                          <span className="text-slate-400 font-medium">
                            {citation.customerLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        {citation.similarityScore !== undefined && (
                          <span className="text-indigo-400 font-mono">
                            sim: {citation.similarityScore.toFixed(2)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {citation.createdAt.split("T")[0]}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 italic border-l-2 border-indigo-500/40 pl-3">
                      &ldquo;{citation.contentExcerpt}&rdquo;
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400 text-[11px]">
                        <span className="text-slate-500">Reason cited:</span> {citation.reason}
                      </span>
                      <Link
                        href="/dashboard"
                        className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px] font-medium"
                      >
                        View in Inbox
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial Empty State */}
      {!response && !isLoading && !error && (
        <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-semibold text-white">Ask your Voice of Customer data</h3>
            <p className="text-xs text-slate-400">
              Type a question above or pick one of the suggested prompts to query your workspace&apos;s customer feedback using vector similarity and grounded synthesis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
