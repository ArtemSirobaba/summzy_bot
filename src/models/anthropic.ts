import { createAnthropic } from "@ai-sdk/anthropic";
import { env } from "../config/env";

let cachedProvider: ReturnType<typeof createAnthropic> | null = null;

function getProvider() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  if (!cachedProvider) {
    cachedProvider = createAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  return cachedProvider;
}

export function anthropicModel(modelId: string) {
  return getProvider()(modelId);
}
