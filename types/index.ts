// Project LOOP — Core Domain & Database Types
// Derived from Prisma Client models and enums

export * from "@prisma/client";

export type Environment = "development" | "production" | "test";

// Multi-tenant query contract helper type:
// Every tenant-owned database query must enforce workspaceId scoping
export interface WorkspaceScoped {
  workspaceId: string;
}
