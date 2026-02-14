import { Bot } from "grammy";
import { env } from "../config/env";
import {
  handleFeatures,
  handleHelp,
  handleNewChat,
  handlePreview,
  handlePreviewPreset,
  handlePreviewReset,
  handlePreviewSet,
  handleStart,
} from "./commands";
import { handleMessage } from "../handlers/message";

export function createBot(): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("newchat", handleNewChat);
  bot.command("features", handleFeatures);
  bot.command("preview", handlePreview);
  bot.command("previewset", handlePreviewSet);
  bot.command("previewpreset", handlePreviewPreset);
  bot.command("previewreset", handlePreviewReset);

  bot.on("message:text", handleMessage);

  bot.catch((error) => {
    const updateId = error.ctx.update.update_id;
    console.error(`Bot error on update ${updateId}:`, error.error);
  });

  return bot;
}
