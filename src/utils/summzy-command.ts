import { extractFirstUrl } from "./url";

export function extractSummzyUrl(rawArgs: string): string | null {
  const value = rawArgs.trim();
  if (!value) {
    return null;
  }

  return extractFirstUrl(value);
}

export function buildSummzyUsageMessage(): string {
  return [
    "Usage: /summzy <url>",
    "Example:",
    "/summzy https://example.com/article",
  ].join("\n");
}
