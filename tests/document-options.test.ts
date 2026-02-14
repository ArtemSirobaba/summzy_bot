import assert from "node:assert/strict";
import test from "node:test";
import {
  applyChatLinkPreviewPreset,
  getDefaultLinkPreviewFetchOptions,
  getEffectiveLinkPreviewFetchOptions,
  parseLinkPreviewPreset,
  resetChatLinkPreviewOptions,
  setChatLinkPreviewOption,
} from "../src/services/document";

test("preview option override applies per chat", () => {
  const chatId = 991001;
  resetChatLinkPreviewOptions(chatId);

  const result = setChatLinkPreviewOption(chatId, "firecrawl", "always");
  assert.equal(result.ok, true);
  assert.equal(result.options.firecrawl, "always");
  assert.equal(getEffectiveLinkPreviewFetchOptions(chatId).firecrawl, "always");

  resetChatLinkPreviewOptions(chatId);
});

test("preview option override validates invalid values", () => {
  const chatId = 991002;
  resetChatLinkPreviewOptions(chatId);

  const result = setChatLinkPreviewOption(chatId, "youtubeTranscript", "invalid");
  assert.equal(result.ok, false);
  assert.match(result.message, /must be one of/i);
});

test("preview presets can be parsed and applied", () => {
  const chatId = 991003;
  resetChatLinkPreviewOptions(chatId);

  assert.equal(parseLinkPreviewPreset("deep"), "deep");
  assert.equal(parseLinkPreviewPreset("unknown"), null);

  const deepOptions = applyChatLinkPreviewPreset(chatId, "deep");
  assert.equal(deepOptions.firecrawl, "always");
  assert.equal(deepOptions.mediaTranscript, "prefer");
  assert.equal(deepOptions.transcriptTimestamps, true);

  const balancedOptions = applyChatLinkPreviewPreset(chatId, "balanced");
  assert.deepEqual(balancedOptions, getDefaultLinkPreviewFetchOptions());
});
