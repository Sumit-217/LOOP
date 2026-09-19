// Project LOOP — AI Provider Abstraction Types
// Designed to decouple application routes from any specific AI vendor

export interface AIClassificationResult {
  sentiment: "POS" | "NEU" | "NEG";
  sentimentScore: number; // Range: -1.0 to +1.0
  themes: string[];       // Must match or select from existing workspace themes
  featureArea: string;    // Short functional-area label (e.g., "Billing", "Onboarding", "Mobile App")
  rationale: string;      // Concise one-line explanation of the classification
}

export interface AIClassificationProvider {
  readonly name: string;
  readonly model: string;
  classifyFeedback(content: string, existingThemes: string[]): Promise<AIClassificationResult>;
}
