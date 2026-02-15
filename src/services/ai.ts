import { generateText, stepCountIs } from "ai";
import {
  getDefaultModel,
  getModelByDescriptor,
  type ModelDescriptor,
} from "../config/models";
import { AGENT_SYSTEM_PROMPT } from "../prompts/system";
import type { ChatTurn } from "../types/chat";
import { createWebTools } from "../web-tools";

const activeModelDescriptor = getDefaultModel();
const activeLanguageModel = getModelByDescriptor(activeModelDescriptor);

export function getActiveModel(): ModelDescriptor {
  return activeModelDescriptor;
}

const webTools = createWebTools();

export async function generateAgentReply(
  history: ChatTurn[],
  userMessage: string
): Promise<string> {
  const result = await generateText({
    model: activeLanguageModel,
    prepareStep: async ({ messages }) => {
      if (messages.length > 20) {
        return {
          messages: [messages[0], ...messages.slice(-20)],
        };
      }
      return {
        messages,
      };
    },
    stopWhen: [stepCountIs(25)],
    messages: [
      {
        role: "system",
        content: AGENT_SYSTEM_PROMPT,
      },
      ...history.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ],
    tools: webTools,
  });

  return result.text.trim();
}
