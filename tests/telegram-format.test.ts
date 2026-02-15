import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatForTelegram } from "../src/utils/telegram-format";

describe("formatForTelegram", () => {
  // ─── Edge cases ──────────────────────────────────────────────────

  test("empty string returns empty string", () => {
    assert.equal(formatForTelegram(""), "");
  });

  test("whitespace-only string is escaped", () => {
    assert.equal(formatForTelegram("   "), "   ");
  });

  // ─── Special character escaping ──────────────────────────────────

  test("escapes special characters in plain text", () => {
    assert.equal(
      formatForTelegram("Cost is $5.00 (approx)!"),
      "Cost is $5\\.00 \\(approx\\)\\!"
    );
  });

  test("escapes all Telegram special chars", () => {
    assert.equal(formatForTelegram("a[b]c"), "a\\[b\\]c");
    assert.equal(formatForTelegram("a{b}c"), "a\\{b\\}c");
    assert.equal(formatForTelegram("a+b=c"), "a\\+b\\=c");
    assert.equal(formatForTelegram("a|b"), "a\\|b");
  });

  test("escapes backslashes", () => {
    assert.equal(formatForTelegram("path\\to\\file"), "path\\\\to\\\\file");
  });

  // ─── Bold ────────────────────────────────────────────────────────

  test("converts **bold** to *bold*", () => {
    assert.equal(formatForTelegram("**hello**"), "*hello*");
  });

  test("converts **bold** with special chars inside", () => {
    assert.equal(
      formatForTelegram("**price: $5.00**"),
      "*price: $5\\.00*"
    );
  });

  test("multiple bold segments on one line", () => {
    assert.equal(
      formatForTelegram("**a** and **b**"),
      "*a* and *b*"
    );
  });

  // ─── Italic ──────────────────────────────────────────────────────

  test("converts *italic* to _italic_", () => {
    assert.equal(formatForTelegram("*hello*"), "_hello_");
  });

  test("converts _italic_ to _italic_", () => {
    assert.equal(formatForTelegram("_hello_"), "_hello_");
  });

  // ─── Headers ─────────────────────────────────────────────────────

  test("converts # Header to bold", () => {
    assert.equal(formatForTelegram("# Header"), "*Header*");
  });

  test("converts ## Header to bold", () => {
    assert.equal(formatForTelegram("## Sub Header"), "*Sub Header*");
  });

  test("header with special chars", () => {
    assert.equal(
      formatForTelegram("# Price: $5.00!"),
      "*Price: $5\\.00\\!*"
    );
  });

  // ─── Horizontal rules ───────────────────────────────────────────

  test("converts --- to visual separator", () => {
    const result = formatForTelegram("above\n---\nbelow");
    assert.ok(!result.includes("---"));
    assert.ok(result.includes("———"));
    assert.ok(result.includes("above"));
    assert.ok(result.includes("below"));
  });

  test("converts ---- (longer) to separator", () => {
    const result = formatForTelegram("----");
    assert.ok(!result.includes("----"));
  });

  // ─── Strikethrough ──────────────────────────────────────────────

  test("converts ~~text~~ to ~text~", () => {
    assert.equal(formatForTelegram("~~deleted~~"), "~deleted~");
  });

  // ─── Links ──────────────────────────────────────────────────────

  test("preserves [text](url) links", () => {
    assert.equal(
      formatForTelegram("[click here](https://example.com)"),
      "[click here](https://example.com)"
    );
  });

  test("escapes special chars in link text but not URL", () => {
    assert.equal(
      formatForTelegram("[price: $5!](https://example.com/path?a=1&b=2)"),
      "[price: $5\\!](https://example.com/path?a=1&b=2)"
    );
  });

  // ─── Blockquotes ────────────────────────────────────────────────

  test("converts > text to blockquote", () => {
    assert.equal(formatForTelegram("> hello world"), ">hello world");
  });

  test("blockquote with special chars", () => {
    assert.equal(
      formatForTelegram("> price: $5.00!"),
      ">price: $5\\.00\\!"
    );
  });

  // ─── Code blocks ────────────────────────────────────────────────

  test("preserves inline code without escaping inside", () => {
    assert.equal(
      formatForTelegram("use `console.log()` here"),
      "use `console.log()` here"
    );
  });

  test("preserves fenced code blocks", () => {
    const input = "text\n```js\nconst x = 5;\n```\nmore text";
    const result = formatForTelegram(input);
    assert.ok(result.includes("```js\nconst x = 5;\n```"));
    assert.ok(result.includes("more text"));
  });

  test("code blocks do not escape special chars inside", () => {
    const input = "```\n$5.00 (test) [brackets]\n```";
    const result = formatForTelegram(input);
    assert.ok(result.includes("$5.00 (test) [brackets]"));
  });

  // ─── Bullet points ─────────────────────────────────────────────

  test("converts - item to bullet", () => {
    const result = formatForTelegram("- Item one\n- Item two");
    assert.ok(result.includes("• Item one"));
    assert.ok(result.includes("• Item two"));
  });

  test("bullet points with special chars", () => {
    const result = formatForTelegram("- Item (with parens)");
    assert.ok(result.includes("• Item \\(with parens\\)"));
  });

  // ─── Nested formatting ─────────────────────────────────────────

  test("bold with italic inside: **bold *italic* text**", () => {
    const result = formatForTelegram("**bold *italic* text**");
    assert.equal(result, "*bold _italic_ text*");
  });

  // ─── Mismatched / unclosed markers ──────────────────────────────

  test("mismatched markers *text_ are escaped", () => {
    const result = formatForTelegram("*text_");
    // Neither * nor _ should produce formatting — both escaped
    assert.ok(!result.includes("_text_"));
    assert.ok(!result.includes("*text*"));
    // They should be escaped
    assert.ok(result.includes("\\*") || result.includes("\\*"));
  });

  test("unclosed bold **text is escaped", () => {
    const result = formatForTelegram("**text without closing");
    // Should not have unbalanced * in output
    assert.ok(!result.match(/(?<!\\)\*(?!\\)/)); // no unescaped *
  });

  test("unclosed italic _text without closing is escaped", () => {
    const result = formatForTelegram("_Section heading without closing");
    // Should not produce unbalanced _ formatting
    // The _ at start should be escaped since there's no closing _
    assert.ok(result.includes("\\*") || result.includes("\\_") || !result.match(/(?<!\\)_/));
  });

  // ─── Multi-line content ─────────────────────────────────────────

  test("multi-line with section headers", () => {
    const input = `# Summary
Here is the summary.

## Details
- Point one
- Point two

---

> Note: important!`;

    const result = formatForTelegram(input);
    assert.ok(result.includes("*Summary*"));
    assert.ok(result.includes("*Details*"));
    assert.ok(result.includes("• Point one"));
    assert.ok(result.includes(">Note: important\\!"));
  });

  // ─── Real-world AI summary output ──────────────────────────────

  test("handles typical AI summary with mixed formatting", () => {
    const input = `## Key Points

**Revenue** grew by 15% to $5.2M (up from $4.5M).

*Note:* These figures are preliminary.

- Market cap: ~$100M
- P/E ratio: 25.3x

For details, see [the report](https://example.com/report).`;

    const result = formatForTelegram(input);
    // Bold converted
    assert.ok(result.includes("*Revenue*"));
    // Special chars escaped
    assert.ok(result.includes("$5\\.2M"));
    // Italic converted
    assert.ok(result.includes("_Note:_"));
    // Link preserved
    assert.ok(result.includes("[the report](https://example.com/report)"));
    // Bullets converted
    assert.ok(result.includes("• Market cap:"));
  });

  test("handles AI output with underscored section names", () => {
    const input = `_Main Points_
Here is the content.

_Secondary Notes_
More content here.`;

    const result = formatForTelegram(input);
    // These should be italic
    assert.ok(result.includes("_Main Points_"));
    assert.ok(result.includes("_Secondary Notes_"));
  });

  // ─── Bold + Italic ─────────────────────────────────────────────

  test("converts ***bold italic*** to *_bold italic_*", () => {
    assert.equal(formatForTelegram("***hello***"), "*_hello_*");
  });

  test("converts ___bold italic___ to *_bold italic_*", () => {
    assert.equal(formatForTelegram("___hello___"), "*_hello_*");
  });

  test("converts **_bold italic_** to *_bold italic_*", () => {
    assert.equal(formatForTelegram("**_hello_**"), "*_hello_*");
  });

  test("converts __*bold italic*__ to *_bold italic_*", () => {
    assert.equal(formatForTelegram("__*hello*__"), "*_hello_*");
  });

  // ─── Ordered lists ─────────────────────────────────────────────

  test("ordered list items escape the dot", () => {
    const result = formatForTelegram("1. First\n2. Second\n3. Third");
    assert.ok(result.includes("1\\."));
    assert.ok(result.includes("2\\."));
    assert.ok(result.includes("3\\."));
    assert.ok(result.includes("First"));
  });

  // ─── HR variants ───────────────────────────────────────────────

  test("converts *** to separator", () => {
    const result = formatForTelegram("above\n***\nbelow");
    assert.ok(result.includes("———"));
    assert.ok(!result.includes("***"));
  });

  test("converts ___ to separator", () => {
    const result = formatForTelegram("above\n___\nbelow");
    assert.ok(result.includes("———"));
  });

  // ─── Images ─────────────────────────────────────────────────────

  test("converts ![alt](url) to just alt text", () => {
    const result = formatForTelegram("![Screenshot](https://example.com/img.png)");
    assert.ok(result.includes("Screenshot"));
    assert.ok(!result.includes("!["));
  });

  test("image with title is handled", () => {
    const result = formatForTelegram('![Logo](https://example.com/logo.png "Company Logo")');
    assert.ok(result.includes("Logo"));
    assert.ok(!result.includes("!["));
  });

  // ─── Nested blockquotes ─────────────────────────────────────────

  test("nested >> blockquotes flatten to single >", () => {
    assert.equal(formatForTelegram(">> nested quote"), ">nested quote");
  });

  // ─── Links with titles ─────────────────────────────────────────

  test("link with title strips the title", () => {
    const result = formatForTelegram('[Example](https://example.com "Title")');
    assert.equal(result, "[Example](https://example.com)");
  });

  // ─── Already-escaped input ─────────────────────────────────────

  test("already-escaped \\* is not double-escaped", () => {
    const result = formatForTelegram("price is 5\\*");
    assert.equal(result, "price is 5\\*");
  });

  test("already-escaped \\_ is not double-escaped", () => {
    const result = formatForTelegram("use \\_\\_name\\_\\_");
    assert.equal(result, "use \\_\\_name\\_\\_");
  });

  // ─── Spoiler ────────────────────────────────────────────────────

  test("converts ||spoiler|| to ||spoiler||", () => {
    assert.equal(formatForTelegram("||secret message||"), "||secret message||");
  });

  test("spoiler with special chars inside", () => {
    assert.equal(
      formatForTelegram("||price: $5.00!||"),
      "||price: $5\\.00\\!||"
    );
  });

  // ─── URL escaping ──────────────────────────────────────────────

  test("URL with parentheses escapes ) inside URL", () => {
    const result = formatForTelegram("[link](https://example.com/path(1))");
    // Inner ) is escaped, outer ) closes the markdown link
    assert.equal(result, "[link](https://example.com/path(1\\))");
  });

  test("URL special chars are not over-escaped", () => {
    const result = formatForTelegram("[go](https://example.com/a#b?c=1&d=2)");
    // # ? & = should NOT be escaped inside URL
    assert.ok(result.includes("https://example.com/a#b?c=1&d=2"));
  });
});
