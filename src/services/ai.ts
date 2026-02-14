import { generateText } from "ai";
import { getDefaultModel, getModelByDescriptor, type ModelDescriptor } from "../models";
import {
  buildGroundedAnswerPrompt,
  buildSummaryPrompt,
  GROUNDED_QA_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
} from "../prompts/system";
import type { ChatSession } from "../types/chat";

const activeModelDescriptor = getDefaultModel();
const activeLanguageModel = getModelByDescriptor(activeModelDescriptor);

export function getActiveModel(): ModelDescriptor {
  return activeModelDescriptor;
}

export async function summarizeDocument(
  content: string,
  url: string
): Promise<string> {
  const result = await generateText({
    model: activeLanguageModel,
    system: SUMMARY_SYSTEM_PROMPT,
    prompt: buildSummaryPrompt(url, content),
  });

  return result.text.trim();
}

export async function answerAboutDocument(
  session: ChatSession,
  question: string
): Promise<string> {
  const result = await generateText({
    model: activeLanguageModel,
    system: GROUNDED_QA_SYSTEM_PROMPT,
    prompt: buildGroundedAnswerPrompt(session, question),
  });

  return result.text.trim();
}
