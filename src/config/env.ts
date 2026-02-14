import "dotenv/config";
import z from "zod";

const ProviderSchema = z.enum([
  "openrouter",
  "openai",
  "anthropic",
  "minimax",
  "xai",
]);
const CacheModeSchema = z.enum(["default", "bypass"]);
const YoutubeTranscriptModeSchema = z.enum([
  "auto",
  "web",
  "apify",
  "yt-dlp",
  "no-auto",
]);
const MediaTranscriptModeSchema = z.enum(["auto", "prefer"]);
const FirecrawlModeSchema = z.enum(["off", "auto", "always"]);
const ContentFormatSchema = z.enum(["text", "markdown"]);
const MarkdownModeSchema = z.enum(["off", "auto", "llm", "readability"]);

const EnvBooleanSchema = z.preprocess((input) => {
  if (typeof input === "boolean") {
    return input;
  }

  if (typeof input !== "string") {
    return input;
  }

  const normalized = input.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return input;
}, z.boolean());

function parseTelegramUserIds(
  singleUserIdRaw?: string,
  userIdsRaw?: string
): number[] {
  const userIds = new Set<number>();

  const parseOneId = (raw: string): number => {
    const parsed = Number(raw.trim());
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid Telegram user id: "${raw}"`);
    }
    return parsed;
  };

  if (singleUserIdRaw?.trim()) {
    userIds.add(parseOneId(singleUserIdRaw));
  }

  if (userIdsRaw?.trim()) {
    const value = userIdsRaw.trim();

    if (value.startsWith("[")) {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        throw new Error("TELEGRAM_USER_IDS must be a JSON array of user ids");
      }

      for (const item of parsed) {
        userIds.add(parseOneId(String(item)));
      }
    } else {
      const parts = value.split(",");
      for (const part of parts) {
        if (part.trim()) {
          userIds.add(parseOneId(part));
        }
      }
    }
  }

  return [...userIds];
}

export const EnvSchema = z
  .object({
    BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    MINIMAX_API_KEY: z.string().min(1).optional(),
    XAI_API_KEY: z.string().min(1).optional(),
    DEFAULT_PROVIDER: ProviderSchema.optional(),
    DEFAULT_MODEL: z.string().min(1).optional(),
    TELEGRAM_USER_ID: z.string().min(1).optional(),
    TELEGRAM_USER_IDS: z.string().min(1).optional(),
    MAX_TELEGRAM_MESSAGE_LENGTH: z.coerce
      .number()
      .int()
      .min(1000)
      .max(4096)
      .optional()
      .default(4000),
    APIFY_API_TOKEN: z.string().min(1).optional(),
    YT_DLP_PATH: z.string().min(1).optional(),
    GROQ_API_KEY: z.string().min(1).optional(),
    FAL_KEY: z.string().min(1).optional(),
    FAL_API_KEY: z.string().min(1).optional(),
    FIRECRAWL_API_KEY: z.string().min(1).optional(),
    LINK_PREVIEW_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(600000)
      .optional()
      .default(120000),
    LINK_PREVIEW_MAX_CHARACTERS: z.coerce
      .number()
      .int()
      .min(500)
      .max(50000)
      .optional()
      .default(8000),
    LINK_PREVIEW_CACHE_MODE: CacheModeSchema.optional().default("default"),
    LINK_PREVIEW_YOUTUBE_TRANSCRIPT_MODE: YoutubeTranscriptModeSchema.optional().default(
      "auto"
    ),
    LINK_PREVIEW_MEDIA_TRANSCRIPT_MODE: MediaTranscriptModeSchema.optional().default(
      "auto"
    ),
    LINK_PREVIEW_TRANSCRIPT_TIMESTAMPS: EnvBooleanSchema.optional().default(false),
    LINK_PREVIEW_FIRECRAWL_MODE: FirecrawlModeSchema.optional().default("auto"),
    LINK_PREVIEW_FORMAT: ContentFormatSchema.optional().default("markdown"),
    LINK_PREVIEW_MARKDOWN_MODE: MarkdownModeSchema.optional().default("auto"),
    LINK_PREVIEW_DEBUG_PROGRESS: EnvBooleanSchema.optional().default(false),
  })
  .superRefine((value, ctx) => {
    const hasAnyProviderKey = Boolean(
      value.OPENROUTER_API_KEY ||
        value.OPENAI_API_KEY ||
        value.ANTHROPIC_API_KEY ||
        value.MINIMAX_API_KEY ||
        value.XAI_API_KEY
    );

    if (!hasAnyProviderKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one provider key is required: OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, MINIMAX_API_KEY, or XAI_API_KEY",
      });
    }
  })
  .transform((value, ctx) => {
    try {
      const telegramAdminUserIds = parseTelegramUserIds(
        value.TELEGRAM_USER_ID,
        value.TELEGRAM_USER_IDS
      );

      return {
        ...value,
        TELEGRAM_ADMIN_USER_IDS: telegramAdminUserIds,
      };
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          error instanceof Error
            ? error.message
            : "Failed to parse TELEGRAM_USER_ID/TELEGRAM_USER_IDS",
      });
      return z.NEVER;
    }
  });

export type Env = z.infer<typeof EnvSchema>;
export type ProviderName = z.infer<typeof ProviderSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return EnvSchema.parse(source);
}

export const env: Env = parseEnv(process.env);
