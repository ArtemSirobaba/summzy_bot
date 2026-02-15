import type { Context } from "grammy";
import { env } from "../config/env";
import { generateAgentReply } from "../services/ai";
import {
  addAssistantTurn,
  addUserTurn,
  getSession,
} from "../services/session-store";
import {
  canProcessAiMessage,
  formatAiThrottleMessage,
  recordProcessedAiMessage,
} from "../services/summary-throttle";
import { isGroupChatType } from "../utils/chat-mode";
import { chunkText } from "../utils/chunk";
import { replyMarkdownV2WithFallback } from "../utils/telegram-format";

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

function isAdminUser(userId: number): boolean {
  return env.TELEGRAM_ADMIN_USER_IDS.includes(userId);
}

function hasBotMention(text: string, username?: string): boolean {
  if (!username) {
    return false;
  }

  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mentionMatcher = new RegExp(`(?:^|\\s)@${escaped}(?:\\s|$)`, "i");
  return mentionMatcher.test(text);
}

function stripBotMention(text: string, username?: string): string {
  if (!username) {
    return text.trim();
  }

  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mentionMatcher = new RegExp(`@${escaped}\\b`, "gi");
  return text
    .replace(mentionMatcher, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function shouldProcessInCurrentChat(ctx: Context, text: string): boolean {
  if (!isGroupChatType(ctx.chat?.type)) {
    return true;
  }

  const botId = ctx.me.id;
  const replyToBot = ctx.message?.reply_to_message?.from?.id === botId;
  if (replyToBot) {
    return true;
  }

  return hasBotMention(text, ctx.me.username);
}

export async function handleMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text?.trim();
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  let processingMessageId: number | undefined;

  if (!text || !chatId || !userId) {
    return;
  }

  if (text.startsWith("/")) {
    return;
  }

  if (!shouldProcessInCurrentChat(ctx, text)) {
    return;
  }

  const normalizedUserMessage = isGroupChatType(ctx.chat?.type)
    ? stripBotMention(text, ctx.me.username)
    : text;

  if (!normalizedUserMessage) {
    return;
  }

  const throttle = canProcessAiMessage(userId, isAdminUser(userId));
  if (!throttle.allowed) {
    await ctx.reply(formatAiThrottleMessage(throttle.retryAfterMs ?? 0));
    return;
  }

  processingMessageId = (await ctx.reply("Processing...")).message_id;
  await ctx.api.sendChatAction(chatId, "typing");

  try {
    const history = getSession(chatId)?.history ?? [];
    const answer = await generateAgentReply(history, normalizedUserMessage);

    if (answer) {
      addUserTurn(chatId, normalizedUserMessage);
      addAssistantTurn(chatId, answer);
      recordProcessedAiMessage(userId);
      await replyInChunks(ctx, answer);
    } else {
      await ctx.reply(
        "I could not generate a useful answer right now. Please rephrase your message."
      );
    }
  } catch (error) {
    logHandlerError("agent", error);
    await ctx.reply(
      "Failed to process your message right now. Please try again."
    );
  } finally {
    if (processingMessageId !== undefined) {
      try {
        await ctx.api.deleteMessage(chatId, processingMessageId);
      } catch (cleanupError) {
        logHandlerError("processing-message-cleanup", cleanupError);
      }
    }
  }
}
