// Project LOOP — Channel Constants & Metadata
// Derived from Zidio_Project_Web_1.1.pdf Sections 02, 08 (C3), and 19 (Appendix A)

export const CHANNELS = [
  {
    id: "SUPPORT_TICKET",
    label: "Support Ticket",
    description: "Zendesk, Intercom, or live-chat customer support transcripts",
  },
  {
    id: "APP_STORE",
    label: "App Store Review",
    description: "iOS App Store, Google Play, or G2 customer ratings & comments",
  },
  {
    id: "NPS_SURVEY",
    label: "NPS / CSAT Survey",
    description: "Quarterly NPS or customer satisfaction free-text responses",
  },
  {
    id: "SALES_NOTE",
    label: "Sales & Success Note",
    description: "CRM call notes, prospect feature asks, or account churn feedback",
  },
  {
    id: "COMMUNITY",
    label: "Community & Social",
    description: "Community forum discussions, Discord messages, or social posts",
  },
] as const;

export type ChannelType = (typeof CHANNELS)[number]["id"];

export const VALID_CHANNEL_IDS = CHANNELS.map((c) => c.id) as [string, ...string[]];
