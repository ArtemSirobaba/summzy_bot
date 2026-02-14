import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "../config/env";

let cachedProvider: ReturnType<typeof createOpenAICompatible> | null = null;

function getProvider() {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  if (!cachedProvider) {
    cachedProvider = createOpenAICompatible({
      name: "openrouter",
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  return cachedProvider;
}

export function openrouterModel(modelId: string) {
  return getProvider().chatModel(modelId);
}
