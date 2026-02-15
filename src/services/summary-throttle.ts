const NON_ADMIN_AI_MESSAGE_LIMIT = 5;
const NON_ADMIN_WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED_USERS = 10000;

interface SummaryWindowEntry {
  timestamps: number[];
  lastUpdatedAt: number;
}

const summaryWindows = new Map<number, SummaryWindowEntry>();

function pruneOld(now: number): void {
  for (const [userId, entry] of summaryWindows.entries()) {
    const recent = entry.timestamps.filter(
      (timestamp) => now - timestamp < NON_ADMIN_WINDOW_MS
    );

    if (recent.length === 0) {
      summaryWindows.delete(userId);
      continue;
    }

    entry.timestamps = recent;
    entry.lastUpdatedAt = recent[recent.length - 1] ?? entry.lastUpdatedAt;
    summaryWindows.set(userId, entry);
  }
}

function pruneOverflow(maxEntries: number = MAX_TRACKED_USERS): void {
  if (summaryWindows.size <= maxEntries) {
    return;
  }

  const sorted = [...summaryWindows.entries()].sort(
    (a, b) => a[1].lastUpdatedAt - b[1].lastUpdatedAt
  );

  const removeCount = summaryWindows.size - maxEntries;
  for (let index = 0; index < removeCount; index += 1) {
    const [userId] = sorted[index] ?? [];
    if (typeof userId === "number") {
      summaryWindows.delete(userId);
    }
  }
}

export function canProcessAiMessage(
  userId: number,
  isAdmin: boolean,
  now: number = Date.now()
): { allowed: boolean; retryAfterMs?: number } {
  if (isAdmin) {
    return { allowed: true };
  }

  pruneOld(now);

  const entry = summaryWindows.get(userId);
  if (!entry || entry.timestamps.length < NON_ADMIN_AI_MESSAGE_LIMIT) {
    return { allowed: true };
  }

  const oldestActiveTimestamp = entry.timestamps[0] ?? now;
  const retryAfterMs = Math.max(0, NON_ADMIN_WINDOW_MS - (now - oldestActiveTimestamp));

  return { allowed: false, retryAfterMs };
}

export function recordProcessedAiMessage(
  userId: number,
  now: number = Date.now()
): void {
  pruneOld(now);

  const entry = summaryWindows.get(userId) ?? {
    timestamps: [],
    lastUpdatedAt: now,
  };

  const recent = entry.timestamps.filter(
    (timestamp) => now - timestamp < NON_ADMIN_WINDOW_MS
  );

  recent.push(now);

  summaryWindows.set(userId, {
    timestamps: recent,
    lastUpdatedAt: now,
  });

  pruneOverflow();
}

export function formatAiThrottleMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
  const suffix = minutes === 1 ? "minute" : "minutes";
  return `AI message limit reached for non-admin users (${NON_ADMIN_AI_MESSAGE_LIMIT} per hour). Try again in about ${minutes} ${suffix}.`;
}

export function resetAiThrottle(userId?: number): void {
  if (typeof userId === "number") {
    summaryWindows.delete(userId);
    return;
  }

  summaryWindows.clear();
}

export { NON_ADMIN_AI_MESSAGE_LIMIT, NON_ADMIN_WINDOW_MS };
