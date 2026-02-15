import assert from "node:assert/strict";
import test from "node:test";
import { isGroupChatType } from "../src/utils/chat-mode";

test("group and supergroup are detected as group chat types", () => {
  assert.equal(isGroupChatType("group"), true);
  assert.equal(isGroupChatType("supergroup"), true);
});

test("private chats are not group chat types", () => {
  assert.equal(isGroupChatType("private"), false);
});
