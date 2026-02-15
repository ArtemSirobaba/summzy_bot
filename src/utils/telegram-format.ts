import type { Context } from "grammy";

/**
 * Telegram MarkdownV2 Formatter
 *
 * Pipeline:
 * 1. Extract code blocks/inline code → placeholders
 * 2. Normalize markdown (headers, HR, bold, italic, strikethrough, links, blockquotes)
 * 3. Validate marker pairing per-line; escape unpaired markers
 * 4. Escape remaining special chars outside formatting regions
 * 5. Restore code blocks
 */

// Characters that must be escaped in Telegram MarkdownV2 (outside formatting)
const SPECIAL_CHARS = /[_*[\]()~`>#+\-=|{}.!\\]/g;

function escapeChar(ch: string): string {
  return `\\${ch}`;
}

function escapeText(text: string): string {
  return text.replace(SPECIAL_CHARS, escapeChar);
}

// Inside link URLs, only ) and \ need escaping per Telegram spec
function escapeUrl(url: string): string {
  return url.replace(/[)\\]/g, escapeChar);
}

// ─── Code extraction ───────────────────────────────────────────────

interface CodeStore {
  blocks: Map<string, string>;
  counter: number;
}

function extractCode(text: string): { text: string; store: CodeStore } {
  const store: CodeStore = { blocks: new Map(), counter: 0 };
  let result = text;

  // Fenced code blocks: ```lang\ncode```
  result = result.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const ph = `\x00CB${store.counter++}\x00`;
    const formatted = lang
      ? `\`\`\`${lang}\n${code.trimEnd()}\n\`\`\``
      : `\`\`\`\n${code.trimEnd()}\n\`\`\``;
    store.blocks.set(ph, formatted);
    return ph;
  });

  // Inline code: `code`
  result = result.replace(/`([^`\n]+?)`/g, (_m, code) => {
    const ph = `\x00IC${store.counter++}\x00`;
    store.blocks.set(ph, `\`${code}\``);
    return ph;
  });

  return { text: result, store };
}

function restoreCode(text: string, store: CodeStore): string {
  let result = text;
  for (const [ph, code] of store.blocks) {
    result = result.replace(ph, code);
  }
  return result;
}

// ─── Markdown normalization ────────────────────────────────────────

/**
 * Convert standard markdown to Telegram MarkdownV2 formatting markers.
 * Uses sentinel tokens to avoid double-processing.
 */
function normalizeMarkdown(text: string): {
  text: string;
  escaped: string[];
} {
  let result = text;

  // Pre-process: unescape already-escaped markdown chars (e.g. \* \_ \~)
  // Replace with numbered placeholders to avoid interfering with markdown regexes.
  const escaped: string[] = [];
  result = result.replace(/\\([_*~`\\[\]()>#+=|{}.!\-])/g, (_m, ch) => {
    const idx = escaped.length;
    escaped.push(ch);
    return `\x02${idx}\x02`;
  });

  // Headers → bold
  result = result.replace(/^#{1,6}\s+(.+?)$/gm, "\x01BOLD$1\x01/BOLD");

  // Horizontal rules: ---, ***, ___ (3+ chars)
  result = result.replace(/^[-*_]{3,}$/gm, "\x01HR");

  // Images: ![alt](url) or ![alt](url "title") → just the alt text
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Links: [text](url) or [text](url "title") — strip optional title
  // URL pattern handles one level of balanced parentheses (e.g. wikipedia URLs)
  result = result.replace(
    /\[([^\]]+)\]\(((?:[^\s()]*(?:\([^\s()]*\))[^\s()]*|[^\s)"])+)(?:\s+"[^"]*")?\)/g,
    "\x01LINK$1\x01LSEP$2\x01/LINK"
  );

  // Bold+Italic: ***text*** or ___text___
  result = result.replace(
    /\*\*\*(.+?)\*\*\*/g,
    "\x01BOLD\x01ITALIC$1\x01/ITALIC\x01/BOLD"
  );
  result = result.replace(
    /___(.+?)___/g,
    "\x01BOLD\x01ITALIC$1\x01/ITALIC\x01/BOLD"
  );

  // Bold+Italic mixed: **_text_** or __*text*__
  result = result.replace(
    /\*\*_(.+?)_\*\*/g,
    "\x01BOLD\x01ITALIC$1\x01/ITALIC\x01/BOLD"
  );
  result = result.replace(
    /__\*(.+?)\*__/g,
    "\x01BOLD\x01ITALIC$1\x01/ITALIC\x01/BOLD"
  );

  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, "\x01BOLD$1\x01/BOLD");
  result = result.replace(/(?<!_)__(?!_)(.+?)__(?!_)/g, "\x01BOLD$1\x01/BOLD");

  // Italic: *text* or _text_ (single, not double)
  result = result.replace(
    /(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g,
    "\x01ITALIC$1\x01/ITALIC"
  );
  result = result.replace(
    /(?<!_)_(?!_)(.+?)_(?!_)/g,
    "\x01ITALIC$1\x01/ITALIC"
  );

  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, "\x01STRIKE$1\x01/STRIKE");

  // Spoiler: ||text|| (Telegram-specific, pass through)
  result = result.replace(/\|\|(.+?)\|\|/g, "\x01SPOILER$1\x01/SPOILER");

  // Blockquotes: > or >> (nested treated same — Telegram only has single-level)
  result = result.replace(/^>+\s?(.*)$/gm, "\x01BQ$1");

  // Ordered lists: 1. item → number with escaped dot
  result = result.replace(/^(\d+)\.\s+/gm, (_m, num) => {
    const idx = escaped.length;
    escaped.push(".");
    return `${num}\x02${idx}\x02 `;
  });

  // Unordered lists: - item or * item → • item
  result = result.replace(/^[-*]\s+/gm, "• ");

  return { text: result, escaped };
}

// ─── Sentinel resolution ───────────────────────────────────────────

function resolveLine(line: string): string {
  // Parse the line into segments: plain text and sentinel-wrapped regions
  const segments: Array<
    | { type: "text"; content: string }
    | { type: "bold"; content: string }
    | { type: "italic"; content: string }
    | { type: "strike"; content: string }
    | { type: "spoiler"; content: string }
    | { type: "link"; text: string; url: string }
    | { type: "blockquote"; content: string }
    | { type: "hr" }
  > = [];

  let remaining = line;

  while (remaining.length > 0) {
    // Find the next sentinel
    const nextSentinel = remaining.indexOf("\x01");

    if (nextSentinel === -1) {
      // No more sentinels — rest is plain text
      segments.push({ type: "text", content: remaining });
      break;
    }

    // Push any text before the sentinel
    if (nextSentinel > 0) {
      segments.push({
        type: "text",
        content: remaining.substring(0, nextSentinel),
      });
      remaining = remaining.substring(nextSentinel);
    }

    // Identify sentinel type
    if (remaining.startsWith("\x01HR")) {
      segments.push({ type: "hr" });
      remaining = remaining.substring(3); // \x01HR
    } else if (remaining.startsWith("\x01BQ")) {
      const content = remaining.substring(3); // \x01BQ
      segments.push({ type: "blockquote", content });
      remaining = "";
    } else if (remaining.startsWith("\x01BOLD")) {
      const end = remaining.indexOf("\x01/BOLD");
      if (end === -1) {
        // Unclosed — treat as plain text
        segments.push({ type: "text", content: remaining.substring(1) });
        remaining = "";
      } else {
        const content = remaining.substring(5, end); // after \x01BOLD
        segments.push({ type: "bold", content });
        remaining = remaining.substring(end + 6); // after \x01/BOLD
      }
    } else if (remaining.startsWith("\x01ITALIC")) {
      const end = remaining.indexOf("\x01/ITALIC");
      if (end === -1) {
        segments.push({ type: "text", content: remaining.substring(1) });
        remaining = "";
      } else {
        const content = remaining.substring(7, end);
        segments.push({ type: "italic", content });
        remaining = remaining.substring(end + 8);
      }
    } else if (remaining.startsWith("\x01STRIKE")) {
      const end = remaining.indexOf("\x01/STRIKE");
      if (end === -1) {
        segments.push({ type: "text", content: remaining.substring(1) });
        remaining = "";
      } else {
        const content = remaining.substring(7, end);
        segments.push({ type: "strike", content });
        remaining = remaining.substring(end + 8);
      }
    } else if (remaining.startsWith("\x01SPOILER")) {
      const end = remaining.indexOf("\x01/SPOILER");
      if (end === -1) {
        segments.push({ type: "text", content: remaining.substring(1) });
        remaining = "";
      } else {
        const content = remaining.substring(8, end); // after \x01SPOILER
        segments.push({ type: "spoiler", content });
        remaining = remaining.substring(end + 9); // after \x01/SPOILER
      }
    } else if (remaining.startsWith("\x01LINK")) {
      const sepIdx = remaining.indexOf("\x01LSEP");
      const endIdx = remaining.indexOf("\x01/LINK");
      if (sepIdx === -1 || endIdx === -1) {
        segments.push({ type: "text", content: remaining.substring(1) });
        remaining = "";
      } else {
        const linkText = remaining.substring(5, sepIdx);
        const url = remaining.substring(sepIdx + 5, endIdx);
        segments.push({ type: "link", text: linkText, url });
        remaining = remaining.substring(endIdx + 6);
      }
    } else {
      // Unknown sentinel — skip the \x01 and treat rest as text
      segments.push({ type: "text", content: remaining.substring(1) });
      remaining = "";
    }
  }

  // Render segments
  return segments
    .map((seg) => {
      switch (seg.type) {
        case "text":
          return escapeText(seg.content);
        case "bold":
          return `*${resolveInner(seg.content)}*`;
        case "italic":
          return `_${resolveInner(seg.content)}_`;
        case "strike":
          return `~${resolveInner(seg.content)}~`;
        case "spoiler":
          return `||${resolveInner(seg.content)}||`;
        case "link":
          return `[${resolveInner(seg.text)}](${escapeUrl(seg.url)})`;
        case "blockquote":
          return `>${resolveInner(seg.content)}`;
        case "hr":
          return escapeText("———");
      }
    })
    .join("");
}

/**
 * Resolve inner content: if it contains sentinels (nested formatting),
 * recurse; otherwise just escape.
 */
function resolveInner(text: string): string {
  if (text.includes("\x01")) {
    return resolveLine(text);
  }
  return escapeText(text);
}

// ─── Main pipeline ─────────────────────────────────────────────────

/**
 * Convert markdown text to Telegram MarkdownV2 format.
 * Handles malformed/mismatched markers gracefully by escaping them.
 */
function formatForTelegram(text: string): string {
  if (!text) return "";

  // Step 1: Extract code blocks
  const { text: withoutCode, store } = extractCode(text);

  // Step 2: Normalize markdown → sentinels
  const { text: normalized, escaped } = normalizeMarkdown(withoutCode);

  // Step 3: Resolve sentinels → escaped text with formatting markers
  // Process line by line to prevent cross-line formatting leaks
  const lines = normalized.split("\n");
  let formatted = lines.map((line) => resolveLine(line)).join("\n");

  // Step 3.5: Restore pre-escaped characters
  formatted = formatted.replace(/\x02(\d+)\x02/g, (_m, idx) => {
    return `\\${escaped[Number(idx)]}`;
  });

  // Step 4: Restore code blocks
  return restoreCode(formatted, store);
}

// ─── Public API (preserved for backwards compatibility) ────────────

export class TelegramMarkdownV2Formatter {
  static format(text: string): string {
    return formatForTelegram(text);
  }

  static formatSmart(text: string): string {
    return formatForTelegram(text);
  }

  static escapeOnly(text: string): string {
    if (!text) return "";
    const { text: withoutCode, store } = extractCode(text);
    const escaped = escapeText(withoutCode);
    return restoreCode(escaped, store);
  }

  static getUtf16Length(text: string): number {
    let length = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff) {
        length += 2;
        i++;
      } else {
        length += 1;
      }
    }
    return length;
  }

  static stripFormatting(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/<u>(.+?)<\/u>/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s+/gm, "")
      .trim();
  }
}

export { formatForTelegram };
export function formatMarkdown(text: string): string {
  return formatForTelegram(text);
}
export function escapeForTelegram(text: string): string {
  return TelegramMarkdownV2Formatter.escapeOnly(text);
}
export function getUtf16Length(text: string): number {
  return TelegramMarkdownV2Formatter.getUtf16Length(text);
}

export async function replyMarkdownV2WithFallback(
  ctx: Context,
  text: string
): Promise<void> {
  try {
    await ctx.reply(formatForTelegram(text), { parse_mode: "MarkdownV2" });
  } catch (error) {
    console.error("[replyMarkdownV2WithFallback]", error);
    await ctx.reply(text, { parse_mode: undefined });
  }
}
