import { createXai } from "@ai-sdk/xai";
import { env } from "../env";

let cachedProvider: ReturnType<typeof createXai> | null = null;

function getProvider() {
  if (!env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }

  if (!cachedProvider) {
    cachedProvider = createXai({
      apiKey: env.XAI_API_KEY,
    });
  }

  return cachedProvider;
}

export function xaiModel(modelId: string) {
  return getProvider()(modelId);
}
