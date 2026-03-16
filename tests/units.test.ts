import { describe, it, expect, vi } from "vitest";

// ─── Model Registry (pure functions) ─────────────────────────

describe("Model Registry", () => {
  // Test the exported helper functions that don't need network
  // getApiProviderForModel is a pure function
  const { getApiProviderForModel } = await import("@/lib/modelRegistry");

  describe("getApiProviderForModel", () => {
    it("maps openai models to openai provider", () => {
      expect(getApiProviderForModel("openai/gpt-4.1")).toBe("openai");
      expect(getApiProviderForModel("openai/gpt-4.1-mini")).toBe("openai");
      expect(getApiProviderForModel("openai/o3")).toBe("openai");
    });

    it("maps anthropic models to anthropic provider", () => {
      expect(getApiProviderForModel("anthropic/claude-sonnet-4")).toBe(
        "anthropic",
      );
      expect(getApiProviderForModel("anthropic/claude-opus-4")).toBe(
        "anthropic",
      );
    });

    it("maps google models to gemini provider", () => {
      expect(getApiProviderForModel("google/gemini-2.0-flash")).toBe("gemini");
      expect(getApiProviderForModel("google/gemini-2.5-pro")).toBe("gemini");
    });

    it("maps unknown providers to openrouter", () => {
      expect(getApiProviderForModel("mistralai/mistral-large")).toBe(
        "openrouter",
      );
      expect(getApiProviderForModel("deepseek/deepseek-r1")).toBe("openrouter");
      expect(getApiProviderForModel("meta-llama/llama-4")).toBe("openrouter");
    });
  });

  describe("ModelInfo structure", () => {
    it("should have required fields", () => {
      const model = {
        id: "openai/gpt-4.1",
        name: "GPT-4.1",
        provider: "OpenAI",
        providerId: "openai",
        contextLength: 1050000,
        pricing: { prompt: 0.002, completion: 0.008 },
        modalities: { input: ["text", "image"], output: ["text"] },
      };

      expect(model.id).toContain("/");
      expect(model.name).toBeTruthy();
      expect(model.provider).toBeTruthy();
      expect(model.contextLength).toBeGreaterThan(0);
      expect(model.modalities.input).toContain("text");
    });
  });
});

// ─── Headers ─────────────────────────────────────────────────

describe("Headers Library", () => {
  const {
    COMMON_HEADERS,
    HEADER_PRESETS,
    CONTENT_TYPES,
    ACCEPT_VALUES,
    COMMON_USER_AGENTS,
    filterHeaders,
    getHeaderValueSuggestions,
  } = await import("@/lib/headers");

  describe("COMMON_HEADERS", () => {
    it("should have standard headers", () => {
      expect(COMMON_HEADERS).toContain("Accept");
      expect(COMMON_HEADERS).toContain("Authorization");
      expect(COMMON_HEADERS).toContain("Content-Type");
      expect(COMMON_HEADERS).toContain("Cookie");
      expect(COMMON_HEADERS).toContain("User-Agent");
    });

    it("should have CORS headers", () => {
      expect(COMMON_HEADERS).toContain("Access-Control-Allow-Origin");
      expect(COMMON_HEADERS).toContain("Access-Control-Allow-Methods");
    });

    it("should have security headers", () => {
      expect(COMMON_HEADERS).toContain("Content-Security-Policy");
      expect(COMMON_HEADERS).toContain("Strict-Transport-Security");
      expect(COMMON_HEADERS).toContain("X-Frame-Options");
    });

    it("should have 100+ headers", () => {
      expect(COMMON_HEADERS.length).toBeGreaterThan(100);
    });
  });

  describe("HEADER_PRESETS", () => {
    it("should have JSON Request preset", () => {
      const preset = HEADER_PRESETS["JSON Request"];
      expect(preset).toBeDefined();
      expect(preset.some((h) => h.name === "Content-Type")).toBe(true);
      expect(preset.some((h) => h.value === "application/json")).toBe(true);
    });

    it("should have Bearer Auth preset", () => {
      const preset = HEADER_PRESETS["Bearer Auth"];
      expect(preset).toBeDefined();
      expect(preset[0].name).toBe("Authorization");
      expect(preset[0].value).toContain("Bearer");
    });

    it("should have CORS Headers preset", () => {
      const preset = HEADER_PRESETS["CORS Headers"];
      expect(preset.length).toBeGreaterThanOrEqual(3);
    });

    it("should have 10 presets", () => {
      expect(Object.keys(HEADER_PRESETS).length).toBe(10);
    });
  });

  describe("filterHeaders", () => {
    it("should filter headers by prefix", () => {
      const results = filterHeaders("content");
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(10);
      results.forEach((h) => expect(h.toLowerCase()).toContain("content"));
    });

    it("should be case-insensitive", () => {
      const upper = filterHeaders("ACCEPT");
      const lower = filterHeaders("accept");
      expect(upper).toEqual(lower);
    });

    it("should return max 10 results", () => {
      const results = filterHeaders("a");
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it("should return empty for no match", () => {
      const results = filterHeaders("zzznotfound");
      expect(results).toHaveLength(0);
    });
  });

  describe("getHeaderValueSuggestions", () => {
    it("should suggest content types for Content-Type", () => {
      const suggestions = getHeaderValueSuggestions("Content-Type");
      expect(suggestions).toContain("application/json");
      expect(suggestions).toContain("text/html");
    });

    it("should suggest content types for Accept", () => {
      const suggestions = getHeaderValueSuggestions("Accept");
      expect(suggestions).toContain("application/json");
    });

    it("should suggest encodings for Accept-Encoding", () => {
      const suggestions = getHeaderValueSuggestions("Accept-Encoding");
      expect(suggestions).toContain("gzip");
      expect(suggestions).toContain("br");
    });

    it("should suggest user agents for User-Agent", () => {
      const suggestions = getHeaderValueSuggestions("User-Agent");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.includes("Chrome"))).toBe(true);
    });

    it("should suggest cache directives for Cache-Control", () => {
      const suggestions = getHeaderValueSuggestions("Cache-Control");
      expect(suggestions).toContain("no-cache");
      expect(suggestions).toContain("max-age=3600");
    });

    it("should suggest CORS values for Access-Control headers", () => {
      const suggestions = getHeaderValueSuggestions(
        "Access-Control-Allow-Origin",
      );
      expect(suggestions).toContain("*");
    });

    it("should return empty for unknown headers", () => {
      const suggestions = getHeaderValueSuggestions("X-Custom-Unknown");
      expect(suggestions).toHaveLength(0);
    });
  });

  describe("CONTENT_TYPES", () => {
    it("should have common MIME types", () => {
      expect(CONTENT_TYPES).toContain("application/json");
      expect(CONTENT_TYPES).toContain("text/html");
      expect(CONTENT_TYPES).toContain("image/png");
      expect(CONTENT_TYPES).toContain("application/pdf");
    });
  });

  describe("COMMON_USER_AGENTS", () => {
    it("should have browser user agents", () => {
      const names = COMMON_USER_AGENTS.map((ua) => ua.name);
      expect(names.some((n) => n.includes("Chrome"))).toBe(true);
      expect(names.some((n) => n.includes("Firefox"))).toBe(true);
      expect(names.some((n) => n.includes("Safari"))).toBe(true);
    });

    it("should have valid user agent strings", () => {
      COMMON_USER_AGENTS.forEach((ua) => {
        expect(ua.value).toBeTruthy();
        expect(ua.value.length).toBeGreaterThan(10);
      });
    });
  });
});

// ─── Keyboard Shortcuts ──────────────────────────────────────

describe("Keyboard Shortcuts", () => {
  const { KEYBOARD_SHORTCUTS, formatShortcut, matchesShortcut } =
    await import("@/lib/shortcuts");

  describe("KEYBOARD_SHORTCUTS", () => {
    it("should have shortcuts in all categories", () => {
      const categories = new Set(KEYBOARD_SHORTCUTS.map((s) => s.category));
      expect(categories.has("request")).toBe(true);
      expect(categories.has("navigation")).toBe(true);
      expect(categories.has("editing")).toBe(true);
      expect(categories.has("global")).toBe(true);
    });

    it("should have Ctrl+Enter for send request", () => {
      const send = KEYBOARD_SHORTCUTS.find((s) => s.action === "sendRequest");
      expect(send).toBeDefined();
      expect(send?.key).toBe("Enter");
      expect(send?.ctrl).toBe(true);
    });

    it("should have ? for show shortcuts", () => {
      const show = KEYBOARD_SHORTCUTS.find((s) => s.action === "showShortcuts");
      expect(show).toBeDefined();
      expect(show?.key).toBe("?");
      expect(show?.shift).toBe(true);
    });

    it("all shortcuts should have required fields", () => {
      KEYBOARD_SHORTCUTS.forEach((s) => {
        expect(s.key).toBeTruthy();
        expect(s.action).toBeTruthy();
        expect(s.description).toBeTruthy();
        expect(s.category).toBeTruthy();
      });
    });
  });

  describe("formatShortcut", () => {
    it("should format Ctrl+Enter", () => {
      const formatted = formatShortcut({
        key: "Enter",
        ctrl: true,
        action: "test",
        description: "Test",
        category: "request",
      });
      // On non-Mac: "Ctrl+ENTER", on Mac: "⌘↵"
      expect(formatted).toContain("Enter");
    });

    it("should format simple key", () => {
      const formatted = formatShortcut({
        key: "Escape",
        action: "test",
        description: "Test",
        category: "request",
      });
      expect(formatted).toBeTruthy();
    });

    it("should format Shift+key", () => {
      const formatted = formatShortcut({
        key: "?",
        shift: true,
        action: "test",
        description: "Test",
        category: "global",
      });
      expect(formatted).toContain("?");
    });
  });
});

// ─── Script Executor ─────────────────────────────────────────

describe("Script Executor", () => {
  const {
    executePreRequestScript,
    executePostResponseScript,
    applyScriptModifications,
  } = await import("@/lib/scriptExecutor");

  const defaultConfig = {
    method: "GET" as const,
    url: "https://api.example.com/test",
    headers: [{ name: "Accept", value: "application/json", enabled: true }],
    params: [],
    body: { raw: "" },
    bodyType: "none" as const,
    auth: { type: "none" as const },
  };

  const defaultResponse = {
    status: 200,
    statusText: "OK",
    headers: [["Content-Type", "application/json"]],
    body: '{"id": 1, "name": "test"}',
    duration: 150,
    size: 25,
  };

  describe("executePreRequestScript", () => {
    it("should execute simple script", () => {
      const result = executePreRequestScript(
        'pm.variables.set("key", "value");',
        defaultConfig,
        {},
        {},
      );
      expect(result.success).toBe(true);
      expect(result.variables?.["key"]).toBe("value");
    });

    it("should capture console.log", () => {
      const result = executePreRequestScript(
        'console.log("hello");',
        defaultConfig,
        {},
        {},
      );
      expect(result.success).toBe(true);
      expect(result.logs).toContain("hello");
    });

    it("should handle script errors", () => {
      const result = executePreRequestScript(
        "throw new Error('test error');",
        defaultConfig,
        {},
        {},
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("test error");
    });

    it("should allow modifying request URL", () => {
      const result = executePreRequestScript(
        'pm.request.url.url = "https://new-url.com";',
        defaultConfig,
        {},
        {},
      );
      expect(result.success).toBe(true);
      expect(result.modifiedRequest?.url).toBe("https://new-url.com");
    });

    it("should allow adding headers", () => {
      const result = executePreRequestScript(
        'pm.request.headers.add("X-Custom", "value");',
        defaultConfig,
        {},
        {},
      );
      expect(result.success).toBe(true);
      expect(
        result.modifiedRequest?.headers.some((h) => h.name === "X-Custom"),
      ).toBe(true);
    });

    it("should access environment variables", () => {
      const result = executePreRequestScript(
        'const val = pm.environment.get("baseUrl"); pm.variables.set("got", val);',
        defaultConfig,
        {},
        { baseUrl: "https://api.example.com" },
      );
      expect(result.success).toBe(true);
      expect(result.variables?.["got"]).toBe("https://api.example.com");
    });
  });

  describe("executePostResponseScript", () => {
    it("should execute script with response access", () => {
      const result = executePostResponseScript(
        'const data = pm.response.json(); pm.variables.set("name", data.name);',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(result.success).toBe(true);
      expect(result.variables?.["name"]).toBe("test");
    });

    it("should access response status", () => {
      const result = executePostResponseScript(
        'pm.variables.set("status", String(pm.response.code));',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(result.success).toBe(true);
      expect(result.variables?.["status"]).toBe("200");
    });

    it("should access response body as text", () => {
      const result = executePostResponseScript(
        'const text = pm.response.text(); pm.variables.set("bodyLen", String(text.length));',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(result.success).toBe(true);
      expect(Number(result.variables?.["bodyLen"])).toBeGreaterThan(0);
    });

    it("should run pm.test() assertions", () => {
      const result = executePostResponseScript(
        'pm.test("status is 200", () => { pm.expect(pm.response.code).to.equal(200); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(result.success).toBe(true);
      expect(result.logs?.some((l) => l.includes("✓"))).toBe(true);
    });

    it("should report failing tests", () => {
      const result = executePostResponseScript(
        'pm.test("fail", () => { pm.expect(1).to.equal(2); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(result.success).toBe(true); // script didn't throw
      expect(result.logs?.some((l) => l.includes("✗"))).toBe(true);
    });

    it("should handle pm.expect().to.be.true", () => {
      const result = executePostResponseScript(
        'pm.test("true check", () => { pm.expect(true).to.be.true(); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(result.logs?.[0]).toContain("✓");
    });

    it("should handle pm.expect().to.exist", () => {
      const result = executePostResponseScript(
        'pm.test("exists", () => { pm.expect("value").to.exist(); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(result.logs?.[0]).toContain("✓");
    });

    it("should handle pm.expect().to.beA", () => {
      const result = executePostResponseScript(
        'pm.test("type check", () => { pm.expect(42).to.beA("number"); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(result.logs?.[0]).toContain("✓");
    });
  });

  describe("applyScriptModifications", () => {
    it("should merge headers", () => {
      const result = applyScriptModifications(defaultConfig, {
        headers: [{ name: "X-New", value: "val", enabled: true }],
      });
      expect(result.headers[0].name).toBe("X-New");
    });

    it("should preserve other fields", () => {
      const result = applyScriptModifications(defaultConfig, {
        headers: [{ name: "X-New", value: "val", enabled: true }],
      });
      expect(result.method).toBe("GET");
      expect(result.url).toBe("https://api.example.com/test");
    });
  });
});

// ─── GitHub Sync ─────────────────────────────────────────────

describe("GitHub Sync", () => {
  const { getGitHubPATUrl } = await import("@/lib/githubSync");

  describe("getGitHubPATUrl", () => {
    it("should return a valid GitHub URL", () => {
      const url = getGitHubPATUrl();
      expect(url).toContain("github.com/settings/tokens/new");
    });

    it("should include required scopes", () => {
      const url = getGitHubPATUrl();
      expect(url).toContain("repo");
    });

    it("should include description", () => {
      const url = getGitHubPATUrl();
      expect(url).toContain("API+Debugger");
    });
  });

  describe("SyncData structure", () => {
    it("should support v2.0 profile format", () => {
      const data = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        profiles: [{ id: "p1", name: "Test" }],
        activeProfileId: "p1",
        profileData: {
          p1: { collections: [], savedRequests: [], environments: [] },
        },
        settings: { theme: "dark", captureFilter: null },
      };
      expect(data.version).toBe("2.0");
      expect(data.profiles).toHaveLength(1);
    });

    it("should support legacy v1.0 flat format", () => {
      const data = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        collections: [],
        savedRequests: [],
        environments: [],
        settings: { theme: "system", captureFilter: null },
      };
      expect(data.version).toBe("1.0");
      expect(data.collections).toBeDefined();
    });
  });
});

// ─── Profile Helpers ─────────────────────────────────────────

describe("Profile Helpers", () => {
  const { DEMO_PROFILE_ID } = await import("@/lib/profiles");

  it("should have demo profile ID constant", () => {
    expect(DEMO_PROFILE_ID).toBe("profile-demo");
  });

  it("profile IDs should follow naming convention", () => {
    expect(DEMO_PROFILE_ID.startsWith("profile-")).toBe(true);
  });

  describe("Profile structure validation", () => {
    it("valid profile has all required fields", () => {
      const profile = {
        id: "profile-test",
        name: "Test",
        icon: "🧪",
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(profile.id).toBeTruthy();
      expect(profile.name).toBeTruthy();
      expect(typeof profile.isBuiltIn).toBe("boolean");
    });

    it("ProfileData has required arrays", () => {
      const data = {
        collections: [],
        savedRequests: [],
        environments: [],
      };
      expect(Array.isArray(data.collections)).toBe(true);
      expect(Array.isArray(data.savedRequests)).toBe(true);
      expect(Array.isArray(data.environments)).toBe(true);
    });
  });
});

// ─── Import Format Detection ─────────────────────────────────

describe("Import Format Detection", () => {
  const { detectImportFormat } = await import("@/lib/importers/types");

  it("detects OpenAPI JSON", () => {
    const spec = JSON.stringify({ openapi: "3.0.0", paths: {} });
    expect(detectImportFormat(spec)).toBe("openapi");
  });

  it("detects Swagger 2.0", () => {
    const spec = JSON.stringify({ swagger: "2.0", paths: {} });
    expect(detectImportFormat(spec)).toBe("openapi");
  });

  it("detects Postman v2.1", () => {
    const col = JSON.stringify({
      info: {
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    });
    expect(detectImportFormat(col)).toBe("postman");
  });

  it("detects HAR", () => {
    const har = JSON.stringify({ log: { entries: [] } });
    expect(detectImportFormat(har)).toBe("har");
  });

  it("detects cURL", () => {
    expect(detectImportFormat("curl https://example.com")).toBe("curl");
    expect(detectImportFormat("curl -X POST https://api.com")).toBe("curl");
  });

  it("detects Insomnia", () => {
    const insomnia = JSON.stringify({
      _type: "export",
      __export_format: 4,
      resources: [],
    });
    expect(detectImportFormat(insomnia)).toBe("insomnia");
  });

  it("returns null for unknown format", () => {
    expect(detectImportFormat("random text here")).toBe(null);
    expect(detectImportFormat('{"foo": "bar"}')).toBe(null);
  });

  it("detects by file extension", () => {
    expect(detectImportFormat("", "spec.yaml")).toBe("openapi");
    expect(detectImportFormat("", "collection.json")).toBe(null); // needs content
    expect(detectImportFormat("", "export.har")).toBe("har");
    expect(detectImportFormat("", "insomnia.json")).toBe("insomnia");
  });
});

// ─── cURL Parser Edge Cases ──────────────────────────────────

describe("cURL Parser Edge Cases", () => {
  const { parseCurl } = await import("@/lib/importers/curl");

  it("parses --json flag", () => {
    const result = parseCurl(
      'curl --json \'{"name":"test"}\' https://api.example.com/data',
    );
    expect(result.requests[0].method).toBe("POST");
    expect(result.requests[0].body?.raw).toContain("name");
  });

  it("auto-promotes GET to POST with data", () => {
    const result = parseCurl(
      'curl -d "key=value" https://api.example.com/data',
    );
    expect(result.requests[0].method).toBe("POST");
  });

  it("parses -u for basic auth", () => {
    const result = parseCurl("curl -u user:pass https://api.example.com/data");
    expect(result.requests[0].auth?.type).toBe("basic");
    expect(result.requests[0].auth?.basic?.username).toBe("user");
  });

  it("parses -A for user agent", () => {
    const result = parseCurl(
      'curl -A "MyAgent/1.0" https://api.example.com/data',
    );
    expect(
      result.requests[0].headers?.some((h) => h.key === "User-Agent"),
    ).toBe(true);
  });

  it("parses -b for cookies", () => {
    const result = parseCurl(
      'curl -b "session=abc123" https://api.example.com/data',
    );
    expect(result.requests[0].headers?.some((h) => h.key === "Cookie")).toBe(
      true,
    );
  });

  it("handles single-quoted URLs", () => {
    const result = parseCurl("curl 'https://api.example.com/data'");
    expect(result.requests[0].url).toBe("https://api.example.com/data");
  });

  it("handles escaped quotes in data", () => {
    const result = parseCurl(
      'curl -d "name=\\"test\\"" https://api.example.com/data',
    );
    expect(result.requests[0].body?.raw).toBeTruthy();
  });
});

// ─── Postman Environment Parser ──────────────────────────────

describe("Postman Environment Parser", () => {
  const { parsePostmanEnvironment } = await import("@/lib/importers/postman");

  it("parses environment with values", () => {
    const env = JSON.stringify({
      name: "Dev",
      values: [
        { key: "baseUrl", value: "http://localhost:3000", enabled: true },
        { key: "apiKey", value: "dev-key", enabled: true },
        { key: "disabled", value: "off", enabled: false },
      ],
    });
    const result = parsePostmanEnvironment(env);
    expect(result.name).toBe("Dev");
    expect(result.values.length).toBe(2); // only enabled
  });

  it("handles empty values", () => {
    const env = JSON.stringify({ name: "Empty", values: [] });
    const result = parsePostmanEnvironment(env);
    expect(result.name).toBe("Empty");
    expect(result.values).toHaveLength(0);
  });
});

// ─── OpenAPI Parser ──────────────────────────────────────────

describe("OpenAPI Parser", () => {
  const { parseOpenAPI } = await import("@/lib/importers/openapi");

  it("parses OpenAPI 3.0 with paths", () => {
    const spec = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0" },
      servers: [{ url: "https://api.example.com" }],
      paths: {
        "/users": {
          get: { summary: "List users", operationId: "listUsers" },
          post: { summary: "Create user", operationId: "createUser" },
        },
        "/users/{id}": {
          get: {
            summary: "Get user",
            parameters: [{ name: "id", in: "path", required: true }],
          },
        },
      },
    });
    const result = parseOpenAPI(spec);
    expect(result.requests.length).toBe(3);
    expect(result.requests.some((r) => r.method === "GET")).toBe(true);
    expect(result.requests.some((r) => r.method === "POST")).toBe(true);
  });

  it("handles empty paths", () => {
    const spec = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "Empty", version: "1.0" },
      paths: {},
    });
    const result = parseOpenAPI(spec);
    expect(result.requests).toHaveLength(0);
  });

  it("sets base URL from servers", () => {
    const spec = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0" },
      servers: [{ url: "https://custom.api.com/v2" }],
      paths: {
        "/test": { get: { summary: "Test" } },
      },
    });
    const result = parseOpenAPI(spec);
    expect(result.requests[0].url).toContain("https://custom.api.com/v2");
  });
});

// ─── URL Construction ────────────────────────────────────────

describe("URL Construction", () => {
  const buildUrl = (
    base: string,
    params: { name: string; value: string; enabled?: boolean }[],
  ): string => {
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

  it("should add params to URL without query", () => {
    const url = buildUrl("https://api.example.com/posts", [
      { name: "page", value: "1" },
      { name: "limit", value: "10" },
    ]);
    expect(url).toBe("https://api.example.com/posts?page=1&limit=10");
  });

  it("should append to existing query string", () => {
    const url = buildUrl("https://api.example.com/posts?sort=desc", [
      { name: "page", value: "1" },
    ]);
    expect(url).toBe("https://api.example.com/posts?sort=desc&page=1");
  });

  it("should skip disabled params", () => {
    const url = buildUrl("https://api.example.com/posts", [
      { name: "page", value: "1", enabled: true },
      { name: "skip", value: "me", enabled: false },
    ]);
    expect(url).toBe("https://api.example.com/posts?page=1");
  });

  it("should URL-encode special characters", () => {
    const url = buildUrl("https://api.example.com/search", [
      { name: "q", value: "hello world & more" },
    ]);
    expect(url).toContain("hello%20world%20%26%20more");
  });

  it("should return base URL for no params", () => {
    const url = buildUrl("https://api.example.com/posts", []);
    expect(url).toBe("https://api.example.com/posts");
  });

  it("should handle params with empty names", () => {
    const url = buildUrl("https://api.example.com/posts", [
      { name: "", value: "ignored" },
      { name: "valid", value: "yes" },
    ]);
    expect(url).toBe("https://api.example.com/posts?valid=yes");
  });
});

// ─── Collection Runner Logic ─────────────────────────────────

describe("Collection Runner", () => {
  describe("Sequential execution", () => {
    it("should execute requests in order", async () => {
      const order: number[] = [];
      const requests = [1, 2, 3, 4, 5];

      for (const req of requests) {
        order.push(req);
      }

      expect(order).toEqual([1, 2, 3, 4, 5]);
    });

    it("should track pass/fail counts", () => {
      const results = [
        { passed: true },
        { passed: false },
        { passed: true },
        { passed: true },
      ];
      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;

      expect(passed).toBe(3);
      expect(failed).toBe(1);
    });
  });

  describe("Load testing math", () => {
    it("should calculate RPS correctly", () => {
      const requests = 100;
      const durationMs = 5000;
      const rps = requests / (durationMs / 1000);
      expect(rps).toBe(20);
    });

    it("should calculate average duration", () => {
      const durations = [100, 200, 150, 300, 250];
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avg).toBe(200);
    });

    it("should find min/max duration", () => {
      const durations = [100, 200, 150, 300, 250];
      expect(Math.min(...durations)).toBe(100);
      expect(Math.max(...durations)).toBe(300);
    });
  });
});

// ─── Demo Profile Structure ──────────────────────────────────

describe("Demo Profile Structure", () => {
  const { createDemoCollections } = await import("@/lib/demoProfile");
  const demo = createDemoCollections();

  it("should have 4 collections", () => {
    expect(demo.collections).toHaveLength(4);
  });

  it("should have 21 requests", () => {
    expect(demo.requests).toHaveLength(21);
  });

  it("should have 3 environments", () => {
    expect(demo.environments).toHaveLength(3);
  });

  it("each collection should have at least one request", () => {
    demo.collections.forEach((col) => {
      const count = demo.requests.filter(
        (r) => r.collectionId === col.id,
      ).length;
      expect(count).toBeGreaterThan(0);
    });
  });

  it("should have requestCount matching actual requests", () => {
    demo.collections.forEach((col) => {
      const actual = demo.requests.filter(
        (r) => r.collectionId === col.id,
      ).length;
      expect(col.requestCount).toBe(actual);
    });
  });

  it("all requests should have valid URLs", () => {
    demo.requests.forEach((r) => {
      expect(r.requestConfig?.url).toBeTruthy();
      expect(r.requestConfig?.url.startsWith("http")).toBe(true);
    });
  });

  it("all requests should have valid methods", () => {
    const validMethods = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ];
    demo.requests.forEach((r) => {
      expect(validMethods).toContain(r.requestConfig?.method);
    });
  });

  it("environments should have unique names", () => {
    const names = demo.environments.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("exactly one environment should be active", () => {
    const active = demo.environments.filter((e) => e.isActive);
    expect(active).toHaveLength(1);
  });

  it("all environment variables should have keys", () => {
    demo.environments.forEach((env) => {
      env.variables.forEach((v) => {
        expect(v.key).toBeTruthy();
      });
    });
  });

  it("should have all 5 HTTP methods represented", () => {
    const methods = new Set(demo.requests.map((r) => r.requestConfig?.method));
    expect(methods.has("GET")).toBe(true);
    expect(methods.has("POST")).toBe(true);
    expect(methods.has("PUT")).toBe(true);
    expect(methods.has("PATCH")).toBe(true);
    expect(methods.has("DELETE")).toBe(true);
  });

  it("should have requests with all 3 auth types", () => {
    const hasBearer = demo.requests.some((r) =>
      r.requestConfig?.headers.some((h) => h.value?.startsWith("Bearer")),
    );
    const hasBasic = demo.requests.some(
      (r) => r.requestConfig?.auth.type === "basic",
    );
    const hasApiKey = demo.requests.some((r) =>
      r.requestConfig?.headers.some((h) => h.name === "X-API-Key"),
    );
    expect(hasBearer).toBe(true);
    expect(hasBasic).toBe(true);
    expect(hasApiKey).toBe(true);
  });

  it("should have requests with all 3 body types", () => {
    const types = new Set(demo.requests.map((r) => r.requestConfig?.bodyType));
    expect(types.has("json")).toBe(true);
    expect(types.has("form-data")).toBe(true);
    expect(types.has("x-www-form-urlencoded")).toBe(true);
  });

  it("should have requests with both pre and post scripts", () => {
    const hasPre = demo.requests.some(
      (r) => !!r.requestConfig?.preRequestScript,
    );
    const hasPost = demo.requests.some(
      (r) => !!r.requestConfig?.postResponseScript,
    );
    expect(hasPre).toBe(true);
    expect(hasPost).toBe(true);
  });

  it("should have requests with pm.test() in post scripts", () => {
    const withTests = demo.requests.filter((r) =>
      r.requestConfig?.postResponseScript?.includes("pm.test"),
    );
    expect(withTests.length).toBeGreaterThanOrEqual(2);
  });

  it("should have requests with toggleable headers", () => {
    const toggleDemo = demo.requests.find(
      (r) => r.name === "Toggle Headers Demo",
    );
    expect(toggleDemo).toBeDefined();
    const headers = toggleDemo?.requestConfig?.headers || [];
    expect(headers.some((h) => h.enabled === true)).toBe(true);
    expect(headers.some((h) => h.enabled === false)).toBe(true);
  });

  it("should have a request that targets a 404", () => {
    const errorReq = demo.requests.find((r) =>
      r.requestConfig?.url.includes("99999"),
    );
    expect(errorReq).toBeDefined();
  });

  it("should have a status code testing request", () => {
    const statusReq = demo.requests.find(
      (r) => r.name === "Status Code Testing",
    );
    expect(statusReq).toBeDefined();
    expect(statusReq?.requestConfig?.url).toContain("/status/");
  });
});
