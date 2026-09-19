import React from "react";
import { getCurrentSession } from "@/lib/auth";
import ThemesIntelligenceClient from "@/components/themes/ThemesIntelligenceClient";

export default async function ThemesPage() {
  const session = await getCurrentSession();
  if (!session || !session.user) {
    return null;
  }

  return <ThemesIntelligenceClient />;
}
