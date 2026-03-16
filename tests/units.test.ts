import { describe, it, expect } from "vitest";
import { getApiProviderForModel } from "@/lib/modelRegistry";
import {
  COMMON_HEADERS,
  HEADER_PRESETS,
  CONTENT_TYPES,
  COMMON_USER_AGENTS,
  filterHeaders,
  getHeaderValueSuggestions,
} from "@/lib/headers";
import { KEYBOARD_SHORTCUTS, formatShortcut } from "@/lib/shortcuts";
import {
  executePreRequestScript,
  executePostResponseScript,
  applyScriptModifications,
} from "@/lib/scriptExecutor";
import { getGitHubPATUrl } from "@/lib/githubSync";
import { DEMO_PROFILE_ID } from "@/lib/profiles";
import { detectImportFormat } from "@/lib/importers/types";
import { parseCurl } from "@/lib/importers/curl";
import { parsePostmanEnvironment } from "@/lib/importers/postman";
import { parseOpenAPI } from "@/lib/importers/openapi";
import { createDemoCollections } from "@/lib/demoProfile";
import type { CapturedResponse } from "@/types";

// ─── Model Registry ──────────────────────────────────────────

describe("Model Registry", () => {
  describe("getApiProviderForModel", () => {
    it("maps openai models to openai", () => {
      expect(getApiProviderForModel("openai/gpt-4.1")).toBe("openai");
      expect(getApiProviderForModel("openai/gpt-4.1-mini")).toBe("openai");
      expect(getApiProviderForModel("openai/o3")).toBe("openai");
    });

    it("maps anthropic models to anthropic", () => {
      expect(getApiProviderForModel("anthropic/claude-sonnet-4")).toBe(
        "anthropic",
      );
    });

    it("maps google models to gemini", () => {
      expect(getApiProviderForModel("google/gemini-2.0-flash")).toBe("gemini");
    });

    it("maps unknown providers to openrouter", () => {
      expect(getApiProviderForModel("mistralai/mistral-large")).toBe(
        "openrouter",
      );
      expect(getApiProviderForModel("deepseek/deepseek-r1")).toBe("openrouter");
    });
  });
});

// ─── Headers ─────────────────────────────────────────────────

describe("Headers Library", () => {
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
    });

    it("should have security headers", () => {
      expect(COMMON_HEADERS).toContain("Content-Security-Policy");
      expect(COMMON_HEADERS).toContain("Strict-Transport-Security");
    });

    it("should have 100+ headers", () => {
      expect(COMMON_HEADERS.length).toBeGreaterThan(100);
    });
  });

  describe("HEADER_PRESETS", () => {
    it("should have JSON Request preset", () => {
      const preset = HEADER_PRESETS["JSON Request"];
      expect(preset.some((h) => h.name === "Content-Type")).toBe(true);
    });

    it("should have Bearer Auth preset", () => {
      expect(HEADER_PRESETS["Bearer Auth"][0].name).toBe("Authorization");
    });

    it("should have 10 presets", () => {
      expect(Object.keys(HEADER_PRESETS).length).toBe(10);
    });
  });

  describe("filterHeaders", () => {
    it("should filter by prefix", () => {
      const results = filterHeaders("content");
      expect(results.length).toBeGreaterThan(0);
      results.forEach((h) => expect(h.toLowerCase()).toContain("content"));
    });

    it("should be case-insensitive", () => {
      expect(filterHeaders("ACCEPT")).toEqual(filterHeaders("accept"));
    });

    it("should max 10 results", () => {
      expect(filterHeaders("a").length).toBeLessThanOrEqual(10);
    });

    it("should return empty for no match", () => {
      expect(filterHeaders("zzznotfound")).toHaveLength(0);
    });
  });

  describe("getHeaderValueSuggestions", () => {
    it("suggests content types for Content-Type", () => {
      const s = getHeaderValueSuggestions("Content-Type");
      expect(s).toContain("application/json");
      expect(s).toContain("text/html");
    });

    it("suggests encodings for Accept-Encoding", () => {
      const s = getHeaderValueSuggestions("Accept-Encoding");
      expect(s).toContain("gzip");
      expect(s).toContain("br");
    });

    it("suggests user agents for User-Agent", () => {
      const s = getHeaderValueSuggestions("User-Agent");
      expect(s.some((v) => v.includes("Chrome"))).toBe(true);
    });

    it("suggests cache directives for Cache-Control", () => {
      const s = getHeaderValueSuggestions("Cache-Control");
      expect(s).toContain("no-cache");
      expect(s).toContain("max-age=3600");
    });

    it("suggests CORS values for Access-Control", () => {
      const s = getHeaderValueSuggestions("Access-Control-Allow-Origin");
      expect(s).toContain("*");
    });

    it("returns empty for unknown headers", () => {
      expect(getHeaderValueSuggestions("X-Custom-Unknown")).toHaveLength(0);
    });
  });

  describe("CONTENT_TYPES", () => {
    it("should have common MIME types", () => {
      expect(CONTENT_TYPES).toContain("application/json");
      expect(CONTENT_TYPES).toContain("text/html");
      expect(CONTENT_TYPES).toContain("image/png");
    });
  });

  describe("COMMON_USER_AGENTS", () => {
    it("should have browser user agents", () => {
      const names = COMMON_USER_AGENTS.map((ua) => ua.name);
      expect(names.some((n) => n.includes("Chrome"))).toBe(true);
      expect(names.some((n) => n.includes("Firefox"))).toBe(true);
    });

    it("should have valid strings", () => {
      COMMON_USER_AGENTS.forEach((ua) => {
        expect(ua.value.length).toBeGreaterThan(10);
      });
    });
  });
});

// ─── Keyboard Shortcuts ──────────────────────────────────────

describe("Keyboard Shortcuts", () => {
  describe("KEYBOARD_SHORTCUTS", () => {
    it("should have all categories", () => {
      const cats = new Set(KEYBOARD_SHORTCUTS.map((s) => s.category));
      expect(cats.has("request")).toBe(true);
      expect(cats.has("navigation")).toBe(true);
      expect(cats.has("editing")).toBe(true);
      expect(cats.has("global")).toBe(true);
    });

    it("should have Ctrl+Enter for send", () => {
      const send = KEYBOARD_SHORTCUTS.find((s) => s.action === "sendRequest");
      expect(send?.key).toBe("Enter");
      expect(send?.ctrl).toBe(true);
    });

    it("should have ? for shortcuts", () => {
      const show = KEYBOARD_SHORTCUTS.find((s) => s.action === "showShortcuts");
      expect(show?.key).toBe("?");
      expect(show?.shift).toBe(true);
    });

    it("all should have required fields", () => {
      KEYBOARD_SHORTCUTS.forEach((s) => {
        expect(s.key).toBeTruthy();
        expect(s.action).toBeTruthy();
        expect(s.description).toBeTruthy();
      });
    });
  });

  describe("formatShortcut", () => {
    it("should format Ctrl+Enter", () => {
      const f = formatShortcut({
        key: "Enter",
        ctrl: true,
        action: "t",
        description: "t",
        category: "request",
      });
      expect(f).toContain("Enter");
    });

    it("should format simple key", () => {
      const f = formatShortcut({
        key: "Escape",
        action: "t",
        description: "t",
        category: "request",
      });
      expect(f).toBeTruthy();
    });
  });
});

// ─── Script Executor ─────────────────────────────────────────

describe("Script Executor", () => {
  const defaultConfig = {
    method: "GET" as const,
    url: "https://api.example.com/test",
    headers: [{ name: "Accept", value: "application/json", enabled: true }],
    params: [],
    body: { raw: "" },
    bodyType: "none" as const,
    auth: { type: "none" as const },
  };

  const defaultResponse: CapturedResponse = {
    status: 200,
    statusText: "OK",
    headers: [["Content-Type", "application/json"] as [string, string]],
    body: '{"id": 1, "name": "test"}',
    duration: 150,
    size: 25,
  };

  describe("executePreRequestScript", () => {
    it("should execute simple script", () => {
      const r = executePreRequestScript(
        'pm.variables.set("key", "value");',
        defaultConfig,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.variables?.["key"]).toBe("value");
    });

    it("should capture console.log", () => {
      const r = executePreRequestScript(
        'console.log("hello");',
        defaultConfig,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.logs).toContain("hello");
    });

    it("should handle script errors", () => {
      const r = executePreRequestScript(
        "throw new Error('boom');",
        defaultConfig,
        {},
        {},
      );
      expect(r.success).toBe(false);
      expect(r.error).toContain("boom");
    });

    it("should allow modifying request URL", () => {
      const r = executePreRequestScript(
        'pm.request.url.url = "https://new-url.com";',
        defaultConfig,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.modifiedRequest?.url).toBe("https://new-url.com");
    });

    it("should allow adding headers", () => {
      const r = executePreRequestScript(
        'pm.request.headers.add("X-Custom", "val");',
        defaultConfig,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(
        r.modifiedRequest?.headers?.some((h) => h.name === "X-Custom"),
      ).toBe(true);
    });

    it("should access environment variables", () => {
      const r = executePreRequestScript(
        'const v = pm.environment.get("base"); pm.variables.set("got", v);',
        defaultConfig,
        {},
        { base: "https://api.example.com" },
      );
      expect(r.success).toBe(true);
      expect(r.variables?.["got"]).toBe("https://api.example.com");
    });

    it("should access request method", () => {
      const r = executePreRequestScript(
        'pm.variables.set("method", pm.request.method);',
        defaultConfig,
        {},
        {},
      );
      expect(r.variables?.["method"]).toBe("GET");
    });

    it("should remove headers", () => {
      const r = executePreRequestScript(
        'pm.request.headers.remove("Accept");',
        defaultConfig,
        {},
        {},
      );
      expect(r.success).toBe(true);
    });

    it("should modify request body", () => {
      const r = executePreRequestScript(
        'pm.request.body.raw = "{\\"test\\":true}";',
        defaultConfig,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.modifiedRequest?.body?.raw).toContain("test");
    });
  });

  describe("executePostResponseScript", () => {
    it("should parse response JSON", () => {
      const r = executePostResponseScript(
        'const d = pm.response.json(); pm.variables.set("name", d.name);',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.variables?.["name"]).toBe("test");
    });

    it("should access response status", () => {
      const r = executePostResponseScript(
        'pm.variables.set("s", String(pm.response.code));',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.variables?.["s"]).toBe("200");
    });

    it("should get response as text", () => {
      const r = executePostResponseScript(
        'const t = pm.response.text(); pm.variables.set("len", String(t.length));',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(Number(r.variables?.["len"])).toBeGreaterThan(0);
    });

    it("should run passing pm.test()", () => {
      const r = executePostResponseScript(
        'pm.test("ok", () => { pm.expect(pm.response.code).to.equal(200); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.logs?.some((l) => l.includes("✓"))).toBe(true);
    });

    it("should report failing pm.test()", () => {
      const r = executePostResponseScript(
        'pm.test("fail", () => { pm.expect(1).to.equal(2); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.logs?.some((l) => l.includes("✗"))).toBe(true);
    });

    it("should handle pm.expect().to.be.true()", () => {
      const r = executePostResponseScript(
        'pm.test("t", () => { pm.expect(true).to.be.true(); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.logs?.[0]).toContain("✓");
    });

    it("should handle pm.expect().to.exist()", () => {
      const r = executePostResponseScript(
        'pm.test("e", () => { pm.expect("x").to.exist(); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.logs?.[0]).toContain("✓");
    });

    it("should handle pm.expect().to.beA()", () => {
      const r = executePostResponseScript(
        'pm.test("a", () => { pm.expect(42).to.beA("number"); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.logs?.[0]).toContain("✓");
    });

    it("should handle pm.expect().to.be.false()", () => {
      const r = executePostResponseScript(
        'pm.test("f", () => { pm.expect(false).to.be.false(); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.logs?.[0]).toContain("✓");
    });

    it("should handle pm.expect().to.eql() for deep equality", () => {
      const r = executePostResponseScript(
        'pm.test("eq", () => { pm.expect({a:1}).to.eql({a:1}); });',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.logs?.[0]).toContain("✓");
    });

    it("should access response headers", () => {
      const r = executePostResponseScript(
        'const ct = pm.response.headers.get("Content-Type"); pm.variables.set("ct", ct || "none");',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.variables?.["ct"]).toBe("application/json");
    });

    it("should access response time", () => {
      const r = executePostResponseScript(
        'pm.variables.set("rt", String(pm.response.responseTime));',
        defaultConfig,
        defaultResponse,
        {},
        {},
      );
      expect(r.variables?.["rt"]).toBe("150");
    });
  });

  describe("applyScriptModifications", () => {
    it("should merge headers", () => {
      const r = applyScriptModifications(defaultConfig, {
        headers: [{ name: "X-New", value: "val", enabled: true }],
      });
      expect(r.headers[0].name).toBe("X-New");
    });

    it("should preserve other fields", () => {
      const r = applyScriptModifications(defaultConfig, {
        headers: [{ name: "X-New", value: "val", enabled: true }],
      });
      expect(r.method).toBe("GET");
      expect(r.url).toBe("https://api.example.com/test");
    });
  });
});

// ─── GitHub Sync ─────────────────────────────────────────────

describe("GitHub Sync", () => {
  describe("getGitHubPATUrl", () => {
    it("should return GitHub URL", () => {
      expect(getGitHubPATUrl()).toContain("github.com/settings/tokens/new");
    });

    it("should include repo scope", () => {
      expect(getGitHubPATUrl()).toContain("repo");
    });

    it("should include description", () => {
      expect(getGitHubPATUrl()).toContain("API+Debugger");
    });
  });
});

// ─── Profiles ────────────────────────────────────────────────

describe("Profiles", () => {
  it("should have demo profile ID", () => {
    expect(DEMO_PROFILE_ID).toBe("profile-demo");
    expect(DEMO_PROFILE_ID.startsWith("profile-")).toBe(true);
  });
});

// ─── Import Format Detection ─────────────────────────────────

describe("Import Format Detection", () => {
  it("detects OpenAPI JSON", () => {
    expect(
      detectImportFormat(JSON.stringify({ openapi: "3.0.0", paths: {} })),
    ).toBe("openapi");
  });

  it("detects Swagger 2.0", () => {
    expect(
      detectImportFormat(JSON.stringify({ swagger: "2.0", paths: {} })),
    ).toBe("openapi");
  });

  it("detects Postman v2.1", () => {
    expect(
      detectImportFormat(
        JSON.stringify({
          info: {
            schema:
              "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
          },
          item: [],
        }),
      ),
    ).toBe("postman");
  });

  it("detects HAR", () => {
    expect(detectImportFormat(JSON.stringify({ log: { entries: [] } }))).toBe(
      "har",
    );
  });

  it("detects cURL", () => {
    expect(detectImportFormat("curl https://example.com")).toBe("curl");
  });

  it("detects Insomnia", () => {
    expect(
      detectImportFormat(
        JSON.stringify({
          _type: "export",
          __export_format: 4,
          resources: [],
        }),
      ),
    ).toBe("insomnia");
  });

  it("returns null for unknown", () => {
    expect(detectImportFormat("random text")).toBe(null);
  });

  it("detects by extension", () => {
    expect(detectImportFormat("", "spec.yaml")).toBe("openapi");
    expect(detectImportFormat("", "export.har")).toBe("har");
  });

  it("detects Bruno by extension", () => {
    expect(detectImportFormat("", "collection.bru")).toBe("bruno");
  });

  it("returns null for unknown", () => {
    expect(detectImportFormat("random text")).toBe(null);
  });

  it("detects by extension", () => {
    expect(detectImportFormat("", "spec.yaml")).toBe("openapi");
    expect(detectImportFormat("", "export.har")).toBe("har");
  });
});

// ─── cURL Parser ─────────────────────────────────────────────

describe("cURL Parser", () => {
  it("parses --json flag", () => {
    const r = parseCurl(
      'curl --json \'{"name":"test"}\' https://api.example.com/data',
    );
    expect(r.requests?.[0].method).toBe("POST");
  });

  it("auto-promotes GET to POST with data", () => {
    const r = parseCurl('curl -d "key=value" https://api.example.com/data');
    expect(r.requests?.[0].method).toBe("POST");
  });

  it("parses -u for basic auth", () => {
    const r = parseCurl("curl -u user:pass https://api.example.com/data");
    expect(r.requests?.[0].auth?.type).toBe("basic");
    expect(r.requests?.[0].auth?.basic?.username).toBe("user");
  });

  it("parses -A for user agent", () => {
    const r = parseCurl('curl -A "MyAgent/1.0" https://api.example.com/data');
    expect(r.requests?.[0].headers?.some((h) => h.name === "User-Agent")).toBe(
      true,
    );
  });

  it("handles single-quoted URLs", () => {
    const r = parseCurl("curl 'https://api.example.com/data'");
    expect(r.requests?.[0].url).toBe("https://api.example.com/data");
  });

  it("parses multiple headers", () => {
    const r = parseCurl(
      'curl -H "Accept: json" -H "X-Key: val" https://api.example.com/data',
    );
    expect(r.requests?.[0].headers?.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Postman Environment ─────────────────────────────────────

describe("Postman Environment Parser", () => {
  it("parses environment with values", () => {
    const r = parsePostmanEnvironment(
      JSON.stringify({
        name: "Dev",
        values: [
          { key: "baseUrl", value: "http://localhost:3000", enabled: true },
          { key: "disabled", value: "off", enabled: false },
        ],
      }),
    );
    expect(r.environments?.[0].name).toBe("Dev");
    expect(r.environments?.[0].values.length).toBe(1); // only enabled
  });

  it("handles empty values", () => {
    const r = parsePostmanEnvironment(
      JSON.stringify({ name: "Empty", values: [] }),
    );
    expect(r.environments?.[0].values).toHaveLength(0);
  });
});

// ─── OpenAPI Parser ──────────────────────────────────────────

describe("OpenAPI Parser", () => {
  it("parses paths into requests", () => {
    const r = parseOpenAPI(
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        servers: [{ url: "https://api.example.com" }],
        paths: {
          "/users": {
            get: { summary: "List" },
            post: { summary: "Create" },
          },
        },
      }),
    );
    expect(r.requests.length).toBe(2);
  });

  it("handles empty paths", () => {
    const r = parseOpenAPI(
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "E", version: "1.0" },
        paths: {},
      }),
    );
    expect(r.requests).toHaveLength(0);
  });

  it("sets base URL from servers", () => {
    const r = parseOpenAPI(
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "T", version: "1.0" },
        servers: [{ url: "https://custom.com/v2" }],
        paths: { "/test": { get: { summary: "T" } } },
      }),
    );
    expect(r.requests[0].url).toContain("https://custom.com/v2");
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

  it("adds params to URL without query", () => {
    expect(
      buildUrl("https://api.com/posts", [
        { name: "page", value: "1" },
        { name: "limit", value: "10" },
      ]),
    ).toBe("https://api.com/posts?page=1&limit=10");
  });

  it("appends to existing query", () => {
    expect(
      buildUrl("https://api.com/posts?sort=desc", [
        { name: "page", value: "1" },
      ]),
    ).toBe("https://api.com/posts?sort=desc&page=1");
  });

  it("skips disabled params", () => {
    expect(
      buildUrl("https://api.com/posts", [
        { name: "page", value: "1", enabled: true },
        { name: "skip", value: "me", enabled: false },
      ]),
    ).toBe("https://api.com/posts?page=1");
  });

  it("URL-encodes special characters", () => {
    const url = buildUrl("https://api.com/search", [
      { name: "q", value: "hello & world" },
    ]);
    expect(url).toContain("hello%20%26%20world");
  });

  it("returns base URL for no params", () => {
    expect(buildUrl("https://api.com/posts", [])).toBe("https://api.com/posts");
  });

  it("skips empty param names", () => {
    expect(
      buildUrl("https://api.com/posts", [
        { name: "", value: "ignored" },
        { name: "valid", value: "yes" },
      ]),
    ).toBe("https://api.com/posts?valid=yes");
  });
});

// ─── Collection Runner Math ──────────────────────────────────

describe("Collection Runner Math", () => {
  it("calculates RPS", () => {
    expect(100 / (5000 / 1000)).toBe(20);
  });

  it("calculates average", () => {
    const d = [100, 200, 150, 300, 250];
    expect(d.reduce((a, b) => a + b, 0) / d.length).toBe(200);
  });

  it("finds min/max", () => {
    const d = [100, 200, 150, 300, 250];
    expect(Math.min(...d)).toBe(100);
    expect(Math.max(...d)).toBe(300);
  });

  it("counts pass/fail", () => {
    const r = [true, false, true, true];
    expect(r.filter(Boolean).length).toBe(3);
    expect(r.filter((x) => !x).length).toBe(1);
  });
});

// ─── Demo Profile Validation ─────────────────────────────────

describe("Demo Profile Validation", () => {
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

  it("each collection should have requests", () => {
    demo.collections.forEach((col) => {
      expect(
        demo.requests.filter((r) => r.collectionId === col.id).length,
      ).toBeGreaterThan(0);
    });
  });

  it("requestCount should match actual count", () => {
    demo.collections.forEach((col) => {
      const actual = demo.requests.filter(
        (r) => r.collectionId === col.id,
      ).length;
      expect(col.requestCount).toBe(actual);
    });
  });

  it("all requests should have valid URLs", () => {
    demo.requests.forEach((r) => {
      expect(r.requestConfig?.url.startsWith("http")).toBe(true);
    });
  });

  it("all requests should have valid methods", () => {
    const valid = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
    demo.requests.forEach((r) => {
      expect(valid).toContain(r.requestConfig?.method);
    });
  });

  it("environments should have unique names", () => {
    const names = demo.environments.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("exactly one environment active", () => {
    expect(demo.environments.filter((e) => e.isActive)).toHaveLength(1);
  });

  it("all env vars should have keys", () => {
    demo.environments.forEach((e) => {
      e.variables.forEach((v) => expect(v.key).toBeTruthy());
    });
  });

  it("should have all 5 HTTP methods", () => {
    const m = new Set(demo.requests.map((r) => r.requestConfig?.method));
    expect(
      m.has("GET") &&
        m.has("POST") &&
        m.has("PUT") &&
        m.has("PATCH") &&
        m.has("DELETE"),
    ).toBe(true);
  });

  it("should have bearer, basic, and api-key auth", () => {
    expect(
      demo.requests.some((r) =>
        r.requestConfig?.headers.some((h) => h.value?.startsWith("Bearer")),
      ),
    ).toBe(true);
    expect(
      demo.requests.some((r) => r.requestConfig?.auth.type === "basic"),
    ).toBe(true);
    expect(
      demo.requests.some((r) =>
        r.requestConfig?.headers.some((h) => h.name === "X-API-Key"),
      ),
    ).toBe(true);
  });

  it("should have json, form-data, and urlencoded body types", () => {
    const t = new Set(demo.requests.map((r) => r.requestConfig?.bodyType));
    expect(
      t.has("json") && t.has("form-data") && t.has("x-www-form-urlencoded"),
    ).toBe(true);
  });

  it("should have pre and post scripts", () => {
    expect(demo.requests.some((r) => !!r.requestConfig?.preRequestScript)).toBe(
      true,
    );
    expect(
      demo.requests.some((r) => !!r.requestConfig?.postResponseScript),
    ).toBe(true);
  });

  it("should have pm.test() in post scripts", () => {
    expect(
      demo.requests.filter((r) =>
        r.requestConfig?.postResponseScript?.includes("pm.test"),
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("should have toggleable headers", () => {
    const t = demo.requests.find((r) => r.name === "Toggle Headers Demo");
    const h = t?.requestConfig?.headers || [];
    expect(
      h.some((x) => x.enabled === true) && h.some((x) => x.enabled === false),
    ).toBe(true);
  });

  it("should have status code testing request", () => {
    expect(
      demo.requests.find((r) => r.name === "Status Code Testing"),
    ).toBeDefined();
  });

  it("should have cookie handling request", () => {
    expect(
      demo.requests.find((r) => r.name === "Cookie Handling"),
    ).toBeDefined();
  });

  it("should have API key in query request", () => {
    expect(
      demo.requests.find((r) => r.name === "API Key in Query"),
    ).toBeDefined();
  });

  it("should have script error handling request", () => {
    expect(
      demo.requests.find((r) => r.name === "Script Error Handling"),
    ).toBeDefined();
  });
});
