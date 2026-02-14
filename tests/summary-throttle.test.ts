import assert from "node:assert/strict";
import test from "node:test";
import {
  NON_ADMIN_WINDOW_MS,
  canSummarize,
  formatSummaryThrottleMessage,
  recordSummary,
  resetSummaryThrottle,
} from "../src/services/summary-throttle";

test("non-admin can summarize once per hour", () => {
  const userId = 7001;
  const now = 10_000;

  resetSummaryThrottle();
  assert.equal(canSummarize(userId, false, now).allowed, true);

  recordSummary(userId, now);

  const blocked = canSummarize(userId, false, now + 1);
  assert.equal(blocked.allowed, false);
  assert.equal(typeof blocked.retryAfterMs, "number");
  assert.equal(blocked.retryAfterMs, NON_ADMIN_WINDOW_MS - 1);
});

test("non-admin can summarize again after one hour", () => {
  const userId = 7002;
  const now = 20_000;

  resetSummaryThrottle();
  recordSummary(userId, now);

  const allowed = canSummarize(userId, false, now + NON_ADMIN_WINDOW_MS);
  assert.equal(allowed.allowed, true);
});

test("admin users are unlimited", () => {
  const userId = 7003;
  const now = 30_000;

  resetSummaryThrottle();
  recordSummary(userId, now);
  recordSummary(userId, now + 1);

  assert.equal(canSummarize(userId, true, now + 2).allowed, true);
});

test("resetSummaryThrottle clears one user or all users", () => {
  const firstUser = 7004;
  const secondUser = 7005;
  const now = 40_000;

  resetSummaryThrottle();
  recordSummary(firstUser, now);
  recordSummary(secondUser, now);

  resetSummaryThrottle(firstUser);
  assert.equal(canSummarize(firstUser, false, now + 1).allowed, true);
  assert.equal(canSummarize(secondUser, false, now + 1).allowed, false);

  resetSummaryThrottle();
  assert.equal(canSummarize(secondUser, false, now + 2).allowed, true);
});

test("throttle message formats retry minutes", () => {
  assert.equal(
    formatSummaryThrottleMessage(30_000),
    "Summary limit reached for non-admin users (1 per hour). Try again in about 1 minute."
  );
  assert.equal(
    formatSummaryThrottleMessage(120_000),
    "Summary limit reached for non-admin users (1 per hour). Try again in about 2 minutes."
  );
});
