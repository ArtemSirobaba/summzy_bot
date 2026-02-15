import assert from "node:assert/strict";
import test from "node:test";
import {
  NON_ADMIN_AI_MESSAGE_LIMIT,
  NON_ADMIN_WINDOW_MS,
  canProcessAiMessage,
  formatAiThrottleMessage,
  recordProcessedAiMessage,
  resetAiThrottle,
} from "../src/services/summary-throttle";

test("non-admin can process up to five messages per hour", () => {
  const userId = 7001;
  const now = 10_000;

  resetAiThrottle();

  for (let index = 0; index < NON_ADMIN_AI_MESSAGE_LIMIT; index += 1) {
    const check = canProcessAiMessage(userId, false, now + index);
    assert.equal(check.allowed, true);
    recordProcessedAiMessage(userId, now + index);
  }

  const blocked = canProcessAiMessage(
    userId,
    false,
    now + NON_ADMIN_AI_MESSAGE_LIMIT + 1
  );
  assert.equal(blocked.allowed, false);
  assert.equal(typeof blocked.retryAfterMs, "number");
  assert.equal(blocked.retryAfterMs, NON_ADMIN_WINDOW_MS - (NON_ADMIN_AI_MESSAGE_LIMIT + 1));
});

test("non-admin can process again after one hour", () => {
  const userId = 7002;
  const now = 20_000;

  resetAiThrottle();
  recordProcessedAiMessage(userId, now);

  const allowed = canProcessAiMessage(userId, false, now + NON_ADMIN_WINDOW_MS);
  assert.equal(allowed.allowed, true);
});

test("admin users are unlimited", () => {
  const userId = 7003;
  const now = 30_000;

  resetAiThrottle();
  recordProcessedAiMessage(userId, now);
  recordProcessedAiMessage(userId, now + 1);

  assert.equal(canProcessAiMessage(userId, true, now + 2).allowed, true);
});

test("resetAiThrottle clears one user or all users", () => {
  const firstUser = 7004;
  const secondUser = 7005;
  const now = 40_000;

  resetAiThrottle();
  recordProcessedAiMessage(firstUser, now);
  recordProcessedAiMessage(secondUser, now);

  resetAiThrottle(firstUser);
  assert.equal(canProcessAiMessage(firstUser, false, now + 1).allowed, true);
  assert.equal(canProcessAiMessage(secondUser, false, now + 1).allowed, true);

  recordProcessedAiMessage(secondUser, now + 2);
  assert.equal(canProcessAiMessage(secondUser, false, now + 3).allowed, true);
  resetAiThrottle();
  assert.equal(canProcessAiMessage(secondUser, false, now + 4).allowed, true);
});

test("throttle message formats retry minutes", () => {
  assert.equal(
    formatAiThrottleMessage(30_000),
    "AI message limit reached for non-admin users (5 per hour). Try again in about 1 minute."
  );
  assert.equal(
    formatAiThrottleMessage(120_000),
    "AI message limit reached for non-admin users (5 per hour). Try again in about 2 minutes."
  );
});
