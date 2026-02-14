import type { Context } from "grammy";

const MARKDOWN_V2_SPECIAL_CHARS_REGEX = /[_*\[\]()~`>#+=|{}.!-]/g;
const BOLD_REGEX = /\*\*([^*\n][^*\n]*)\*\*/g;

function escapeMarkdownV2(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(MARKDOWN_V2_SPECIAL_CHARS_REGEX, "\\$&");
}

export function formatMarkdownV2(text: string): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[*-]\s+/gm, "- ")
    .trim();

  const boldSegments: string[] = [];
  const textWithTokens = normalized.replace(BOLD_REGEX, (_, inner: string) => {
    const token = `BOLDTOKEN${boldSegments.length}TOKEN`;
    boldSegments.push(inner);
    return token;
  });

  let escaped = escapeMarkdownV2(textWithTokens);

  boldSegments.forEach((segment, index) => {
    const token = `BOLDTOKEN${index}TOKEN`;
    const formattedSegment = `*${escapeMarkdownV2(segment)}*`;
    escaped = escaped.replace(token, formattedSegment);
  });

  return escaped;
}

export async function replyMarkdownV2WithFallback(
  ctx: Context,
  text: string
): Promise<void> {
  const markdownText = formatMarkdownV2(text);

  try {
    await ctx.reply(markdownText, { parse_mode: "MarkdownV2" });
  } catch {
    await ctx.reply(text, { parse_mode: undefined });
  }
}
