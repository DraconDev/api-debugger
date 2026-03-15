/**
 * Model Registry - Fetches available AI models from OpenRouter (free, no key needed)
 *
 * This eliminates hardcoded model lists. We fetch once, cache for 24h.
 * OpenRouter aggregates models from 50+ providers.
 */

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  providerId: string;
  contextLength: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
  modalities: {
    input: string[];
    output: string[];
  };
}

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  architecture: {
    input_modalities: string[];
    output_modalities: string[];
  };
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface CachedModels {
  models: ModelInfo[];
  fetchedAt: number;
  version: number;
}

const CACHE_KEY = "apiDebugger_modelRegistry";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VERSION = 1;

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  meta: "Meta",
  "meta-llama": "Meta",
  mistralai: "Mistral",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  "x-ai": "xAI",
  cohere: "Cohere",
  amazon: "Amazon",
  microsoft: "Microsoft",
  nvidia: "NVIDIA",
  perplexity: "Perplexity",
  nousresearch: "Nous Research",
};

const PROVIDER_API_MAP: Record<
  string,
  "openai" | "anthropic" | "gemini" | "openrouter"
> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "gemini",
  "google/gemini": "gemini",
};

function getProviderFromModelId(modelId: string): string {
  const prefix = modelId.split("/")[0];
  return PROVIDER_NAMES[prefix] || prefix;
}

function getProviderIdFromModelId(modelId: string): string {
  return modelId.split("/")[0];
}

function getApiProvider(
  modelId: string,
): "openai" | "anthropic" | "gemini" | "openrouter" {
  const providerId = getProviderIdFromModelId(modelId);
  return PROVIDER_API_MAP[providerId] || "openrouter";
}

/**
 * Fetch model registry from OpenRouter (public, no key required)
 */
export async function fetchModelRegistry(): Promise<ModelInfo[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok)
      throw new Error(`OpenRouter API error: ${response.status}`);

    const data = await response.json();
    const models: OpenRouterModel[] = data.data || [];

    return models
      .filter((m) => !m.id.includes(":free"))
      .map((m) => ({
        id: m.id,
        name: m.name,
        provider: getProviderFromModelId(m.id),
        providerId: getProviderIdFromModelId(m.id),
        contextLength: m.context_length || 0,
        pricing: {
          prompt: parseFloat(m.pricing?.prompt || "0"),
          completion: parseFloat(m.pricing?.completion || "0"),
        },
        modalities: {
          input: m.architecture?.input_modalities || ["text"],
          output: m.architecture?.output_modalities || ["text"],
        },
      }))
      .sort((a, b) => {
        // Sort by provider popularity, then by name
        const providerOrder = [
          "openai",
          "anthropic",
          "google",
          "meta-llama",
          "mistralai",
          "deepseek",
        ];
        const aIdx = providerOrder.indexOf(a.providerId);
        const bIdx = providerOrder.indexOf(b.providerId);
        if (aIdx !== -1 || bIdx !== -1) {
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        }
        return a.name.localeCompare(b.name);
      });
  } catch (err) {
    console.error("Failed to fetch model registry:", err);
    return getFallbackModels();
  }
}

/**
 * Get models from cache, or fetch if stale
 */
export async function getModels(forceRefresh = false): Promise<ModelInfo[]> {
  if (!forceRefresh) {
    try {
      const cached = await chrome.storage.local.get(CACHE_KEY);
      const data = cached[CACHE_KEY] as CachedModels | undefined;

      if (
        data &&
        data.version === CACHE_VERSION &&
        Date.now() - data.fetchedAt < CACHE_TTL
      ) {
        return data.models;
      }
    } catch {
      // Cache miss, fetch fresh
    }
  }

  const models = await fetchModelRegistry();

  try {
    await chrome.storage.local.set({
      [CACHE_KEY]: {
        models,
        fetchedAt: Date.now(),
        version: CACHE_VERSION,
      } as CachedModels,
    });
  } catch {
    // Storage write failed, continue anyway
  }

  return models;
}

/**
 * Get models filtered by provider
 */
export async function getModelsByProvider(
  providerId: string,
): Promise<ModelInfo[]> {
  const models = await getModels();
  return models.filter((m) => m.providerId === providerId);
}

/**
 * Get providers summary
 */
export async function getProviders(): Promise<
  Array<{ id: string; name: string; modelCount: number }>
> {
  const models = await getModels();
  const counts = new Map<string, number>();

  for (const m of models) {
    counts.set(m.providerId, (counts.get(m.providerId) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      name: PROVIDER_NAMES[id] || id,
      modelCount: count,
    }))
    .sort((a, b) => b.modelCount - a.modelCount);
}

/**
 * Search models by name or ID
 */
export async function searchModels(query: string): Promise<ModelInfo[]> {
  const models = await getModels();
  const q = query.toLowerCase();
  return models.filter(
    (m) =>
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q),
  );
}

/**
 * Get the API provider type for a model ID
 */
export function getApiProviderForModel(
  modelId: string,
): "openai" | "anthropic" | "gemini" | "openrouter" {
  return getApiProvider(modelId);
}

/**
 * Fallback models when API is unreachable
 */
function getFallbackModels(): ModelInfo[] {
  const fallbacks = [
    // OpenAI
    {
      id: "openai/gpt-4.1",
      name: "GPT-4.1",
      provider: "OpenAI",
      providerId: "openai",
      ctx: 1050000,
    },
    {
      id: "openai/gpt-4.1-mini",
      name: "GPT-4.1 Mini",
      provider: "OpenAI",
      providerId: "openai",
      ctx: 1050000,
    },
    {
      id: "openai/gpt-4.1-nano",
      name: "GPT-4.1 Nano",
      provider: "OpenAI",
      providerId: "openai",
      ctx: 1050000,
    },
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      provider: "OpenAI",
      providerId: "openai",
      ctx: 128000,
    },
    {
      id: "openai/gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "OpenAI",
      providerId: "openai",
      ctx: 128000,
    },
    {
      id: "openai/o3",
      name: "o3",
      provider: "OpenAI",
      providerId: "openai",
      ctx: 200000,
    },
    {
      id: "openai/o3-mini",
      name: "o3 Mini",
      provider: "OpenAI",
      providerId: "openai",
      ctx: 200000,
    },
    {
      id: "openai/o4-mini",
      name: "o4 Mini",
      provider: "OpenAI",
      providerId: "openai",
      ctx: 200000,
    },
    // Anthropic
    {
      id: "anthropic/claude-opus-4",
      name: "Claude Opus 4",
      provider: "Anthropic",
      providerId: "anthropic",
      ctx: 200000,
    },
    {
      id: "anthropic/claude-sonnet-4",
      name: "Claude Sonnet 4",
      provider: "Anthropic",
      providerId: "anthropic",
      ctx: 200000,
    },
    {
      id: "anthropic/claude-haiku-4",
      name: "Claude Haiku 4",
      provider: "Anthropic",
      providerId: "anthropic",
      ctx: 200000,
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      providerId: "anthropic",
      ctx: 200000,
    },
    // Google
    {
      id: "google/gemini-2.5-pro-preview",
      name: "Gemini 2.5 Pro",
      provider: "Google",
      providerId: "google",
      ctx: 1050000,
    },
    {
      id: "google/gemini-2.5-flash-preview",
      name: "Gemini 2.5 Flash",
      provider: "Google",
      providerId: "google",
      ctx: 1050000,
    },
    {
      id: "google/gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      provider: "Google",
      providerId: "google",
      ctx: 1050000,
    },
    // DeepSeek
    {
      id: "deepseek/deepseek-r1",
      name: "DeepSeek R1",
      provider: "DeepSeek",
      providerId: "deepseek",
      ctx: 128000,
    },
    {
      id: "deepseek/deepseek-chat-v3",
      name: "DeepSeek V3",
      provider: "DeepSeek",
      providerId: "deepseek",
      ctx: 128000,
    },
    // Meta
    {
      id: "meta-llama/llama-4-maverick",
      name: "Llama 4 Maverick",
      provider: "Meta",
      providerId: "meta-llama",
      ctx: 128000,
    },
    // Mistral
    {
      id: "mistralai/mistral-large",
      name: "Mistral Large",
      provider: "Mistral",
      providerId: "mistralai",
      ctx: 128000,
    },
  ];

  return fallbacks.map((f) => ({
    id: f.id,
    name: f.name,
    provider: f.provider,
    providerId: f.providerId,
    contextLength: f.ctx,
    pricing: undefined,
    modalities: { input: ["text"], output: ["text"] },
  }));
}
