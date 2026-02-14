import type { Context } from "grammy";
import { env } from "../config/env";
import { summarizeDocument } from "../services/ai";
import { canSummarize, formatSummaryThrottleMessage, recordSummary } from "../services/summary-throttle";
import {
  fetchDocumentContent,
  getEffectiveLinkPreviewFetchOptions,
} from "../services/document";
import { replaceSession } from "../services/session-store";
import { sanitizeAssistantOutput } from "../utils/assistant-output";
import { chunkText } from "../utils/chunk";
import { replyMarkdownV2WithFallback } from "../utils/telegram-format";

function isSummaryAdmin(userId: number): boolean {
  return env.TELEGRAM_ADMIN_USER_IDS.includes(userId);
}

function logSummarizeError(error: unknown): void {
  if (error instanceof Error) {
    console.error(`[summary] ${error.message}`, error);
    return;
  }

  console.error("[summary] Unknown error", error);
}

async function replyInChunks(ctx: Context, text: string): Promise<void> {
  const chunks = chunkText(text, env.MAX_TELEGRAM_MESSAGE_LENGTH);

  for (const chunk of chunks) {
    await replyMarkdownV2WithFallback(ctx, chunk);
  }
}

export async function summarizeFromUrl(ctx: Context, url: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Unable to verify your user identity for throttling. Please try again from your account.");
    return;
  }

  const isAdmin = isSummaryAdmin(userId);
  const throttle = canSummarize(userId, isAdmin);
  if (!throttle.allowed) {
    await ctx.reply(formatSummaryThrottleMessage(throttle.retryAfterMs ?? 0));
    return;
  }

  await ctx.api.sendChatAction(chatId, "typing");

  try {
    const document = await fetchDocumentContent(
      url,
      getEffectiveLinkPreviewFetchOptions(chatId)
    );
    const summary = sanitizeAssistantOutput(
      await summarizeDocument(document.content, document.url)
    );

    replaceSession(chatId, document.url, document.content, summary);

    if (summary) {
      if (!isAdmin) {
        recordSummary(userId);
      }
      await replyInChunks(ctx, summary);
      return;
    }

    await ctx.reply(
      "I could not generate a usable summary for that link. Please try another URL."
    );
  } catch (error) {
    logSummarizeError(error);
    await ctx.reply("Failed to summarize that URL. Please try again in a moment.");
  }
}
