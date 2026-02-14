import assert from "node:assert/strict";
import test from "node:test";
import { chunkText } from "../src/utils/chunk";

test("chunkText returns one chunk for short text", () => {
  assert.deepEqual(chunkText("short", 10), ["short"]);
});

test("chunkText splits long lines to max length", () => {
  const chunks = chunkText("abcdefghij", 4);
  assert.deepEqual(chunks, ["abcd", "efgh", "ij"]);
});

test("chunkText preserves line boundaries where possible", () => {
  const text = "line1\nline2\nline3";
  const chunks = chunkText(text, 10);
  assert.deepEqual(chunks, ["line1", "line2", "line3"]);
});
