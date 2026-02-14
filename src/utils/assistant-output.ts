const DISALLOWED_LINE_PATTERNS = [
  /Fetching and summarizing the link\.\s*This may take a moment(?:\.{3}|…)?/i,
  /Ask questions about this document.*\/newchat.*reset\.?/i,
];

export function sanitizeAssistantOutput(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return true;
      }

      return !DISALLOWED_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
    })
    .join("\n")
    .trim();
}
