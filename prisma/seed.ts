import { PrismaClient, Role, Sentiment, FeedbackStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Project LOOP Phase 1 foundation seed...");

  // 1. Clean up existing demo data deterministically
  await prisma.feedbackTheme.deleteMany();
  await prisma.embedding.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  // 2. Create Primary Demo Workspace
  const demoWorkspace = await prisma.workspace.create({
    data: {
      name: "Acme SaaS (Demo Workspace)",
    },
  });
  console.log(`✓ Created Workspace: ${demoWorkspace.name} (${demoWorkspace.id})`);

  // 3. Create Demo Users across the 3 mandatory RBAC roles
  // Using secure salt rounds (10) for demo password hashing
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync("DemoPass123!", salt);

  const adminUser = await prisma.user.create({
    data: {
      name: "Alice Admin",
      email: "admin@loop.demo",
      passwordHash,
      role: Role.ADMIN,
      workspaceId: demoWorkspace.id,
    },
  });

  const analystUser = await prisma.user.create({
    data: {
      name: "Bob Analyst",
      email: "analyst@loop.demo",
      passwordHash,
      role: Role.ANALYST,
      workspaceId: demoWorkspace.id,
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      name: "Charlie Viewer",
      email: "viewer@loop.demo",
      passwordHash,
      role: Role.VIEWER,
      workspaceId: demoWorkspace.id,
    },
  });

  console.log(`✓ Created 3 Demo Users:`);
  console.log(`   - ADMIN:   ${adminUser.email}`);
  console.log(`   - ANALYST: ${analystUser.email}`);
  console.log(`   - VIEWER:  ${viewerUser.email}`);

  // 4. Create Representative Baseline Themes
  const themeOnboarding = await prisma.theme.create({
    data: {
      name: "Onboarding & Navigation",
      description: "User signup, team invitation, and first-run experience",
      color: "#3B82F6",
      workspaceId: demoWorkspace.id,
    },
  });

  const themeBilling = await prisma.theme.create({
    data: {
      name: "Billing & Invoicing",
      description: "Payment methods, subscription upgrades, and invoice generation",
      color: "#EF4444",
      workspaceId: demoWorkspace.id,
    },
  });

  console.log(`✓ Created 2 Baseline Themes: "${themeOnboarding.name}", "${themeBilling.name}"`);

  // 5. Create Representative Feedback Records & Relationships
  const feedback1 = await prisma.feedback.create({
    data: {
      content: "The initial account setup and team invite flow was straightforward and quick.",
      channel: "NPS_SURVEY",
      sourceRef: "nps-2024-001",
      customerLabel: "Enterprise Tier",
      sentiment: Sentiment.POS,
      sentimentScore: 0.85,
      status: FeedbackStatus.NEW,
      workspaceId: demoWorkspace.id,
      themes: {
        create: {
          themeId: themeOnboarding.id,
          confidence: 0.95,
        },
      },
    },
  });

  const feedback2 = await prisma.feedback.create({
    data: {
      content: "Monthly invoice download timed out repeatedly when accessing the billing tab.",
      channel: "SUPPORT_TICKET",
      sourceRef: "ticket-10492",
      customerLabel: "SMB Tier",
      sentiment: Sentiment.NEG,
      sentimentScore: -0.75,
      status: FeedbackStatus.NEW,
      workspaceId: demoWorkspace.id,
      themes: {
        create: {
          themeId: themeBilling.id,
          confidence: 0.92,
        },
      },
    },
  });

  console.log(`✓ Created 2 Representative Feedback Records verifying FeedbackTheme relational join`);
  console.log(`   - Feedback 1: [POS: +0.85] -> "${themeOnboarding.name}"`);
  console.log(`   - Feedback 2: [NEG: -0.75] -> "${themeBilling.name}"`);

  console.log("\n✅ Phase 1 database foundation seed completed successfully.");
  console.log("ℹ️ Full 120+ multi-channel dataset will be seeded in Phase 3 (Feedback Ingestion).");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
