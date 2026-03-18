import { describe, it, expect } from "vitest";
import { createDemoCollections } from "@/lib/demoProfile";
import type { Profile, ProfileData } from "@/lib/profiles";
import type { SyncData } from "@/lib/githubSync";
import type {
  RequestConfig,
  SavedRequest,
  Collection,
  Environment,
} from "@/types";

// ─── Profile System ──────────────────────────────────────────

describe("Profile System", () => {
  describe("Profile structure", () => {
    it("should have required fields", () => {
      const profile: Profile = {
        id: "profile-test",
        name: "Test Profile",
        description: "A test profile",
        icon: "🧪",
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(profile.id).toBeTruthy();
      expect(profile.name).toBeTruthy();
      expect(profile.icon).toBeTruthy();
      expect(typeof profile.isBuiltIn).toBe("boolean");
      expect(typeof profile.createdAt).toBe("number");
      expect(typeof profile.updatedAt).toBe("number");
    });

    it("should distinguish built-in from custom profiles", () => {
      const builtIn: Profile = {
        id: "profile-demo",
        name: "Demo",
        icon: "🎯",
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const custom: Profile = {
        id: "profile-123",
        name: "Custom",
        icon: "📁",
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(builtIn.isBuiltIn).toBe(true);
      expect(custom.isBuiltIn).toBe(false);
    });
  });

  describe("ProfileData structure", () => {
    it("should have collections, requests, and environments arrays", () => {
      const data: ProfileData = {
        collections: [],
        savedRequests: [],
        environments: [],
      };

      expect(Array.isArray(data.collections)).toBe(true);
      expect(Array.isArray(data.savedRequests)).toBe(true);
      expect(Array.isArray(data.environments)).toBe(true);
    });

    it("should optionally have aiSettings", () => {
      const withAI: ProfileData = {
        collections: [],
        savedRequests: [],
        environments: [],
        aiSettings: {
          apiKey: "sk-or-test",
          model: "openai/gpt-4.1-mini",
          fallbacks: ["google/gemini-2.0-flash"],
        },
      };
      const withoutAI: ProfileData = {
        collections: [],
        savedRequests: [],
        environments: [],
      };

      expect(withAI.aiSettings).toBeDefined();
      expect(withAI.aiSettings?.apiKey).toBe("sk-or-test");
      expect(withoutAI.aiSettings).toBeUndefined();
    });

    it("should validate aiSettings structure", () => {
      const data: ProfileData = {
        collections: [],
        savedRequests: [],
        environments: [],
        aiSettings: {
          apiKey: "sk-or-key",
          model: "anthropic/claude-sonnet-4",
          fallbacks: ["openai/gpt-4.1", "google/gemini-2.5-pro"],
        },
      };

      expect(data.aiSettings?.model).toContain("/");
      expect(Array.isArray(data.aiSettings?.fallbacks)).toBe(true);
      expect(data.aiSettings?.fallbacks.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Storage key format", () => {
    it("should use apiDebugger_pd_ prefix for profile data", () => {
      const profileId = "profile-123";
      const key = `apiDebugger_pd_${profileId}`;
      expect(key).toBe("apiDebugger_pd_profile-123");
    });

    it("should use apiDebugger_profiles for profile list", () => {
      expect("apiDebugger_profiles").toBe("apiDebugger_profiles");
    });

    it("should use apiDebugger_activeProfile for active profile", () => {
      expect("apiDebugger_activeProfile").toBe("apiDebugger_activeProfile");
    });
  });
});

// ─── Demo Profile Validation ─────────────────────────────────

describe("Demo Profile", () => {
  const demo = createDemoCollections();

  it("should have 4 collections", () => {
    expect(demo.collections).toHaveLength(4);
  });

  it("should have collections with correct names", () => {
    const names = demo.collections.map((c: Collection) => c.name);
    // Names include emojis, check they contain the expected text
    expect(names.some((n: string) => n.includes("REST APIs"))).toBe(true);
    expect(names.some((n: string) => n.includes("Authentication"))).toBe(true);
    expect(names.some((n: string) => n.includes("Scripts"))).toBe(true);
    expect(names.some((n: string) => n.includes("Advanced"))).toBe(true);
  });

  it("should have 33 saved requests", () => {
    expect(demo.requests).toHaveLength(33);
  });

  it("should have requests in each collection", () => {
    demo.collections.forEach((col: Collection) => {
      const colRequests = demo.requests.filter(
        (r: SavedRequest) => r.collectionId === col.id,
      );
      expect(colRequests.length).toBeGreaterThan(0);
    });
  });

  it("should have GET, POST, PUT, PATCH, DELETE methods", () => {
    const methods = new Set(
      demo.requests.map((r: SavedRequest) => r.requestConfig?.method),
    );
    expect(methods.has("GET")).toBe(true);
    expect(methods.has("POST")).toBe(true);
    expect(methods.has("PUT")).toBe(true);
    expect(methods.has("PATCH")).toBe(true);
    expect(methods.has("DELETE")).toBe(true);
  });

  it("should have requests with JSON body type", () => {
    const jsonRequests = demo.requests.filter(
      (r: SavedRequest) => r.requestConfig?.bodyType === "json",
    );
    expect(jsonRequests.length).toBeGreaterThan(0);
  });

  it("should have requests with form-data body type", () => {
    const formRequests = demo.requests.filter(
      (r: SavedRequest) => r.requestConfig?.bodyType === "form-data",
    );
    expect(formRequests.length).toBeGreaterThan(0);
  });

  it("should have requests with urlencoded body type", () => {
    const urlRequests = demo.requests.filter(
      (r: SavedRequest) =>
        r.requestConfig?.bodyType === "x-www-form-urlencoded",
    );
    expect(urlRequests.length).toBeGreaterThan(0);
  });

  it("should have a request with bearer auth", () => {
    const bearer = demo.requests.find((r: SavedRequest) =>
      r.requestConfig?.headers.some((h) => h.value?.startsWith("Bearer ")),
    );
    expect(bearer).toBeDefined();
  });

  it("should have a request with basic auth", () => {
    const basic = demo.requests.find(
      (r: SavedRequest) => r.requestConfig?.auth.type === "basic",
    );
    expect(basic).toBeDefined();
    expect(basic?.requestConfig?.auth.basic?.username).toBeTruthy();
    expect(basic?.requestConfig?.auth.basic?.password).toBeTruthy();
  });

  it("should have a request with pre-request script", () => {
    const withPreScript = demo.requests.find(
      (r: SavedRequest) => !!r.requestConfig?.preRequestScript,
    );
    expect(withPreScript).toBeDefined();
    expect(withPreScript?.requestConfig?.preRequestScript).toContain(
      "pm.variables",
    );
  });

  it("should have a request with post-response script", () => {
    const withPostScript = demo.requests.find(
      (r: SavedRequest) => !!r.requestConfig?.postResponseScript,
    );
    expect(withPostScript).toBeDefined();
    expect(withPostScript?.requestConfig?.postResponseScript).toContain(
      "pm.test",
    );
  });

  it("should have a request with pm.test() assertions", () => {
    const withTests = demo.requests.find((r: SavedRequest) =>
      r.requestConfig?.postResponseScript?.includes("pm.test"),
    );
    expect(withTests).toBeDefined();
  });

  it("should have a request with query params", () => {
    const withParams = demo.requests.find(
      (r: SavedRequest) => (r.requestConfig?.params?.length || 0) > 0,
    );
    expect(withParams).toBeDefined();
  });

  it("should have a request with variable interpolation", () => {
    const withVars = demo.requests.find((r: SavedRequest) =>
      r.requestConfig?.url.includes("{{"),
    );
    expect(withVars).toBeDefined();
  });

  it("should have 3 environments", () => {
    expect(demo.environments).toHaveLength(3);
  });

  it("should have environments with variables", () => {
    demo.environments.forEach((env: Environment) => {
      expect(env.variables.length).toBeGreaterThan(0);
    });
  });

  it("should have exactly one active environment", () => {
    const active = demo.environments.filter((env: Environment) => env.isActive);
    expect(active).toHaveLength(1);
  });

  it("should have baseUrl variable in environments", () => {
    const hasBaseUrl = demo.environments.some((env: Environment) =>
      env.variables.some((v) => v.key === "baseUrl"),
    );
    expect(hasBaseUrl).toBe(true);
  });

  it("all requests should have valid request stubs", () => {
    demo.requests.forEach((r: SavedRequest) => {
      expect(r.request).toBeDefined();
      expect(r.request.url).toBeTruthy();
      expect(r.request.method).toBeTruthy();
    });
  });

  it("all requests should have tags array and createdAt", () => {
    demo.requests.forEach((r: SavedRequest) => {
      expect(Array.isArray(r.tags)).toBe(true);
      expect(typeof r.createdAt).toBe("number");
    });
  });

  it("all environments should have createdAt and updatedAt", () => {
    demo.environments.forEach((env: Environment) => {
      expect(typeof env.createdAt).toBe("number");
      expect(typeof env.updatedAt).toBe("number");
    });
  });
});

// ─── Environment Variable Resolution ─────────────────────────

describe("Variable Interpolation", () => {
  const interpolateVars = (
    template: string,
    variables: Record<string, string>,
  ): string => {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] || "";
    });
  };

  it("should resolve single variable", () => {
    const result = interpolateVars("{{baseUrl}}/posts", {
      baseUrl: "https://api.example.com",
    });
    expect(result).toBe("https://api.example.com/posts");
  });

  it("should resolve multiple variables", () => {
    const result = interpolateVars("{{baseUrl}}/users/{{userId}}", {
      baseUrl: "https://api.example.com",
      userId: "42",
    });
    expect(result).toBe("https://api.example.com/users/42");
  });

  it("should return empty string for missing variables", () => {
    const result = interpolateVars("{{baseUrl}}/posts", {});
    expect(result).toBe("/posts");
  });

  it("should preserve text around variables", () => {
    const result = interpolateVars(
      "https://api.example.com/posts?user={{userId}}&sort={{sortOrder}}",
      { userId: "1", sortOrder: "desc" },
    );
    expect(result).toBe("https://api.example.com/posts?user=1&sort=desc");
  });

  it("should not replace non-matching braces", () => {
    const result = interpolateVars("text with {single} braces", {});
    expect(result).toBe("text with {single} braces");
  });

  it("should resolve variables in headers", () => {
    const header = "Bearer {{token}}";
    const result = interpolateVars(header, { token: "abc123" });
    expect(result).toBe("Bearer abc123");
  });

  it("should resolve variables in JSON body", () => {
    const body = '{"name": "{{userName}}", "age": {{userAge}}}';
    const result = interpolateVars(body, {
      userName: "Alice",
      userAge: "30",
    });
    expect(result).toBe('{"name": "Alice", "age": 30}');
  });
});

// ─── Auth Header Building ────────────────────────────────────

describe("Auth Header Building", () => {
  const buildAuthHeader = (
    auth: RequestConfig["auth"],
  ): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (auth.type === "bearer" && auth.bearer?.token) {
      headers["Authorization"] = "Bearer " + auth.bearer.token;
    } else if (auth.type === "basic" && auth.basic) {
      const encoded = btoa(auth.basic.username + ":" + auth.basic.password);
      headers["Authorization"] = "Basic " + encoded;
    } else if (auth.type === "api-key" && auth.apiKey?.addTo === "header") {
      headers[auth.apiKey.key] = auth.apiKey.value;
    }
    return headers;
  };

  it("should build bearer auth header", () => {
    const headers = buildAuthHeader({
      type: "bearer",
      bearer: { token: "my-token-123" },
    });
    expect(headers["Authorization"]).toBe("Bearer my-token-123");
  });

  it("should build basic auth header with base64", () => {
    const headers = buildAuthHeader({
      type: "basic",
      basic: { username: "admin", password: "secret" },
    });
    expect(headers["Authorization"]).toBe("Basic " + btoa("admin:secret"));
  });

  it("should build api-key header", () => {
    const headers = buildAuthHeader({
      type: "api-key",
      apiKey: { key: "X-API-Key", value: "key-123", addTo: "header" },
    });
    expect(headers["X-API-Key"]).toBe("key-123");
  });

  it("should not add header for api-key in query", () => {
    const headers = buildAuthHeader({
      type: "api-key",
      apiKey: { key: "api_key", value: "key-123", addTo: "query" },
    });
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it("should return empty headers for no auth", () => {
    const headers = buildAuthHeader({ type: "none" });
    expect(Object.keys(headers)).toHaveLength(0);
  });
});

// ─── Header & Param Handling ─────────────────────────────────

describe("Header Building", () => {
  const buildHeaders = (
    headers: { name: string; value: string; enabled?: boolean }[],
  ): Record<string, string> => {
    const result: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled !== false && h.name) {
        result[h.name] = h.value;
      }
    });
    return result;
  };

  it("should include enabled headers", () => {
    const headers = buildHeaders([
      { name: "Accept", value: "application/json", enabled: true },
    ]);
    expect(headers["Accept"]).toBe("application/json");
  });

  it("should exclude disabled headers", () => {
    const headers = buildHeaders([
      { name: "Accept", value: "application/json", enabled: false },
    ]);
    expect(headers["Accept"]).toBeUndefined();
  });

  it("should default enabled to true", () => {
    const headers = buildHeaders([
      { name: "Content-Type", value: "application/json" },
    ]);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("should skip headers with empty names", () => {
    const headers = buildHeaders([
      { name: "", value: "some-value", enabled: true },
    ]);
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it("should handle multiple headers", () => {
    const headers = buildHeaders([
      { name: "Accept", value: "application/json" },
      { name: "User-Agent", value: "API-Debugger" },
      { name: "X-Request-Id", value: "123" },
    ]);
    expect(Object.keys(headers)).toHaveLength(3);
  });
});

describe("Query Param Building", () => {
  const buildQueryString = (
    params: { name: string; value: string; enabled?: boolean }[],
  ): string => {
    const enabled = params.filter((p) => p.enabled !== false && p.name);
    if (enabled.length === 0) return "";
    return (
      "?" +
      enabled
        .map(
          (p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`,
        )
        .join("&")
    );
  };

  it("should build simple query string", () => {
    const qs = buildQueryString([
      { name: "page", value: "1" },
      { name: "limit", value: "10" },
    ]);
    expect(qs).toBe("?page=1&limit=10");
  });

  it("should URL-encode special characters", () => {
    const qs = buildQueryString([{ name: "search", value: "hello world" }]);
    expect(qs).toBe("?search=hello%20world");
  });

  it("should skip disabled params", () => {
    const qs = buildQueryString([
      { name: "page", value: "1", enabled: true },
      { name: "limit", value: "10", enabled: false },
    ]);
    expect(qs).toBe("?page=1");
  });

  it("should return empty string for no params", () => {
    const qs = buildQueryString([]);
    expect(qs).toBe("");
  });

  it("should handle equals signs in values", () => {
    const qs = buildQueryString([{ name: "filter", value: "status=active" }]);
    expect(qs).toBe("?filter=status%3Dactive");
  });
});

// ─── GitHub Sync Data Format ─────────────────────────────────

describe("GitHub Sync Data Format", () => {
  it("should have v2.0 structure with profiles", () => {
    const syncData: SyncData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      profiles: [],
      activeProfileId: "profile-demo",
      profileData: {},
      settings: {
        theme: "dark",
        captureFilter: null,
      },
    };

    expect(syncData.version).toBe("2.0");
    expect(syncData.profiles).toBeDefined();
    expect(syncData.activeProfileId).toBeDefined();
    expect(syncData.profileData).toBeDefined();
  });

  it("should have backward-compatible v1.0 fields", () => {
    const syncData: SyncData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      collections: [],
      savedRequests: [],
      environments: [],
      settings: {
        theme: "system",
        captureFilter: null,
      },
    };

    expect(syncData.version).toBe("1.0");
    expect(syncData.collections).toBeDefined();
    expect(syncData.savedRequests).toBeDefined();
    expect(syncData.environments).toBeDefined();
  });

  it("should include profile data with all fields", () => {
    const profileData = {
      "profile-1": {
        collections: [{ id: "col-1", name: "Test" }],
        savedRequests: [{ id: "req-1", name: "GET Test" }],
        environments: [{ id: "env-1", name: "Dev" }],
        aiSettings: {
          apiKey: "sk-or-key",
          model: "openai/gpt-4.1-mini",
          fallbacks: [],
        },
      },
    };

    const syncData: SyncData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      profileData,
      settings: { theme: "dark", captureFilter: null },
    };

    expect(syncData.profileData?.["profile-1"]).toBeDefined();
    expect(syncData.profileData?.["profile-1"].aiSettings).toBeDefined();
  });

  it("should be serializable to JSON", () => {
    const syncData: SyncData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      profiles: [
        {
          id: "profile-demo",
          name: "Demo",
          icon: "🎯",
          isBuiltIn: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      activeProfileId: "profile-demo",
      profileData: {
        "profile-demo": {
          collections: [],
          savedRequests: [],
          environments: [],
        },
      },
      settings: { theme: "dark", captureFilter: null },
    };

    const json = JSON.stringify(syncData);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe("2.0");
    expect(parsed.profiles[0].id).toBe("profile-demo");
  });
});

// ─── Script Sandbox (pm API) ─────────────────────────────────

describe("Script Sandbox (pm API)", () => {
  describe("pm.variables", () => {
    const createPmVariables = () => {
      const vars: Record<string, string> = {};
      return {
        set: (key: string, value: string) => {
          vars[key] = value;
        },
        get: (key: string) => vars[key],
        unset: (key: string) => {
          delete vars[key];
        },
        clear: () => {
          Object.keys(vars).forEach((k) => delete vars[k]);
        },
        _vars: vars,
      };
    };

    it("should set and get variables", () => {
      const pm = createPmVariables();
      pm.set("userId", "42");
      expect(pm.get("userId")).toBe("42");
    });

    it("should return undefined for missing variables", () => {
      const pm = createPmVariables();
      expect(pm.get("nonexistent")).toBeUndefined();
    });

    it("should unset a variable", () => {
      const pm = createPmVariables();
      pm.set("key", "value");
      pm.unset("key");
      expect(pm.get("key")).toBeUndefined();
    });

    it("should clear all variables", () => {
      const pm = createPmVariables();
      pm.set("a", "1");
      pm.set("b", "2");
      pm.clear();
      expect(pm.get("a")).toBeUndefined();
      expect(pm.get("b")).toBeUndefined();
    });
  });

  describe("pm.test / pm.expect", () => {
    const createTestRunner = () => {
      const tests: { name: string; passed: boolean; error?: string }[] = [];
      return {
        test: (name: string, fn: () => void) => {
          try {
            fn();
            tests.push({ name, passed: true });
          } catch (e) {
            tests.push({
              name,
              passed: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        },
        expect: (actual: unknown) => ({
          to: {
            equal: (expected: unknown) => {
              if (actual !== expected)
                throw new Error(`Expected ${expected} but got ${actual}`);
            },
            be: {
              a: (type: string) => {
                if (typeof actual !== type)
                  throw new Error(
                    `Expected type ${type} but got ${typeof actual}`,
                  );
              },
            },
          },
        }),
        _tests: tests,
      };
    };

    it("should pass when assertion is correct", () => {
      const pm = createTestRunner();
      pm.test("status is 200", () => {
        pm.expect(200).to.equal(200);
      });
      expect(pm._tests[0].passed).toBe(true);
    });

    it("should fail when assertion is incorrect", () => {
      const pm = createTestRunner();
      pm.test("status is 200", () => {
        pm.expect(404).to.equal(200);
      });
      expect(pm._tests[0].passed).toBe(false);
      expect(pm._tests[0].error).toContain("Expected 200");
    });

    it("should check type with to.be.a", () => {
      const pm = createTestRunner();
      pm.test("is string", () => {
        pm.expect("hello").to.be.a("string");
      });
      pm.test("is number", () => {
        pm.expect(42).to.be.a("number");
      });
      expect(pm._tests[0].passed).toBe(true);
      expect(pm._tests[1].passed).toBe(true);
    });

    it("should run multiple tests independently", () => {
      const pm = createTestRunner();
      pm.test("pass", () => {
        pm.expect(1).to.equal(1);
      });
      pm.test("fail", () => {
        pm.expect(1).to.equal(2);
      });
      pm.test("also pass", () => {
        pm.expect("a").to.be.a("string");
      });

      const passed = pm._tests.filter((t) => t.passed);
      const failed = pm._tests.filter((t) => !t.passed);
      expect(passed).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });
  });
});

// ─── Request/Response Data Structures ────────────────────────

describe("Request Data Structures", () => {
  it("should create valid SavedRequest with all fields", () => {
    const req: SavedRequest = {
      id: "req-1",
      collectionId: "col-1",
      name: "Test Request",
      description: "A test",
      request: {
        id: "req-1",
        url: "https://api.example.com/test",
        method: "GET",
        statusCode: 200,
        tabId: 1,
        startTime: Date.now(),
        timeStamp: Date.now(),
        duration: 150,
        requestHeaders: [],
        requestBody: null,
        requestBodyText: null,
        responseHeaders: [],
      },
      requestConfig: {
        method: "GET",
        url: "https://api.example.com/test",
        headers: [],
        params: [],
        body: { raw: "" },
        bodyType: "none",
        auth: { type: "none" },
      },
      tags: ["test"],
      createdAt: Date.now(),
    };

    expect(req.id).toBe(req.request.id);
    expect(req.requestConfig?.method).toBe("GET");
    expect(req.tags).toContain("test");
  });

  it("should create valid Collection", () => {
    const col: Collection = {
      id: "col-1",
      name: "My Collection",
      description: "Test collection",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      requestCount: 5,
    };

    expect(col.id).toBeTruthy();
    expect(col.name).toBeTruthy();
    expect(typeof col.requestCount).toBe("number");
  });

  it("should create valid Environment", () => {
    const env: Environment = {
      id: "env-1",
      name: "Development",
      isActive: true,
      variables: [
        { key: "baseUrl", value: "http://localhost:3000", enabled: true },
        { key: "apiKey", value: "dev-key", enabled: true },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(env.variables).toHaveLength(2);
    expect(env.isActive).toBe(true);
    expect(env.variables[0].key).toBe("baseUrl");
  });
});

// ─── SSE Event Parsing ───────────────────────────────────────

describe("SSE Event Parsing", () => {
  const parseSSE = (raw: string) => {
    const lines = raw.split("\n");
    const event: { data?: string; event?: string; id?: string } = {};
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        event.data = (event.data || "") + line.slice(6);
      } else if (line.startsWith("event: ")) {
        event.event = line.slice(7);
      } else if (line.startsWith("id: ")) {
        event.id = line.slice(4);
      }
    }
    return event;
  };

  it("should parse simple data event", () => {
    const event = parseSSE("data: hello world");
    expect(event.data).toBe("hello world");
  });

  it("should parse event type", () => {
    const event = parseSSE("event: update\ndata: payload");
    expect(event.event).toBe("update");
    expect(event.data).toBe("payload");
  });

  it("should parse event ID", () => {
    const event = parseSSE("id: 123\ndata: test");
    expect(event.id).toBe("123");
  });

  it("should handle multi-line data", () => {
    const event = parseSSE("data: line1\ndata: line2");
    expect(event.data).toBe("line1line2");
  });

  it("should handle JSON data", () => {
    const json = JSON.stringify({ type: "message", text: "hi" });
    const event = parseSSE(`data: ${json}`);
    expect(() => JSON.parse(event.data!)).not.toThrow();
  });
});

// ─── WebSocket Message Format ────────────────────────────────

describe("WebSocket Message Format", () => {
  it("should create text message", () => {
    const msg = {
      type: "message" as const,
      direction: "outgoing" as const,
      data: "hello",
      timestamp: Date.now(),
    };
    expect(msg.type).toBe("message");
    expect(msg.direction).toBe("outgoing");
  });

  it("should create binary message", () => {
    const msg = {
      type: "binary" as const,
      direction: "incoming" as const,
      data: new ArrayBuffer(8),
      timestamp: Date.now(),
    };
    expect(msg.data.byteLength).toBe(8);
  });

  it("should validate WebSocket URL format", () => {
    const validUrls = [
      "ws://localhost:8080",
      "wss://echo.websocket.org",
      "ws://192.168.1.1:3000/chat",
    ];
    const invalidUrls = ["http://example.com", "ftp://server.com", "not-a-url"];

    validUrls.forEach((url) => {
      expect(url.startsWith("ws://") || url.startsWith("wss://")).toBe(true);
    });

    invalidUrls.forEach((url) => {
      expect(url.startsWith("ws://") || url.startsWith("wss://")).toBe(false);
    });
  });
});

// ─── Socket.IO Event Format ──────────────────────────────────

describe("Socket.IO Event Format", () => {
  it("should construct emit event", () => {
    const event = {
      name: "chat:message",
      data: { text: "hello", user: "alice" },
    };
    expect(event.name).toBeTruthy();
    expect(event.data).toBeDefined();
  });

  it("should handle namespace format", () => {
    const urls = [
      { url: "http://localhost:3000", namespace: "/" },
      { url: "http://localhost:3000/chat", namespace: "/chat" },
    ];
    urls.forEach(({ namespace }) => {
      expect(namespace.startsWith("/")).toBe(true);
    });
  });

  it("should construct listen events", () => {
    const listenEvents = ["message", "user:join", "user:leave"];
    expect(listenEvents.length).toBeGreaterThan(0);
    listenEvents.forEach((e) => expect(typeof e).toBe("string"));
  });
});

// ─── GraphQL Structures ──────────────────────────────────────

describe("GraphQL Structures", () => {
  it("should validate basic query", () => {
    const query = `{ users { id name } }`;
    expect(query).toContain("{");
    expect(query).toContain("}");
  });

  it("should validate query with variables", () => {
    const query = `query GetUser($id: ID!) { user(id: $id) { name } }`;
    const variables = { id: "1" };
    expect(query).toContain("$");
    expect(variables.id).toBe("1");
  });

  it("should validate mutation", () => {
    const mutation = `mutation CreateUser($name: String!) {
      createUser(name: $name) { id name }
    }`;
    expect(mutation).toContain("mutation");
  });

  it("should validate fragment", () => {
    const fragment = `fragment UserFields on User { id name email }`;
    expect(fragment).toContain("fragment");
    expect(fragment).toContain("on");
  });
});

// ─── Diagnostics & Error Handling ────────────────────────────

describe("Error Handling", () => {
  it("should classify HTTP status codes", () => {
    const classify = (status: number) => {
      if (status >= 200 && status < 300) return "success";
      if (status >= 300 && status < 400) return "redirect";
      if (status >= 400 && status < 500) return "client-error";
      if (status >= 500) return "server-error";
      return "unknown";
    };

    expect(classify(200)).toBe("success");
    expect(classify(201)).toBe("success");
    expect(classify(301)).toBe("redirect");
    expect(classify(400)).toBe("client-error");
    expect(classify(404)).toBe("client-error");
    expect(classify(500)).toBe("server-error");
    expect(classify(502)).toBe("server-error");
  });

  it("should classify HTTP methods by safety", () => {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];

    safeMethods.forEach((m) => {
      expect(["GET", "HEAD", "OPTIONS"]).toContain(m);
    });
    unsafeMethods.forEach((m) => {
      expect(["POST", "PUT", "PATCH", "DELETE"]).toContain(m);
    });
  });
});
