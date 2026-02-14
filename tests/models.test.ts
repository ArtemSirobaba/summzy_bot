import assert from "node:assert/strict";
import test from "node:test";
import {
  getAvailableModelsForConfig,
  getDefaultModelForConfig,
} from "../src/models";

test("model registry exposes only configured providers", () => {
  const models = getAvailableModelsForConfig({
    OPENAI_API_KEY: "sk-test",
    XAI_API_KEY: "xai-test",
  });

  assert.deepEqual(
    models.map((model) => model.provider),
    ["openai", "xai"]
  );
});

test("default model uses configured provider and model", () => {
  const selected = getDefaultModelForConfig({
    OPENROUTER_API_KEY: "sk-or-test",
    OPENAI_API_KEY: "sk-test",
    DEFAULT_PROVIDER: "openai",
    DEFAULT_MODEL: "gpt-4.1-mini",
  });

  assert.equal(selected.provider, "openai");
  assert.equal(selected.modelId, "gpt-4.1-mini");
});

test("default model falls back to provider priority", () => {
  const selected = getDefaultModelForConfig({
    ANTHROPIC_API_KEY: "sk-ant-test",
    XAI_API_KEY: "xai-test",
  });

  assert.equal(selected.provider, "anthropic");
});
