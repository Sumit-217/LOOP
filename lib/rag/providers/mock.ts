import { RagAnswerProvider, RagAnswerResult } from "../types";

export const NO_DATA_ANSWER =
  "I couldn't find enough relevant feedback in your workspace to answer that confidently. Try asking about a specific product area, theme, channel, or time period.";

/**
 * Deterministic Mock RAG Answer Provider
 * Used for automated tests, offline development, and CI environments.
 */
export class MockRagAnswerProvider implements RagAnswerProvider {
  public readonly name = "MockRagProvider";
  public readonly model = "mock-rag-v1";

  async answerQuestion(params: {
    question: string;
    context: string;
    retrievedIds: string[];
  }): Promise<RagAnswerResult> {
    const { question, retrievedIds } = params;

    // Handle no-data / empty evidence case
    if (!retrievedIds || retrievedIds.length === 0) {
      return {
        answer: NO_DATA_ANSWER,
        citations: [],
      };
    }

    const qLower = question.toLowerCase();

    // Identify topic for synthesized answer
    let topic = "customer feedback";
    if (qLower.includes("bill") || qLower.includes("invoice") || qLower.includes("payment")) {
      topic = "billing and invoices";
    } else if (qLower.includes("onboard") || qLower.includes("invite") || qLower.includes("signup")) {
      topic = "onboarding and team invitations";
    } else if (qLower.includes("sso") || qLower.includes("saml") || qLower.includes("auth") || qLower.includes("login")) {
      topic = "SSO authentication and access";
    } else if (qLower.includes("mobile") || qLower.includes("ios") || qLower.includes("android")) {
      topic = "the mobile application";
    } else if (qLower.includes("unhappy") || qLower.includes("problem") || qLower.includes("bug") || qLower.includes("issue")) {
      topic = "recurring customer pain points";
    }

    // Pick top 1-3 citations from retrievedIds
    const citedCount = Math.min(3, retrievedIds.length);
    const citations = retrievedIds.slice(0, citedCount).map((id, index) => ({
      feedbackId: id,
      reason: `Direct evidence item #${index + 1} regarding ${topic} reported by customers.`,
    }));

    const answer = `Based on ${retrievedIds.length} relevant customer feedback items in your workspace, here is the summary regarding ${topic}:\n\nCustomers have noted specific experiences and issues in this area. Several reports highlight operational friction and feature requests across multiple channels. Reviewing the cited feedback items below provides direct customer context and quotes.`;

    return {
      answer,
      citations,
    };
  }
}
