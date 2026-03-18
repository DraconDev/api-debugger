import { describe, it, expect } from "vitest";
import type { RequestConfig } from "@/types";

// ─── Code Generation: cURL ──────────────────────────────────

function generateCurl(config: RequestConfig): string {
  const parts = ["curl"];
  if (config.method !== "GET") parts.push(`-X ${config.method}`);
  parts.push(`'${config.url}'`);
  config.headers
    .filter((h) => h.enabled !== false)
    .forEach((h) => {
      parts.push(`-H '${h.name}: ${h.value}'`);
    });
  if (config.auth.type === "bearer" && config.auth.bearer?.token) {
    parts.push(`-H 'Authorization: Bearer ${config.auth.bearer.token}'`);
  } else if (config.auth.type === "basic" && config.auth.basic) {
    parts.push(
      `-u '${config.auth.basic.username}:${config.auth.basic.password}'`,
    );
  }
  if (config.bodyType === "json" && config.body.raw) {
    parts.push(`--data '${config.body.raw}'`);
  } else if (config.bodyType === "raw" && config.body.raw) {
    parts.push(`--data '${config.body.raw}'`);
  }
  return parts.join(" \\\n  ");
}

describe("Code Generation: cURL", () => {
  it("generates basic GET", () => {
    const curl = generateCurl({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(curl).toContain("curl");
    expect(curl).toContain("https://api.example.com/data");
    expect(curl).not.toContain("-X");
  });

  it("generates POST with method flag", () => {
    const curl = generateCurl({
      method: "POST",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(curl).toContain("-X POST");
  });

  it("includes headers", () => {
    const curl = generateCurl({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [
        { name: "Accept", value: "application/json", enabled: true },
        { name: "User-Agent", value: "Test/1.0", enabled: true },
      ],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(curl).toContain("Accept: application/json");
    expect(curl).toContain("User-Agent: Test/1.0");
  });

  it("includes bearer auth", () => {
    const curl = generateCurl({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "bearer", bearer: { token: "my-token" } },
    });
    expect(curl).toContain("Authorization: Bearer my-token");
  });

  it("includes basic auth", () => {
    const curl = generateCurl({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "basic", basic: { username: "user", password: "pass" } },
    });
    expect(curl).toContain("-u 'user:pass'");
  });

  it("includes JSON body", () => {
    const curl = generateCurl({
      method: "POST",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: '{"key":"value"}' },
      bodyType: "json",
      auth: { type: "none" },
    });
    expect(curl).toContain("--data");
    expect(curl).toContain("key");
  });

  it("excludes disabled headers", () => {
    const curl = generateCurl({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [
        { name: "Accept", value: "json", enabled: true },
        { name: "Disabled", value: "nope", enabled: false },
      ],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(curl).toContain("Accept");
    expect(curl).not.toContain("Disabled");
  });

  it("generates DELETE", () => {
    const curl = generateCurl({
      method: "DELETE",
      url: "https://api.example.com/items/1",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(curl).toContain("-X DELETE");
    expect(curl).toContain("/items/1");
  });

  it("generates PUT with body", () => {
    const curl = generateCurl({
      method: "PUT",
      url: "https://api.example.com/items/1",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
      ],
      params: [],
      body: { raw: '{"name":"updated"}' },
      bodyType: "json",
      auth: { type: "none" },
    });
    expect(curl).toContain("-X PUT");
    expect(curl).toContain("updated");
  });

  it("generates PATCH", () => {
    const curl = generateCurl({
      method: "PATCH",
      url: "https://api.example.com/items/1",
      headers: [],
      params: [],
      body: { raw: '{"field":"new"}' },
      bodyType: "json",
      auth: { type: "none" },
    });
    expect(curl).toContain("-X PATCH");
  });
});

// ─── Code Generation: Fetch ──────────────────────────────────

function generateFetch(config: RequestConfig): string {
  const parts: string[] = [];
  const headers: Record<string, string> = {};
  config.headers
    .filter((h) => h.enabled !== false)
    .forEach((h) => {
      headers[h.name] = h.value;
    });
  if (config.auth.type === "bearer" && config.auth.bearer?.token) {
    headers["Authorization"] = `Bearer ${config.auth.bearer.token}`;
  }
  parts.push(`fetch('${config.url}', {`);
  parts.push(`  method: '${config.method}',`);
  if (Object.keys(headers).length > 0) {
    parts.push(`  headers: ${JSON.stringify(headers, null, 4)},`);
  }
  if (config.bodyType !== "none" && config.body.raw) {
    parts.push(
      `  body: ${config.bodyType === "json" ? `JSON.stringify(${config.body.raw})` : `'${config.body.raw}'`},`,
    );
  }
  parts.push("});");
  return parts.join("\n");
}

describe("Code Generation: Fetch", () => {
  it("generates basic fetch", () => {
    const code = generateFetch({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(code).toContain("fetch(");
    expect(code).toContain("https://api.example.com/data");
    expect(code).toContain("method: 'GET'");
  });

  it("includes headers", () => {
    const code = generateFetch({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [{ name: "Accept", value: "application/json", enabled: true }],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(code).toContain("headers:");
    expect(code).toContain("application/json");
  });

  it("includes bearer auth in headers", () => {
    const code = generateFetch({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "bearer", bearer: { token: "tok" } },
    });
    expect(code).toContain("Authorization");
    expect(code).toContain("Bearer tok");
  });

  it("includes POST body", () => {
    const code = generateFetch({
      method: "POST",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: '{"key":"value"}' },
      bodyType: "json",
      auth: { type: "none" },
    });
    expect(code).toContain("body:");
    expect(code).toContain("JSON.stringify");
  });

  it("generates DELETE method", () => {
    const code = generateFetch({
      method: "DELETE",
      url: "https://api.example.com/items/1",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(code).toContain("method: 'DELETE'");
  });
});

// ─── Code Generation: Python ─────────────────────────────────

function generatePython(config: RequestConfig): string {
  const lines: string[] = [];
  lines.push("import requests");
  lines.push("");
  lines.push(`url = '${config.url}'`);
  if (config.headers.filter((h) => h.enabled !== false).length > 0) {
    lines.push("headers = {");
    config.headers
      .filter((h) => h.enabled !== false)
      .forEach((h) => {
        lines.push(`    '${h.name}': '${h.value}',`);
      });
    lines.push("}");
  }
  if (config.bodyType === "json" && config.body.raw) {
    lines.push(`data = ${config.body.raw}`);
  }
  const method = config.method.toLowerCase();
  lines.push("");
  lines.push(
    `response = requests.${method}(url${config.headers.filter((h) => h.enabled !== false).length > 0 ? ", headers=headers" : ""}${config.bodyType === "json" ? ", json=data" : ""})`,
  );
  lines.push("print(response.status_code)");
  lines.push("print(response.json())");
  return lines.join("\n");
}

describe("Code Generation: Python", () => {
  it("generates basic GET request", () => {
    const code = generatePython({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(code).toContain("import requests");
    expect(code).toContain("requests.get(url)");
    expect(code).toContain("response.status_code");
  });

  it("generates POST with JSON", () => {
    const code = generatePython({
      method: "POST",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      body: { raw: '{"key":"value"}' },
      bodyType: "json",
      auth: { type: "none" },
    });
    expect(code).toContain("requests.post");
    expect(code).toContain("json=data");
  });

  it("includes headers", () => {
    const code = generatePython({
      method: "GET",
      url: "https://api.example.com/data",
      headers: [{ name: "Accept", value: "application/json", enabled: true }],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(code).toContain("headers = {");
    expect(code).toContain("Accept");
  });

  it("generates DELETE", () => {
    const code = generatePython({
      method: "DELETE",
      url: "https://api.example.com/items/1",
      headers: [],
      params: [],
      body: { raw: "" },
      bodyType: "none",
      auth: { type: "none" },
    });
    expect(code).toContain("requests.delete");
  });

  it("generates PUT", () => {
    const code = generatePython({
      method: "PUT",
      url: "https://api.example.com/items/1",
      headers: [],
      params: [],
      body: { raw: '{"name":"new"}' },
      bodyType: "json",
      auth: { type: "none" },
    });
    expect(code).toContain("requests.put");
  });
});

// ─── Diff: LCS and Diff Computation ──────────────────────────

function computeLCS(left: string[], right: string[]): string[] {
  const m = left.length;
  const n = right.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: string[] = [];
  let i = m,
    j = n;
  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      result.unshift(left[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return result;
}

describe("Diff: LCS Computation", () => {
  it("returns all elements for identical arrays", () => {
    const lcs = computeLCS(["a", "b", "c"], ["a", "b", "c"]);
    expect(lcs).toEqual(["a", "b", "c"]);
  });

  it("returns empty for completely different arrays", () => {
    const lcs = computeLCS(["a", "b"], ["c", "d"]);
    expect(lcs).toEqual([]);
  });

  it("finds common subsequence", () => {
    const lcs = computeLCS(["a", "b", "c", "d"], ["a", "c", "d"]);
    expect(lcs).toEqual(["a", "c", "d"]);
  });

  it("handles empty left array", () => {
    const lcs = computeLCS([], ["a", "b"]);
    expect(lcs).toEqual([]);
  });

  it("handles empty right array", () => {
    const lcs = computeLCS(["a", "b"], []);
    expect(lcs).toEqual([]);
  });

  it("handles both empty", () => {
    const lcs = computeLCS([], []);
    expect(lcs).toEqual([]);
  });

  it("finds interleaved subsequence", () => {
    const lcs = computeLCS(["a", "x", "b", "y", "c"], ["a", "b", "c"]);
    expect(lcs).toEqual(["a", "b", "c"]);
  });

  it("handles single element", () => {
    const lcs = computeLCS(["a"], ["a"]);
    expect(lcs).toEqual(["a"]);
  });
});

// ─── Format Bytes ────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

describe("formatBytes", () => {
  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500.0 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });

  it("formats fractional values", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});

// ─── getValueByPath ──────────────────────────────────────────

function getValueByPath(obj: unknown, path: string): string | undefined {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current !== undefined ? String(current) : undefined;
}

describe("getValueByPath", () => {
  const data = {
    user: {
      name: "Alice",
      age: 30,
      address: {
        city: "NYC",
        zip: "10001",
      },
      tags: ["admin", "user"],
    },
    items: [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
    ],
  };

  it("accesses top-level field", () => {
    expect(getValueByPath(data, "user.name")).toBe("Alice");
  });

  it("accesses nested field", () => {
    expect(getValueByPath(data, "user.address.city")).toBe("NYC");
  });

  it("accesses deeply nested field", () => {
    expect(getValueByPath(data, "user.address.zip")).toBe("10001");
  });

  it("accesses array element by index", () => {
    expect(getValueByPath(data, "user.tags[0]")).toBe("admin");
    expect(getValueByPath(data, "user.tags[1]")).toBe("user");
  });

  it("accesses object in array", () => {
    expect(getValueByPath(data, "items[0].name")).toBe("Item 1");
    expect(getValueByPath(data, "items[1].id")).toBe("2");
  });

  it("returns undefined for missing path", () => {
    expect(getValueByPath(data, "user.nonexistent")).toBeUndefined();
  });

  it("returns undefined for out-of-bounds array", () => {
    expect(getValueByPath(data, "user.tags[10]")).toBeUndefined();
  });

  it("returns undefined for null path", () => {
    expect(getValueByPath(null, "any.path")).toBeUndefined();
  });

  it("converts number to string", () => {
    expect(getValueByPath(data, "user.age")).toBe("30");
  });

  it("handles single key", () => {
    expect(getValueByPath({ key: "value" }, "key")).toBe("value");
  });
});

// ─── Percentile Calculation ──────────────────────────────────

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

describe("percentile calculation", () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  it("p50 is median", () => {
    expect(percentile(values, 50)).toBe(50);
  });

  it("p0 is minimum", () => {
    expect(percentile(values, 0)).toBe(10);
  });

  it("p100 is maximum", () => {
    expect(percentile(values, 100)).toBe(100);
  });

  it("p90 is 90th percentile", () => {
    expect(percentile(values, 90)).toBe(90);
  });

  it("p95 is approximately 95th", () => {
    const p = percentile(values, 95);
    expect(p).toBeGreaterThanOrEqual(90);
  });

  it("handles single element", () => {
    expect(percentile([42], 50)).toBe(42);
  });

  it("handles empty array", () => {
    expect(percentile([], 50)).toBe(0);
  });

  it("handles two elements", () => {
    expect(percentile([10, 20], 50)).toBe(10);
  });
});

// ─── Content Type Detection ──────────────────────────────────

function detectContentKind(body: string, contentType?: string): string {
  if (contentType?.includes("json") || contentType?.includes("javascript")) {
    try {
      JSON.parse(body);
      return "json";
    } catch {}
  }
  if (contentType?.includes("xml") || body.trim().startsWith("<")) return "xml";
  if (contentType?.includes("html")) return "html";
  if (contentType?.includes("text/plain")) return "text";
  try {
    JSON.parse(body);
    return "json";
  } catch {}
  if (body.trim().startsWith("<")) return "xml";
  return "text";
}

describe("Content Type Detection", () => {
  it("detects JSON from content-type", () => {
    expect(detectContentKind('{"a":1}', "application/json")).toBe("json");
  });

  it("detects JSON from body", () => {
    expect(detectContentKind('{"a":1}')).toBe("json");
  });

  it("detects XML from content-type", () => {
    expect(detectContentKind("<root/>", "application/xml")).toBe("xml");
  });

  it("detects XML from body", () => {
    expect(detectContentKind("<root><child/></root>")).toBe("xml");
  });

  it("detects HTML from content-type", () => {
    expect(detectContentKind("<html><body/></html>", "text/html")).toBe("html");
  });

  it("detects plain text", () => {
    expect(detectContentKind("just plain text", "text/plain")).toBe("text");
  });

  it("detects plain text as default", () => {
    expect(detectContentKind("no special content")).toBe("text");
  });

  it("detects invalid JSON as text", () => {
    expect(detectContentKind("{invalid json}", "application/json")).toBe(
      "text",
    );
  });

  it("detects JSON array", () => {
    expect(detectContentKind("[1,2,3]")).toBe("json");
  });

  it("detects JSON from content-type", () => {
    expect(detectContentKind("true", "application/json")).toBe("json");
  });
});

// ─── API Doc Generation: Markdown ────────────────────────────

function generateMarkdown(
  name: string,
  endpoints: { method: string; path: string; summary: string }[],
): string {
  let md = `# ${name}\n\n`;
  md += `## Endpoints\n\n`;
  endpoints.forEach((ep) => {
    md += `### \`${ep.method} ${ep.path}\`\n\n`;
    md += `${ep.summary}\n\n`;
  });
  return md;
}

describe("API Doc: Markdown Generation", () => {
  it("generates title", () => {
    const md = generateMarkdown("My API", []);
    expect(md).toContain("# My API");
  });

  it("lists endpoints", () => {
    const md = generateMarkdown("API", [
      { method: "GET", path: "/users", summary: "List users" },
      { method: "POST", path: "/users", summary: "Create user" },
    ]);
    expect(md).toContain("GET /users");
    expect(md).toContain("POST /users");
    expect(md).toContain("List users");
    expect(md).toContain("Create user");
  });

  it("handles empty endpoints", () => {
    const md = generateMarkdown("Empty", []);
    expect(md).toContain("# Empty");
    expect(md).toContain("## Endpoints");
  });

  it("handles single endpoint", () => {
    const md = generateMarkdown("API", [
      { method: "GET", path: "/health", summary: "Health check" },
    ]);
    expect(md).toContain("GET /health");
  });
});

// ─── API Doc: OpenAPI Generation ─────────────────────────────

function generateOpenAPI(
  title: string,
  endpoints: { method: string; path: string; summary: string }[],
): string {
  const spec: any = {
    openapi: "3.0.0",
    info: { title, version: "1.0.0" },
    paths: {},
  };
  endpoints.forEach((ep) => {
    if (!spec.paths[ep.path]) spec.paths[ep.path] = {};
    spec.paths[ep.path][ep.method.toLowerCase()] = {
      summary: ep.summary,
      responses: { "200": { description: "OK" } },
    };
  });
  return JSON.stringify(spec, null, 2);
}

describe("API Doc: OpenAPI Generation", () => {
  it("generates valid OpenAPI 3.0", () => {
    const spec = JSON.parse(generateOpenAPI("Test", []));
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Test");
  });

  it("includes endpoints in paths", () => {
    const spec = JSON.parse(
      generateOpenAPI("Test", [
        { method: "GET", path: "/users", summary: "List" },
      ]),
    );
    expect(spec.paths["/users"].get).toBeDefined();
    expect(spec.paths["/users"].get.summary).toBe("List");
  });

  it("groups methods on same path", () => {
    const spec = JSON.parse(
      generateOpenAPI("Test", [
        { method: "GET", path: "/users", summary: "List" },
        { method: "POST", path: "/users", summary: "Create" },
      ]),
    );
    expect(spec.paths["/users"].get).toBeDefined();
    expect(spec.paths["/users"].post).toBeDefined();
  });

  it("handles multiple paths", () => {
    const spec = JSON.parse(
      generateOpenAPI("Test", [
        { method: "GET", path: "/users", summary: "Users" },
        { method: "GET", path: "/posts", summary: "Posts" },
      ]),
    );
    expect(Object.keys(spec.paths)).toHaveLength(2);
  });
});

// ─── safeParseJSON ───────────────────────────────────────────

function safeParseJSON(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

describe("safeParseJSON", () => {
  it("parses valid JSON", () => {
    expect(safeParseJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns original string for invalid JSON", () => {
    expect(safeParseJSON("not json")).toBe("not json");
  });

  it("parses JSON array", () => {
    expect(safeParseJSON("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("parses JSON null", () => {
    expect(safeParseJSON("null")).toBe(null);
  });

  it("returns empty string as-is", () => {
    expect(safeParseJSON("")).toBe("");
  });

  it("handles partial JSON", () => {
    expect(safeParseJSON('{"key": ')).toBe('{"key": ');
  });
});

// ─── Assert Evaluation ───────────────────────────────────────

function compareValues(
  actual: unknown,
  expected: unknown,
  operator: string,
): { pass: boolean; message: string } {
  switch (operator) {
    case "equals":
      return {
        pass: actual === expected,
        message: `Expected ${actual} to equal ${expected}`,
      };
    case "not_equals":
      return {
        pass: actual !== expected,
        message: `Expected ${actual} to not equal ${expected}`,
      };
    case "contains":
      return {
        pass: String(actual).includes(String(expected)),
        message: `Expected "${actual}" to contain "${expected}"`,
      };
    case "greater_than":
      return {
        pass: Number(actual) > Number(expected),
        message: `Expected ${actual} to be greater than ${expected}`,
      };
    case "less_than":
      return {
        pass: Number(actual) < Number(expected),
        message: `Expected ${actual} to be less than ${expected}`,
      };
    case "exists":
      return {
        pass: actual !== null && actual !== undefined,
        message: `Expected value to exist`,
      };
    default:
      return { pass: false, message: `Unknown operator: ${operator}` };
  }
}

describe("Assert: compareValues", () => {
  it("equals: pass on match", () => {
    expect(compareValues(1, 1, "equals").pass).toBe(true);
  });

  it("equals: fail on mismatch", () => {
    expect(compareValues(1, 2, "equals").pass).toBe(false);
  });

  it("equals: strict type check", () => {
    expect(compareValues(1, "1", "equals").pass).toBe(false);
  });

  it("not_equals: pass on different", () => {
    expect(compareValues(1, 2, "not_equals").pass).toBe(true);
  });

  it("not_equals: fail on same", () => {
    expect(compareValues(1, 1, "not_equals").pass).toBe(false);
  });

  it("contains: pass on substring", () => {
    expect(compareValues("hello world", "world", "contains").pass).toBe(true);
  });

  it("contains: fail on missing", () => {
    expect(compareValues("hello", "xyz", "contains").pass).toBe(false);
  });

  it("greater_than: pass", () => {
    expect(compareValues(5, 3, "greater_than").pass).toBe(true);
  });

  it("greater_than: fail on equal", () => {
    expect(compareValues(5, 5, "greater_than").pass).toBe(false);
  });

  it("less_than: pass", () => {
    expect(compareValues(3, 5, "less_than").pass).toBe(true);
  });

  it("exists: pass on defined", () => {
    expect(compareValues("value", null, "exists").pass).toBe(true);
  });

  it("exists: fail on null", () => {
    expect(compareValues(null, null, "exists").pass).toBe(false);
  });

  it("exists: fail on undefined", () => {
    expect(compareValues(undefined, null, "exists").pass).toBe(false);
  });

  it("unknown operator returns false", () => {
    expect(compareValues(1, 2, "unknown").pass).toBe(false);
  });
});

// ─── Metrics Calculation ─────────────────────────────────────

function calculateMetrics(durations: number[]) {
  if (durations.length === 0)
    return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...durations].sort((a, b) => a - b);
  const percentileFn = (p: number) => {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  };
  return {
    avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: percentileFn(50),
    p95: percentileFn(95),
    p99: percentileFn(99),
  };
}

describe("Metrics Calculation", () => {
  it("calculates avg, min, max", () => {
    const m = calculateMetrics([100, 200, 300]);
    expect(m.avg).toBe(200);
    expect(m.min).toBe(100);
    expect(m.max).toBe(300);
  });

  it("handles single value", () => {
    const m = calculateMetrics([500]);
    expect(m.avg).toBe(500);
    expect(m.min).toBe(500);
    expect(m.max).toBe(500);
  });

  it("handles empty array", () => {
    const m = calculateMetrics([]);
    expect(m.avg).toBe(0);
  });

  it("calculates percentiles", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const m = calculateMetrics(values);
    expect(m.p50).toBe(50);
    expect(m.p95).toBe(95);
    expect(m.p99).toBe(99);
  });

  it("handles all same values", () => {
    const m = calculateMetrics([100, 100, 100]);
    expect(m.avg).toBe(100);
    expect(m.min).toBe(100);
    expect(m.max).toBe(100);
  });
});
