import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAIClient, validateApiKey } from "@/utils/ai-client";

describe("AI Client", () => {
  describe("createAIClient", () => {
    it("should create a client with model", () => {
      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
        model: "gpt-4.1-mini",
      });

      expect(client.model).toBe("gpt-4.1-mini");
    });

    it("should strip provider prefix from model for direct API", () => {
      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
        model: "openai/gpt-4.1-mini",
      });

      expect(client.model).toBe("openai/gpt-4.1-mini");
      expect(client.apiProvider).toBe("openai");
    });

    it("should route Anthropic models to Anthropic API", () => {
      const client = createAIClient({
        provider: "anthropic",
        apiKey: "test-key",
        model: "anthropic/claude-sonnet-4",
      });

      expect(client.apiProvider).toBe("anthropic");
    });

    it("should route Google models to Gemini API", () => {
      const client = createAIClient({
        provider: "gemini",
        apiKey: "test-key",
        model: "google/gemini-2.0-flash",
      });

      expect(client.apiProvider).toBe("gemini");
    });

    it("should route OpenRouter provider to OpenRouter API", () => {
      const client = createAIClient({
        provider: "openrouter",
        apiKey: "test-key",
        model: "deepseek/deepseek-r1",
      });

      expect(client.apiProvider).toBe("openrouter");
    });

    it("should route unknown provider models to OpenRouter", () => {
      const client = createAIClient({
        provider: "openrouter",
        apiKey: "test-key",
        model: "qwen/qwen-2.5-72b",
      });

      expect(client.apiProvider).toBe("openrouter");
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
        model: "openai/gpt-4.1-mini",
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
    });

    it("should call Anthropic API correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: "Hello!" }],
            model: "claude-sonnet-4",
            usage: { input_tokens: 10, output_tokens: 5 },
          }),
      });

      const client = createAIClient({
        provider: "anthropic",
        apiKey: "test-key",
        model: "anthropic/claude-sonnet-4",
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
        model: "google/gemini-2.0-flash",
      });

      const response = await client.chat([{ role: "user", content: "Hi" }]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("generativelanguage.googleapis.com"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(response.content).toBe("Hello!");
    });

    it("should call OpenRouter API correctly", async () => {
      const { chatCompletion } = await import("@dracon/wxt-shared/byok");
      const mockChatCompletion = chatCompletion as ReturnType<typeof vi.fn>;

      mockChatCompletion.mockResolvedValueOnce({
        content: "Hello!",
        model: "deepseek/deepseek-r1",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      });

      const client = createAIClient({
        provider: "openrouter",
        apiKey: "test-key",
        model: "deepseek/deepseek-r1",
      });

      const response = await client.chat([{ role: "user", content: "Hi" }]);

      expect(mockChatCompletion).toHaveBeenCalledWith(
        [{ role: "user", content: "Hi" }],
        "test-key",
        expect.objectContaining({
          model: "deepseek/deepseek-r1",
          max_tokens: 4096,
        }),
      );
      expect(response.content).toBe("Hello!");
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
        model: "openai/gpt-4.1-mini",
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
        model: "openai/gpt-4.1-mini",
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
        model: "openai/gpt-4.1-mini",
      });

      expect(isValid).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const isValid = await validateApiKey({
        provider: "openai",
        apiKey: "test-key",
        model: "openai/gpt-4.1-mini",
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
        model: "openai/gpt-4.1-mini",
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
        model: "openai/gpt-4.1-mini",
      });

      await client.complete("Hello");

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.messages).toHaveLength(1);
      expect(body.messages[0]).toEqual({ role: "user", content: "Hello" });
    });
  });
});
