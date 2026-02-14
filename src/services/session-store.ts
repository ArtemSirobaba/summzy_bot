import type { ChatSession, ChatTurn } from "../types/chat";

const sessions = new Map<number, ChatSession>();

function newTurn(role: ChatTurn["role"], content: string): ChatTurn {
  return {
    role,
    content,
    ts: Date.now(),
  };
}

export function replaceSession(
  chatId: number,
  sourceUrl: string,
  extractedContent: string,
  summary: string
): ChatSession {
  const now = Date.now();
  const session: ChatSession = {
    chatId,
    sourceUrl,
    extractedContent,
    summary,
    history: [newTurn("assistant", summary)],
    createdAt: now,
    updatedAt: now,
  };

  sessions.set(chatId, session);
  return session;
}

export function getSession(chatId: number): ChatSession | undefined {
  return sessions.get(chatId);
}

export function hasSession(chatId: number): boolean {
  return sessions.has(chatId);
}

export function clearSession(chatId: number): boolean {
  return sessions.delete(chatId);
}

export function addUserTurn(chatId: number, content: string): ChatSession | undefined {
  const session = sessions.get(chatId);
  if (!session) {
    return undefined;
  }

  session.history.push(newTurn("user", content));
  session.updatedAt = Date.now();
  return session;
}

export function addAssistantTurn(
  chatId: number,
  content: string
): ChatSession | undefined {
  const session = sessions.get(chatId);
  if (!session) {
    return undefined;
  }

  session.history.push(newTurn("assistant", content));
  session.updatedAt = Date.now();
  return session;
}
