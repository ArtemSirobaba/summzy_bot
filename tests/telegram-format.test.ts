import assert from "node:assert/strict";
import test from "node:test";
import { formatMarkdownV2 } from "../src/utils/telegram-format";

test("formatMarkdownV2 converts markdown bullets to safe markdownv2 list", () => {
  const input = [
    "Here are the key takeaways:",
    "",
    "*   **Negotiations are stalled:** The process is frozen.",
  ].join("\n");

  const output = formatMarkdownV2(input);

  assert.equal(
    output,
    "Here are the key takeaways:\n\\- *Negotiations are stalled:* The process is frozen\\."
  );
});

test("formatMarkdownV2 escapes markdownv2 special characters", () => {
  const output = formatMarkdownV2("Cost is $5.00 (approx)!");

  assert.equal(output, "Cost is $5\\.00 \\(approx\\)\\!");
});
