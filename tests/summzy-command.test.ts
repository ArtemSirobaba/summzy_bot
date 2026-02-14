import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSummzyUsageMessage,
  extractSummzyUrl,
} from "../src/utils/summzy-command";

test("extractSummzyUrl reads url from command args", () => {
  assert.equal(
    extractSummzyUrl("https://example.com/article"),
    "https://example.com/article"
  );
  assert.equal(
    extractSummzyUrl("please summarize https://example.com/doc"),
    "https://example.com/doc"
  );
});

test("extractSummzyUrl returns null when no valid url", () => {
  assert.equal(extractSummzyUrl(""), null);
  assert.equal(extractSummzyUrl("not-a-link"), null);
});

test("buildSummzyUsageMessage returns command usage", () => {
  assert.equal(
    buildSummzyUsageMessage(),
    "Usage: /summzy <url>\nExample:\n/summzy https://example.com/article"
  );
});
