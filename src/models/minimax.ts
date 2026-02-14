import { createMinimax } from "vercel-minimax-ai-provider";
import { env } from "../config/env";

let cachedProvider: ReturnType<typeof createMinimax> | null = null;

function getProvider() {
  if (!env.MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY is not configured");
  }

  if (!cachedProvider) {
    cachedProvider = createMinimax({
      apiKey: env.MINIMAX_API_KEY,
    });
  }

  return cachedProvider;
}

export function minimaxModel(modelId: string) {
  return getProvider()(modelId);
}
