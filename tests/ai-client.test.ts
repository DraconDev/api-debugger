import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAIClient, getAvailableModels, validateApiKey, type AIProvider } from "@/utils/ai-client";

describe("AI Client", () => {
  describe("createAIClient", () => {
    it("should create a client with default model", () => {
      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
      });
      
      expect(client.provider).toBe("openai");
      expect(client.model).toBe("gpt-4o-mini");
    });

    it("should create a client with custom model", () => {
      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
        model: "gpt-4o",
      });
      
      expect(client.model).toBe("gpt-4o");
    });

    it("should use correct default models for each provider", () => {
      const defaults: Record<AIProvider, string> = {
        openai: "gpt-4o-mini",
        anthropic: "claude-3-haiku-20240307",
        gemini: "gemini-1.5-flash",
      };

      (Object.keys(defaults) as AIProvider[]).forEach((provider) => {
        const client = createAIClient({
          provider,
          apiKey: "test-key",
        });
        expect(client.model).toBe(defaults[provider]);
      });
    });
  });

  describe("getAvailableModels", () => {
    it("should return models for OpenAI", () => {
      const models = getAvailableModels("openai");
      expect(models).toContain("gpt-4o");
      expect(models).toContain("gpt-4o-mini");
      expect(models).toContain("gpt-3.5-turbo");
    });

    it("should return models for Anthropic", () => {
      const models = getAvailableModels("anthropic");
      expect(models).toContain("claude-3-opus-20240229");
      expect(models).toContain("claude-3-sonnet-20240229");
      expect(models).toContain("claude-3-haiku-20240307");
    });

    it("should return models for Gemini", () => {
      const models = getAvailableModels("gemini");
      expect(models).toContain("gemini-1.5-pro");
      expect(models).toContain("gemini-1.5-flash");
      expect(models).toContain("gemini-1.0-pro");
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
        json: () => Promise.resolve({
          choices: [{ message: { content: "Hello!" } }],
          model: "gpt-4o-mini",
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });

      const client = createAIClient({
        provider: "openai",
        apiKey: "test-key",
      });

      const response = await client.chat([
        { role: "user", content: "Hi" },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        })
      );
      expect(response.content).toBe("Hello!");
      expect(response.provider).toBe("openai");
    });

    it("should call Anthropic API correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: "Hello!" }],
          model: "claude-3-haiku-20240307",
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
        })
      );
      expect(response.content).toBe("Hello!");
      expect(response.provider).toBe("anthropic");
    });

    it("should call Gemini API correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: "Hello!" }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
        }),
      });

      const client = createAIClient({
        provider: "gemini",
        apiKey: "test-key",
      });

      const response = await client.chat([
        { role: "user", content: "Hi" },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("generativelanguage.googleapis.com"),
        expect.objectContaining({ method: "POST" })
      );
      expect(response.content).toBe("Hello!");
      expect(response.provider).toBe("gemini");
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

      await expect(client.chat([{ role: "user", content: "Hi" }])).rejects.toThrow(
        "Invalid API key"
      );
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
        json: () => Promise.resolve({
          choices: [{ message: { content: "ok" } }],
          model: "gpt-4o-mini",
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
        json: () => Promise.resolve({
          choices: [{ message: { content: "Response" } }],
          model: "gpt-4o-mini",
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
      expect(body.messages[0]).toEqual({ role: "system", content: "You are helpful" });
      expect(body.messages[1]).toEqual({ role: "user", content: "Hello" });
    });

    it("should work without system message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "Response" } }],
          model: "gpt-4o-mini",
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
