import { AIClassificationProvider, AIClassificationResult } from "../types";

/**
 * Deterministic Mock Classification Provider
 * Used for automated unit/integration tests and offline development.
 */
export class MockClassificationProvider implements AIClassificationProvider {
  public readonly name = "MockProvider";
  public readonly model = "mock-deterministic-v1";

  async classifyFeedback(
    content: string,
    existingThemes: string[]
  ): Promise<AIClassificationResult> {
    const text = content.toLowerCase();

    // 1. Determine sentiment & score
    const negativeKeywords = [
      "504", "timeout", "fail", "failed", "crash", "crashes", "stuck", "broken",
      "nightmare", "sluggish", "delay", "delayed", "cannot", "can't", "error",
      "declined", "churn", "lost", "issue", "bug", "terrible", "bad", "expensive"
    ];

    const positiveKeywords = [
      "love", "gorgeous", "fast", "instant", "smooth", "best", "fantastic",
      "kudos", "excellent", "super", "praise", "saved", "pleased", "helpful",
      "great", "buttery", "clean", "wonderful", "game-changing"
    ];

    let sentiment: "POS" | "NEU" | "NEG" = "NEU";
    let sentimentScore = 0.05;
    let rationale = "Feedback tone is neutral and informative.";

    const hasNeg = negativeKeywords.some((k) => text.includes(k));
    const hasPos = positiveKeywords.some((k) => text.includes(k));

    if (hasNeg && !hasPos) {
      sentiment = "NEG";
      sentimentScore = -0.82;
      rationale = "Feedback expresses user frustration regarding system friction or errors.";
    } else if (hasPos && !hasNeg) {
      sentiment = "POS";
      sentimentScore = 0.89;
      rationale = "Feedback expresses high customer satisfaction and enthusiasm.";
    } else if (hasPos && hasNeg) {
      sentiment = "NEU";
      sentimentScore = 0.15;
      rationale = "Feedback contains mixed sentiments with both appreciation and criticism.";
    }

    // 2. Select appropriate themes ONLY from existingThemes
    const matchedThemes: string[] = [];

    const themeKeywordMap: Record<string, string[]> = {
      "billing": ["bill", "invoice", "payment", "card", "tax", "price", "vat", "proration"],
      "onboarding": ["onboard", "invite", "signup", "wizard", "start", "register"],
      "performance": ["timeout", "speed", "fast", "slow", "latency", "uptime", "504", "load"],
      "security": ["sso", "saml", "okta", "auth", "security", "password", "2fa", "rbac", "role"],
      "mobile": ["mobile", "ios", "android", "ipad", "phone", "app store", "faceid", "biometric"],
      "integrations": ["api", "webhook", "crm", "zapier", "sync", "snowflake", "linear", "slack"],
      "analytics": ["report", "chart", "export", "dashboard", "digest", "voc", "metric"],
      "features": ["feature", "shortcut", "keyboard", "request", "tag", "theme"],
    };

    for (const theme of existingThemes) {
      const lowerTheme = theme.toLowerCase();
      for (const [key, keywords] of Object.entries(themeKeywordMap)) {
        if (lowerTheme.includes(key)) {
          if (keywords.some((kw) => text.includes(kw))) {
            if (!matchedThemes.includes(theme)) {
              matchedThemes.push(theme);
            }
          }
        }
      }
    }

    // 3. Determine feature area
    let featureArea = "General Feedback";
    if (text.includes("bill") || text.includes("invoice") || text.includes("card")) {
      featureArea = "Billing & Payments";
    } else if (text.includes("onboard") || text.includes("invite") || text.includes("setup")) {
      featureArea = "Onboarding & Invitations";
    } else if (text.includes("mobile") || text.includes("ios") || text.includes("android")) {
      featureArea = "Mobile Application";
    } else if (text.includes("sso") || text.includes("saml") || text.includes("okta") || text.includes("auth")) {
      featureArea = "Security & SSO";
    } else if (text.includes("api") || text.includes("webhook") || text.includes("sync")) {
      featureArea = "Integrations & API";
    } else if (text.includes("chart") || text.includes("report") || text.includes("export")) {
      featureArea = "Reporting & Analytics";
    }

    return {
      sentiment,
      sentimentScore,
      themes: matchedThemes.slice(0, 2), // 1-2 existing themes max
      featureArea,
      rationale,
    };
  }
}
