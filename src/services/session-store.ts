import type { ChatSession, ChatTurn } from "../types/chat";

const sessions = new Map<number, ChatSession>();
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_SESSIONS = 1000;
const MAX_HISTORY_TURNS = 30;

function newTurn(role: ChatTurn["role"], content: string): ChatTurn {
  return {
    role,
    content,
    ts: Date.now(),
  };
}

function pruneExpiredSessions(now: number = Date.now()): void {
  for (const [chatId, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(chatId);
    }
  }
}

function pruneOldestSessions(maxEntries: number = MAX_SESSIONS): void {
  if (sessions.size <= maxEntries) {
    return;
  }

  const sortedByLastUpdate = [...sessions.entries()].sort(
    (a, b) => a[1].updatedAt - b[1].updatedAt
  );
  const removeCount = sessions.size - maxEntries;

  for (let index = 0; index < removeCount; index += 1) {
    const [chatId] = sortedByLastUpdate[index];
    sessions.delete(chatId);
  }
}

function trimHistory(history: ChatTurn[]): ChatTurn[] {
  if (history.length <= MAX_HISTORY_TURNS) {
    return history;
  }

  return history.slice(-MAX_HISTORY_TURNS);
}

function createEmptySession(chatId: number): ChatSession {
  pruneExpiredSessions();
  const now = Date.now();
  return {
    chatId,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
}

function getOrCreateSession(chatId: number): ChatSession {
  const existing = getSession(chatId);
  if (existing) {
    return existing;
  }
  const session = createEmptySession(chatId);
  sessions.set(chatId, session);
  pruneOldestSessions();
  return session;
}

export function getSession(chatId: number): ChatSession | undefined {
  pruneExpiredSessions();
  return sessions.get(chatId);
}

export function hasSession(chatId: number): boolean {
  return Boolean(getSession(chatId));
}

export function clearSession(chatId: number): boolean {
  return sessions.delete(chatId);
}

export function addUserTurn(chatId: number, content: string): ChatSession | undefined {
  const session = getOrCreateSession(chatId);
  session.history.push(newTurn("user", content));
  session.history = trimHistory(session.history);
  session.updatedAt = Date.now();
  return session;
}

export function addAssistantTurn(
  chatId: number,
  content: string
): ChatSession | undefined {
  const session = getOrCreateSession(chatId);
  session.history.push(newTurn("assistant", content));
  session.history = trimHistory(session.history);
  session.updatedAt = Date.now();
  return session;
}
