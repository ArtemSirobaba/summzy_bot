import type { Context } from "grammy";
import { env } from "../config/env";
import { answerAboutDocument } from "../services/ai";
import {
  addAssistantTurn,
  addUserTurn,
  getSession,
} from "../services/session-store";
import { summarizeFromUrl } from "./summarize";
import { sanitizeAssistantOutput } from "../utils/assistant-output";
import { chunkText } from "../utils/chunk";
import { isGroupChatType } from "../utils/chat-mode";
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

  if (text.startsWith("/")) {
    return;
  }

  const url = extractFirstUrl(text);

  if (url) {
    if (isGroupChatType(ctx.chat?.type)) {
      await ctx.reply("In groups, use /summzy <url> to request a summary.");
      return;
    }

    await summarizeFromUrl(ctx, url);
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
