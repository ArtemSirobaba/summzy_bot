import type { CommandContext, Context } from "grammy";
import { clearSession, hasSession } from "../services/session-store";
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

const START_MESSAGE = [
  "Welcome to Summzy.",
  "",
  "Send me any URL. I will summarize it, then you can ask follow-up questions about that document.",
  "",
  "Commands:",
  "/help - Show usage",
  "/newchat - Clear current document chat",
  "/features - Show enabled extractor features from env",
  "/preview - Show active link extraction options",
  "/previewset <key> <value> - Override one extraction option for this chat",
  "/previewpreset <fast|balanced|deep|media> - Apply preset extraction profile",
  "/previewreset - Clear extraction overrides for this chat",
].join("\n");

const HELP_MESSAGE = [
  "How to use:",
  "1. Send a URL",
  "2. Read the summary",
  "3. Ask questions about the same document",
  "",
  "Link preview controls:",
  "/features - Env-driven capabilities (Firecrawl/Apify/yt-dlp/transcription)",
  "/preview - Current effective fetch options",
  "/previewset - Per-chat option override",
  "/previewpreset - Apply extraction preset",
  "/previewreset - Return to env defaults",
].join("\n");

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
  resetChatLinkPreviewOptions(chatId);

  await ctx.reply(
    existed
      ? "Started a new chat context. Send a URL to continue."
      : "No active document chat. Send a URL to begin."
  );
}

export async function handleFeatures(ctx: CommandContext<Context>) {
  const capabilities = getLinkPreviewCapabilities();
  const defaultOptions = getDefaultLinkPreviewFetchOptions();
  const transcriptionProviders = [
    capabilities.transcriptionWithOpenAI ? "openai" : null,
    capabilities.transcriptionWithGroq ? "groq" : null,
    capabilities.transcriptionWithFal ? "fal" : null,
  ].filter(Boolean);

  await ctx.reply(
    [
      "Link preview capabilities (from environment):",
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
      "Default extraction options:",
      ...formatLinkPreviewOptions(defaultOptions),
    ].join("\n")
  );
}

export async function handlePreview(ctx: CommandContext<Context>) {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const effectiveOptions = getEffectiveLinkPreviewFetchOptions(chatId);
  const overrides = getChatLinkPreviewOverrides(chatId);
  const overrideKeys = Object.keys(overrides);

  await ctx.reply(
    [
      "Active extraction options for this chat:",
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
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const args = getCommandArgs(ctx);
  if (args.length < 2) {
    await ctx.reply(buildPreviewSetUsageMessage());
    return;
  }

  const [optionKey, ...valueParts] = args;
  const rawValue = valueParts.join(" ");
  const result = setChatLinkPreviewOption(chatId, optionKey, rawValue);

  await ctx.reply(
    [
      result.message,
      "",
      "Current extraction options:",
      ...formatLinkPreviewOptions(result.options),
    ].join("\n")
  );
}

export async function handlePreviewPreset(ctx: CommandContext<Context>) {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const args = getCommandArgs(ctx);
  const rawPreset = args[0];
  if (!rawPreset) {
    await ctx.reply(
      `Usage: /previewpreset <${getLinkPreviewPresetValues().join("|")}>`
    );
    return;
  }

  const preset = parseLinkPreviewPreset(rawPreset);
  if (!preset) {
    await ctx.reply(
      `Unknown preset "${rawPreset}". Allowed presets: ${getLinkPreviewPresetValues().join(", ")}`
    );
    return;
  }

  const options = applyChatLinkPreviewPreset(chatId, preset);
  await ctx.reply(
    [
      `Applied preset "${preset}" for this chat.`,
      "",
      "Current extraction options:",
      ...formatLinkPreviewOptions(options),
    ].join("\n")
  );
}

export async function handlePreviewReset(ctx: CommandContext<Context>) {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  resetChatLinkPreviewOptions(chatId);
  const options = getEffectiveLinkPreviewFetchOptions(chatId);

  await ctx.reply(
    [
      "Cleared extraction overrides for this chat.",
      "",
      "Current extraction options:",
      ...formatLinkPreviewOptions(options),
    ].join("\n")
  );
}
