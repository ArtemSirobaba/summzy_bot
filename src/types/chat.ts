export type ChatRole = "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  content: string;
  ts: number;
}

export interface ChatSession {
  chatId: number;
  history: ChatTurn[];
  createdAt: number;
  updatedAt: number;
}
