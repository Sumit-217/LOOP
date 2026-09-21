import React from "react";
import { getCurrentSession } from "@/lib/auth";
import AskLoopClient from "@/components/ask-loop/AskLoopClient";

export const metadata = {
  title: "Ask LOOP — Semantic Search & Grounded RAG",
  description: "Natural language semantic question-answering over your customer feedback data using pgvector and Gemini 2.5 Flash.",
};

export default async function AskLoopPage() {
  const session = await getCurrentSession();
  if (!session || !session.user) {
    return null;
  }

  return <AskLoopClient />;
}
