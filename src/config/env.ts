import "dotenv/config";
import z from "zod";

const ProviderSchema = z.enum(["openrouter", "openai", "anthropic", "xai"]);

export const EnvSchema = z
  .object({
    BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    XAI_API_KEY: z.string().min(1).optional(),
    DEFAULT_PROVIDER: ProviderSchema.optional(),
    DEFAULT_MODEL: z.string().min(1).optional(),
    MAX_TELEGRAM_MESSAGE_LENGTH: z.coerce
      .number()
      .int()
      .min(1000)
      .max(4096)
      .optional()
      .default(4000),
  })
  .superRefine((value, ctx) => {
    const hasAnyProviderKey = Boolean(
      value.OPENROUTER_API_KEY ||
        value.OPENAI_API_KEY ||
        value.ANTHROPIC_API_KEY ||
        value.XAI_API_KEY
    );

    if (!hasAnyProviderKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one provider key is required: OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or XAI_API_KEY",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;
export type ProviderName = z.infer<typeof ProviderSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return EnvSchema.parse(source);
}

export const env: Env = parseEnv(process.env);
