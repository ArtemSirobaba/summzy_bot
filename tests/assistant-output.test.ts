import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAssistantOutput } from "../src/utils/assistant-output";

test("sanitizeAssistantOutput removes disallowed status and reset lines", () => {
  const input = [
    "Fetching and summarizing the link. This may take a moment...",
    "- Key point 1",
    "- Key point 2",
    "Ask questions about this document, or use /newchat to reset.",
  ].join("\n");

  const output = sanitizeAssistantOutput(input);
  assert.equal(output, "- Key point 1\n- Key point 2");
});

test("sanitizeAssistantOutput keeps unrelated content intact", () => {
  const input = "- Summary A\n- Summary B";
  assert.equal(sanitizeAssistantOutput(input), input);
});
