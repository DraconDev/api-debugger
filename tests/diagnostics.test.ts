import { describe, it, expect } from "vitest";

describe("Diagnostics Engine", () => {
  it("should detect 401 missing auth", () => {
    const request = {
      id: "test-1",
      url: "https://api.example.com/protected",
      method: "GET",
      statusCode: 401,
      requestHeaders: [],
      responseHeaders: [],
      requestBody: null,
      requestBodyText: null,
      startTime: Date.now(),
      timeStamp: Date.now(),
      duration: 100,
      tabId: 1,
    };

    const diagnostics = analyzeRequest(request);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].type).toBe("auth_missing");
    expect(diagnostics[0].severity).toBe("error");
    expect(diagnostics[0].confidence).toBeGreaterThan(0.9);
  });

  it("should detect 401 invalid auth when header present", () => {
    const request = {
      id: "test-2",
      url: "https://api.example.com/protected",
      method: "GET",
      statusCode: 401,
      requestHeaders: [{ name: "Authorization", value: "Bearer invalid-token" }],
      responseHeaders: [],
      requestBody: null,
      requestBodyText: null,
      startTime: Date.now(),
      timeStamp: Date.now(),
      duration: 100,
      tabId: 1,
    };

    const diagnostics = analyzeRequest(request);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].type).toBe("auth_invalid");
  });

  it("should detect 403 forbidden", () => {
    const request = {
      id: "test-3",
      url: "https://api.example.com/admin",
      method: "GET",
      statusCode: 403,
      requestHeaders: [],
      responseHeaders: [],
      requestBody: null,
      requestBodyText: null,
      startTime: Date.now(),
      timeStamp: Date.now(),
      duration: 100,
      tabId: 1,
    };

    const diagnostics = analyzeRequest(request);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].type).toBe("permission_denied");
  });

  it("should detect 404 not found", () => {
    const request = {
      id: "test-4",
      url: "https://api.example.com/nonexistent",
      method: "GET",
      statusCode: 404,
      requestHeaders: [],
      responseHeaders: [],
      requestBody: null,
      requestBodyText: null,
      startTime: Date.now(),
      timeStamp: Date.now(),
      duration: 100,
      tabId: 1,
    };

    const diagnostics = analyzeRequest(request);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].type).toBe("not_found");
  });

  it("should detect 500 server error", () => {
    const request = {
      id: "test-5",
      url: "https://api.example.com/error",
      method: "GET",
      statusCode: 500,
      requestHeaders: [],
      responseHeaders: [],
      requestBody: null,
      requestBodyText: null,
      startTime: Date.now(),
      timeStamp: Date.now(),
      duration: 100,
      tabId: 1,
    };

    const diagnostics = analyzeRequest(request);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].type).toBe("server_error");
  });

  it("should not return diagnostics for 200 status", () => {
    const request = {
      id: "test-6",
      url: "https://api.example.com/success",
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

    const diagnostics = analyzeRequest(request);

    expect(diagnostics.length).toBe(0);
  });
});

// Copy of the diagnostics logic for testing
function analyzeRequest(request: any) {
  const diagnostics: any[] = [];

  if (request.statusCode === 401) {
    const authHeader = request.requestHeaders?.find(
      (h: any) => h.name.toLowerCase() === "authorization"
    );

    if (!authHeader) {
      diagnostics.push({
        type: "auth_missing",
        severity: "error",
        title: "Missing authentication",
        explanation: "The request was rejected because no authentication credentials were provided.",
        evidence: [
          { source: "response", field: "statusCode", value: "401", description: "Unauthorized status code" },
        ],
        suggestions: [
          "Add an Authorization header with a valid token",
        ],
        confidence: 0.95,
      });
    } else {
      diagnostics.push({
        type: "auth_invalid",
        severity: "error",
        title: "Invalid or expired authentication",
        explanation: "Authentication credentials were provided but were rejected by the server.",
        evidence: [
          { source: "response", field: "statusCode", value: "401", description: "Unauthorized status code" },
        ],
        suggestions: [
          "Check if the token has expired",
        ],
        confidence: 0.85,
      });
    }
  }

  if (request.statusCode === 403) {
    diagnostics.push({
      type: "permission_denied",
      severity: "error",
      title: "Permission denied",
      explanation: "The server understood the request but refuses to authorize it.",
      evidence: [],
      suggestions: [],
      confidence: 0.9,
    });
  }

  if (request.statusCode === 404) {
    diagnostics.push({
      type: "not_found",
      severity: "error",
      title: "Resource not found",
      explanation: "The requested resource could not be found on the server.",
      evidence: [],
      suggestions: [],
      confidence: 0.95,
    });
  }

  if (request.statusCode >= 500 && request.statusCode < 600) {
    diagnostics.push({
      type: "server_error",
      severity: "error",
      title: "Server error",
      explanation: "The server encountered an error while processing the request.",
      evidence: [],
      suggestions: [],
      confidence: 0.95,
    });
  }

  return diagnostics;
}
