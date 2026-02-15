import { tool } from "ai";
import z from "zod";
import { searchProcessor } from "./processor";

export const createWebTools = () => {
  return {
    summarizeLink: tool({
      description: [
        "Use this when the user asks to summarize or explain a specific URL.",
        "Best for: articles, PDFs, YouTube videos, docs, GitHub pages, blog posts.",
        "Do NOT use for broad queries that are not tied to one URL.",
        "Examples:",
        '- "summarize https://example.com/post"',
        '- "give me key points from this YouTube link"',
      ].join("\n"),
      inputSchema: z.object({
        url: z.url().describe("The URL of the link to summarize"),
      }),
      execute: async ({ url }) => {
        try {
          const result = await searchProcessor.summarizeLink(url);
          return { result: result };
        } catch (error) {
          console.error("[tools.summarizeLink]", error);
          return {
            error,
          };
        }
      },
    }),
    scrapeWebsite: tool({
      description: [
        "Use this when the user wants to inspect what is currently on a page.",
        "Best for: extracting page title and readable body text from a URL.",
        "Do NOT use for broad discovery across multiple websites.",
        "Examples:",
        '- "what does this page say?"',
        '- "extract the content from https://example.com so I can read it"',
      ].join("\n"),
      inputSchema: z.object({
        url: z.url().describe("The URL of the website to scrape"),
      }),
      execute: async ({ url }) => {
        try {
          const result = await searchProcessor.scrape(url);
          console.log(result);
          return { result: result };
        } catch (error) {
          console.error("[tools.scrapeWebsite]", error);
          return {
            error,
          };
        }
      },
    }),
    webSearch: tool({
      description: [
        "Use this when the user needs web discovery across multiple sources.",
        "Best for: recent news, market moves, comparisons, and up-to-date facts.",
        "Prefer 3-8 specific keywords; include dates for time-sensitive topics.",
        "Examples:",
        '- "why is crypto market moving today"',
        '- "latest Telegram Bot API changes 2026"',
      ].join("\n"),
      inputSchema: z.object({
        query: z
          .string()
          .min(1, "Query is required")
          .describe(`The query to search the web for`),
      }),
      execute: async ({ query }) => {
        try {
          try {
            const results = await searchProcessor.search(query);
            return {
              results,
            };
          } catch (error) {
            return {
              results: error,
            };
          }
        } catch (error) {
          console.error("[tools.webSearch]", error);
          return {
            error,
          };
        }
      },
    }),
  };
};
