import type { CommandContext, Context } from "grammy";
import { env } from "../config/env";
import { summarizeFromUrl } from "../handlers/summarize";
import {
  applyChatLinkPreviewPreset,
  formatLinkPreviewOptions,
  getChatLinkPreviewOverrides,
  getDefaultLinkPreviewFetchOptions,
  getEffectiveLinkPreviewFetchOptions,
  getLinkPreviewCapabilities,
  getLinkPreviewOptionKeys,
  getLinkPreviewPresetValues,
  parseLinkPreviewPreset,
  resetChatLinkPreviewOptions,
  setChatLinkPreviewOption,
} from "../services/document";
import { clearSession, hasSession } from "../services/session-store";
import {
  buildSummzyUsageMessage,
  extractSummzyUrl,
} from "../utils/summzy-command";
import { replyMarkdownV2WithFallback } from "../utils/telegram-format";

function isPreviewConfigured(): boolean {
  return env.TELEGRAM_ADMIN_USER_IDS.length > 0;
}

function isPreviewAdmin(ctx: CommandContext<Context>): boolean {
  const userId = ctx.from?.id;
  if (!userId) {
    return false;
  }
  return env.TELEGRAM_ADMIN_USER_IDS.includes(userId);
}

function getPreviewAccessState(
  ctx: CommandContext<Context>
): "admin" | "not-admin" | "disabled" {
  if (!isPreviewConfigured()) {
    return "disabled";
  }
  return isPreviewAdmin(ctx) ? "admin" : "not-admin";
}

function buildPreviewAccessMessage(): string {
  return [
    "**Link preview controls are unavailable.**",
    "Set TELEGRAM_USER_ID or TELEGRAM_USER_IDS in env to enable admin access.",
  ].join("\n");
}

function buildPreviewAdminOnlyMessage(): string {
  return [
    "**Admin only command.**",
    "Preview controls are limited to users from TELEGRAM_USER_ID/TELEGRAM_USER_IDS.",
  ].join("\n");
}

function buildStartMessage(ctx: CommandContext<Context>): string {
  const access = getPreviewAccessState(ctx);
  const previewSection =
    access === "admin"
      ? [
          "",
          "**Admin Link Preview Controls**",
          "- /features - Show extractor capabilities",
          "- /preview - Show active extraction options",
          "- /previewset <key> <value> - Override one option",
          "- /previewpreset <fast|balanced|deep|media> - Apply preset",
          "- /previewreset - Clear extraction overrides",
        ].join("\n")
      : access === "not-admin"
      ? [
          "",
          "**Admin Link Preview Controls**",
          "- Available only to configured admin users",
        ].join("\n")
      : [
          "",
          "**Admin Link Preview Controls**",
          "- Disabled until TELEGRAM_USER_ID or TELEGRAM_USER_IDS is configured",
        ].join("\n");

  return [
    "**Welcome to Summzy!**",
    "",
    "Private chats: send a URL and I will summarize it.",
    "Group chats: use /summzy <url> to summarize links.",
    "Then ask follow-up questions in the same chat.",
    "",
    "**Commands**",
    "- /start - Show welcome message",
    "- /help - Show command guide",
    "- /summzy <url> - Summarize a URL (required in groups)",
    "- /newchat - Start a new chat context",
    previewSection,
  ].join("\n");
}

function buildHelpMessage(ctx: CommandContext<Context>): string {
  const access = getPreviewAccessState(ctx);
  const previewSection =
    access === "admin"
      ? [
          "",
          "**Admin Link Preview Controls**",
          "- /features - Env capabilities (Firecrawl/Apify/yt-dlp/transcription)",
          "- /preview - Current effective options",
          "- /previewset <key> <value> - Per-chat override",
          "- /previewpreset <fast|balanced|deep|media> - Apply profile",
          "- /previewreset - Return to env defaults",
          "",
          "**Rate limits**",
          "- Non-admin users: 1 summary per hour",
          "- Admin users (TELEGRAM_USER_ID/TELEGRAM_USER_IDS): unlimited",
        ].join("\n")
      : access === "not-admin"
      ? [
          "",
          "**Admin Link Preview Controls**",
          "- Hidden for non-admin users",
        ].join("\n")
      : [
          "",
          "**Admin Link Preview Controls**",
          "- Not available for anyone until admin IDs are configured",
        ].join("\n");

  return [
    "**How To Use**",
    "1. Private chat: send a URL or use /summzy <url>",
    "2. Group chat: use /summzy <url>",
    "3. Read the summary",
    "4. Ask questions about that document",
    "5. Use /newchat to start a fresh context",
    "",
    previewSection,
  ].join("\n");
}

async function canUsePreviewControls(
  ctx: CommandContext<Context>
): Promise<boolean> {
  const access = getPreviewAccessState(ctx);
  if (access === "admin") {
    return true;
  }

  await replyMarkdownV2WithFallback(
    ctx,
    access === "disabled"
      ? buildPreviewAccessMessage()
      : buildPreviewAdminOnlyMessage()
  );
  return false;
}

function getCommandArgs(ctx: CommandContext<Context>): string[] {
  const text = ctx.message?.text ?? "";
  const [command, ...rest] = text.trim().split(/\s+/);
  if (!command) {
    return [];
  }
  return rest;
}

function buildPreviewSetUsageMessage(): string {
  return [
    "Usage: /previewset <option> <value>",
    `Options: ${getLinkPreviewOptionKeys().join(", ")}`,
    "Examples:",
    "/previewset firecrawl always",
    "/previewset youtubeTranscript yt-dlp",
    "/previewset transcriptTimestamps true",
  ].join("\n");
}

export async function handleStart(ctx: CommandContext<Context>) {
  await replyMarkdownV2WithFallback(ctx, buildStartMessage(ctx));
}

export async function handleHelp(ctx: CommandContext<Context>) {
  await replyMarkdownV2WithFallback(ctx, buildHelpMessage(ctx));
}

export async function handleSummzy(ctx: CommandContext<Context>) {
  const args = getCommandArgs(ctx).join(" ");
  const url = extractSummzyUrl(args);

  if (!url) {
    await ctx.reply(buildSummzyUsageMessage());
    return;
  }

  await summarizeFromUrl(ctx, url);
}

export async function handleNewChat(ctx: CommandContext<Context>) {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const existed = hasSession(chatId);
  clearSession(chatId);
  resetChatLinkPreviewOptions(chatId);

  await ctx.reply(
    existed
      ? "Started a new chat context. Send a URL to continue."
      : "No active document chat. Send a URL to begin."
  );
}

export async function handleFeatures(ctx: CommandContext<Context>) {
  if (!(await canUsePreviewControls(ctx))) {
    return;
  }

  const capabilities = getLinkPreviewCapabilities();
  const defaultOptions = getDefaultLinkPreviewFetchOptions();
  const transcriptionProviders = [
    capabilities.transcriptionWithOpenAI ? "openai" : null,
    capabilities.transcriptionWithGroq ? "groq" : null,
    capabilities.transcriptionWithFal ? "fal" : null,
  ].filter(Boolean);

  await replyMarkdownV2WithFallback(
    ctx,
    [
      "**Link Preview Capabilities**",
      `- firecrawl: ${capabilities.firecrawl ? "enabled" : "disabled"}`,
      `- apify: ${capabilities.apify ? "enabled" : "disabled"}`,
      `- yt-dlp: ${capabilities.ytDlp ? "enabled" : "disabled"}`,
      `- transcription providers: ${
        transcriptionProviders.length > 0
          ? transcriptionProviders.join(", ")
          : "none"
      }`,
      `- progress logs: ${capabilities.progressLogs ? "enabled" : "disabled"}`,
      "",
      "**Default Extraction Options**",
      ...formatLinkPreviewOptions(defaultOptions),
    ].join("\n")
  );
}

export async function handlePreview(ctx: CommandContext<Context>) {
  if (!(await canUsePreviewControls(ctx))) {
    return;
  }

  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const effectiveOptions = getEffectiveLinkPreviewFetchOptions(chatId);
  const overrides = getChatLinkPreviewOverrides(chatId);
  const overrideKeys = Object.keys(overrides);

  await replyMarkdownV2WithFallback(
    ctx,
    [
      "**Active Extraction Options (This Chat)**",
      ...formatLinkPreviewOptions(effectiveOptions),
      "",
      overrideKeys.length > 0
        ? `Overrides: ${overrideKeys.join(", ")}`
        : "Overrides: none (using env defaults)",
      `Presets: ${getLinkPreviewPresetValues().join(", ")}`,
    ].join("\n")
  );
}

export async function handlePreviewSet(ctx: CommandContext<Context>) {
  if (!(await canUsePreviewControls(ctx))) {
    return;
  }

  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const args = getCommandArgs(ctx);
  if (args.length < 2) {
    await replyMarkdownV2WithFallback(ctx, buildPreviewSetUsageMessage());
    return;
  }

  const [optionKey, ...valueParts] = args;
  const rawValue = valueParts.join(" ");
  const result = setChatLinkPreviewOption(chatId, optionKey, rawValue);

  await replyMarkdownV2WithFallback(
    ctx,
    [
      result.message,
      "",
      "Current extraction options:",
      ...formatLinkPreviewOptions(result.options),
    ].join("\n")
  );
}

export async function handlePreviewPreset(ctx: CommandContext<Context>) {
  if (!(await canUsePreviewControls(ctx))) {
    return;
  }

  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const args = getCommandArgs(ctx);
  const rawPreset = args[0];
  if (!rawPreset) {
    await replyMarkdownV2WithFallback(
      ctx,
      `Usage: /previewpreset <${getLinkPreviewPresetValues().join("|")}>`
    );
    return;
  }

  const preset = parseLinkPreviewPreset(rawPreset);
  if (!preset) {
    await replyMarkdownV2WithFallback(
      ctx,
      `Unknown preset "${rawPreset}". Allowed presets: ${getLinkPreviewPresetValues().join(
        ", "
      )}`
    );
    return;
  }

  const options = applyChatLinkPreviewPreset(chatId, preset);
  await replyMarkdownV2WithFallback(
    ctx,
    [
      `Applied preset "${preset}" for this chat.`,
      "",
      "Current extraction options:",
      ...formatLinkPreviewOptions(options),
    ].join("\n")
  );
}

export async function handlePreviewReset(ctx: CommandContext<Context>) {
  if (!(await canUsePreviewControls(ctx))) {
    return;
  }

  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  resetChatLinkPreviewOptions(chatId);
  const options = getEffectiveLinkPreviewFetchOptions(chatId);

  await replyMarkdownV2WithFallback(
    ctx,
    [
      "Cleared extraction overrides for this chat.",
      "",
      "Current extraction options:",
      ...formatLinkPreviewOptions(options),
    ].join("\n")
  );
}
