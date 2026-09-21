import { GoogleGenAI } from "@google/genai";
import { AIClassificationProvider, AIClassificationResult } from "../types";
import { aiClassificationOutputSchema } from "@/lib/validations/ai";

/**
 * Google Gemini Classification Provider
 * Implements AIClassificationProvider using Gemini 2.5 Flash.
 */
export class GeminiClassificationProvider implements AIClassificationProvider {
  public readonly name = "GoogleGemini";
  public readonly model: string;
  private client: GoogleGenAI;

  constructor(apiKey: string, model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest") {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required to instantiate GeminiClassificationProvider.");
    }
    this.model = model;
    this.client = new GoogleGenAI({ apiKey });
  }

  async classifyFeedback(
    content: string,
    existingThemes: string[]
  ): Promise<AIClassificationResult> {
    const prompt = `You are an AI customer-feedback classification engine for the Voice-of-Customer platform LOOP.
Analyze the following customer feedback item and output strictly valid JSON conforming to the schema described below.

---
CUSTOMER FEEDBACK ITEM:
"${content}"

AVAILABLE WORKSPACE THEMES:
${existingThemes.length > 0 ? JSON.stringify(existingThemes) : "[] (No existing themes available)"}

---
CLASSIFICATION RULES:
1. "sentiment": Strictly one of "POS" (Positive), "NEU" (Neutral), or "NEG" (Negative).
2. "sentimentScore": Continuous float from -1.0 (strongly negative) to +1.0 (strongly positive). E.g., -0.85 for critical bugs, +0.92 for enthusiastic praise, 0.0 for purely informational queries.
3. "themes": Array of theme strings. You MUST select 1 or 2 matching themes ONLY from the AVAILABLE WORKSPACE THEMES list above. If none of the available themes are appropriate, return an empty array []. DO NOT invent new theme names.
4. "featureArea": Short functional area label (e.g. "Billing & Invoicing", "Onboarding", "Mobile App", "SAML SSO", "Integrations & API", "Analytics & Reporting").
5. "rationale": Exactly one concise sentence explaining why this classification was chosen.

OUTPUT FORMAT:
Return raw JSON only without markdown formatting or code fences:
{
  "sentiment": "NEG",
  "sentimentScore": -0.82,
  "themes": ["Billing & Invoicing"],
  "featureArea": "Invoicing",
  "rationale": "Customer experienced timeouts when attempting to export monthly invoices."
}`;

    // Execute with 1 retry on parse failure
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await this.client.models.generateContent({
          model: this.model,
          contents: [prompt],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const rawText = response.text || "";
        const cleanText = rawText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const parsedJson = JSON.parse(cleanText);

        // Validate via Zod perimeter schema
        const validated = aiClassificationOutputSchema.parse(parsedJson);

        // Enforce existing theme constraint: only keep themes that exist in the workspace taxonomy
        const validThemes = validated.themes.filter((t) =>
          existingThemes.some((et) => et.toLowerCase() === t.toLowerCase())
        );

        return {
          sentiment: validated.sentiment,
          sentimentScore: validated.sentimentScore,
          themes: validThemes,
          featureArea: validated.featureArea,
          rationale: validated.rationale,
        };
      } catch (err: unknown) {
        lastError = err;
        if (attempt === 1) {
          console.warn(`[GeminiClassificationProvider] Attempt 1 failed. Retrying...`, err);
        }
      }
    }

    throw new Error(
      `Gemini AI classification failed after 2 attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }
}
