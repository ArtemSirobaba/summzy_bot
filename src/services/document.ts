import { createLinkPreviewClient } from "@steipete/summarize-core";

export interface DocumentContent {
  url: string;
  title: string | null;
  content: string;
}

const linkPreviewClient = createLinkPreviewClient({});

export async function fetchDocumentContent(
  url: string
): Promise<DocumentContent> {
  const extracted = await linkPreviewClient.fetchLinkContent(url, {
    format: "markdown",
  });

  return {
    url: extracted.url,
    title: extracted.title,
    content: extracted.content,
  };
}
