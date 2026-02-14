import type { ChatSession } from "../types/chat";

const MAX_DOC_CONTEXT_CHARS = 12000;
const MAX_SUMMARY_SOURCE_CHARS = 10000;
const MAX_QUESTION_HISTORY_TURNS = 8;

export const SUMMARY_SYSTEM_PROMPT = [
  "You are a precise summarization assistant.",
  "Return factual, concise summaries.",
  "Do not invent details that are not in the source.",
].join(" ");

export const GROUNDED_QA_SYSTEM_PROMPT = [
  "You answer user questions about a provided document.",
  "Use only the provided document context and conversation history.",
  "If the answer is not present, clearly say it is not in the source.",
].join(" ");

function trimContext(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}\n\n[Truncated for context length]`;
}

export function buildSummaryPrompt(url: string, extractedContent: string): string {
  const source = trimContext(extractedContent, MAX_SUMMARY_SOURCE_CHARS);

  return [
    `Source URL: ${url}`,
    "Summarize the document in 5-8 bullet points.",
    "Include key claims, conclusions, and practical takeaways.",
    "",
    "Document content:",
    source,
  ].join("\n");
}

export function buildGroundedAnswerPrompt(
  session: ChatSession,
  userQuestion: string
): string {
  const recentHistory = session.history
    .slice(-MAX_QUESTION_HISTORY_TURNS)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join("\n");

  return [
    `Source URL: ${session.sourceUrl}`,
    "Document summary:",
    session.summary,
    "",
    "Document content:",
    trimContext(session.extractedContent, MAX_DOC_CONTEXT_CHARS),
    "",
    "Conversation history:",
    recentHistory || "(none)",
    "",
    `Current user question: ${userQuestion}`,
    "Answer clearly and reference only the provided source context.",
  ].join("\n");
}
