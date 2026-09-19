import { NextRequest, NextResponse } from "next/server";
import { Role, Sentiment, FeedbackStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { simulateChannelSchema } from "@/lib/validations/feedback";

// Realistic simulated template pools across channels
const SIMULATED_CHANNEL_TEMPLATES: Record<
  string,
  Array<{
    content: string;
    customerLabel: string;
    sourceRefPrefix: string;
  }>
> = {
  SUPPORT_TICKET: [
    {
      content: "Customer reporting intermittent 504 Gateway Timeout when generating PDF invoice exports in the billing section.",
      customerLabel: "Enterprise Tier",
      sourceRefPrefix: "ZD-TICKET-",
    },
    {
      content: "Unable to invite new team members with ANALYST role. The invite modal hangs on submit without an error message.",
      customerLabel: "Pro SaaS Tier",
      sourceRefPrefix: "ZD-TICKET-",
    },
    {
      content: "Our team SSO login loop redirects back to login page repeatedly when using Okta SAML integration.",
      customerLabel: "Healthcare Corp",
      sourceRefPrefix: "ZD-TICKET-",
    },
    {
      content: "How do we configure custom webhooks for real-time customer feedback alerts into our internal Slack channel?",
      customerLabel: "FinTech Scaleup",
      sourceRefPrefix: "ZD-TICKET-",
    },
    {
      content: "Data sync with our CRM paused unexpectedly overnight. Last synced record was timestamped 03:00 UTC.",
      customerLabel: "E-Commerce Plus",
      sourceRefPrefix: "ZD-TICKET-",
    },
    {
      content: "Requesting guidance on how to export all customer feedback history for compliance and SOC2 auditing.",
      customerLabel: "Enterprise Tier",
      sourceRefPrefix: "ZD-TICKET-",
    },
  ],
  APP_STORE: [
    {
      content: "The new dashboard is gorgeous and finally fast! Huge improvement over the previous sluggish mobile app.",
      customerLabel: "iOS User (v2.4)",
      sourceRefPrefix: "APPSTORE-REV-",
    },
    {
      content: "FaceID biometric login stopped working after the iOS 17 update. Please fix the session persistence issue!",
      customerLabel: "iOS User (v2.4)",
      sourceRefPrefix: "APPSTORE-REV-",
    },
    {
      content: "Great product for reviewing customer feedback on the go. Would really love an iPad split-screen layout.",
      customerLabel: "iPad Pro User",
      sourceRefPrefix: "APPSTORE-REV-",
    },
    {
      content: "Push notifications for negative sentiment spikes are delayed by several hours on Android 14.",
      customerLabel: "Google Play Review",
      sourceRefPrefix: "GPLAY-REV-",
    },
    {
      content: "Clean, dark-mode first design. Easily the most polished Voice-of-Customer tool our product team has used.",
      customerLabel: "Google Play Review",
      sourceRefPrefix: "GPLAY-REV-",
    },
  ],
  NPS_SURVEY: [
    {
      content: "NPS 9/10: Platform is indispensable for our weekly product triage meetings, but mobile search could be sharper.",
      customerLabel: "Enterprise Cohort Q3",
      sourceRefPrefix: "NPS-CSAT-",
    },
    {
      content: "NPS 4/10: Onboarding took too long. I couldn't figure out where to configure initial customer channels.",
      customerLabel: "New Signup (Day 3)",
      sourceRefPrefix: "NPS-CSAT-",
    },
    {
      content: "NPS 10/10: Love the executive VoC summary reports. Saved our VP of Product hours of manual slide preparation.",
      customerLabel: "Pro Tier Cohort",
      sourceRefPrefix: "NPS-CSAT-",
    },
    {
      content: "NPS 6/10: It does the job well on desktop, but we need automated weekly Slack digest notifications.",
      customerLabel: "Mid-Market Cohort",
      sourceRefPrefix: "NPS-CSAT-",
    },
  ],
  SALES_NOTE: [
    {
      content: "Prospect call with VP of Product at FinCorp: Deal is blocked until we offer automated role-based access control and SAML SSO.",
      customerLabel: "Prospect: FinCorp ($50k ARR)",
      sourceRefPrefix: "CRM-DEAL-",
    },
    {
      content: "Churn risk alert: Customer mentioned their data science team wants raw API access to vector embeddings and themes.",
      customerLabel: "Account: CloudMatrix ($24k ARR)",
      sourceRefPrefix: "CRM-CALL-",
    },
    {
      content: "Expansion opportunity: Head of CX wants to add 15 Analyst seats if we support bulk CSV upload with column mapping.",
      customerLabel: "Account: LogiTech Systems",
      sourceRefPrefix: "CRM-DEAL-",
    },
    {
      content: "Prospect demo feedback: Loved the grounded Q&A Ask LOOP concept. Asked if custom PDF reports can carry company branding.",
      customerLabel: "Prospect: MedGlobal",
      sourceRefPrefix: "CRM-DEMO-",
    },
  ],
  COMMUNITY: [
    {
      content: "Just imported 500 customer reviews via CSV — parsed in under 2 seconds! Kudos to the team on the performance.",
      customerLabel: "Discord Community",
      sourceRefPrefix: "DISCORD-MSG-",
    },
    {
      content: "Feature request: Can we get keyboard shortcuts (j/k navigation, 1/2/3 status toggles) for rapid inbox triage?",
      customerLabel: "User Forum",
      sourceRefPrefix: "FORUM-THREAD-",
    },
    {
      content: "Has anyone built a Zapier or Make integration to pipe Google Forms survey responses into LOOP directly?",
      customerLabel: "Discord Community",
      sourceRefPrefix: "DISCORD-MSG-",
    },
  ],
};

/**
 * POST /api/feedback/simulate
 * Simulates external integration feed (e.g. Zendesk, App Store, NPS Survey).
 * RBAC: Restricted to ADMIN and ANALYST roles. VIEWER receives 403 Forbidden.
 */
export async function POST(req: NextRequest) {
  // 1. RBAC Guard: ADMIN & ANALYST only
  const { session, errorResponse } = await requireRole([Role.ADMIN, Role.ANALYST]);
  if (errorResponse || !session) {
    return errorResponse;
  }

  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body allowed (uses defaults)
    }

    const parseResult = simulateChannelSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid simulation parameters",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const selectedChannel = parseResult.data.channel || "SUPPORT_TICKET";
    const requestedCount = parseResult.data.count || 5;
    const workspaceId = session.user.workspaceId;

    const templates = SIMULATED_CHANNEL_TEMPLATES[selectedChannel] || SIMULATED_CHANNEL_TEMPLATES.SUPPORT_TICKET;

    // Pick items randomly from the template pool with unique timestamped source references
    const recordsToInsert = [];
    const timestamp = Date.now();

    for (let i = 0; i < requestedCount; i++) {
      const template = templates[i % templates.length];
      const uniqueSuffix = `${timestamp.toString().slice(-5)}${Math.floor(100 + Math.random() * 900)}`;

      recordsToInsert.push({
        content: template.content,
        channel: selectedChannel,
        customerLabel: template.customerLabel,
        sourceRef: `${template.sourceRefPrefix}${uniqueSuffix}`,
        sentiment: Sentiment.NEU,
        sentimentScore: 0.0,
        status: FeedbackStatus.NEW,
        workspaceId,
      });
    }

    // Insert simulated batch into workspace
    await db.feedback.createMany({
      data: recordsToInsert,
    });

    // Fetch the newly created items to return to caller
    const createdItems = await db.feedback.findMany({
      where: {
        workspaceId,
        channel: selectedChannel,
      },
      orderBy: { createdAt: "desc" },
      take: requestedCount,
    });

    return NextResponse.json(
      {
        message: `Successfully simulated ${requestedCount} items from channel ${selectedChannel}`,
        channel: selectedChannel,
        count: requestedCount,
        items: createdItems,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Failed to simulate channel ingestion:", err);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to simulate channel ingestion" },
      { status: 500 }
    );
  }
}
