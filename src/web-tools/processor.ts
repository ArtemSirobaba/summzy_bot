import { env } from "@/config/env";
import { Readability } from "@mozilla/readability";
import {
  FetchLinkContentOptions,
  LinkPreviewClient,
  LinkPreviewClientOptions,
  createLinkPreviewClient,
} from "@steipete/summarize-core";
import { SafeSearchType, search } from "duck-duck-scrape";
import { JSDOM } from "jsdom";
import pLimit, { LimitFunction } from "p-limit";
import puppeteer from "puppeteer";
import TurndownService from "turndown";
import { executeUntilSuccess } from "../utils/fallback";

const DEFAULT_LINK_PREVIEW_TIMEOUT_MS = 120000;

const falApiKeyFromEnv = env.FAL_KEY ?? env.FAL_API_KEY ?? null;

const defaultFetchOptions: FetchLinkContentOptions = {
  timeoutMs: DEFAULT_LINK_PREVIEW_TIMEOUT_MS,
  maxCharacters: 8000,
  cacheMode: "default",
  youtubeTranscript: "auto",
  mediaTranscript: "auto",
  transcriptTimestamps: false,
  firecrawl: "auto",
  format: "markdown",
  markdownMode: "auto",
};

const linkPreviewClientOptions: LinkPreviewClientOptions = {
  env: process.env,
  apifyApiToken: env.APIFY_API_TOKEN ?? null,
  ytDlpPath: env.YT_DLP_PATH ?? null,
  falApiKey: falApiKeyFromEnv,
  groqApiKey: env.GROQ_API_KEY ?? null,
  openaiApiKey: env.OPENAI_API_KEY ?? null,
};

class SearchProcessor {
  private limit: LimitFunction;
  private turndownService: TurndownService;

  private client: LinkPreviewClient = createLinkPreviewClient(
    linkPreviewClientOptions
  );

  constructor(concurrencyLimit: number = 2) {
    this.limit = pLimit(concurrencyLimit);
    this.turndownService = new TurndownService();

    this.turndownService.addRule("removeExtras", {
      filter: ["style", "script", "noscript"],
      replacement: () => "",
    });
  }

  async summarizeLink(url: string) {
    const linkContent = await this.client.fetchLinkContent(
      url,
      defaultFetchOptions
    );
    return linkContent;
  }

  async scrapeWebsite(url: string) {
    const data = await fetch(url).then((res) => res.text());

    const dom = new JSDOM(data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    return article;
  }

  async searchMinimax(query: string) {
    if (!query.trim()) {
      throw new Error("Query is required");
    }

    if (!env.MINIMAX_API_KEY) {
      throw new Error("MINIMAX_API_KEY is not configured");
    }
    const API_HOST = "https://api.minimax.io";

    const response = await fetch(`${API_HOST}/v1/coding_plan/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({ q: query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Web search failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  async searchDuckDuckGo(query: string) {
    const results = await this.limit(() =>
      search(query, {
        safeSearch: SafeSearchType.STRICT,
      })
    );
    return results;
  }

  async searchDuckDuckGoHTML(query: string) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const url = `https://html.duckduckgo.com/html/?${new URLSearchParams({
      q: query,
    })}`;

    await page.goto(url, { waitUntil: "networkidle2" });

    const results = await page.evaluate(() => {
      const snippets = document.querySelectorAll(".result__snippet");
      const titles = document.querySelectorAll(".result__title");
      const links = document.querySelectorAll(".result__url");

      return [...snippets].map((snippet, i) => ({
        title: titles[i]?.textContent?.trim(),
        snippet: snippet.textContent?.trim(),
        url: links[i]?.getAttribute("href") ?? "",
        score: 1,
      }));
    });
    await browser.close();

    return results;
  }

  async scrape(url: string) {
    return await executeUntilSuccess([
      () => this.scrapeWebsite(url),
      () => this.scrapeUrlToMDX(url),
    ]);
  }

  async search(query: string) {
    return await executeUntilSuccess([
      () => this.searchMinimax(query),
      () => this.searchDuckDuckGo(query),
      () => this.searchDuckDuckGoHTML(query),
    ]);
  }

  async scrapeUrlToMDX(url: string) {
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2" });

      const content = await page.evaluate(() => {
        const body = document.querySelector("body");
        return body ? body.innerHTML : "";
      });

      await browser.close();
      return this.turndownService.turndown(content);
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      throw error;
    }
  }
}

const searchProcessor = new SearchProcessor();

export { searchProcessor };
