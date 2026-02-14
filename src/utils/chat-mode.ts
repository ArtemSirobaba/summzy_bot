import type { Chat } from "grammy/types";

export function isGroupChatType(type?: Chat["type"]): boolean {
  return type === "group" || type === "supergroup";
}

export function shouldAutoSummarizeUrlInChat(type?: Chat["type"]): boolean {
  return !isGroupChatType(type);
}
