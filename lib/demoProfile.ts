/**
 * Demo Profile - Pre-populated showcase collection
 *
 * Loaded on first launch so the extension never feels empty.
 * Uses only public APIs - no keys required.
 * 21 requests across 4 collections demonstrating every feature.
 */

import type {
  Collection,
  SavedRequest,
  Environment,
  RequestRecord,
  RequestConfig,
} from "@/types";

const NOW = Date.now();
let counter = 0;

function makeId(prefix: string): string {
  return `${prefix}-${++counter}`;
}

function stub(url: string, method: string): RequestRecord {
  return {
    id: makeId("stub"),
    url,
    method,
    statusCode: 0,
    tabId: 0,
    startTime: NOW,
    timeStamp: NOW,
    duration: 0,
    requestHeaders: [],
    requestBody: null,
    requestBodyText: null,
    responseHeaders: [],
  };
}

function req(
  id: string,
  name: string,
  collectionId: string,
  config: Omit<RequestConfig, "id" | "name">,
): SavedRequest {
  return {
    id,
    name,
    collectionId,
    request: stub(config.url, config.method),
    requestConfig: { ...config, id, name },
    tags: [],
    createdAt: NOW,
  };
}

function env(
  id: string,
  name: string,
  isActive: boolean,
  variables: Environment["variables"],
): Environment {
  return { id, name, isActive, variables, createdAt: NOW, updatedAt: NOW };
}

export function createDemoCollections(): {
  collections: Collection[];
  requests: SavedRequest[];
  environments: Environment[];
} {
  const colRest = "demo-col-rest";
  const colScripts = "demo-col-scripts";
  const colAuth = "demo-col-auth";
  const colAdvanced = "demo-col-advanced";

  const collections: Collection[] = [
    {
      id: colRest,
      name: "🌐 REST APIs",
      description: "All HTTP methods with public APIs",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      requestCount: 6,
    },
    {
      id: colAuth,
      name: "🔐 Authentication",
      description: "Different auth methods demonstrated",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      requestCount: 4,
    },
    {
      id: colScripts,
      name: "⚡ Scripts & Variables",
      description: "Pre-request and post-response scripting",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      requestCount: 4,
    },
    {
      id: colAdvanced,
      name: "🚀 Advanced Features",
      description: "Headers, params, body types, edge cases",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      requestCount: 12,
    },
  ];

  const requests: SavedRequest[] = [
    // ─── REST APIs Collection ─────────────────────────────────
    req("demo-req-get-posts", "Get Posts", colRest, {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/posts",
      headers: [{ name: "Accept", value: "application/json", enabled: true }],
      params: [
        { name: "_limit", value: "5", enabled: true },
        { name: "_sort", value: "id", enabled: true },
      ],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-create-post", "Create Post", colRest, {
      method: "POST",
      url: "https://jsonplaceholder.typicode.com/posts",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
        { name: "Accept", value: "application/json", enabled: true },
      ],
      params: [],
      body: {
        raw: JSON.stringify(
          {
            title: "Hello from API Debugger",
            body: "This is a test post created with API Debugger",
            userId: 1,
          },
          null,
          2,
        ),
      },
      bodyType: "json",
      auth: { type: "none" },
    }),
    req("demo-req-update-post", "Update Post", colRest, {
      method: "PUT",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
      ],
      params: [],
      body: {
        raw: JSON.stringify(
          {
            id: 1,
            title: "Updated Title",
            body: "Updated body content",
            userId: 1,
          },
          null,
          2,
        ),
      },
      bodyType: "json",
      auth: { type: "none" },
    }),
    req("demo-req-patch-post", "Patch Post", colRest, {
      method: "PATCH",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
      ],
      params: [],
      body: { raw: JSON.stringify({ title: "Patched title only" }, null, 2) },
      bodyType: "json",
      auth: { type: "none" },
    }),
    req("demo-req-delete-post", "Delete Post", colRest, {
      method: "DELETE",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-user", "Get User by ID", colRest, {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/users/{{userId}}",
      headers: [{ name: "Accept", value: "application/json", enabled: true }],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),

    // ─── Authentication Collection ────────────────────────────
    req("demo-req-bearer", "Bearer Token", colAuth, {
      method: "GET",
      url: "https://httpbin.org/bearer",
      headers: [
        {
          name: "Authorization",
          value: "Bearer demo-token-123",
          enabled: true,
        },
      ],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-basic", "Basic Auth", colAuth, {
      method: "GET",
      url: "https://httpbin.org/basic-auth/user/pass",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: {
        type: "basic",
        basic: { username: "user", password: "pass" },
      },
    }),
    req("demo-req-apikey", "API Key in Header", colAuth, {
      method: "GET",
      url: "https://httpbin.org/get",
      headers: [{ name: "X-API-Key", value: "demo-key-123", enabled: true }],
      params: [{ name: "source", value: "api-debugger", enabled: true }],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-apikey-query", "API Key in Query", colAuth, {
      method: "GET",
      url: "https://httpbin.org/get",
      headers: [],
      params: [
        { name: "api_key", value: "demo-key-456", enabled: true },
        { name: "format", value: "json", enabled: true },
      ],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),

    // ─── Scripts Collection ───────────────────────────────────
    req("demo-req-scripts", "Set & Use Variables", colScripts, {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/users/{{userId}}",
      headers: [{ name: "Accept", value: "application/json", enabled: true }],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
      preRequestScript: [
        "// Set variables before request",
        'pm.variables.set("userId", "1");',
        'pm.variables.set("timestamp", new Date().toISOString());',
        'console.log("Fetching user:", pm.variables.get("userId"));',
      ].join("\n"),
      postResponseScript: [
        "// Extract data from response",
        "const response = pm.response.json();",
        'pm.variables.set("userName", response.name);',
        'pm.variables.set("userEmail", response.email);',
        'console.log("Got user:", response.name);',
        'pm.test("Status is 200", () => {',
        "  pm.expect(pm.response.status).to.equal(200);",
        "});",
      ].join("\n"),
    }),
    req("demo-req-chained", "Chained Request (uses vars)", colScripts, {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/posts?userId={{userId}}",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-assertions", "Test Assertions", colScripts, {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
      postResponseScript: [
        "// Test the response",
        'pm.test("Status is 200", () => {',
        "  pm.expect(pm.response.status).to.equal(200);",
        "});",
        'pm.test("Has title", () => {',
        "  const data = pm.response.json();",
        '  pm.expect(data.title).to.be.a("string");',
        "});",
        'pm.test("Has userId", () => {',
        "  const data = pm.response.json();",
        '  pm.expect(data.userId).to.be.a("number");',
        "});",
      ].join("\n"),
    }),
    req("demo-req-script-error", "Script Error Handling", colScripts, {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/posts/99999",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
      postResponseScript: [
        "// Handle both success and error responses",
        "try {",
        "  const data = pm.response.json();",
        '  pm.test("Has title", () => {',
        "    pm.expect(data.title).to.be.a('string');",
        "  });",
        "} catch (e) {",
        '  pm.test("Handles error gracefully", () => {',
        "    pm.expect(pm.response.status).to.be.a('number');",
        "  });",
        "}",
        'pm.test("Status is valid HTTP code", () => {',
        "  pm.expect(pm.response.status >= 200).to.equal(true);",
        "  pm.expect(pm.response.status < 600).to.equal(true);",
        "});",
      ].join("\n"),
    }),

    // ─── Advanced Features Collection ─────────────────────────
    req("demo-req-headers", "Multiple Headers", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/headers",
      headers: [
        { name: "X-Request-Id", value: "req-123", enabled: true },
        {
          name: "X-Custom-Header",
          value: "Hello from API Debugger",
          enabled: true,
        },
        { name: "Accept-Language", value: "en-US,en;q=0.9", enabled: true },
        { name: "Cache-Control", value: "no-cache", enabled: true },
      ],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-toggle-header", "Toggle Headers Demo", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/headers",
      headers: [
        { name: "X-Always-Enabled", value: "I will be sent", enabled: true },
        {
          name: "X-Toggle-Me",
          value: "Disable me before sending!",
          enabled: true,
        },
        {
          name: "X-Disabled",
          value: "I start disabled",
          enabled: false,
        },
      ],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-cookies", "Cookie Handling", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/cookies/set",
      headers: [{ name: "Accept", value: "application/json", enabled: true }],
      params: [
        { name: "session", value: "abc123", enabled: true },
        { name: "theme", value: "dark", enabled: true },
      ],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-formdata", "Form Data POST", colAdvanced, {
      method: "POST",
      url: "https://httpbin.org/post",
      headers: [],
      params: [],
      body: {
        formData: [
          { name: "username", value: "demo", type: "text" },
          { name: "email", value: "demo@example.com", type: "text" },
        ],
      },
      bodyType: "form-data",
      auth: { type: "none" },
    }),
    req("demo-req-urlencoded", "URL Encoded POST", colAdvanced, {
      method: "POST",
      url: "https://httpbin.org/post",
      headers: [
        {
          name: "Content-Type",
          value: "application/x-www-form-urlencoded",
          enabled: true,
        },
      ],
      params: [],
      body: {
        urlEncoded: [
          { name: "field1", value: "value1" },
          { name: "field2", value: "value with spaces" },
        ],
      },
      bodyType: "x-www-form-urlencoded",
      auth: { type: "none" },
    }),
    req("demo-req-params", "Query Params Demo", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/get",
      headers: [],
      params: [
        { name: "page", value: "1", enabled: true },
        { name: "limit", value: "10", enabled: true },
        { name: "sort", value: "desc", enabled: true },
        { name: "filter", value: "active", enabled: true },
      ],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-status-codes", "Status Code Testing", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/status/418",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
      postResponseScript: [
        "// httpbin.org/status/{code} returns that status code",
        "// Try changing 418 to: 200, 201, 301, 400, 401, 403, 404, 500, 502",
        'pm.test("Got expected status", () => {',
        "  pm.expect(pm.response.status).to.equal(418);",
        "});",
        'pm.test("I\'m a teapot ☕", () => {',
        "  pm.expect(pm.response.status).to.equal(418);",
        "});",
      ].join("\n"),
    }),
    req("demo-req-redirect", "Redirect Chain", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/redirect-to",
      headers: [],
      params: [
        { name: "url", value: "https://httpbin.org/get", enabled: true },
        { name: "status_code", value: "302", enabled: true },
      ],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-delay", "Slow Response (2s delay)", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/delay/2",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-gzip", "Compressed Response", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/gzip",
      headers: [
        { name: "Accept-Encoding", value: "gzip, deflate", enabled: true },
      ],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-html", "HTML Response", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/html",
      headers: [{ name: "Accept", value: "text/html", enabled: true }],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
    req("demo-req-xml", "XML Response", colAdvanced, {
      method: "GET",
      url: "https://httpbin.org/xml",
      headers: [{ name: "Accept", value: "application/xml", enabled: true }],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    }),
  ];

  const environments: Environment[] = [
    env("demo-env-dev", "🔧 Development", true, [
      {
        key: "baseUrl",
        value: "https://jsonplaceholder.typicode.com",
        enabled: true,
      },
      { key: "apiKey", value: "dev-key-123", enabled: true },
      { key: "userId", value: "1", enabled: true },
    ]),
    env("demo-env-prod", "🌍 Production", false, [
      { key: "baseUrl", value: "https://api.example.com", enabled: true },
      { key: "apiKey", value: "prod-key-***", enabled: true },
      { key: "userId", value: "1", enabled: true },
    ]),
    env("demo-env-test", "🧪 Testing", false, [
      { key: "baseUrl", value: "https://httpbin.org", enabled: true },
      { key: "testMode", value: "true", enabled: true },
    ]),
  ];

  return { collections, requests, environments };
}
