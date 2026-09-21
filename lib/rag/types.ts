// Project LOOP — RAG Answer Provider Abstraction Types
// Designed to decouple RAG question-answering from any specific LLM vendor

export interface RagCitation {
  feedbackId: string;
  reason: string;
}

export interface EnrichedRagCitation extends RagCitation {
  contentExcerpt: string;
  channel: string;
  customerLabel?: string | null;
  createdAt: string;
  similarityScore?: number;
}

export interface RagAnswerResult {
  answer: string;
  citations: RagCitation[];
}

export interface RagAnswerProvider {
  readonly name: string;
  readonly model: string;
  answerQuestion(params: {
    question: string;
    context: string;
    retrievedIds: string[];
  }): Promise<RagAnswerResult>;
}
