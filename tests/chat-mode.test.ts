import assert from "node:assert/strict";
import test from "node:test";
import { isGroupChatType, shouldAutoSummarizeUrlInChat } from "../src/utils/chat-mode";

test("group and supergroup require explicit command", () => {
  assert.equal(isGroupChatType("group"), true);
  assert.equal(isGroupChatType("supergroup"), true);
  assert.equal(shouldAutoSummarizeUrlInChat("group"), false);
  assert.equal(shouldAutoSummarizeUrlInChat("supergroup"), false);
});

test("private chats still auto summarize urls", () => {
  assert.equal(isGroupChatType("private"), false);
  assert.equal(shouldAutoSummarizeUrlInChat("private"), true);
});
