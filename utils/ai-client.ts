/**
 * AI Client - Multi-provider AI support with BYOK (Bring Your Own Key)
 *
 * Supports: OpenAI, Anthropic, Google Gemini
 */

export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
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

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  gemini: 'gemini-1.5-flash',
};

/**
 * Create an AI client for a specific provider
 */
export function createAIClient(config: AIConfig) {
  const model = config.model || DEFAULT_MODELS[config.provider];

  return {
    provider: config.provider,
    model,

    /**
     * Send a chat completion request
     */
    async chat(messages: AIMessage[]): Promise<AIResponse> {
      switch (config.provider) {
        case 'openai':
          return openaiChat(config.apiKey, model, messages);
        case 'anthropic':
          return anthropicChat(config.apiKey, model, messages);
        case 'gemini':
          return geminiChat(config.apiKey, model, messages);
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
    },

    /**
     * Simple completion with a single prompt
     */
    async complete(prompt: string, system?: string): Promise<AIResponse> {
      const messages: AIMessage[] = [];
      if (system) {
        messages.push({ role: 'system', content: system });
      }
      messages.push({ role: 'user', content: prompt });
      return this.chat(messages);
    },
  };
}

/**
 * OpenAI chat completion
 */
async function openaiChat(
  apiKey: string,
  model: string,
  messages: AIMessage[]
): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI error: ${response.status}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
    model: data.model,
    provider: 'openai',
  };
}

/**
 * Anthropic chat completion
 */
async function anthropicChat(
  apiKey: string,
  model: string,
  messages: AIMessage[]
): Promise<AIResponse> {
  // Separate system message from other messages
  const systemMessage = messages.find((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemMessage?.content,
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic error: ${response.status}`);
  }

  const data = await response.json();

  return {
    content: data.content[0]?.text || '',
    usage: data.usage
      ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        }
      : undefined,
    model: data.model,
    provider: 'anthropic',
  };
}

/**
 * Google Gemini chat completion
 */
async function geminiChat(
  apiKey: string,
  model: string,
  messages: AIMessage[]
): Promise<AIResponse> {
  // Convert messages to Gemini format
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === 'system');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction.content }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gemini error: ${response.status}`);
  }

  const data = await response.json();

  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    usage: data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        }
      : undefined,
    model,
    provider: 'gemini',
  };
}

/**
 * Get available models for a provider
 */
export function getAvailableModels(provider: AIProvider): string[] {
  switch (provider) {
    case 'openai':
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    case 'anthropic':
      return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
    case 'gemini':
      return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
    default:
      return [];
  }
}

/**
 * Validate an API key by making a minimal test request
 */
export async function validateApiKey(config: AIConfig): Promise<boolean> {
  try {
    const client = createAIClient(config);
    await client.complete('Say "ok" if you can hear me.');
    return true;
  } catch {
    return false;
  }
}
