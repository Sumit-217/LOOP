import { RetrievedFeedbackItem } from "./retrieval";

/**
 * Sanitizes untrusted user text so it cannot break prompt delimiters
 * or attempt prompt-injection attacks.
 */
function sanitizeFeedbackContent(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // Strip raw HTML/XML tags
    .replace(/```/g, "'''")  // Disarm markdown code fence escapes
    .trim();
}

/**
 * Builds a bounded, structured context string from retrieved feedback items.
 *
 * Security & Integrity:
 * - Only retrieved records enter this context.
 * - Items are wrapped in strict <evidence_item> XML boundaries.
 * - Customer text is sanitized and explicitly demarcated as untrusted external data.
 */
export function buildRagContext(items: RetrievedFeedbackItem[]): string {
  if (!items || items.length === 0) {
    return "<evidence_context>\nNo feedback evidence available.\n</evidence_context>";
  }

  const formattedItems = items.map((item, index) => {
    const cleanContent = sanitizeFeedbackContent(item.content);
    const themesStr = item.themeNames.length > 0 ? item.themeNames.join(", ") : "None";
    const dateStr = item.createdAt instanceof Date ? item.createdAt.toISOString().split("T")[0] : String(item.createdAt);

    return `  <evidence_item index="${index + 1}" feedback_id="${item.id}">
    <content>${cleanContent}</content>
    <channel>${item.channel}</channel>
    <sentiment>${item.sentiment} (Score: ${item.sentimentScore.toFixed(2)})</sentiment>
    <themes>${themesStr}</themes>
    <feature_area>${item.featureArea || "Uncategorized"}</feature_area>
    <customer_label>${item.customerLabel || "Standard"}</customer_label>
    <date>${dateStr}</date>
  </evidence_item>`;
  });

  return `<evidence_context count="${items.length}">\n${formattedItems.join("\n")}\n</evidence_context>`;
}
