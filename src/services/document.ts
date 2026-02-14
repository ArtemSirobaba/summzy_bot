import {
  createLinkPreviewClient,
  type FetchLinkContentOptions,
  type LinkPreviewClientOptions,
  type LinkPreviewProgressEvent,
} from "@steipete/summarize-core";
import { env } from "../config/env";

export interface DocumentContent {
  url: string;
  title: string | null;
  content: string;
}

export type LinkPreviewOptionKey =
  | "timeoutMs"
  | "maxCharacters"
  | "cacheMode"
  | "youtubeTranscript"
  | "mediaTranscript"
  | "transcriptTimestamps"
  | "firecrawl"
  | "format"
  | "markdownMode";

export type LinkPreviewPreset = "fast" | "balanced" | "deep" | "media";

interface ParsedOptionValue {
  ok: true;
  value: NonNullable<FetchLinkContentOptions[LinkPreviewOptionKey]>;
}

interface ParsedOptionError {
  ok: false;
  error: string;
}

type ParsedOption = ParsedOptionValue | ParsedOptionError;

export interface LinkPreviewCapabilities {
  firecrawl: boolean;
  apify: boolean;
  ytDlp: boolean;
  transcriptionWithOpenAI: boolean;
  transcriptionWithGroq: boolean;
  transcriptionWithFal: boolean;
  progressLogs: boolean;
}

const LINK_PREVIEW_OPTION_KEYS: readonly LinkPreviewOptionKey[] = [
  "timeoutMs",
  "maxCharacters",
  "cacheMode",
  "youtubeTranscript",
  "mediaTranscript",
  "transcriptTimestamps",
  "firecrawl",
  "format",
  "markdownMode",
];

const LINK_PREVIEW_OPTION_ALIASES: Readonly<Record<string, LinkPreviewOptionKey>> =
  {
    timeout: "timeoutMs",
    timeoutms: "timeoutMs",
    max: "maxCharacters",
    maxchars: "maxCharacters",
    maxcharacters: "maxCharacters",
    cache: "cacheMode",
    youtube: "youtubeTranscript",
    yt: "youtubeTranscript",
    media: "mediaTranscript",
    timestamps: "transcriptTimestamps",
    firecrawl: "firecrawl",
    format: "format",
    markdown: "markdownMode",
    markdownmode: "markdownMode",
  };

const CACHE_MODE_VALUES = ["default", "bypass"] as const;
const YOUTUBE_TRANSCRIPT_VALUES = [
  "auto",
  "web",
  "apify",
  "yt-dlp",
  "no-auto",
] as const;
const MEDIA_TRANSCRIPT_VALUES = ["auto", "prefer"] as const;
const FIRECRAWL_MODE_VALUES = ["off", "auto", "always"] as const;
const CONTENT_FORMAT_VALUES = ["text", "markdown"] as const;
const MARKDOWN_MODE_VALUES = ["off", "auto", "llm", "readability"] as const;
const PRESET_VALUES: readonly LinkPreviewPreset[] = [
  "fast",
  "balanced",
  "deep",
  "media",
];

const falApiKeyFromEnv = env.FAL_KEY ?? env.FAL_API_KEY ?? null;

const defaultFetchOptions: FetchLinkContentOptions = {
  timeoutMs: env.LINK_PREVIEW_TIMEOUT_MS,
  maxCharacters: env.LINK_PREVIEW_MAX_CHARACTERS,
  cacheMode: env.LINK_PREVIEW_CACHE_MODE,
  youtubeTranscript: env.LINK_PREVIEW_YOUTUBE_TRANSCRIPT_MODE,
  mediaTranscript: env.LINK_PREVIEW_MEDIA_TRANSCRIPT_MODE,
  transcriptTimestamps: env.LINK_PREVIEW_TRANSCRIPT_TIMESTAMPS,
  firecrawl: env.LINK_PREVIEW_FIRECRAWL_MODE,
  format: env.LINK_PREVIEW_FORMAT,
  markdownMode: env.LINK_PREVIEW_MARKDOWN_MODE,
};

const presetOverrides: Readonly<
  Record<LinkPreviewPreset, Partial<FetchLinkContentOptions>>
> = {
  fast: {
    timeoutMs: 45000,
    maxCharacters: 5000,
    firecrawl: "off",
    format: "text",
    markdownMode: "off",
    youtubeTranscript: "auto",
    mediaTranscript: "auto",
    transcriptTimestamps: false,
  },
  balanced: {},
  deep: {
    timeoutMs: 180000,
    maxCharacters: 16000,
    firecrawl: "always",
    format: "markdown",
    markdownMode: "readability",
    youtubeTranscript: "auto",
    mediaTranscript: "prefer",
    transcriptTimestamps: true,
  },
  media: {
    mediaTranscript: "prefer",
    youtubeTranscript: "auto",
    transcriptTimestamps: true,
    firecrawl: "off",
  },
};

const chatOptionOverrides = new Map<number, Partial<FetchLinkContentOptions>>();

function isOneOf<T extends string>(
  value: string,
  candidates: readonly T[]
): value is T {
  return candidates.includes(value as T);
}

function parseBooleanValue(rawValue: string): boolean | null {
  const normalized = rawValue.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return null;
}

function parseIntegerValue(
  rawValue: string,
  key: "timeoutMs" | "maxCharacters",
  min: number,
  max: number
): ParsedOption {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return {
      ok: false,
      error: `${key} must be an integer in range ${min}-${max}.`,
    };
  }

  if (parsed < min || parsed > max) {
    return {
      ok: false,
      error: `${key} must be in range ${min}-${max}.`,
    };
  }

  return {
    ok: true,
    value: parsed,
  };
}

function parseOptionValue(key: LinkPreviewOptionKey, rawValue: string): ParsedOption {
  const normalizedValue = rawValue.trim().toLowerCase();

  switch (key) {
    case "timeoutMs":
      return parseIntegerValue(normalizedValue, "timeoutMs", 1000, 600000);
    case "maxCharacters":
      return parseIntegerValue(normalizedValue, "maxCharacters", 500, 50000);
    case "cacheMode":
      if (isOneOf(normalizedValue, CACHE_MODE_VALUES)) {
        return { ok: true, value: normalizedValue };
      }
      return {
        ok: false,
        error: `cacheMode must be one of: ${CACHE_MODE_VALUES.join(", ")}`,
      };
    case "youtubeTranscript":
      if (isOneOf(normalizedValue, YOUTUBE_TRANSCRIPT_VALUES)) {
        return { ok: true, value: normalizedValue };
      }
      return {
        ok: false,
        error: `youtubeTranscript must be one of: ${YOUTUBE_TRANSCRIPT_VALUES.join(", ")}`,
      };
    case "mediaTranscript":
      if (isOneOf(normalizedValue, MEDIA_TRANSCRIPT_VALUES)) {
        return { ok: true, value: normalizedValue };
      }
      return {
        ok: false,
        error: `mediaTranscript must be one of: ${MEDIA_TRANSCRIPT_VALUES.join(", ")}`,
      };
    case "transcriptTimestamps": {
      const parsed = parseBooleanValue(normalizedValue);
      if (parsed === null) {
        return {
          ok: false,
          error:
            "transcriptTimestamps must be boolean: true/false, yes/no, on/off, 1/0.",
        };
      }
      return { ok: true, value: parsed };
    }
    case "firecrawl":
      if (isOneOf(normalizedValue, FIRECRAWL_MODE_VALUES)) {
        return { ok: true, value: normalizedValue };
      }
      return {
        ok: false,
        error: `firecrawl must be one of: ${FIRECRAWL_MODE_VALUES.join(", ")}`,
      };
    case "format":
      if (isOneOf(normalizedValue, CONTENT_FORMAT_VALUES)) {
        return { ok: true, value: normalizedValue };
      }
      return {
        ok: false,
        error: `format must be one of: ${CONTENT_FORMAT_VALUES.join(", ")}`,
      };
    case "markdownMode":
      if (isOneOf(normalizedValue, MARKDOWN_MODE_VALUES)) {
        return { ok: true, value: normalizedValue };
      }
      return {
        ok: false,
        error: `markdownMode must be one of: ${MARKDOWN_MODE_VALUES.join(", ")}`,
      };
    default:
      return {
        ok: false,
        error: `Unsupported option: ${key}`,
      };
  }
}

function formatProgressEvent(event: LinkPreviewProgressEvent): string {
  const payload = JSON.stringify(event);
  return `[link-preview] ${event.kind} ${payload}`;
}

function createFirecrawlScraper(
  apiKey: string
): NonNullable<LinkPreviewClientOptions["scrapeWithFirecrawl"]> {
  return async (url, options) => {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? env.LINK_PREVIEW_TIMEOUT_MS;
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          formats: ["markdown", "html"],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Firecrawl request failed (${response.status})`);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const data =
        typeof payload.data === "object" && payload.data !== null
          ? (payload.data as Record<string, unknown>)
          : payload;

      const markdown =
        typeof data.markdown === "string" ? data.markdown.trim() : "";

      if (!markdown) {
        return null;
      }

      const html = typeof data.html === "string" ? data.html : null;
      const metadata =
        typeof data.metadata === "object" && data.metadata !== null
          ? (data.metadata as Record<string, unknown>)
          : null;

      return {
        markdown,
        html,
        metadata,
      };
    } finally {
      clearTimeout(timeoutHandle);
    }
  };
}

const linkPreviewClientOptions: LinkPreviewClientOptions = {
  env: process.env,
  apifyApiToken: env.APIFY_API_TOKEN ?? null,
  ytDlpPath: env.YT_DLP_PATH ?? null,
  falApiKey: falApiKeyFromEnv,
  groqApiKey: env.GROQ_API_KEY ?? null,
  openaiApiKey: env.OPENAI_API_KEY ?? null,
  scrapeWithFirecrawl: env.FIRECRAWL_API_KEY
    ? createFirecrawlScraper(env.FIRECRAWL_API_KEY)
    : null,
  onProgress: env.LINK_PREVIEW_DEBUG_PROGRESS
    ? (event) => {
        console.log(formatProgressEvent(event));
      }
    : null,
};

const linkPreviewClient = createLinkPreviewClient(linkPreviewClientOptions);

export function getLinkPreviewCapabilities(): LinkPreviewCapabilities {
  return {
    firecrawl: Boolean(env.FIRECRAWL_API_KEY),
    apify: Boolean(env.APIFY_API_TOKEN),
    ytDlp: Boolean(env.YT_DLP_PATH),
    transcriptionWithOpenAI: Boolean(env.OPENAI_API_KEY),
    transcriptionWithGroq: Boolean(env.GROQ_API_KEY),
    transcriptionWithFal: Boolean(falApiKeyFromEnv),
    progressLogs: env.LINK_PREVIEW_DEBUG_PROGRESS,
  };
}

export function getLinkPreviewPresetValues(): readonly LinkPreviewPreset[] {
  return PRESET_VALUES;
}

export function getLinkPreviewOptionKeys(): readonly LinkPreviewOptionKey[] {
  return LINK_PREVIEW_OPTION_KEYS;
}

export function getDefaultLinkPreviewFetchOptions(): FetchLinkContentOptions {
  return { ...defaultFetchOptions };
}

export function getChatLinkPreviewOverrides(
  chatId: number
): Partial<FetchLinkContentOptions> {
  return { ...(chatOptionOverrides.get(chatId) ?? {}) };
}

export function getEffectiveLinkPreviewFetchOptions(
  chatId: number
): FetchLinkContentOptions {
  const overrides = chatOptionOverrides.get(chatId);
  if (!overrides) {
    return getDefaultLinkPreviewFetchOptions();
  }

  return {
    ...defaultFetchOptions,
    ...overrides,
  };
}

export function formatLinkPreviewOptions(
  options: FetchLinkContentOptions
): string[] {
  return LINK_PREVIEW_OPTION_KEYS.map((key) => {
    const value = options[key];
    return `- ${key}: ${value === undefined ? "undefined" : String(value)}`;
  });
}

function normalizeOptionKey(raw: string): LinkPreviewOptionKey | null {
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }

  if (LINK_PREVIEW_OPTION_KEYS.includes(normalized as LinkPreviewOptionKey)) {
    return normalized as LinkPreviewOptionKey;
  }

  const alias = LINK_PREVIEW_OPTION_ALIASES[normalized.toLowerCase()];
  return alias ?? null;
}

export function setChatLinkPreviewOption(
  chatId: number,
  rawKey: string,
  rawValue: string
): {
  ok: boolean;
  message: string;
  options: FetchLinkContentOptions;
} {
  const key = normalizeOptionKey(rawKey);
  if (!key) {
    return {
      ok: false,
      message: `Unknown option "${rawKey}". Available keys: ${LINK_PREVIEW_OPTION_KEYS.join(", ")}`,
      options: getEffectiveLinkPreviewFetchOptions(chatId),
    };
  }

  const parsed = parseOptionValue(key, rawValue);
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.error,
      options: getEffectiveLinkPreviewFetchOptions(chatId),
    };
  }

  const existing = chatOptionOverrides.get(chatId) ?? {};
  const nextOverrides: Partial<FetchLinkContentOptions> = {
    ...existing,
    [key]: parsed.value,
  };
  chatOptionOverrides.set(chatId, nextOverrides);

  return {
    ok: true,
    message: `Set ${key}=${String(parsed.value)} for this chat.`,
    options: getEffectiveLinkPreviewFetchOptions(chatId),
  };
}

export function applyChatLinkPreviewPreset(
  chatId: number,
  preset: LinkPreviewPreset
): FetchLinkContentOptions {
  if (preset === "balanced") {
    chatOptionOverrides.delete(chatId);
    return getEffectiveLinkPreviewFetchOptions(chatId);
  }

  chatOptionOverrides.set(chatId, {
    ...presetOverrides[preset],
  });
  return getEffectiveLinkPreviewFetchOptions(chatId);
}

export function resetChatLinkPreviewOptions(chatId: number): void {
  chatOptionOverrides.delete(chatId);
}

export function parseLinkPreviewPreset(
  rawPreset: string
): LinkPreviewPreset | null {
  const normalized = rawPreset.trim().toLowerCase();
  if (!isOneOf(normalized, PRESET_VALUES)) {
    return null;
  }
  return normalized;
}

export async function fetchDocumentContent(
  url: string,
  options: FetchLinkContentOptions = defaultFetchOptions
): Promise<DocumentContent> {
  const extracted = await linkPreviewClient.fetchLinkContent(url, options);

  return {
    url: extracted.url,
    title: extracted.title,
    content: extracted.content,
  };
}
