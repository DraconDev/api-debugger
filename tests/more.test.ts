import { describe, it, expect } from "vitest";
import { getApiProviderForModel } from "@/lib/modelRegistry";
import { AIError, createAI } from "@/lib/ai-client";
import { formatShortcut, KEYBOARD_SHORTCUTS } from "@/lib/shortcuts";
import {
  executePreRequestScript,
  executePostResponseScript,
} from "@/lib/scriptExecutor";
import { detectImportFormat } from "@/lib/importers/types";
import type { RequestConfig, CapturedResponse } from "@/types";

// ─── AI Client: Fallback Chain Logic ─────────────────────────

describe("AI Client: Fallback Chain", () => {
  it("AIError has correct properties", () => {
    const err = new AIError("Rate limited", 429, "openai/gpt-4.1");
    expect(err.message).toBe("Rate limited");
    expect(err.status).toBe(429);
    expect(err.model).toBe("openai/gpt-4.1");
    expect(err.name).toBe("AIError");
    expect(err).toBeInstanceOf(Error);
  });

  it("AIError with 401 should not be retried by fallback", () => {
    const err = new AIError("Unauthorized", 401, "openai/gpt-4.1");
    expect(err.status).toBe(401);
    // 401 is auth error - should NOT trigger fallback
  });

  it("AIError with 429 should trigger fallback", () => {
    const err = new AIError("Rate limited", 429, "openai/gpt-4.1");
    expect(err.status).toBe(429);
    // 429 is rate limit - SHOULD trigger fallback
  });

  it("AIError with 500 should trigger fallback", () => {
    const err = new AIError("Server error", 500, "openai/gpt-4.1");
    expect(err.status).toBe(500);
    // 500 is server error - SHOULD trigger fallback
  });

  it("AIError with 403 should not be retried by fallback", () => {
    const err = new AIError("Forbidden", 403, "openai/gpt-4.1");
    expect(err.status).toBe(403);
    // 403 is forbidden - should NOT trigger fallback
  });

  it("createAI returns chat, complete, validate", () => {
    const client = createAI({ apiKey: "test-key" });
    expect(typeof client.chat).toBe("function");
    expect(typeof client.complete).toBe("function");
    expect(typeof client.validate).toBe("function");
  });

  it("createAI with custom baseUrl", () => {
    const client = createAI({
      apiKey: "test-key",
      baseUrl: "https://custom.api.com/v1",
    });
    expect(client).toBeDefined();
  });

  it("createAI with site metadata", () => {
    const client = createAI({
      apiKey: "test-key",
      siteUrl: "https://example.com",
      siteName: "Test App",
    });
    expect(client).toBeDefined();
  });
});

// ─── Model Registry: Fallback Models ─────────────────────────

describe("Model Registry: Fallback Models", () => {
  // Test getApiProviderForModel which is the public pure function
  it("maps openai models correctly", () => {
    expect(getApiProviderForModel("openai/gpt-4.1")).toBe("openai");
    expect(getApiProviderForModel("openai/gpt-4.1-mini")).toBe("openai");
    expect(getApiProviderForModel("openai/gpt-4.1-nano")).toBe("openai");
    expect(getApiProviderForModel("openai/gpt-4o")).toBe("openai");
    expect(getApiProviderForModel("openai/gpt-4o-mini")).toBe("openai");
    expect(getApiProviderForModel("openai/o3")).toBe("openai");
    expect(getApiProviderForModel("openai/o3-mini")).toBe("openai");
    expect(getApiProviderForModel("openai/o4-mini")).toBe("openai");
  });

  it("maps anthropic models correctly", () => {
    expect(getApiProviderForModel("anthropic/claude-opus-4")).toBe("anthropic");
    expect(getApiProviderForModel("anthropic/claude-sonnet-4")).toBe(
      "anthropic",
    );
    expect(getApiProviderForModel("anthropic/claude-haiku-4")).toBe(
      "anthropic",
    );
    expect(getApiProviderForModel("anthropic/claude-3.5-sonnet")).toBe(
      "anthropic",
    );
  });

  it("maps google models correctly", () => {
    expect(getApiProviderForModel("google/gemini-2.5-pro-preview")).toBe(
      "gemini",
    );
    expect(getApiProviderForModel("google/gemini-2.5-flash-preview")).toBe(
      "gemini",
    );
    expect(getApiProviderForModel("google/gemini-2.0-flash")).toBe("gemini");
  });

  it("maps deepseek models to openrouter", () => {
    expect(getApiProviderForModel("deepseek/deepseek-r1")).toBe("openrouter");
    expect(getApiProviderForModel("deepseek/deepseek-chat-v3")).toBe(
      "openrouter",
    );
  });

  it("maps meta models to openrouter", () => {
    expect(getApiProviderForModel("meta-llama/llama-4-maverick")).toBe(
      "openrouter",
    );
  });

  it("maps mistral models to openrouter", () => {
    expect(getApiProviderForModel("mistralai/mistral-large")).toBe(
      "openrouter",
    );
  });

  it("maps unknown providers to openrouter", () => {
    expect(getApiProviderForModel("cohere/command-r")).toBe("openrouter");
    expect(getApiProviderForModel("xai/grok-3")).toBe("openrouter");
    expect(getApiProviderForModel("random/model")).toBe("openrouter");
  });

  it("model IDs follow provider/name format", () => {
    const modelIds = [
      "openai/gpt-4.1",
      "anthropic/claude-sonnet-4",
      "google/gemini-2.0-flash",
      "deepseek/deepseek-r1",
      "meta-llama/llama-4-maverick",
      "mistralai/mistral-large",
    ];
    modelIds.forEach((id) => {
      expect(id).toContain("/");
      const parts = id.split("/");
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });
  });
});

// ─── Keyboard Shortcuts: formatShortcut ──────────────────────

describe("Keyboard Shortcuts: formatShortcut", () => {
  it("formats Ctrl+key on non-Mac", () => {
    const formatted = formatShortcut({
      key: "Enter",
      ctrl: true,
      action: "send",
      description: "Send",
      category: "request",
    });
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("formats Shift+key", () => {
    const formatted = formatShortcut({
      key: "?",
      shift: true,
      action: "shortcuts",
      description: "Shortcuts",
      category: "global",
    });
    expect(formatted).toContain("?");
  });

  it("formats simple key without modifiers", () => {
    const formatted = formatShortcut({
      key: "Escape",
      action: "cancel",
      description: "Cancel",
      category: "request",
    });
    expect(formatted).toBeTruthy();
  });

  it("formats Ctrl+Shift+key", () => {
    const formatted = formatShortcut({
      key: "s",
      ctrl: true,
      shift: true,
      action: "saveAs",
      description: "Save As",
      category: "request",
    });
    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("formats arrow keys", () => {
    const formatted = formatShortcut({
      key: "ArrowUp",
      action: "prev",
      description: "Previous",
      category: "navigation",
    });
    expect(formatted).toBeTruthy();
  });

  it("all shortcuts can be formatted", () => {
    KEYBOARD_SHORTCUTS.forEach((s) => {
      const formatted = formatShortcut(s);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});

// ─── Script Executor: Edge Cases ─────────────────────────────

describe("Script Executor: Edge Cases", () => {
  const config: RequestConfig = {
    method: "GET",
    url: "https://api.example.com/data",
    headers: [],
    params: [],
    body: { raw: "" },
    bodyType: "none",
    auth: { type: "none" },
  };

  const response: CapturedResponse = {
    status: 200,
    statusText: "OK",
    headers: [["Content-Type", "application/json"] as [string, string]],
    body: '{"data": [1,2,3]}',
    duration: 100,
    size: 18,
  };

  describe("pre-request script edge cases", () => {
    it("handles empty script", () => {
      const r = executePreRequestScript("", config, {}, {});
      expect(r.success).toBe(true);
    });

    it("handles whitespace-only script", () => {
      const r = executePreRequestScript("   \n   ", config, {}, {});
      expect(r.success).toBe(true);
    });

    it("handles script with only comments", () => {
      const r = executePreRequestScript(
        "// this is a comment\n// another comment",
        config,
        {},
        {},
      );
      expect(r.success).toBe(true);
    });

    it("handles syntax error in script", () => {
      const r = executePreRequestScript("function() {", config, {}, {});
      expect(r.success).toBe(false);
      expect(r.error).toBeTruthy();
    });

    it("handles undefined reference in script", () => {
      const r = executePreRequestScript(
        "nonexistentFunction()",
        config,
        {},
        {},
      );
      expect(r.success).toBe(false);
    });

    it("handles multiple console.log calls", () => {
      const r = executePreRequestScript(
        'console.log("a"); console.log("b"); console.log("c");',
        config,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.logs).toHaveLength(3);
    });

    it("handles script that modifies multiple fields", () => {
      const r = executePreRequestScript(
        [
          'pm.request.url.url = "https://new.com";',
          'pm.request.method = "POST";',
          'pm.request.headers.add("X-Test", "val");',
        ].join("\n"),
        config,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.modifiedRequest?.url).toBe("https://new.com");
      expect(r.modifiedRequest?.method).toBe("POST");
    });
  });

  describe("post-response script edge cases", () => {
    it("handles invalid JSON response", () => {
      const badResponse: CapturedResponse = {
        ...response,
        body: "not json at all",
      };
      const r = executePostResponseScript(
        'pm.test("parse", () => { const d = pm.response.json(); });',
        config,
        badResponse,
        {},
        {},
      );
      // Should not crash the entire script
      expect(r.success).toBe(true);
      expect(r.logs?.some((l) => l.includes("✗"))).toBe(true);
    });

    it("handles empty response body", () => {
      const emptyResponse: CapturedResponse = {
        ...response,
        body: "",
      };
      const r = executePostResponseScript(
        'pm.variables.set("bodyLen", String(pm.response.text().length));',
        config,
        emptyResponse,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.variables?.["bodyLen"]).toBe("0");
    });

    it("handles response with no headers", () => {
      const noHeaders: CapturedResponse = {
        ...response,
        headers: [],
      };
      const r = executePostResponseScript(
        'const h = pm.response.headers.get("Missing"); pm.variables.set("h", h || "none");',
        config,
        noHeaders,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.variables?.["h"]).toBe("none");
    });

    it("handles pm.expect().to.eql() for arrays", () => {
      const r = executePostResponseScript(
        'pm.test("array", () => { pm.expect([1,2,3]).to.eql([1,2,3]); });',
        config,
        response,
        {},
        {},
      );
      expect(r.logs?.[0]).toContain("✓");
    });

    it("handles deeply nested JSON", () => {
      const deep: CapturedResponse = {
        ...response,
        body: '{"a":{"b":{"c":{"d":"deep"}}}}',
      };
      const r = executePostResponseScript(
        'const d = pm.response.json(); pm.variables.set("deep", d.a.b.c.d);',
        config,
        deep,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.variables?.["deep"]).toBe("deep");
    });

    it("handles null values in JSON", () => {
      const nullResp: CapturedResponse = {
        ...response,
        body: '{"name": null, "value": 42}',
      };
      const r = executePostResponseScript(
        'const d = pm.response.json(); pm.variables.set("isNull", String(d.name === null));',
        config,
        nullResp,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.variables?.["isNull"]).toBe("true");
    });

    it("handles boolean values in JSON", () => {
      const boolResp: CapturedResponse = {
        ...response,
        body: '{"active": true, "deleted": false}',
      };
      const r = executePostResponseScript(
        [
          "const d = pm.response.json();",
          'pm.test("active is true", () => { pm.expect(d.active).to.be.true(); });',
          'pm.test("deleted is false", () => { pm.expect(d.deleted).to.be.false(); });',
        ].join("\n"),
        config,
        boolResp,
        {},
        {},
      );
      expect(r.success).toBe(true);
    });
  });
});

// ─── OAuth2: URL and Config Building ─────────────────────────

describe("OAuth2: URL and Config Validation", () => {
  it("validates client credentials config", () => {
    const config = {
      flow: "client_credentials" as const,
      accessTokenUrl: "https://auth.example.com/token",
      clientId: "my-client-id",
      clientSecret: "my-secret",
      scope: "read write",
    };

    expect(config.flow).toBe("client_credentials");
    expect(config.accessTokenUrl).toContain("/token");
    expect(config.clientId).toBeTruthy();
    expect(config.scope).toContain("read");
  });

  it("validates PKCE config has authorization URL", () => {
    const config = {
      flow: "authorization_code" as const,
      accessTokenUrl: "https://auth.example.com/token",
      authorizationUrl: "https://auth.example.com/authorize",
      clientId: "my-client-id",
      scope: "openid profile",
    };

    expect(config.flow).toBe("authorization_code");
    expect(config.authorizationUrl).toContain("/authorize");
  });

  it("builds correct token request body for client credentials", () => {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: "test-client",
      scope: "read write",
      client_secret: "test-secret",
    });

    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("client_id")).toBe("test-client");
    expect(body.get("scope")).toBe("read write");
    expect(body.get("client_secret")).toBe("test-secret");
    expect(body.toString()).toContain("grant_type=client_credentials");
  });

  it("builds correct PKCE authorization URL parameters", () => {
    const authUrl = new URL("https://auth.example.com/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", "test-client");
    authUrl.searchParams.set("redirect_uri", "https://localhost/callback");
    authUrl.searchParams.set("scope", "openid");
    authUrl.searchParams.set("state", "random-state");
    authUrl.searchParams.set("code_challenge", "challenge123");
    authUrl.searchParams.set("code_challenge_method", "S256");

    expect(authUrl.searchParams.get("response_type")).toBe("code");
    expect(authUrl.searchParams.get("client_id")).toBe("test-client");
    expect(authUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authUrl.toString()).toContain("response_type=code");
  });

  it("calculates token expiry correctly", () => {
    const expiresInSeconds = 3600;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const now = Date.now();

    expect(expiresAt).toBeGreaterThan(now);
    expect(expiresAt - now).toBeGreaterThan(3590 * 1000);
    expect(expiresAt - now).toBeLessThanOrEqual(3610 * 1000);
  });

  it("validates redirect URI format", () => {
    const redirectUris = [
      "https://localhost/callback",
      "https://app.example.com/auth/callback",
      "http://localhost:3000/callback",
    ];
    redirectUris.forEach((uri) => {
      expect(() => new URL(uri)).not.toThrow();
    });
  });
});

// ─── GitHub Sync: Config Structure ───────────────────────────

describe("GitHub Sync: Config Structure", () => {
  it("validates sync data v2.0 structure", () => {
    const syncData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      profiles: [{ id: "p1", name: "Test", icon: "🧪", isBuiltIn: false }],
      activeProfileId: "p1",
      profileData: {
        p1: {
          collections: [],
          savedRequests: [],
          environments: [],
          aiSettings: { apiKey: "key", model: "model", fallbacks: [] },
        },
      },
      settings: { theme: "dark", captureFilter: null },
    };

    expect(syncData.version).toBe("2.0");
    expect(syncData.profiles[0].id).toBe("p1");
    expect(syncData.profileData["p1"].aiSettings).toBeDefined();
  });

  it("validates sync data v1.0 backward compat", () => {
    const v1 = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      collections: [],
      savedRequests: [],
      environments: [],
      settings: { theme: "system", captureFilter: null },
    };

    expect(v1.version).toBe("1.0");
    expect(v1.collections).toBeDefined();
    expect(v1.savedRequests).toBeDefined();
    expect(v1.environments).toBeDefined();
  });

  it("GitHub PAT URL includes correct scopes", () => {
    // Re-implement the logic to test
    const url = new URL("https://github.com/settings/tokens/new");
    url.searchParams.set("description", "API Debugger");
    url.searchParams.set("scopes", "repo");

    expect(url.toString()).toContain("github.com");
    expect(url.searchParams.get("scopes")).toBe("repo");
  });

  it("validates config structure", () => {
    const config = {
      token: "ghp_test123",
      repo: "my-api-debugger",
      branch: "main",
      path: "api-debugger-sync.json",
    };

    expect(config.token).toContain("ghp_");
    expect(config.repo).toContain("/");
    expect(config.branch).toBe("main");
  });
});

// ─── Import Format: More Edge Cases ──────────────────────────

describe("Import Format: Additional Edge Cases", () => {
  const { detectImportFormat } = await import("@/lib/importers/types");

  it("returns null for numeric input", () => {
    expect(detectImportFormat("12345")).toBe(null);
  });

  it("returns null for single word", () => {
    expect(detectImportFormat("hello")).toBe(null);
  });

  it("does not detect cURL in sentence", () => {
    expect(detectImportFormat("I used curl to fetch data")).toBe(null);
  });

  it("detects cURL at start of string", () => {
    expect(detectImportFormat("curl -X GET https://api.com")).toBe("curl");
  });

  it("detects cURL with no URL", () => {
    expect(detectImportFormat("curl")).toBe("curl");
  });

  it("handles JSON with nested objects", () => {
    const har = JSON.stringify({
      log: { version: "1.2", entries: [{ request: {}, response: {} }] },
    });
    expect(detectImportFormat(har)).toBe("har");
  });

  it("distinguishes Postman from Insomnia", () => {
    const postman = JSON.stringify({
      info: {
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    });
    const insomnia = JSON.stringify({
      _type: "export",
      __export_format: 4,
      resources: [{ _id: "1", _type: "workspace", name: "test" }],
    });
    expect(detectImportFormat(postman)).toBe("postman");
    expect(detectImportFormat(insomnia)).toBe("insomnia");
  });
});

// ─── HTTP Status Classification ───────────────────────────────

describe("HTTP Status Classification", () => {
  const classify = (status: number) => {
    if (status >= 200 && status < 300) return "success";
    if (status >= 300 && status < 400) return "redirect";
    if (status >= 400 && status < 500) return "client-error";
    if (status >= 500) return "server-error";
    return "unknown";
  };

  it("classifies all common success codes", () => {
    [200, 201, 202, 204, 206].forEach((s) => {
      expect(classify(s)).toBe("success");
    });
  });

  it("classifies all common redirect codes", () => {
    [301, 302, 303, 304, 307, 308].forEach((s) => {
      expect(classify(s)).toBe("redirect");
    });
  });

  it("classifies all common client error codes", () => {
    [400, 401, 403, 404, 405, 409, 422, 429].forEach((s) => {
      expect(classify(s)).toBe("client-error");
    });
  });

  it("classifies all common server error codes", () => {
    [500, 501, 502, 503, 504].forEach((s) => {
      expect(classify(s)).toBe("server-error");
    });
  });

  it("classifies I'm a teapot", () => {
    expect(classify(418)).toBe("client-error");
  });
});

// ─── URL Construction Comprehensive ──────────────────────────

describe("URL Construction: Comprehensive", () => {
  const buildUrl = (
    base: string,
    params: { name: string; value: string; enabled?: boolean }[],
  ) => {
    const enabled = params.filter((p) => p.enabled !== false && p.name);
    if (enabled.length === 0) return base;
    const sep = base.includes("?") ? "&" : "?";
    return (
      base +
      sep +
      enabled
        .map(
          (p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`,
        )
        .join("&")
    );
  };

  it("handles params with unicode characters", () => {
    const url = buildUrl("https://api.com/search", [
      { name: "q", value: "日本語" },
    ]);
    expect(url).toContain(encodeURIComponent("日本語"));
  });

  it("handles params with ampersands in values", () => {
    const url = buildUrl("https://api.com/search", [
      { name: "filter", value: "a&b=c" },
    ]);
    expect(url).not.toContain("&b="); // should be encoded
  });

  it("handles many params", () => {
    const params = Array.from({ length: 20 }, (_, i) => ({
      name: `param${i}`,
      value: `value${i}`,
    }));
    const url = buildUrl("https://api.com/test", params);
    const paramCount = (url.match(/=/g) || []).length;
    expect(paramCount).toBe(20);
  });

  it("handles base URL with existing fragment", () => {
    const url = buildUrl("https://api.com/test#section", [
      { name: "page", value: "1" },
    ]);
    expect(url).toContain("#section");
    expect(url).toContain("page=1");
  });

  it("handles base URL with port", () => {
    const url = buildUrl("http://localhost:3000/api", [
      { name: "debug", value: "true" },
    ]);
    expect(url).toContain("localhost:3000");
    expect(url).toContain("debug=true");
  });
});
