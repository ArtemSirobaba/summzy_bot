import type { Context } from "grammy";
/**
 * Telegram MarkdownV2 Formatter - Final Version
 * Converts Markdown to Telegram MarkdownV2 format
 *
 * Reference: https://core.telegram.org/api/entities
 */

export class TelegramMarkdownV2Formatter {
  // Characters that must be escaped outside code/links
  private static readonly ESCAPE_CHARS = [
    "_",
    "*",
    "[",
    "]",
    "(",
    ")",
    "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!",
  ];

  /**
   * Main formatting function
   */
  static format(markdown: string): string {
    if (!markdown) return "";

    // Step 1: Extract and protect code blocks and inline code
    const { text: textWithoutCode, codeBlocks } =
      this.extractCodeBlocks(markdown);

    // Step 2: Convert markdown formatting to Telegram format
    const formatted = this.convertMarkdownToTelegramFormat(textWithoutCode);

    // Step 3: Escape special characters
    const escaped = this.escapeSpecialCharacters(formatted);

    // Step 4: Restore code blocks
    const final = this.restoreCodeBlocks(escaped, codeBlocks);

    return final;
  }

  /**
   * Extract code blocks and inline code
   */
  private static extractCodeBlocks(text: string): {
    text: string;
    codeBlocks: Map<string, string>;
  } {
    const codeBlocks = new Map<string, string>();
    let counter = 0;
    let result = text;

    // Extract fenced code blocks
    result = result.replace(
      /```([\w]*)\n?([\s\S]*?)```/g,
      (match, lang, code) => {
        const placeholder = `\x00CODEBLOCK${counter}\x00`;
        const formattedCode = lang
          ? `\`\`\`${lang}\n${code.trim()}\`\`\``
          : `\`\`\`\n${code.trim()}\`\`\``;
        codeBlocks.set(placeholder, formattedCode);
        counter++;
        return placeholder;
      }
    );

    // Extract inline code
    result = result.replace(/`([^`\n]+?)`/g, (match, code) => {
      const placeholder = `\x00CODE${counter}\x00`;
      codeBlocks.set(placeholder, `\`${code}\``);
      counter++;
      return placeholder;
    });

    return { text: result, codeBlocks };
  }

  /**
   * Convert markdown formatting to Telegram MarkdownV2
   */
  private static convertMarkdownToTelegramFormat(text: string): string {
    let result = text;

    // Headers: # -> bold
    result = result.replace(/^#{1,6}\s+(.+?)$/gm, "*$1*");

    // Process bold and italic carefully to avoid conflicts
    // Strategy: Use unique placeholders that won't conflict

    // Bold: **text** -> temporary marker
    result = result.replace(/\*\*(.+?)\*\*/gs, "\x00BOLD\x00$1\x00/BOLD\x00");

    // Bold: __text__ -> temporary marker
    result = result.replace(
      /(?<!_)__(?!_)(.+?)__(?!_)/gs,
      "\x00BOLD\x00$1\x00/BOLD\x00"
    );

    // Italic: *text* -> temporary marker
    result = result.replace(/\*(.+?)\*/gs, "\x00ITALIC\x00$1\x00/ITALIC\x00");

    // Italic: _text_ -> keep as underscore (already in Telegram format)
    // Just need to make sure single _ becomes _text_
    // This regex should match single underscores not part of __
    result = result.replace(
      /(?<!_)_(?!_)(.+?)_(?!_)/gs,
      "\x00ITALIC\x00$1\x00/ITALIC\x00"
    );

    // Convert markers to Telegram format
    result = result.replace(/\x00BOLD\x00(.+?)\x00\/BOLD\x00/gs, "*$1*");
    result = result.replace(/\x00ITALIC\x00(.+?)\x00\/ITALIC\x00/gs, "_$1_");

    // Strikethrough: ~~text~~ -> ~text~
    result = result.replace(/~~(.+?)~~/gs, "~$1~");

    // Underline: <u>text</u> -> __text__
    result = result.replace(/<u>(.+?)<\/u>/gs, "__$1__");

    // Blockquote: > text -> >text
    result = result.replace(/^>\s*(.+)$/gm, ">$1");

    return result;
  }

  /**
   * Escape special characters in formatted text
   */
  private static escapeSpecialCharacters(text: string): string {
    const parts: string[] = [];
    let currentIndex = 0;

    // Pattern to match all Telegram formatting
    const pattern =
      /__[^_]+?__|~[^~]+?~|\*[^*]+?\*|_[^_]+?_|\[[^\]]+?\]\([^)]+?\)|^>[^\n]+/gm;

    const markers: Array<{ start: number; end: number; text: string }> = [];

    let match;
    while ((match = pattern.exec(text)) !== null) {
      markers.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
    }

    // Process text between markers
    for (const marker of markers) {
      // Escape plain text before marker
      if (currentIndex < marker.start) {
        parts.push(this.escapeText(text.substring(currentIndex, marker.start)));
      }

      // Handle different marker types
      const markerText = marker.text;

      if (markerText.startsWith("[")) {
        // Link [text](url) - escape text, not URL
        const linkMatch = markerText.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          parts.push(`[${this.escapeText(linkMatch[1])}](${linkMatch[2]})`);
        } else {
          parts.push(markerText);
        }
      } else if (markerText.startsWith(">")) {
        // Blockquote >text - escape content
        parts.push(">" + this.escapeText(markerText.substring(1)));
      } else if (markerText.startsWith("__") && markerText.endsWith("__")) {
        // Underline __text__
        const content = markerText.slice(2, -2);
        parts.push("__" + this.escapeText(content) + "__");
      } else if (markerText.startsWith("~") && markerText.endsWith("~")) {
        // Strike ~text~
        const content = markerText.slice(1, -1);
        parts.push("~" + this.escapeText(content) + "~");
      } else if (markerText.startsWith("*") && markerText.endsWith("*")) {
        // Bold *text*
        const content = markerText.slice(1, -1);
        parts.push("*" + this.escapeText(content) + "*");
      } else if (markerText.startsWith("_") && markerText.endsWith("_")) {
        // Italic _text_
        const content = markerText.slice(1, -1);
        parts.push("_" + this.escapeText(content) + "_");
      } else {
        parts.push(markerText);
      }

      currentIndex = marker.end;
    }

    // Escape remaining text
    if (currentIndex < text.length) {
      parts.push(this.escapeText(text.substring(currentIndex)));
    }

    return parts.join("");
  }

  /**
   * Escape special characters
   */
  private static escapeText(text: string): string {
    let result = text;
    for (const char of this.ESCAPE_CHARS) {
      result = result.split(char).join(`\\${char}`);
    }
    return result;
  }

  /**
   * Restore code blocks
   */
  private static restoreCodeBlocks(
    text: string,
    blocks: Map<string, string>
  ): string {
    let result = text;
    for (const [placeholder, code] of blocks.entries()) {
      result = result.replace(placeholder, code);
    }
    return result;
  }

  /**
   * Calculate UTF-16 length
   */
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

  /**
   * Strip formatting
   */
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

/**
 * Helper functions
 */
export function formatForTelegram(markdown: string): string {
  return TelegramMarkdownV2Formatter.format(markdown);
}

export function escapeForTelegram(text: string): string {
  return TelegramMarkdownV2Formatter["escapeText"](text);
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
