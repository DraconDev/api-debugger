import { describe, it, expect } from "vitest";

describe("Export Helpers", () => {
  it("should generate valid cURL command", () => {
    const request = {
      id: "test-1",
      url: "https://api.example.com/users",
      method: "GET",
      statusCode: 200,
      requestHeaders: [
        { name: "Authorization", value: "Bearer token123" },
        { name: "Content-Type", value: "application/json" },
      ],
      responseHeaders: [],
      requestBody: null,
      requestBodyText: null,
      startTime: Date.now(),
      timeStamp: Date.now(),
      duration: 100,
      tabId: 1,
    };

    const curl = toCurl(request);

    expect(curl).toContain("curl -X GET");
    expect(curl).toContain("https://api.example.com/users");
    expect(curl).toContain("-H 'Authorization: Bearer token123'");
    expect(curl).toContain("-H 'Content-Type: application/json'");
  });

  it("should generate cURL with body for POST requests", () => {
    const request = {
      id: "test-2",
      url: "https://api.example.com/users",
      method: "POST",
      statusCode: 201,
      requestHeaders: [
        { name: "Content-Type", value: "application/json" },
      ],
      responseHeaders: [],
      requestBody: null,
      requestBodyText: '{"name": "John"}',
      startTime: Date.now(),
      timeStamp: Date.now(),
      duration: 100,
      tabId: 1,
    };

    const curl = toCurl(request);

    expect(curl).toContain("curl -X POST");
    expect(curl).toContain("-d '{\"name\": \"John\"}'");
  });

  it("should generate valid fetch code", () => {
    const request = {
      id: "test-3",
      url: "https://api.example.com/users",
      method: "POST",
      statusCode: 201,
      requestHeaders: [
        { name: "Content-Type", value: "application/json" },
        { name: "Authorization", value: "Bearer token" },
      ],
      responseHeaders: [],
      requestBody: null,
      requestBodyText: '{"email": "test@example.com"}',
      startTime: Date.now(),
      timeStamp: Date.now(),
      duration: 100,
      tabId: 1,
    };

    const fetchCode = toFetch(request);

    expect(fetchCode).toContain("fetch('https://api.example.com/users'");
    expect(fetchCode).toContain('"method": "POST"');
    expect(fetchCode).toContain('"Content-Type": "application/json"');
    expect(fetchCode).toContain('"body": "{\\"email\\": \\"test@example.com\\"}"');
  });

  it("should handle empty headers", () => {
    const request = {
      id: "test-4",
      url: "https://api.example.com/health",
      method: "GET",
      statusCode: 200,
      requestHeaders: [],
      responseHeaders: [],
      requestBody: null,
      requestBodyText: null,
      startTime: Date.now(),
      timeStamp: Date.now(),
      duration: 100,
      tabId: 1,
    };

    const curl = toCurl(request);

    expect(curl).toContain("curl -X GET");
    expect(curl).toContain("https://api.example.com/health");
  });
});

function toCurl(request: any): string {
  const parts = [`curl -X ${request.method}`];

  if (request.requestHeaders?.length) {
    request.requestHeaders.forEach((h: any) => {
      parts.push(`-H '${h.name}: ${h.value}'`);
    });
  }

  if (request.requestBodyText) {
    parts.push(`-d '${request.requestBodyText}'`);
  }

  parts.push(`'${request.url}'`);

  return parts.join(" \\\n  ");
}

function toFetch(request: any): string {
  const headers: Record<string, string> = {};
  request.requestHeaders?.forEach((h: any) => {
    headers[h.name] = h.value;
  });

  const options: Record<string, unknown> = {
    method: request.method,
    headers,
  };

  if (request.requestBodyText) {
    options.body = request.requestBodyText;
  }

  return `fetch('${request.url}', ${JSON.stringify(options, null, 2)});`;
}
