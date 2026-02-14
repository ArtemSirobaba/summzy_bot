import type { CommandContext, Context } from "grammy";
import { clearSession, hasSession } from "../services/session-store";

const START_MESSAGE = [
  "Welcome to Summarize Bot.",
  "",
  "Send me any URL. I will summarize it, then you can ask follow-up questions about that document.",
  "",
  "Commands:",
  "/help - Show usage",
  "/newchat - Clear current document chat",
].join("\n");

const HELP_MESSAGE = [
  "How to use:",
  "1. Send a URL",
  "2. Read the summary",
  "3. Ask questions about the same document",
].join("\n");

export async function handleStart(ctx: CommandContext<Context>) {
  await ctx.reply(START_MESSAGE);
}

export async function handleHelp(ctx: CommandContext<Context>) {
  await ctx.reply(HELP_MESSAGE);
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
      ? "Started a new chat context. Send a URL to continue."
      : "No active document chat. Send a URL to begin."
  );
}
