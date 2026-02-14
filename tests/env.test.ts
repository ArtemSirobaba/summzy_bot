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
