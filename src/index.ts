import { createBot } from "./bot/createBot";
import { getAvailableModels } from "./config/models";
import { getActiveModel } from "./services/ai";

const bot = createBot();
const defaultModel = getActiveModel();
const availableModels = getAvailableModels();

async function main(): Promise<void> {
  console.log("Starting Summzy Telegram bot...");
  console.log(
    `Default model: ${defaultModel.provider}/${defaultModel.modelId}`
  );
  console.log(
    `Available models: ${availableModels
      .map((model) => `${model.provider}/${model.modelId}`)
      .join(", ")}`
  );

  await bot.start();
}

main().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
