import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAI, AIError, FALLBACK_CHAINS } from "@/lib/ai-client";

describe("AI Client (OpenRouter + Fallback)", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  const mockSuccess = (content: string, model: string) => ({
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content } }],
        model,
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
  });

  const mockError = (status: number, message: string) => ({
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message } }),
  });

  describe("createAI", () => {
    it("should create a client with chat method", () => {
      const client = createAI({ apiKey: "test-key" });
      expect(client.chat).toBeDefined();
      expect(client.complete).toBeDefined();
      expect(client.validate).toBeDefined();
    });
  });

  describe("chat", () => {
    it("should call OpenRouter API with correct headers", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccess("Hello!", "openai/gpt-4.1"));

      const client = createAI({ apiKey: "test-key" });
      const result = await client.chat([{ role: "user", content: "Hi" }], {
        model: "openai/gpt-4.1",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result.content).toBe("Hello!");
      expect(result.model).toBe("openai/gpt-4.1");
      expect(result.fallback).toBe(false);
    });

    it("should return usage information", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccess("Response", "openai/gpt-4.1"),
      );

      const client = createAI({ apiKey: "test-key" });
      const result = await client.chat([{ role: "user", content: "Hi" }], {
        model: "openai/gpt-4.1",
      });

      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
    });
  });

  describe("fallback chain", () => {
    it("should try fallback when primary model fails", async () => {
      mockFetch
        .mockResolvedValueOnce(mockError(429, "Rate limited"))
        .mockResolvedValueOnce(
          mockSuccess("Fallback response", "google/gemini-2.0-flash"),
        );

      const client = createAI({ apiKey: "test-key" });
      const result = await client.chat([{ role: "user", content: "Hi" }], {
        model: "openai/gpt-4.1",
        fallbacks: ["google/gemini-2.0-flash"],
      });

      expect(result.content).toBe("Fallback response");
      expect(result.model).toBe("google/gemini-2.0-flash");
      expect(result.fallback).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should try multiple fallbacks in order", async () => {
      mockFetch
        .mockResolvedValueOnce(mockError(503, "Overloaded"))
        .mockResolvedValueOnce(mockError(429, "Rate limited"))
        .mockResolvedValueOnce(
          mockSuccess("Third try!", "anthropic/claude-haiku-4"),
        );

      const client = createAI({ apiKey: "test-key" });
      const result = await client.chat([{ role: "user", content: "Hi" }], {
        model: "openai/gpt-4.1",
        fallbacks: ["google/gemini-2.0-flash", "anthropic/claude-haiku-4"],
      });

      expect(result.content).toBe("Third try!");
      expect(result.fallback).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should NOT fallback on auth errors (401)", async () => {
      mockFetch.mockResolvedValueOnce(mockError(401, "Invalid API key"));

      const client = createAI({ apiKey: "bad-key" });

      await expect(
        client.chat([{ role: "user", content: "Hi" }], {
          model: "openai/gpt-4.1",
          fallbacks: ["google/gemini-2.0-flash"],
        }),
      ).rejects.toThrow("Invalid API key");

      // Should NOT have tried the fallback
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should NOT fallback on auth errors (403)", async () => {
      mockFetch.mockResolvedValueOnce(mockError(403, "Forbidden"));

      const client = createAI({ apiKey: "bad-key" });

      await expect(
        client.chat([{ role: "user", content: "Hi" }], {
          model: "openai/gpt-4.1",
          fallbacks: ["google/gemini-2.0-flash"],
        }),
      ).rejects.toThrow("Forbidden");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should throw when all models fail", async () => {
      mockFetch
        .mockResolvedValueOnce(mockError(503, "Overloaded"))
        .mockResolvedValueOnce(mockError(503, "Also overloaded"));

      const client = createAI({ apiKey: "test-key" });

      await expect(
        client.chat([{ role: "user", content: "Hi" }], {
          model: "openai/gpt-4.1",
          fallbacks: ["google/gemini-2.0-flash"],
        }),
      ).rejects.toThrow();
    });
  });

  describe("complete helper", () => {
    it("should add system message", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccess("Response", "openai/gpt-4.1"),
      );

      const client = createAI({ apiKey: "test-key" });
      await client.complete("Hello", {
        model: "openai/gpt-4.1",
        system: "Be helpful",
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe("system");
      expect(body.messages[1].role).toBe("user");
    });
  });

  describe("validate", () => {
    it("should return true for valid key", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccess("ok", "openai/gpt-4.1-mini"));

      const client = createAI({ apiKey: "valid-key" });
      const valid = await client.validate();
      expect(valid).toBe(true);
    });

    it("should return false for invalid key", async () => {
      mockFetch.mockResolvedValueOnce(mockError(401, "Invalid"));

      const client = createAI({ apiKey: "bad-key" });
      const valid = await client.validate();
      expect(valid).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const client = createAI({ apiKey: "test-key" });
      const valid = await client.validate();
      expect(valid).toBe(false);
    });
  });

  describe("FALLBACK_CHAINS", () => {
    it("should have fast-and-cheap chain", () => {
      expect(FALLBACK_CHAINS["fast-and-cheap"]).toContain(
        "openai/gpt-4.1-mini",
      );
      expect(FALLBACK_CHAINS["fast-and-cheap"]).toContain(
        "google/gemini-2.0-flash",
      );
    });

    it("should have best-quality chain", () => {
      expect(FALLBACK_CHAINS["best-quality"]).toContain(
        "anthropic/claude-opus-4",
      );
    });

    it("should have coding chain", () => {
      expect(FALLBACK_CHAINS["coding"]).toContain("anthropic/claude-sonnet-4");
    });

    it("should have reasoning chain", () => {
      expect(FALLBACK_CHAINS["reasoning"]).toContain("openai/o3");
    });

    it("should have budget chain", () => {
      expect(FALLBACK_CHAINS["budget"]).toContain("openai/gpt-4.1-nano");
    });
  });

  describe("AIError", () => {
    it("should have status and model properties", () => {
      const err = new AIError("test error", 429, "openai/gpt-4.1");
      expect(err.message).toBe("test error");
      expect(err.status).toBe(429);
      expect(err.model).toBe("openai/gpt-4.1");
      expect(err.name).toBe("AIError");
    });
  });
});
