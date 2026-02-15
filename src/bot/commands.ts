import type { CommandContext, Context } from "grammy";
import { env } from "../config/env";
import { clearSession, hasSession } from "../services/session-store";
import { replyMarkdownV2WithFallback } from "../utils/telegram-format";

const NON_ADMIN_LIMIT_PER_HOUR = 5;

function buildStartMessage(): string {
  const adminIdsConfigured = env.TELEGRAM_ADMIN_USER_IDS.length > 0;
  return [
    "**Welcome to Summzy!**",
    "",
    "This is an AI chat agent. Ask anything, and I can use built-in web tools when needed.",
    "Private chats: every non-command text is processed by the agent.",
    "Group chats: I answer only when you reply to one of my messages or mention my @username.",
    "",
    "**Commands**",
    "- /start - Show welcome message",
    "- /help - Show command guide",
    "- /newchat - Start a new chat context",
    "",
    `Non-admin quota: ${NON_ADMIN_LIMIT_PER_HOUR} AI replies/hour per user.`,
    adminIdsConfigured
      ? "Configured admin users have unlimited usage."
      : "No admin users configured yet.",
  ].join("\n");
}

function buildHelpMessage(): string {
  const adminIdsConfigured = env.TELEGRAM_ADMIN_USER_IDS.length > 0;
  return [
    "**How To Use**",
    `1. Send a text message to chat with the agent`,
    "2. In groups, use reply-to-bot or mention @botusername to trigger response",
    "3. Use /newchat to clear only chat history and start fresh",
    "",
    "**Usage limits**",
    `- Non-admin users: ${NON_ADMIN_LIMIT_PER_HOUR} AI replies per hour (per user across private + group chats)`,
    adminIdsConfigured
      ? "- Admin users (TELEGRAM_USER_ID/TELEGRAM_USER_IDS): unlimited"
      : "- Admin mode is disabled until TELEGRAM_USER_ID/TELEGRAM_USER_IDS is configured",
  ].join("\n");
}

export async function handleStart(ctx: CommandContext<Context>) {
  await replyMarkdownV2WithFallback(ctx, buildStartMessage());
}

export async function handleHelp(ctx: CommandContext<Context>) {
  await replyMarkdownV2WithFallback(ctx, buildHelpMessage());
}

export async function handleNewChat(ctx: CommandContext<Context>) {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const existed = hasSession(chatId);
  clearSession(chatId);

  await ctx.reply(
    existed
      ? "Started a new chat context. Quota usage is unchanged."
      : "No active chat history to clear."
  );
}
