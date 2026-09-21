import React from "react";
import { getCurrentSession } from "@/lib/auth";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session || !session.user) {
    return null;
  }

  const { name, role, workspaceName } = session.user;

  return (
    <DashboardClient
      userRole={role}
      userName={name}
      workspaceName={workspaceName}
    />
  );
}
