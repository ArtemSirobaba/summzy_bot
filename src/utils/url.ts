const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

function sanitizeUrlCandidate(rawCandidate: string): string {
  return rawCandidate.replace(/[),.;!?]+$/g, "");
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function extractUrls(text: string): string[] {
  const candidates = text.match(URL_REGEX) ?? [];
  return candidates
    .map(sanitizeUrlCandidate)
    .filter((candidate, index, all) => isHttpUrl(candidate) && all.indexOf(candidate) === index);
}

export function extractFirstUrl(text: string): string | null {
  const [firstUrl] = extractUrls(text);
  return firstUrl ?? null;
}
