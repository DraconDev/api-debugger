/**
 * AI Client - Multi-provider AI support with BYOK (Bring Your Own Key)
 *
 * Supports: OpenAI, Anthropic, Google Gemini, OpenRouter
 */

export type AIProvider = "openai" | "anthropic" | "gemini" | "openrouter";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  contextLength: number;
  pricing?: {
    input: number;
    output: number;
  };
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-haiku-4-20250414",
  gemini: "gemini-2.0-flash",
  openrouter: "openai/gpt-4.1-mini",
};

const PROVIDER_NAMES: Record<AIProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
};

export function getProviderName(provider: AIProvider): string {
  return PROVIDER_NAMES[provider];
}

export function getDefaultModel(provider: AIProvider): string {
  return DEFAULT_MODELS[provider];
}

export function createAIClient(config: AIConfig) {
  const model = config.model || DEFAULT_MODELS[config.provider];

  return {
    provider: config.provider,
    model,

    async chat(messages: AIMessage[]): Promise<AIResponse> {
      switch (config.provider) {
        case "openai":
          return openaiChat(config.apiKey, model, messages);
        case "anthropic":
          return anthropicChat(config.apiKey, model, messages);
        case "gemini":
          return geminiChat(config.apiKey, model, messages);
        case "openrouter":
          return openrouterChat(config.apiKey, model, messages);
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
    },

    async complete(prompt: string, system?: string): Promise<AIResponse> {
      const messages: AIMessage[] = [];
      if (system) {
        messages.push({ role: "system", content: system });
      }
      messages.push({ role: "user", content: prompt });
      return this.chat(messages);
    },
  };
}

async function openaiChat(
  apiKey: string,
  model: string,
  messages: AIMessage[],
): Promise<AIResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
    model: data.model,
    provider: "openai",
  };
}

async function anthropicChat(
  apiKey: string,
  model: string,
  messages: AIMessage[],
): Promise<AIResponse> {
  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMessage?.content,
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `Anthropic error: ${response.status}`,
    );
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text || "",
    usage: data.usage
      ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        }
      : undefined,
    model: data.model,
    provider: "anthropic",
  };
}

async function geminiChat(
  apiKey: string,
  model: string,
  messages: AIMessage[],
): Promise<AIResponse> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === "system");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction.content }] }
          : undefined,
        generationConfig: { maxOutputTokens: 4096 },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    usage: data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        }
      : undefined,
    model,
    provider: "gemini",
  };
}

async function openrouterChat(
  apiKey: string,
  model: string,
  messages: AIMessage[],
): Promise<AIResponse> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/dracon/api-debugger",
        "X-Title": "API Debugger",
      },
      body: JSON.stringify({ model, messages, max_tokens: 4096 }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `OpenRouter error: ${response.status}`,
    );
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
    model: data.model,
    provider: "openrouter",
  };
}

const STATIC_MODELS: Record<AIProvider, string[]> = {
  openai: [
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "o3",
    "o3-mini",
    "o4-mini",
    "o1",
    "o1-mini",
    "o1-pro",
  ],
  anthropic: [
    "claude-opus-4-20250514",
    "claude-sonnet-4-20250514",
    "claude-haiku-4-20250414",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ],
  gemini: [
    "gemini-2.5-pro-preview",
    "gemini-2.5-flash-preview",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
  openrouter: [],
};

export function getAvailableModels(provider: AIProvider): string[] {
  return STATIC_MODELS[provider] || [];
}

export async function fetchModelsFromAPI(
  provider: AIProvider,
  apiKey: string,
): Promise<ModelInfo[]> {
  try {
    switch (provider) {
      case "openai":
        return fetchOpenAIModels(apiKey);
      case "gemini":
        return fetchGeminiModels(apiKey);
      case "openrouter":
        return fetchOpenRouterModels(apiKey);
      case "anthropic":
        return STATIC_MODELS.anthropic.map((id) => ({
          id,
          name: formatModelName(id),
          provider: "anthropic",
          contextLength: 200000,
        }));
      default:
        return [];
    }
  } catch {
    return [];
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || [])
    .filter(
      (m: { id: string }) =>
        m.id.includes("gpt") ||
        m.id.includes("o1") ||
        m.id.includes("o3") ||
        m.id.includes("o4"),
    )
    .map((m: { id: string }) => ({
      id: m.id,
      name: formatModelName(m.id),
      provider: "openai" as const,
      contextLength: 128000,
    }))
    .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
}

async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.models || [])
    .filter((m: { name: string }) => m.name.includes("gemini"))
    .map((m: { name: string; displayName?: string }) => ({
      id: m.name.split("/").pop() || m.name,
      name: m.displayName || formatModelName(m.name.split("/").pop() || m.name),
      provider: "gemini" as const,
      contextLength: 128000,
    }));
}

async function fetchOpenRouterModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || [])
    .filter((m: { id: string }) => !m.id.includes(":free"))
    .slice(0, 100)
    .map(
      (m: {
        id: string;
        name: string;
        context_length: number;
        pricing?: { prompt: string; completion: string };
      }) => ({
        id: m.id,
        name: m.name,
        provider: "openrouter" as const,
        contextLength: m.context_length || 128000,
        pricing: m.pricing
          ? {
              input: parseFloat(m.pricing.prompt),
              output: parseFloat(m.pricing.completion),
            }
          : undefined,
      }),
    );
}

function formatModelName(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\d{8}/g, "");
}

export async function validateApiKey(config: AIConfig): Promise<boolean> {
  try {
    const client = createAIClient(config);
    await client.complete('Say "ok" if you can hear me.');
    return true;
  } catch {
    return false;
  }
}
