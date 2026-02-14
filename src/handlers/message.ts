import type { Context } from "grammy";
import { env } from "../config/env";
import { answerAboutDocument, summarizeDocument } from "../services/ai";
import {
  fetchDocumentContent,
  getEffectiveLinkPreviewFetchOptions,
} from "../services/document";
import {
  addAssistantTurn,
  addUserTurn,
  getSession,
  replaceSession,
} from "../services/session-store";
import { sanitizeAssistantOutput } from "../utils/assistant-output";
import { chunkText } from "../utils/chunk";
import { replyMarkdownV2WithFallback } from "../utils/telegram-format";
import { extractFirstUrl } from "../utils/url";

function logHandlerError(scope: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[message:${scope}] ${error.message}`, error);
    return;
  }

  console.error(`[message:${scope}] Unknown error`, error);
}

async function replyInChunks(ctx: Context, text: string): Promise<void> {
  const chunks = chunkText(text, env.MAX_TELEGRAM_MESSAGE_LENGTH);

  for (const chunk of chunks) {
    await replyMarkdownV2WithFallback(ctx, chunk);
  }
}

export async function handleMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text?.trim();
  const chatId = ctx.chat?.id;

  if (!text || !chatId) {
    return;
  }

  const url = extractFirstUrl(text);

  if (url) {
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
        await replyInChunks(ctx, summary);
      } else {
        await ctx.reply(
          "I could not generate a usable summary for that link. Please try another URL."
        );
      }
    } catch (error) {
      logHandlerError("summarize", error);
      await ctx.reply("Failed to summarize that URL. Please try again in a moment.");
    }

    return;
  }

  const session = getSession(chatId);

  if (!session) {
    await ctx.reply(
      "Send me a URL first. I will summarize it and then we can chat about that document."
    );
    return;
  }

  await ctx.api.sendChatAction(chatId, "typing");
  addUserTurn(chatId, text);

  try {
    const activeSession = getSession(chatId);
    if (!activeSession) {
      await ctx.reply("Chat session is no longer active. Send a URL to begin again.");
      return;
    }

    const answer = sanitizeAssistantOutput(
      await answerAboutDocument(activeSession, text)
    );
    addAssistantTurn(chatId, answer);

    if (answer) {
      await replyInChunks(ctx, answer);
    } else {
      await ctx.reply(
        "I could not produce an answer from the current context. Please rephrase your question."
      );
    }
  } catch (error) {
    logHandlerError("qa", error);
    await ctx.reply("Failed to answer your question right now. Please try again.");
  }
}
