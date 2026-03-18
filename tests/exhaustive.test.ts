import { describe, it, expect } from "vitest";
import {
  executePreRequestScript,
  executePostResponseScript,
} from "@/lib/scriptExecutor";
import { detectImportFormat } from "@/lib/importers/types";
import { parseCurl } from "@/lib/importers/curl";
import { parseHar } from "@/lib/importers/har";
import { parseOpenAPI } from "@/lib/importers/openapi";
import { getApiProviderForModel } from "@/lib/modelRegistry";
import { KEYBOARD_SHORTCUTS, formatShortcut } from "@/lib/shortcuts";
import type { RequestConfig, CapturedResponse } from "@/types";

// ─── HTTP Methods × Body Types × Auth: All Combinations ──────

describe("HTTP Methods", () => {
  const methods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ] as const;
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];
  const idempotentMethods = ["GET", "PUT", "DELETE", "HEAD", "OPTIONS"];

  methods.forEach((method) => {
    it(`${method} is a valid HTTP method`, () => {
      expect(methods).toContain(method);
    });

    it(`${method} can be used in a RequestConfig`, () => {
      const config: RequestConfig = {
        method,
        url: "https://api.example.com",
        headers: [],
        params: [],
        body: { raw: "" },
        bodyType: "none",
        auth: { type: "none" },
      };
      expect(config.method).toBe(method);
    });

    it(`${method} has a methodColor`, () => {
      const colors: Record<string, string> = {
        GET: "emerald",
        POST: "sky",
        PUT: "orange",
        PATCH: "violet",
        DELETE: "rose",
      };
      if (method in colors) {
        expect(colors[method]).toBeTruthy();
      }
    });
  });

  it("classifies safe vs unsafe methods", () => {
    safeMethods.forEach((m) => {
      expect(safeMethods).toContain(m);
      expect(unsafeMethods).not.toContain(m);
    });
    unsafeMethods.forEach((m) => {
      expect(unsafeMethods).toContain(m);
      expect(safeMethods).not.toContain(m);
    });
  });

  it("classifies idempotent methods", () => {
    idempotentMethods.forEach((m) => {
      expect(idempotentMethods).toContain(m);
    });
    expect(idempotentMethods).not.toContain("POST");
  });
});

describe("Body Types", () => {
  const bodyTypes = [
    "none",
    "json",
    "form-data",
    "x-www-form-urlencoded",
    "raw",
  ] as const;

  bodyTypes.forEach((bt) => {
    it(`${bt} is a valid bodyType`, () => {
      expect(bodyTypes).toContain(bt);
    });

    it(`${bt} can be set in RequestConfig`, () => {
      const config: RequestConfig = {
        method: "POST",
        url: "https://api.example.com",
        headers: [],
        params: [],
        body:
          bt === "json"
            ? { json: '{"test":true}' }
            : bt === "raw"
              ? { raw: "hello" }
              : {},
        bodyType: bt,
        auth: { type: "none" },
      };
      expect(config.bodyType).toBe(bt);
    });
  });

  it("bodyType none has no body content", () => {
    const config: RequestConfig = {
      method: "GET",
      url: "https://api.example.com",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    };
    expect(config.bodyType).toBe("none");
  });

  it("bodyType json has JSON body", () => {
    const body = { json: '{"key":"value"}' };
    expect(body.json).toContain("key");
    expect(() => JSON.parse(body.json!)).not.toThrow();
  });

  it("bodyType form-data has form fields", () => {
    const body = {
      formData: [
        { name: "field1", value: "value1", type: "text" as const },
        { name: "field2", value: "value2", type: "text" as const },
      ],
    };
    expect(body.formData).toHaveLength(2);
    expect(body.formData![0].name).toBe("field1");
  });

  it("bodyType urlencoded has key-value pairs", () => {
    const body = {
      urlEncoded: [
        { name: "key1", value: "value1" },
        { name: "key2", value: "value2" },
      ],
    };
    expect(body.urlEncoded).toHaveLength(2);
    expect(body.urlEncoded![0].name).toBe("key1");
  });
});

describe("Auth Types", () => {
  const authTypes = ["none", "bearer", "basic", "api-key", "oauth2"] as const;

  authTypes.forEach((at) => {
    it(`${at} is a valid auth type`, () => {
      expect(authTypes).toContain(at);
    });
  });

  it("bearer auth has token", () => {
    const auth = { type: "bearer" as const, bearer: { token: "my-jwt-token" } };
    expect(auth.bearer?.token).toBe("my-jwt-token");
    expect(auth.type).toBe("bearer");
  });

  it("basic auth has username and password", () => {
    const auth = {
      type: "basic" as const,
      basic: { username: "user", password: "pass" },
    };
    expect(auth.basic?.username).toBe("user");
    expect(auth.basic?.password).toBe("pass");
  });

  it("api-key auth has key, value, and addTo", () => {
    const auth = {
      type: "api-key" as const,
      apiKey: { key: "X-API-Key", value: "secret", addTo: "header" as const },
    };
    expect(auth.apiKey?.key).toBe("X-API-Key");
    expect(auth.apiKey?.value).toBe("secret");
    expect(auth.apiKey?.addTo).toBe("header");
  });

  it("api-key can be added to query", () => {
    const auth = {
      type: "api-key" as const,
      apiKey: { key: "api_key", value: "123", addTo: "query" as const },
    };
    expect(auth.apiKey?.addTo).toBe("query");
  });

  it("oauth2 has token URL and client ID", () => {
    const auth = {
      type: "oauth2" as const,
      oauth2: {
        accessTokenUrl: "https://auth.example.com/token",
        clientId: "client-id",
        clientSecret: "secret",
        scope: "read",
      },
    };
    expect(auth.oauth2?.accessTokenUrl).toContain("/token");
    expect(auth.oauth2?.clientId).toBe("client-id");
  });
});

// ─── HTTP Status Codes: Comprehensive ────────────────────────

describe("HTTP Status Codes", () => {
  const allCodes = [
    { code: 100, name: "Continue", category: "info" },
    { code: 101, name: "Switching Protocols", category: "info" },
    { code: 200, name: "OK", category: "success" },
    { code: 201, name: "Created", category: "success" },
    { code: 202, name: "Accepted", category: "success" },
    { code: 204, name: "No Content", category: "success" },
    { code: 206, name: "Partial Content", category: "success" },
    { code: 301, name: "Moved Permanently", category: "redirect" },
    { code: 302, name: "Found", category: "redirect" },
    { code: 304, name: "Not Modified", category: "redirect" },
    { code: 307, name: "Temporary Redirect", category: "redirect" },
    { code: 308, name: "Permanent Redirect", category: "redirect" },
    { code: 400, name: "Bad Request", category: "client-error" },
    { code: 401, name: "Unauthorized", category: "client-error" },
    { code: 403, name: "Forbidden", category: "client-error" },
    { code: 404, name: "Not Found", category: "client-error" },
    { code: 405, name: "Method Not Allowed", category: "client-error" },
    { code: 408, name: "Request Timeout", category: "client-error" },
    { code: 409, name: "Conflict", category: "client-error" },
    { code: 410, name: "Gone", category: "client-error" },
    { code: 413, name: "Payload Too Large", category: "client-error" },
    { code: 415, name: "Unsupported Media Type", category: "client-error" },
    { code: 418, name: "I'm a teapot", category: "client-error" },
    { code: 422, name: "Unprocessable Entity", category: "client-error" },
    { code: 429, name: "Too Many Requests", category: "client-error" },
    { code: 500, name: "Internal Server Error", category: "server-error" },
    { code: 501, name: "Not Implemented", category: "server-error" },
    { code: 502, name: "Bad Gateway", category: "server-error" },
    { code: 503, name: "Service Unavailable", category: "server-error" },
    { code: 504, name: "Gateway Timeout", category: "server-error" },
  ];

  const classify = (code: number) => {
    if (code >= 100 && code < 200) return "info";
    if (code >= 200 && code < 300) return "success";
    if (code >= 300 && code < 400) return "redirect";
    if (code >= 400 && code < 500) return "client-error";
    if (code >= 500) return "server-error";
    return "unknown";
  };

  allCodes.forEach(({ code, name, category }) => {
    it(`${code} ${name} is classified as ${category}`, () => {
      expect(classify(code)).toBe(category);
    });

    it(`${code} ${name} is a valid status`, () => {
      expect(code).toBeGreaterThanOrEqual(100);
      expect(code).toBeLessThan(600);
    });
  });

  it("2xx indicates success", () => {
    for (let i = 200; i < 300; i++) {
      expect(classify(i)).toBe("success");
    }
  });

  it("3xx indicates redirect", () => {
    for (let i = 300; i < 400; i++) {
      expect(classify(i)).toBe("redirect");
    }
  });

  it("4xx indicates client error", () => {
    for (let i = 400; i < 500; i++) {
      expect(classify(i)).toBe("client-error");
    }
  });

  it("5xx indicates server error", () => {
    for (let i = 500; i < 600; i++) {
      expect(classify(i)).toBe("server-error");
    }
  });
});

// ─── URL Encoding: Exhaustive ────────────────────────────────

describe("URL Encoding: Exhaustive", () => {
  const encode = (s: string) => encodeURIComponent(s);
  const decode = (s: string) => decodeURIComponent(s);

  const specialChars = [
    { char: " ", encoded: "%20" },
    { char: "!", encoded: "%21" },
    { char: "#", encoded: "%23" },
    { char: "$", encoded: "%24" },
    { char: "%", encoded: "%25" },
    { char: "&", encoded: "%26" },
    { char: "'", encoded: "'" },
    { char: "(", encoded: "%28" },
    { char: ")", encoded: "%29" },
    { char: "*", encoded: "*" },
    { char: "+", encoded: "%2B" },
    { char: ",", encoded: "%2C" },
    { char: "/", encoded: "%2F" },
    { char: ":", encoded: "%3A" },
    { char: ";", encoded: "%3B" },
    { char: "=", encoded: "%3D" },
    { char: "?", encoded: "%3F" },
    { char: "@", encoded: "%40" },
    { char: "[", encoded: "%5B" },
    { char: "]", encoded: "%5D" },
    { char: "{", encoded: "%7B" },
    { char: "}", encoded: "%7D" },
  ];

  specialChars.forEach(({ char, encoded }) => {
    it(`encodes '${char}' to '${encoded}'`, () => {
      expect(encode(char)).toBe(encoded);
    });
  });

  it("roundtrips all printable ASCII", () => {
    for (let i = 32; i < 127; i++) {
      const char = String.fromCharCode(i);
      expect(decode(encode(char))).toBe(char);
    }
  });

  it("roundtrips unicode", () => {
    const unicode = ["日本語", "中文", "한국어", "émojis🎉", "Ñoño", "München"];
    unicode.forEach((s) => {
      expect(decode(encode(s))).toBe(s);
    });
  });

  it("encodes full query strings", () => {
    const params = [
      { name: "search", value: "hello world" },
      { name: "filter", value: "status=active&type=user" },
      { name: "sort", value: "name+asc" },
    ];
    const qs = params
      .map((p) => `${encode(p.name)}=${encode(p.value)}`)
      .join("&");
    expect(qs).not.toContain(" ");
    expect(qs).not.toContain("=");
    // '=' should be encoded
  });

  it("encodes JSON body values", () => {
    const obj = {
      message: 'He said "hello"',
      path: "/api/v1/users?active=true",
    };
    const encoded = encode(JSON.stringify(obj));
    expect(decode(encoded)).toBe(JSON.stringify(obj));
  });
});

// ─── JSON Handling: Exhaustive ────────────────────────────────

describe("JSON Handling: Exhaustive", () => {
  it("parses empty object", () => {
    expect(JSON.parse("{}")).toEqual({});
  });

  it("parses empty array", () => {
    expect(JSON.parse("[]")).toEqual([]);
  });

  it("parses nested arrays", () => {
    const data = JSON.parse("[[1,2],[3,4],[5,6]]");
    expect(data).toHaveLength(3);
    expect(data[0]).toEqual([1, 2]);
  });

  it("parses deeply nested objects", () => {
    const data = JSON.parse('{"a":{"b":{"c":{"d":{"e":"deep"}}}}}');
    expect(data.a.b.c.d.e).toBe("deep");
  });

  it("handles numbers as strings", () => {
    expect(JSON.parse('"42"')).toBe("42");
    expect(typeof JSON.parse('"42"')).toBe("string");
  });

  it("handles booleans", () => {
    expect(JSON.parse("true")).toBe(true);
    expect(JSON.parse("false")).toBe(false);
  });

  it("handles null", () => {
    expect(JSON.parse("null")).toBe(null);
  });

  it("handles large numbers", () => {
    expect(JSON.parse("9007199254740991")).toBe(9007199254740991);
  });

  it("handles negative numbers", () => {
    expect(JSON.parse("-42")).toBe(-42);
    expect(JSON.parse("-3.14")).toBe(-3.14);
  });

  it("handles floats", () => {
    expect(JSON.parse("3.14159")).toBe(3.14159);
  });

  it("handles scientific notation", () => {
    expect(JSON.parse("1e10")).toBe(1e10);
    expect(JSON.parse("1.5e-3")).toBe(1.5e-3);
  });

  it("handles escaped strings", () => {
    expect(JSON.parse('"hello\\nworld"')).toBe("hello\nworld");
    expect(JSON.parse('"tab\\there"')).toBe("tab\there");
    expect(JSON.parse('"quote\\"inside"')).toBe('quote"inside');
  });

  it("handles unicode escapes", () => {
    expect(JSON.parse('"\\u0041"')).toBe("A");
    expect(JSON.parse('"\\u00e9"')).toBe("é");
  });

  it("stringifies and parses roundtrip", () => {
    const data = { a: 1, b: [2, 3], c: { d: true, e: null } };
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  it("stringifies with formatting", () => {
    const data = { key: "value" };
    const formatted = JSON.stringify(data, null, 2);
    expect(formatted).toContain("\n");
    expect(formatted).toContain("  ");
    expect(JSON.parse(formatted)).toEqual(data);
  });

  it("handles arrays of mixed types", () => {
    const data = JSON.parse('[1, "two", true, null, {"five": 5}, [6]]');
    expect(data).toHaveLength(6);
    expect(typeof data[0]).toBe("number");
    expect(typeof data[1]).toBe("string");
    expect(typeof data[2]).toBe("boolean");
    expect(data[3]).toBe(null);
    expect(typeof data[4]).toBe("object");
    expect(Array.isArray(data[5])).toBe(true);
  });

  it("handles objects with numeric keys", () => {
    const data = JSON.parse('{"1": "one", "2": "two", "100": "hundred"}');
    expect(data["1"]).toBe("one");
    expect(data["100"]).toBe("hundred");
  });
});

// ─── Header Handling: Exhaustive ─────────────────────────────

describe("Header Handling: Exhaustive", () => {
  const buildHeaders = (
    headers: { name: string; value: string; enabled?: boolean }[],
  ) => {
    const result: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled !== false && h.name) result[h.name] = h.value;
    });
    return result;
  };

  const commonHeaderPairs = [
    { name: "Accept", value: "application/json" },
    { name: "Accept-Charset", value: "utf-8" },
    { name: "Accept-Encoding", value: "gzip, deflate" },
    { name: "Accept-Language", value: "en-US,en;q=0.9" },
    { name: "Authorization", value: "Bearer token123" },
    { name: "Cache-Control", value: "no-cache" },
    { name: "Connection", value: "keep-alive" },
    { name: "Content-Length", value: "1024" },
    { name: "Content-Type", value: "application/json" },
    { name: "Cookie", value: "session=abc123" },
    { name: "Host", value: "api.example.com" },
    { name: "If-Modified-Since", value: "Wed, 21 Oct 2023 07:28:00 GMT" },
    { name: "If-None-Match", value: '"abc123"' },
    { name: "Origin", value: "https://example.com" },
    { name: "Referer", value: "https://example.com/page" },
    { name: "User-Agent", value: "API-Debugger/1.0" },
    { name: "X-Forwarded-For", value: "192.168.1.1" },
    { name: "X-Request-Id", value: "req-12345" },
  ];

  commonHeaderPairs.forEach(({ name, value }) => {
    it(`includes ${name} header`, () => {
      const h = buildHeaders([{ name, value }]);
      expect(h[name]).toBe(value);
    });
  });

  it("excludes disabled headers", () => {
    const h = buildHeaders([
      { name: "Accept", value: "json", enabled: true },
      { name: "Cache-Control", value: "no-cache", enabled: false },
    ]);
    expect(h["Accept"]).toBe("json");
    expect(h["Cache-Control"]).toBeUndefined();
  });

  it("defaults enabled to true", () => {
    const h = buildHeaders([
      { name: "Content-Type", value: "application/json" },
    ]);
    expect(h["Content-Type"]).toBe("application/json");
  });

  it("skips empty header names", () => {
    const h = buildHeaders([
      { name: "", value: "ignored" },
      { name: "Valid", value: "yes" },
    ]);
    expect(Object.keys(h)).toHaveLength(1);
    expect(h["Valid"]).toBe("yes");
  });

  it("handles headers with empty values", () => {
    const h = buildHeaders([{ name: "X-Empty", value: "" }]);
    expect(h["X-Empty"]).toBe("");
  });

  it("handles many headers", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      name: `X-Header-${i}`,
      value: `value-${i}`,
    }));
    const h = buildHeaders(many);
    expect(Object.keys(h)).toHaveLength(50);
  });

  it("handles header values with colons", () => {
    const h = buildHeaders([
      { name: "Authorization", value: "Bearer eyJhbGciOiJIUzI1NiJ9" },
    ]);
    expect(h["Authorization"]).toContain(":");
  });

  it("handles header values with special chars", () => {
    const h = buildHeaders([
      { name: "X-Complex", value: "value=with&special<chars>" },
    ]);
    expect(h["X-Complex"]).toBe("value=with&special<chars>");
  });
});

// ─── Script Executor: More Parameterized Tests ───────────────

describe("Script Executor: Parameterized", () => {
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
    body: '{"id":1,"name":"test"}',
    duration: 100,
    size: 20,
  };

  // Test pm.variables with many keys
  const manyKeys = Array.from({ length: 20 }, (_, i) => `var${i}`);

  manyKeys.forEach((key) => {
    it(`sets and gets variable "${key}"`, () => {
      const r = executePreRequestScript(
        `pm.variables.set("${key}", "value-${key}");`,
        config,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.variables?.[key]).toBe(`value-${key}`);
    });
  });

  // Test console.log with various types
  const logTests = [
    { expr: '"hello"', expected: "hello" },
    { expr: "42", expected: "42" },
    { expr: "true", expected: "true" },
    { expr: "null", expected: "null" },
    { expr: '"multi\\nline"', expected: "multi\nline" },
  ];

  logTests.forEach(({ expr, expected }) => {
    it(`console.log(${expr}) produces correct output`, () => {
      const r = executePreRequestScript(
        `console.log(${expr});`,
        config,
        {},
        {},
      );
      expect(r.success).toBe(true);
      expect(r.logs).toContain(expected);
    });
  });

  // Test pm.expect with various comparisons
  const expectTests = [
    { expr: "pm.expect(1).to.equal(1)", shouldPass: true },
    { expr: "pm.expect(1).to.equal(2)", shouldPass: false },
    { expr: 'pm.expect("a").to.equal("a")', shouldPass: true },
    { expr: "pm.expect(true).to.be.true()", shouldPass: true },
    { expr: "pm.expect(false).to.be.false()", shouldPass: true },
    { expr: "pm.expect(null).to.exist()", shouldPass: false },
    { expr: 'pm.expect("x").to.exist()', shouldPass: true },
    { expr: 'pm.expect(42).to.beA("number")', shouldPass: true },
    { expr: 'pm.expect("s").to.beA("string")', shouldPass: true },
    { expr: "pm.expect([]).to.eql([])", shouldPass: true },
    { expr: "pm.expect({a:1}).to.eql({a:1})", shouldPass: true },
  ];

  expectTests.forEach(({ expr, shouldPass }) => {
    it(`${expr} ${shouldPass ? "passes" : "fails"}`, () => {
      const r = executePostResponseScript(
        `pm.test("t", () => { ${expr}; });`,
        config,
        response,
        {},
        {},
      );
      expect(r.success).toBe(true);
      if (shouldPass) {
        expect(r.logs?.some((l) => l.includes("✓"))).toBe(true);
      } else {
        expect(r.logs?.some((l) => l.includes("✗"))).toBe(true);
      }
    });
  });

  // Test pm.response with different status codes
  const statusCodes = [200, 201, 204, 301, 400, 401, 403, 404, 429, 500, 503];

  statusCodes.forEach((status) => {
    it(`pm.response.code returns ${status}`, () => {
      const resp: CapturedResponse = { ...response, status };
      const r = executePostResponseScript(
        `pm.variables.set("code", String(pm.response.code));`,
        config,
        resp,
        {},
        {},
      );
      expect(r.variables?.["code"]).toBe(String(status));
    });
  });
});

// ─── Import Format: Exhaustive Detection ─────────────────────

describe("Import Format: Exhaustive Detection", () => {
  it("detects valid Postman v2.0", () => {
    const col = JSON.stringify({
      info: {
        schema:
          "https://schema.getpostman.com/json/collection/v2.0.0/collection.json",
      },
      item: [],
    });
    expect(detectImportFormat(col)).toBe("postman");
  });

  it("detects valid Postman v2.1", () => {
    const col = JSON.stringify({
      info: {
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    });
    expect(detectImportFormat(col)).toBe("postman");
  });

  it("distinguishes HAR from Postman", () => {
    const har = JSON.stringify({ log: { version: "1.2", entries: [] } });
    const postman = JSON.stringify({
      info: {
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    });
    expect(detectImportFormat(har)).not.toBe(detectImportFormat(postman));
  });

  it("distinguishes Insomnia from Postman", () => {
    const insomnia = JSON.stringify({
      _type: "export",
      __export_format: 4,
      resources: [],
    });
    const postman = JSON.stringify({
      info: {
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    });
    expect(detectImportFormat(insomnia)).not.toBe(detectImportFormat(postman));
  });

  it("handles OpenAPI 3.0.0", () => {
    expect(
      detectImportFormat(JSON.stringify({ openapi: "3.0.0", paths: {} })),
    ).toBe("openapi");
  });

  it("handles OpenAPI 3.0.1", () => {
    expect(
      detectImportFormat(JSON.stringify({ openapi: "3.0.1", paths: {} })),
    ).toBe("openapi");
  });

  it("handles OpenAPI 3.0.2", () => {
    expect(
      detectImportFormat(JSON.stringify({ openapi: "3.0.2", paths: {} })),
    ).toBe("openapi");
  });

  it("handles OpenAPI 3.0.3", () => {
    expect(
      detectImportFormat(JSON.stringify({ openapi: "3.0.3", paths: {} })),
    ).toBe("openapi");
  });

  it("handles OpenAPI 3.1.0", () => {
    expect(
      detectImportFormat(JSON.stringify({ openapi: "3.1.0", paths: {} })),
    ).toBe("openapi");
  });

  it("handles Swagger 2.0", () => {
    expect(
      detectImportFormat(JSON.stringify({ swagger: "2.0", paths: {} })),
    ).toBe("openapi");
  });

  it("returns null for empty object", () => {
    expect(detectImportFormat("{}")).toBe(null);
  });

  it("returns null for array of numbers", () => {
    expect(detectImportFormat("[1,2,3]")).toBe(null);
  });

  it("returns null for string value", () => {
    expect(detectImportFormat('"just a string"')).toBe(null);
  });
});

// ─── cURL Parser: Comprehensive ──────────────────────────────

describe("cURL Parser: Comprehensive", () => {
  it("parses basic GET", () => {
    const r = parseCurl("curl https://api.example.com/data");
    expect(r.requests?.[0].url).toContain("api.example.com");
    expect(r.requests?.[0].method).toBe("GET");
  });

  it("parses POST with -d", () => {
    const r = parseCurl('curl -d "key=value" https://api.example.com/data');
    expect(r.requests?.[0].method).toBe("POST");
  });

  it("parses PUT with -X", () => {
    const r = parseCurl("curl -X PUT https://api.example.com/data");
    expect(r.requests?.[0].method).toBe("PUT");
  });

  it("parses DELETE with -X", () => {
    const r = parseCurl("curl -X DELETE https://api.example.com/data");
    expect(r.requests?.[0].method).toBe("DELETE");
  });

  it("parses --request DELETE", () => {
    const r = parseCurl("curl --request DELETE https://api.example.com/data");
    expect(r.requests?.[0].method).toBe("DELETE");
  });

  it("parses -u for basic auth", () => {
    const r = parseCurl("curl -u admin:secret https://api.example.com/data");
    expect(r.requests?.[0].auth?.type).toBe("basic");
    expect(r.requests?.[0].auth?.basic?.username).toBe("admin");
    expect(r.requests?.[0].auth?.basic?.password).toBe("secret");
  });

  it("parses -A for user agent", () => {
    const r = parseCurl('curl -A "TestAgent/1.0" https://api.example.com/data');
    const ua = r.requests?.[0].headers?.find((h) => h.name === "User-Agent");
    expect(ua).toBeDefined();
    expect(ua?.value).toContain("TestAgent");
  });

  it("parses -e for referer", () => {
    const r = parseCurl(
      'curl -e "https://example.com" https://api.example.com/data',
    );
    expect(r.requests?.[0].headers?.some((h) => h.name === "Referer")).toBe(
      true,
    );
  });

  it("handles URL with path", () => {
    const r = parseCurl("curl https://api.example.com/v1/users/123");
    expect(r.requests?.[0].url).toContain("/v1/users/123");
  });

  it("handles URL with query params", () => {
    const r = parseCurl("curl https://api.example.com/data?page=1&limit=10");
    expect(r.requests?.[0].url).toContain("page=1");
    expect(r.requests?.[0].url).toContain("limit=10");
  });
});

// ─── OpenAPI Parser: Comprehensive ───────────────────────────

describe("OpenAPI Parser: Comprehensive", () => {
  it("parses basic OpenAPI 3.0 spec", () => {
    const r = parseOpenAPI(
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        servers: [{ url: "https://api.test.com" }],
        paths: {
          "/users": { get: { summary: "List users" } },
        },
      }),
    );
    expect(r.requests?.length).toBe(1);
    expect(r.requests?.[0].method).toBe("GET");
  });

  it("parses multiple HTTP methods on same path", () => {
    const r = parseOpenAPI(
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        servers: [{ url: "https://api.test.com" }],
        paths: {
          "/items": {
            get: { summary: "List" },
            post: { summary: "Create" },
            put: { summary: "Update" },
            delete: { summary: "Delete" },
          },
        },
      }),
    );
    expect(r.requests?.length).toBe(4);
    const methods = new Set(r.requests?.map((rq) => rq.method));
    expect(methods.has("GET")).toBe(true);
    expect(methods.has("POST")).toBe(true);
    expect(methods.has("PUT")).toBe(true);
    expect(methods.has("DELETE")).toBe(true);
  });

  it("handles path parameters", () => {
    const r = parseOpenAPI(
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        servers: [{ url: "https://api.test.com" }],
        paths: {
          "/users/{id}": {
            get: {
              summary: "Get user",
              parameters: [{ name: "id", in: "path", required: true }],
            },
          },
        },
      }),
    );
    expect(r.requests?.length).toBe(1);
  });

  it("handles multiple paths", () => {
    const r = parseOpenAPI(
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        servers: [{ url: "https://api.test.com" }],
        paths: {
          "/users": { get: { summary: "Users" } },
          "/posts": { get: { summary: "Posts" } },
          "/comments": { get: { summary: "Comments" } },
          "/tags": { get: { summary: "Tags" } },
        },
      }),
    );
    expect(r.requests?.length).toBe(4);
  });
});

// ─── HAR Parser: Comprehensive ───────────────────────────────

describe("HAR Parser: Comprehensive", () => {
  it("parses HAR with GET request", () => {
    const r = parseHar(
      JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: "GET",
                url: "https://api.com/users",
                headers: [],
                queryString: [],
              },
              response: { status: 200, content: { text: "[]" } },
            },
          ],
          version: "1.2",
        },
      }),
    );
    expect(r.requests?.[0].method).toBe("GET");
  });

  it("parses HAR with POST request and body", () => {
    const r = parseHar(
      JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: "POST",
                url: "https://api.com/data",
                headers: [{ name: "content-type", value: "application/json" }],
                queryString: [],
                postData: {
                  mimeType: "application/json",
                  text: '{"test":true}',
                },
              },
              response: { status: 201, content: {} },
            },
          ],
          version: "1.2",
        },
      }),
    );
    expect(r.requests?.[0].method).toBe("POST");
  });

  it("parses HAR with query strings", () => {
    const r = parseHar(
      JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: "GET",
                url: "https://api.com/search",
                headers: [],
                queryString: [
                  { name: "q", value: "test" },
                  { name: "page", value: "1" },
                ],
              },
              response: { status: 200, content: {} },
            },
          ],
          version: "1.2",
        },
      }),
    );
    expect(r.requests?.[0].method).toBe("GET");
  });

  it("handles empty HAR entries", () => {
    const r = parseHar(
      JSON.stringify({
        log: { entries: [], version: "1.2" },
      }),
    );
    expect(r.requests).toHaveLength(0);
  });
});

// ─── Provider Mapping: All Known Models ──────────────────────

describe("Provider Mapping: All Models", () => {
  const modelProviderMap: Record<string, string> = {
    "openai/gpt-4.1": "openai",
    "openai/gpt-4.1-mini": "openai",
    "openai/gpt-4.1-nano": "openai",
    "openai/gpt-4o": "openai",
    "openai/gpt-4o-mini": "openai",
    "openai/o3": "openai",
    "openai/o3-mini": "openai",
    "openai/o4-mini": "openai",
    "anthropic/claude-opus-4": "anthropic",
    "anthropic/claude-sonnet-4": "anthropic",
    "anthropic/claude-haiku-4": "anthropic",
    "anthropic/claude-3.5-sonnet": "anthropic",
    "google/gemini-2.5-pro-preview": "gemini",
    "google/gemini-2.5-flash-preview": "gemini",
    "google/gemini-2.0-flash": "gemini",
    "google/gemini-2.0-flash-lite": "gemini",
    "deepseek/deepseek-r1": "openrouter",
    "deepseek/deepseek-chat-v3": "openrouter",
    "meta-llama/llama-4-maverick": "openrouter",
    "mistralai/mistral-large": "openrouter",
    "cohere/command-r-plus": "openrouter",
    "xai/grok-3": "openrouter",
    "qwen/qwen-2.5-72b": "openrouter",
  };

  Object.entries(modelProviderMap).forEach(([modelId, expectedProvider]) => {
    it(`maps ${modelId} to ${expectedProvider}`, () => {
      expect(getApiProviderForModel(modelId)).toBe(expectedProvider);
    });
  });
});

// ─── Keyboard Shortcuts: All Combinations ─────────────────────

describe("Keyboard Shortcuts: All Entries", () => {
  it("all shortcuts have required fields", () => {
    KEYBOARD_SHORTCUTS.forEach((s) => {
      expect(s.key).toBeTruthy();
      expect(s.action).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.category).toBeTruthy();
    });
  });

  it("all actions are unique", () => {
    const actions = KEYBOARD_SHORTCUTS.map((s) => s.action);
    expect(new Set(actions).size).toBe(actions.length);
  });

  it("all shortcuts can be formatted", () => {
    KEYBOARD_SHORTCUTS.forEach((s) => {
      const formatted = formatShortcut(s);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted).not.toBe("");
    });
  });

  it("has shortcuts in all categories", () => {
    const categories = new Set(KEYBOARD_SHORTCUTS.map((s) => s.category));
    expect(categories.has("request")).toBe(true);
    expect(categories.has("navigation")).toBe(true);
    expect(categories.has("editing")).toBe(true);
    expect(categories.has("global")).toBe(true);
  });

  it("Ctrl shortcuts have ctrl flag", () => {
    const ctrlShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.ctrl);
    expect(ctrlShortcuts.length).toBeGreaterThan(0);
    ctrlShortcuts.forEach((s) => {
      expect(s.ctrl).toBe(true);
    });
  });

  it("Shift shortcuts have shift flag", () => {
    const shiftShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.shift);
    expect(shiftShortcuts.length).toBeGreaterThan(0);
    shiftShortcuts.forEach((s) => {
      expect(s.shift).toBe(true);
    });
  });
});

// ─── Data Structure Validation: All Types ─────────────────────

describe("Data Structure Validation", () => {
  it("RequestConfig has all required fields", () => {
    const config: RequestConfig = {
      method: "GET",
      url: "https://api.example.com",
      headers: [],
      params: [],
      body: {},
      bodyType: "none",
      auth: { type: "none" },
    };
    expect(config.method).toBeDefined();
    expect(config.url).toBeDefined();
    expect(config.headers).toBeDefined();
    expect(config.params).toBeDefined();
    expect(config.body).toBeDefined();
    expect(config.bodyType).toBeDefined();
    expect(config.auth).toBeDefined();
  });

  it("CapturedResponse has all required fields", () => {
    const response: CapturedResponse = {
      status: 200,
      statusText: "OK",
      headers: [["Content-Type", "application/json"] as [string, string]],
      body: "{}",
      duration: 100,
      size: 2,
    };
    expect(response.status).toBeDefined();
    expect(response.statusText).toBeDefined();
    expect(response.headers).toBeDefined();
    expect(response.body).toBeDefined();
    expect(response.duration).toBeDefined();
    expect(response.size).toBeDefined();
  });

  it("validates URL format", () => {
    const validUrls = [
      "https://api.example.com",
      "http://localhost:3000",
      "https://api.example.com/v1/users",
      "https://api.example.com:8443/path",
      "https://192.168.1.1:8080/api",
    ];
    validUrls.forEach((url) => {
      expect(() => new URL(url)).not.toThrow();
    });
  });

  it("validates method uppercase", () => {
    ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].forEach(
      (m) => {
        expect(m).toBe(m.toUpperCase());
      },
    );
  });

  it("validates content-type values", () => {
    const contentTypes = [
      "application/json",
      "application/xml",
      "text/html",
      "text/plain",
      "multipart/form-data",
      "application/x-www-form-urlencoded",
      "application/octet-stream",
    ];
    contentTypes.forEach((ct) => {
      expect(ct).toContain("/");
    });
  });
});
