import { createBot } from "./bot/createBot";
import { getAvailableModels } from "./models";
import { getActiveModel } from "./services/ai";

const bot = createBot();
const defaultModel = getActiveModel();
const availableModels = getAvailableModels();

console.log("Starting Telegram summarize bot...");
console.log(
  `Default model: ${defaultModel.provider}/${defaultModel.modelId}`
);
console.log(
  `Available models: ${availableModels
    .map((model) => `${model.provider}/${model.modelId}`)
    .join(", ")}`
);

bot.start();
