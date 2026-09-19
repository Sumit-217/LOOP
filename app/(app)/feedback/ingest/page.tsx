import React from "react";
import { getCurrentSession } from "@/lib/auth";
import IngestionHubClient from "@/components/feedback/IngestionHubClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Feedback Ingestion — LOOP",
  description: "Ingest customer feedback via single entry, bulk CSV, or simulated channels.",
};

export default async function FeedbackIngestPage() {
  const session = await getCurrentSession();

  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <IngestionHubClient
      userRole={session.user.role}
      workspaceName={session.user.workspaceName}
    />
  );
}
