import assert from "node:assert/strict";
import test from "node:test";
import { parseEnv } from "../src/config/env";

test("env requires BOT_TOKEN", () => {
  assert.throws(() =>
    parseEnv({ OPENROUTER_API_KEY: "sk-or-test" } as NodeJS.ProcessEnv)
  );
});

test("env requires at least one provider key", () => {
  assert.throws(() => parseEnv({ BOT_TOKEN: "123:test" } as NodeJS.ProcessEnv));
});

test("env applies default telegram max message length", () => {
  const parsed = parseEnv({
    BOT_TOKEN: "123:test",
    OPENAI_API_KEY: "sk-test",
  } as NodeJS.ProcessEnv);

  assert.equal(parsed.MAX_TELEGRAM_MESSAGE_LENGTH, 4000);
});

test("env accepts minimax as the only provider key", () => {
  const parsed = parseEnv({
    BOT_TOKEN: "123:test",
    MINIMAX_API_KEY: "minimax-test",
  } as NodeJS.ProcessEnv);

  assert.equal(parsed.MINIMAX_API_KEY, "minimax-test");
});

test("env applies default link preview options", () => {
  const parsed = parseEnv({
    BOT_TOKEN: "123:test",
    OPENAI_API_KEY: "sk-test",
  } as NodeJS.ProcessEnv);

  assert.equal(parsed.LINK_PREVIEW_TIMEOUT_MS, 120000);
  assert.equal(parsed.LINK_PREVIEW_MAX_CHARACTERS, 8000);
  assert.equal(parsed.LINK_PREVIEW_YOUTUBE_TRANSCRIPT_MODE, "auto");
  assert.equal(parsed.LINK_PREVIEW_MEDIA_TRANSCRIPT_MODE, "auto");
  assert.equal(parsed.LINK_PREVIEW_FIRECRAWL_MODE, "auto");
  assert.equal(parsed.LINK_PREVIEW_FORMAT, "markdown");
  assert.equal(parsed.LINK_PREVIEW_MARKDOWN_MODE, "auto");
  assert.equal(parsed.LINK_PREVIEW_TRANSCRIPT_TIMESTAMPS, false);
});

test("env parses boolean link preview flags", () => {
  const parsed = parseEnv({
    BOT_TOKEN: "123:test",
    OPENAI_API_KEY: "sk-test",
    LINK_PREVIEW_TRANSCRIPT_TIMESTAMPS: "true",
    LINK_PREVIEW_DEBUG_PROGRESS: "1",
  } as NodeJS.ProcessEnv);

  assert.equal(parsed.LINK_PREVIEW_TRANSCRIPT_TIMESTAMPS, true);
  assert.equal(parsed.LINK_PREVIEW_DEBUG_PROGRESS, true);
});

test("env parses TELEGRAM_USER_ID as admin user id", () => {
  const parsed = parseEnv({
    BOT_TOKEN: "123:test",
    OPENAI_API_KEY: "sk-test",
    TELEGRAM_USER_ID: "123456789",
  } as NodeJS.ProcessEnv);

  assert.deepEqual(parsed.TELEGRAM_ADMIN_USER_IDS, [123456789]);
});

test("env parses TELEGRAM_USER_IDS json array and deduplicates", () => {
  const parsed = parseEnv({
    BOT_TOKEN: "123:test",
    OPENAI_API_KEY: "sk-test",
    TELEGRAM_USER_ID: "123456789",
    TELEGRAM_USER_IDS: "[123456789,987654321]",
  } as NodeJS.ProcessEnv);

  assert.deepEqual(parsed.TELEGRAM_ADMIN_USER_IDS, [123456789, 987654321]);
});

test("env parses TELEGRAM_USER_IDS comma separated list", () => {
  const parsed = parseEnv({
    BOT_TOKEN: "123:test",
    OPENAI_API_KEY: "sk-test",
    TELEGRAM_USER_IDS: "101, 202",
  } as NodeJS.ProcessEnv);

  assert.deepEqual(parsed.TELEGRAM_ADMIN_USER_IDS, [101, 202]);
});

test("env rejects invalid TELEGRAM_USER_IDS", () => {
  assert.throws(() =>
    parseEnv({
      BOT_TOKEN: "123:test",
      OPENAI_API_KEY: "sk-test",
      TELEGRAM_USER_IDS: "[123,\"abc\"]",
    } as NodeJS.ProcessEnv)
  );
});
