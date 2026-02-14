import assert from "node:assert/strict";
import test from "node:test";
import {
  addAssistantTurn,
  addUserTurn,
  clearSession,
  getSession,
  hasSession,
  replaceSession,
} from "../src/services/session-store";

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

test("session expires after ttl", () => {
  const originalNow = Date.now;
  let now = 1_000_000_000_000;
  Date.now = () => now;

  try {
    const chatId = 551001;
    clearSession(chatId);
    replaceSession(chatId, "https://example.com", "doc", "summary");
    assert.equal(hasSession(chatId), true);

    now += SESSION_TTL_MS + 1;
    assert.equal(getSession(chatId), undefined);
    assert.equal(hasSession(chatId), false);
  } finally {
    Date.now = originalNow;
  }
});

test("session history is bounded and ignores empty summary seed", () => {
  const chatId = 551002;
  clearSession(chatId);
  replaceSession(chatId, "https://example.com", "doc", "");

  for (let index = 0; index < 40; index += 1) {
    addUserTurn(chatId, `q-${index}`);
    addAssistantTurn(chatId, `a-${index}`);
  }

  const session = getSession(chatId);
  assert.ok(session);
  assert.equal(session.history.length, 30);
  assert.equal(session.history[0]?.content, "q-25");
  assert.equal(session.history[29]?.content, "a-39");
});
