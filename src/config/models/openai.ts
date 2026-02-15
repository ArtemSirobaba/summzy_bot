import { createOpenAI } from "@ai-sdk/openai";
import { env } from "../env";

let cachedProvider: ReturnType<typeof createOpenAI> | null = null;

function getProvider() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (!cachedProvider) {
    cachedProvider = createOpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return cachedProvider;
}

export function openaiModel(modelId: string) {
  return getProvider()(modelId);
}
