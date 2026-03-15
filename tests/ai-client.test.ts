import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createAIClient,
  getAvailableModels,
  validateApiKey,
  getProviderName,
  getDefaultModel,
  type AIProvider,
} from "@/utils/ai-client";

describe("AI Client", () => {
  describe("createAIClient", () => {
    it("should create a client with default model", () => {
      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
      });

      expect(client.provider).toBe("openai");
      expect(client.model).toBe("gpt-4.1-mini");
    });

    it("should create a client with custom model", () => {
      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
        model: "gpt-4.1",
      });

      expect(client.model).toBe("gpt-4.1");
    });

    it("should use correct default models for each provider", () => {
      const defaults: Record<AIProvider, string> = {
        openai: "gpt-4.1-mini",
        anthropic: "claude-haiku-4-20250414",
        gemini: "gemini-2.0-flash",
        openrouter: "openai/gpt-4.1-mini",
      };

      (Object.keys(defaults) as AIProvider[]).forEach((provider) => {
        const client = createAIClient({
          provider,
          apiKey: "test-key",
        });
        expect(client.model).toBe(defaults[provider]);
      });
    });

    it("should support OpenRouter provider", () => {
      const client = createAIClient({
        provider: "openrouter",
        apiKey: "test-key",
      });

      expect(client.provider).toBe("openrouter");
      expect(client.model).toBe("openai/gpt-4.1-mini");
    });
  });

  describe("getProviderName", () => {
    it("should return display names for all providers", () => {
      expect(getProviderName("openai")).toBe("OpenAI");
      expect(getProviderName("anthropic")).toBe("Anthropic");
      expect(getProviderName("gemini")).toBe("Google Gemini");
      expect(getProviderName("openrouter")).toBe("OpenRouter");
    });
  });

  describe("getDefaultModel", () => {
    it("should return default models for all providers", () => {
      expect(getDefaultModel("openai")).toBe("gpt-4.1-mini");
      expect(getDefaultModel("anthropic")).toBe("claude-haiku-4-20250414");
      expect(getDefaultModel("gemini")).toBe("gemini-2.0-flash");
      expect(getDefaultModel("openrouter")).toBe("openai/gpt-4.1-mini");
    });
  });

  describe("getAvailableModels", () => {
    it("should return current OpenAI models", () => {
      const models = getAvailableModels("openai");
      expect(models).toContain("gpt-4.1");
      expect(models).toContain("gpt-4.1-mini");
      expect(models).toContain("gpt-4.1-nano");
      expect(models).toContain("gpt-4o");
      expect(models).toContain("o3");
      expect(models).toContain("o4-mini");
    });

    it("should return current Anthropic models", () => {
      const models = getAvailableModels("anthropic");
      expect(models).toContain("claude-opus-4-20250514");
      expect(models).toContain("claude-sonnet-4-20250514");
      expect(models).toContain("claude-haiku-4-20250414");
      expect(models).toContain("claude-3-5-sonnet-20241022");
    });

    it("should return current Gemini models", () => {
      const models = getAvailableModels("gemini");
      expect(models).toContain("gemini-2.5-pro-preview");
      expect(models).toContain("gemini-2.0-flash");
      expect(models).toContain("gemini-1.5-pro");
    });

    it("should return empty for OpenRouter (uses dynamic fetching)", () => {
      const models = getAvailableModels("openrouter");
      expect(models).toEqual([]);
    });
  });

  describe("API calls", () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    afterEach(() => {
      mockFetch.mockReset();
    });

    it("should call OpenAI API correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Hello!" } }],
            model: "gpt-4.1-mini",
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
      });

      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
      });

      const response = await client.chat([{ role: "user", content: "Hi" }]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        }),
      );
      expect(response.content).toBe("Hello!");
      expect(response.provider).toBe("openai");
    });

    it("should call Anthropic API correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: "Hello!" }],
            model: "claude-haiku-4-20250414",
            usage: { input_tokens: 10, output_tokens: 5 },
          }),
      });

      const client = createAIClient({
        provider: "anthropic",
        apiKey: "test-key",
      });

      const response = await client.chat([
        { role: "system", content: "Be helpful" },
        { role: "user", content: "Hi" },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "test-key",
          }),
        }),
      );
      expect(response.content).toBe("Hello!");
      expect(response.provider).toBe("anthropic");
    });

    it("should call Gemini API correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: "Hello!" }] } }],
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 5,
              totalTokenCount: 15,
            },
          }),
      });

      const client = createAIClient({
        provider: "gemini",
        apiKey: "test-key",
      });

      const response = await client.chat([{ role: "user", content: "Hi" }]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("generativelanguage.googleapis.com"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(response.content).toBe("Hello!");
      expect(response.provider).toBe("gemini");
    });

    it("should call OpenRouter API correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Hello!" } }],
            model: "openai/gpt-4.1-mini",
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
      });

      const client = createAIClient({
        provider: "openrouter",
        apiKey: "test-key",
      });

      const response = await client.chat([{ role: "user", content: "Hi" }]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        }),
      );
      expect(response.content).toBe("Hello!");
      expect(response.provider).toBe("openrouter");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Invalid API key" } }),
      });

      const client = createAIClient({
        provider: "openai",
        apiKey: "bad-key",
      });

      await expect(
        client.chat([{ role: "user", content: "Hi" }]),
      ).rejects.toThrow("Invalid API key");
    });
  });

  describe("validateApiKey", () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    afterEach(() => {
      mockFetch.mockReset();
    });

    it("should return true for valid API key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "ok" } }],
            model: "gpt-4.1-mini",
          }),
      });

      const isValid = await validateApiKey({
        provider: "openai",
        apiKey: "valid-key",
      });

      expect(isValid).toBe(true);
    });

    it("should return false for invalid API key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const isValid = await validateApiKey({
        provider: "openai",
        apiKey: "invalid-key",
      });

      expect(isValid).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const isValid = await validateApiKey({
        provider: "openai",
        apiKey: "test-key",
      });

      expect(isValid).toBe(false);
    });
  });

  describe("complete helper", () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    afterEach(() => {
      mockFetch.mockReset();
    });

    it("should send system message when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Response" } }],
            model: "gpt-4.1-mini",
          }),
      });

      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
      });

      await client.complete("Hello", "You are helpful");

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.messages).toHaveLength(2);
      expect(body.messages[0]).toEqual({
        role: "system",
        content: "You are helpful",
      });
      expect(body.messages[1]).toEqual({ role: "user", content: "Hello" });
    });

    it("should work without system message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Response" } }],
            model: "gpt-4.1-mini",
          }),
      });

      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
      });

      await client.complete("Hello");

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.messages).toHaveLength(1);
      expect(body.messages[0]).toEqual({ role: "user", content: "Hello" });
    });
  });
});
