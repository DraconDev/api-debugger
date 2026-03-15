/**
 * @dracon/ai-client - Shared AI client with fallback chain
 *
 * Supports: OpenAI, Anthropic, Google Gemini, OpenRouter
 * Features: Model registry, fallback chain, auto-routing
 *
 * Usage:
 *   const client = createAI({
 *     chain: [
 *       { provider: "openai", apiKey: "sk-...", model: "openai/gpt-4.1" },
 *       { provider: "anthropic", apiKey: "sk-...", model: "anthropic/claude-sonnet-4" },
 *       { provider: "openrouter", apiKey: "sk-or-...", model: "openrouter/auto" },
 *     ]
 *   });
 *
 *   const response = await client.chat(messages);
 *   console.log(response.model); // "openai/gpt-4.1" (or whichever succeeded)
 *   console.log(response.fallback); // 0 (index in chain that succeeded)
 */

export type AIProvider = "openai" | "anthropic" | "gemini" | "openrouter";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: AIProvider;
  fallback: number; // which chain index succeeded (0 = primary)
  attempts: number; // how many models tried
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIChainEntry {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export interface AIConfig {
  chain: AIChainEntry[];
  maxRetries?: number; // retries per model before fallback (default: 1)
  timeout?: number; // per-request timeout in ms (default: 30000)
  onFallback?: (from: number, to: number, error: Error) => void;
}

interface ProviderHandler {
  (
    apiKey: string,
    model: string,
    messages: AIMessage[],
  ): Promise<{
    content: string;
    model: string;
    usage?: AIResponse["usage"];
  }>;
}

// ─── Registry ───────────────────────────────────────────────────

const handlers: Map<AIProvider, ProviderHandler> = new Map();

export function registerProvider(
  provider: AIProvider,
  handler: ProviderHandler,
) {
  handlers.set(provider, handler);
}

// ─── Built-in Providers ─────────────────────────────────────────

registerProvider("openai", async (apiKey, model, messages) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new AIError(
      err.error?.message || `OpenAI ${res.status}`,
      res.status,
      "openai",
    );
  }
  const data = await res.json();
  return {
    content: data.choices[0]?.message?.content || "",
    model: data.model,
    usage: data.usage && {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
});

registerProvider("anthropic", async (apiKey, model, messages) => {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMsg?.content,
      messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new AIError(
      err.error?.message || `Anthropic ${res.status}`,
      res.status,
      "anthropic",
    );
  }
  const data = await res.json();
  return {
    content: data.content[0]?.text || "",
    model: data.model,
    usage: data.usage && {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  };
});

registerProvider("gemini", async (apiKey, model, messages) => {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const systemMsg = messages.find((m) => m.role === "system");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMsg
          ? { parts: [{ text: systemMsg.content }] }
          : undefined,
        generationConfig: { maxOutputTokens: 4096 },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new AIError(
      err.error?.message || `Gemini ${res.status}`,
      res.status,
      "gemini",
    );
  }
  const data = await res.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    model,
    usage: data.usageMetadata && {
      promptTokens: data.usageMetadata.promptTokenCount,
      completionTokens: data.usageMetadata.candidatesTokenCount,
      totalTokens: data.usageMetadata.totalTokenCount,
    },
  };
});

registerProvider("openrouter", async (apiKey, model, messages) => {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://dracon.dev",
      "X-Title": "Dracon",
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new AIError(
      err.error?.message || `OpenRouter ${res.status}`,
      res.status,
      "openrouter",
    );
  }
  const data = await res.json();
  return {
    content: data.choices[0]?.message?.content || "",
    model: data.model,
    usage: data.usage && {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
});

// ─── AI Client with Fallback Chain ──────────────────────────────

export function createAI(config: AIConfig) {
  const { chain, maxRetries = 1, timeout = 30000, onFallback } = config;

  if (!chain.length) throw new Error("AI chain must have at least one entry");

  return {
    async chat(messages: AIMessage[]): Promise<AIResponse> {
      let lastError: Error | null = null;

      for (let i = 0; i < chain.length; i++) {
        const entry = chain[i];
        const handler = handlers.get(entry.provider);

        if (!handler) {
          lastError = new Error(`Unknown provider: ${entry.provider}`);
          continue;
        }

        for (let retry = 0; retry < maxRetries; retry++) {
          try {
            const result = await withTimeout(
              handler(entry.apiKey, entry.model, messages),
              timeout,
            );

            return {
              content: result.content,
              model: result.model,
              provider: entry.provider,
              fallback: i,
              attempts: i + 1,
              usage: result.usage,
            };
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));

            // Don't retry on auth errors
            if (isAuthError(lastError)) break;

            // Don't retry on last attempt of this model
            if (retry < maxRetries - 1) {
              await sleep(1000 * (retry + 1)); // exponential backoff
            }
          }
        }

        // Fallback to next model
        if (i < chain.length - 1 && onFallback) {
          onFallback(i, i + 1, lastError!);
        }
      }

      throw new AIError(
        `All models failed: ${lastError?.message || "unknown error"}`,
        0,
        chain[0].provider,
      );
    },

    async complete(prompt: string, system?: string): Promise<AIResponse> {
      const messages: AIMessage[] = [];
      if (system) messages.push({ role: "system", content: system });
      messages.push({ role: "user", content: prompt });
      return this.chat(messages);
    },
  };
}

// ─── Error Class ────────────────────────────────────────────────

export class AIError extends Error {
  status: number;
  provider: AIProvider;

  constructor(message: string, status: number, provider: AIProvider) {
    super(message);
    this.name = "AIError";
    this.status = status;
    this.provider = provider;
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function isAuthError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("api key") ||
    msg.includes("unauthorized") ||
    msg.includes("401") ||
    msg.includes("403")
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await promise;
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Validation ─────────────────────────────────────────────────

export async function validateChain(config: AIConfig): Promise<{
  valid: boolean;
  results: Array<{
    index: number;
    provider: AIProvider;
    model: string;
    ok: boolean;
    error?: string;
  }>;
}> {
  const results = [];
  let valid = false;

  for (let i = 0; i < config.chain.length; i++) {
    const entry = config.chain[i];
    try {
      const client = createAI({
        chain: [entry],
        maxRetries: 1,
        timeout: 10000,
      });
      await client.complete("Say ok");
      results.push({
        index: i,
        provider: entry.provider,
        model: entry.model,
        ok: true,
      });
      valid = true;
    } catch (err) {
      results.push({
        index: i,
        provider: entry.provider,
        model: entry.model,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { valid, results };
}
