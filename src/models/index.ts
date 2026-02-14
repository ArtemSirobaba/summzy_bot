import type { LanguageModel } from "ai";
import { env } from "../config/env";
import { anthropicModel } from "./anthropic";
import { openaiModel } from "./openai";
import { openrouterModel } from "./openrouter";
import { xaiModel } from "./xai";

export type ProviderName = "openrouter" | "openai" | "anthropic" | "xai";

export interface ModelDescriptor {
  provider: ProviderName;
  modelId: string;
  label: string;
}

export interface ModelRegistryConfig {
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  XAI_API_KEY?: string;
  DEFAULT_PROVIDER?: ProviderName;
  DEFAULT_MODEL?: string;
}

const PROVIDER_PRIORITY: ProviderName[] = [
  "openrouter",
  "openai",
  "anthropic",
  "xai",
];

const DEFAULT_PROVIDER_MODELS: Record<ProviderName, string> = {
  openrouter: "openrouter/auto",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  xai: "grok-3-mini",
};

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  xai: "xAI",
};

function isProviderAvailable(
  provider: ProviderName,
  config: ModelRegistryConfig
): boolean {
  switch (provider) {
    case "openrouter":
      return Boolean(config.OPENROUTER_API_KEY);
    case "openai":
      return Boolean(config.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(config.ANTHROPIC_API_KEY);
    case "xai":
      return Boolean(config.XAI_API_KEY);
    default:
      return false;
  }
}

function resolveModelId(
  provider: ProviderName,
  config: ModelRegistryConfig
): string {
  if (config.DEFAULT_PROVIDER === provider && config.DEFAULT_MODEL) {
    return config.DEFAULT_MODEL;
  }

  return DEFAULT_PROVIDER_MODELS[provider];
}

export function getAvailableModelsForConfig(
  config: ModelRegistryConfig
): ModelDescriptor[] {
  return PROVIDER_PRIORITY.filter((provider) =>
    isProviderAvailable(provider, config)
  ).map((provider) => {
    const modelId = resolveModelId(provider, config);
    return {
      provider,
      modelId,
      label: `${PROVIDER_LABELS[provider]} (${modelId})`,
    };
  });
}

export function getDefaultModelForConfig(
  config: ModelRegistryConfig
): ModelDescriptor {
  const availableModels = getAvailableModelsForConfig(config);

  if (availableModels.length === 0) {
    throw new Error("No available models. Check provider API keys in environment.");
  }

  if (config.DEFAULT_PROVIDER) {
    const configuredModel = availableModels.find(
      (model) => model.provider === config.DEFAULT_PROVIDER
    );

    if (configuredModel) {
      return configuredModel;
    }
  }

  return availableModels[0];
}

export function getAvailableModels(): ModelDescriptor[] {
  return getAvailableModelsForConfig(env);
}

export function getDefaultModel(): ModelDescriptor {
  return getDefaultModelForConfig(env);
}

export function getModelByDescriptor(descriptor: ModelDescriptor): LanguageModel {
  switch (descriptor.provider) {
    case "openrouter":
      return openrouterModel(descriptor.modelId);
    case "openai":
      return openaiModel(descriptor.modelId);
    case "anthropic":
      return anthropicModel(descriptor.modelId);
    case "xai":
      return xaiModel(descriptor.modelId);
    default:
      throw new Error(`Unsupported provider: ${descriptor.provider}`);
  }
}
