import { Bot } from "grammy";
import { env } from "../config/env";
import { handleHelp, handleNewChat, handleStart } from "./commands";
import { handleMessage } from "../handlers/message";

export function createBot(): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("newchat", handleNewChat);

  bot.on("message:text", handleMessage);

  bot.catch((error) => {
    const updateId = error.ctx.update.update_id;
    console.error(`Bot error on update ${updateId}:`, error.error);
  });

  return bot;
}
