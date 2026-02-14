import assert from "node:assert/strict";
import test from "node:test";
import { extractFirstUrl, extractUrls } from "../src/utils/url";

test("extractFirstUrl returns first valid URL", () => {
  const text = "check https://example.com and https://openai.com";
  assert.equal(extractFirstUrl(text), "https://example.com");
});

test("extractUrls deduplicates and sanitizes punctuation", () => {
  const text = "Read https://example.com, and again https://example.com.";
  assert.deepEqual(extractUrls(text), ["https://example.com"]);
});

test("extractFirstUrl returns null for text without URLs", () => {
  assert.equal(extractFirstUrl("hello world"), null);
});
