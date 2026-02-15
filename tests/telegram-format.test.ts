import assert from "node:assert/strict";
import test from "node:test";
import { formatForTelegram } from "../src/utils/telegram-format";

test("formatMarkdownV2 escapes markdownv2 special characters", () => {
  const output = formatForTelegram("Cost is $5.00 (approx)!");

  assert.equal(output, "Cost is $5\\.00 \\(approx\\)\\!");
});
