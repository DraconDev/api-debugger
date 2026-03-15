/**
 * @dracon/ai-client - AI client via OpenRouter
 *
 * Single provider (OpenRouter) = access to 346+ models from 53 providers.
 * User adds one key, calls any model. OpenRouter handles everything.
 *
 * Usage:
 *   const client = createAI({ apiKey: "sk-or-..." });
 *   const response = await client.chat(messages, { model: "anthropic/claude-sonnet-4" });
 *
 * With fallback:
 *   const response = await client.chat(messages, {
 *     model: "anthropic/claude-sonnet-4",
 *     fallbacks: ["openai/gpt-4.1", "google/gemini-2.0-flash"]
 *   });
 */

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  fallback: boolean; // whether a fallback model was used
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIConfig {
  apiKey: string;
  baseUrl?: string;
  siteUrl?: string;
  siteName?: string;
}

export interface ChatOptions {
  model: string;
  fallbacks?: string[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export class AIError extends Error {
  status: number;
  model: string;

  constructor(message: string, status: number, model: string) {
    super(message);
    this.name = "AIError";
    this.status = status;
    this.model = model;
  }
}

export function createAI(config: AIConfig) {
  const {
    apiKey,
    baseUrl = "https://openrouter.ai/api/v1",
    siteUrl = "https://dracon.dev",
    siteName = "Dracon",
  } = config;

  async function chat(
    messages: AIMessage[],
    options: ChatOptions,
  ): Promise<AIResponse> {
    const {
      model,
      fallbacks = [],
      maxTokens = 4096,
      temperature,
      timeout = 30000,
    } = options;

    const models = [model, ...fallbacks];
    let lastError: AIError | null = null;

    for (let i = 0; i < models.length; i++) {
      const currentModel = models[i];

      try {
        const result = await callOpenRouter(
          apiKey,
          baseUrl,
          siteUrl,
          siteName,
          currentModel,
          messages,
          {
            maxTokens,
            temperature,
            timeout,
          },
        );

        return {
          content: result.content,
          model: result.model,
          fallback: i > 0,
          usage: result.usage,
        };
      } catch (err) {
        lastError =
          err instanceof AIError
            ? err
            : new AIError(String(err), 0, currentModel);

        // Don't fallback on auth errors - they won't work for other models either
        if (lastError.status === 401 || lastError.status === 403) break;
      }
    }

    throw lastError || new AIError("All models failed", 0, model);
  }

  async function complete(
    prompt: string,
    options: ChatOptions & { system?: string },
  ): Promise<AIResponse> {
    const messages: AIMessage[] = [];
    if (options.system)
      messages.push({ role: "system", content: options.system });
    messages.push({ role: "user", content: prompt });
    return chat(messages, options);
  }

  async function validate(): Promise<boolean> {
    try {
      await complete("Say ok", {
        model: "openai/gpt-4.1-mini",
        timeout: 10000,
      });
      return true;
    } catch {
      return false;
    }
  }

  return { chat, complete, validate };
}

async function callOpenRouter(
  apiKey: string,
  baseUrl: string,
  siteUrl: string,
  siteName: string,
  model: string,
  messages: AIMessage[],
  options: { maxTokens: number; temperature?: number; timeout: number },
): Promise<{ content: string; model: string; usage?: AIResponse["usage"] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout);

  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: options.maxTokens,
    };
    if (options.temperature !== undefined)
      body.temperature = options.temperature;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": siteUrl,
        "X-Title": siteName,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.error?.message || `OpenRouter ${response.status}`;
      throw new AIError(message, response.status, model);
    }

    const data = await response.json();

    return {
      content: data.choices?.[0]?.message?.content || "",
      model: data.model || model,
      usage: data.usage && {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Fallback Presets ────────────────────────────────────────────

export const FALLBACK_CHAINS = {
  "fast-and-cheap": [
    "openai/gpt-4.1-mini",
    "google/gemini-2.0-flash",
    "anthropic/claude-haiku-4",
  ],
  "best-quality": [
    "anthropic/claude-opus-4",
    "openai/gpt-4.1",
    "google/gemini-2.5-pro-preview",
  ],
  coding: [
    "anthropic/claude-sonnet-4",
    "openai/gpt-4.1",
    "deepseek/deepseek-r1",
  ],
  reasoning: [
    "openai/o3",
    "anthropic/claude-opus-4",
    "google/gemini-2.5-pro-preview",
  ],
  budget: [
    "openai/gpt-4.1-nano",
    "google/gemini-2.0-flash-lite",
    "deepseek/deepseek-chat-v3",
  ],
} as const;

export type FallbackChainName = keyof typeof FALLBACK_CHAINS;
