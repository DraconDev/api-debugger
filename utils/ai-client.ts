/**
 * AI Client - Multi-provider AI with dynamic model registry
 *
 * Models are fetched from OpenRouter (free, no key needed).
 * User provides API key for their chosen provider.
 * We route to the correct API based on model ID.
 */

import { getApiProviderForModel } from "@/lib/modelRegistry";

export type AIProvider = "openai" | "anthropic" | "gemini" | "openrouter";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
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
}

/**
 * Create an AI client - auto-routes based on model ID
 *
 * Examples:
 * - Model "openai/gpt-4.1" + provider "openai" → direct OpenAI API
 * - Model "anthropic/claude-sonnet-4" + provider "anthropic" → direct Anthropic API
 * - Model "google/gemini-2.0-flash" + provider "gemini" → direct Gemini API
 * - Any model + provider "openrouter" → OpenRouter API
 * - Model "deepseek/deepseek-r1" + provider "openrouter" → OpenRouter API
 */
export function createAIClient(config: AIConfig) {
  const { provider, apiKey, model } = config;

  // Extract clean model name (remove provider prefix if present)
  const cleanModel = model.includes("/")
    ? model.split("/").slice(1).join("/")
    : model;

  // Determine which API to use
  const apiProvider =
    provider === "openrouter" ? "openrouter" : getApiProviderForModel(model);

  return {
    model,
    apiProvider,

    async chat(messages: AIMessage[]): Promise<AIResponse> {
      switch (apiProvider) {
        case "openai":
          return openaiChat(apiKey, cleanModel, messages);
        case "anthropic":
          return anthropicChat(apiKey, cleanModel, messages);
        case "gemini":
          return geminiChat(apiKey, cleanModel, messages);
        case "openrouter":
          return openrouterChat(apiKey, model, messages);
        default:
          throw new Error(`Unsupported API provider: ${apiProvider}`);
      }
    },

    async complete(prompt: string, system?: string): Promise<AIResponse> {
      const messages: AIMessage[] = [];
      if (system) messages.push({ role: "system", content: system });
      messages.push({ role: "user", content: prompt });
      return this.chat(messages);
    },
  };
}

// ─── Provider Implementations ────────────────────────────────────

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
  };
}

/**
 * Validate an API key by making a minimal test request
 */
export async function validateApiKey(config: AIConfig): Promise<boolean> {
  try {
    const client = createAIClient(config);
    await client.complete("Say ok");
    return true;
  } catch {
    return false;
  }
}
