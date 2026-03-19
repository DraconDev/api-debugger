import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getClientCredentialsToken,
  getOAuth2Token,
  type OAuth2Config,
} from "@/lib/oauth2";

// Mock crypto for PKCE tests
const mockGetRandomValues = vi.fn();
const mockRandomUUID = vi.fn();
const mockSubtleDigest = vi.fn();
const mockCreate = vi.fn();
const mockTabsRemove = vi.fn();

vi.stubGlobal("crypto", {
  getRandomValues: mockGetRandomValues,
  randomUUID: mockRandomUUID,
  subtle: {
    digest: mockSubtleDigest,
  },
});

vi.stubGlobal("chrome", {
  tabs: {
    create: mockCreate,
    remove: mockTabsRemove,
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    session: {
      set: vi.fn(),
      get: vi.fn(),
    },
  },
});

describe("OAuth2: Client Credentials Flow", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
  });
  afterEach(() => {
    mockFetch.mockReset();
  });

  const baseConfig: OAuth2Config = {
    flow: "client_credentials",
    accessTokenUrl: "https://auth.example.com/oauth/token",
    clientId: "test-client-id",
    scope: "read write",
  };

  it("sends correct URLSearchParams body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "access-token-123",
          token_type: "Bearer",
          expires_in: 3600,
        }),
    });

    await getClientCredentialsToken(baseConfig);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://auth.example.com/oauth/token",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: expect.stringContaining("grant_type=client_credentials"),
      }),
    );

    const call = mockFetch.mock.calls[0];
    const body = new URLSearchParams(call[1].body);
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("scope")).toBe("read write");
  });

  it("includes client_secret when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "access-token-123",
          token_type: "Bearer",
        }),
    });

    await getClientCredentialsToken({
      ...baseConfig,
      clientSecret: "super-secret",
    });

    const call = mockFetch.mock.calls[0];
    const body = new URLSearchParams(call[1].body);
    expect(body.get("client_secret")).toBe("super-secret");
  });

  it("returns correct token data structure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "token-abc",
          token_type: "Bearer",
          expires_in: 7200,
        }),
    });

    const result = await getClientCredentialsToken(baseConfig);

    expect(result.accessToken).toBe("token-abc");
    expect(result.tokenType).toBe("Bearer");
    expect(result.expiresAt).toBeDefined();
    expect(typeof result.expiresAt).toBe("number");
    expect(result.expiresAt).toBeGreaterThan(Date.now());
  });

  it("defaults tokenType to Bearer if not provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "token-xyz",
        }),
    });

    const result = await getClientCredentialsToken(baseConfig);
    expect(result.tokenType).toBe("Bearer");
  });

  it("throws error on failed request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve("invalid_client"),
    });

    await expect(getClientCredentialsToken(baseConfig)).rejects.toThrow(
      "Token request failed (401): invalid_client",
    );
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(getClientCredentialsToken(baseConfig)).rejects.toThrow(
      "Network error",
    );
  });

  it("throws error for 400 Bad Request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve("invalid_scope"),
    });

    await expect(getClientCredentialsToken(baseConfig)).rejects.toThrow(
      /Token request failed \(400\)/,
    );
  });

  it("throws error for 500 Server Error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal server error"),
    });

    await expect(getClientCredentialsToken(baseConfig)).rejects.toThrow(
      /Token request failed \(500\)/,
    );
  });
});

describe("OAuth2: getOAuth2Token Dispatcher", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
  });
  afterEach(() => {
    mockFetch.mockReset();
  });

  it("dispatches to client_credentials flow", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "cc-token",
          token_type: "Bearer",
        }),
    });

    const result = await getOAuth2Token({
      flow: "client_credentials",
      accessTokenUrl: "https://auth.example.com/token",
      clientId: "client",
      scope: "read",
    });

    expect(result.accessToken).toBe("cc-token");
    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("OAuth2: Token Response Parsing", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
  });
  afterEach(() => {
    mockFetch.mockReset();
  });

  it("handles missing expires_in gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "no-expiry-token",
          token_type: "Bearer",
        }),
    });

    const result = await getClientCredentialsToken({
      flow: "client_credentials",
      accessTokenUrl: "https://auth.example.com/token",
      clientId: "test",
      scope: "read",
    });

    expect(result.accessToken).toBe("no-expiry-token");
    expect(result.expiresAt).toBeUndefined();
  });

  it("calculates correct expiresAt timestamp", async () => {
    const before = Date.now();
    const expiresIn = 7200; // 2 hours

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "token",
          expires_in: expiresIn,
        }),
    });

    const result = await getClientCredentialsToken({
      flow: "client_credentials",
      accessTokenUrl: "https://auth.example.com/token",
      clientId: "test",
      scope: "read",
    });

    const after = Date.now();
    const expectedMin = before + expiresIn * 1000;
    const expectedMax = after + expiresIn * 1000;

    expect(result.expiresAt).toBeGreaterThanOrEqual(expectedMin);
    expect(result.expiresAt).toBeLessThanOrEqual(expectedMax);
  });
});

describe("OAuth2: Flow Types", () => {
  it("supports client_credentials flow", () => {
    const config: OAuth2Config = {
      flow: "client_credentials",
      accessTokenUrl: "https://auth.example.com/token",
      clientId: "client",
      scope: "read",
    };
    expect(config.flow).toBe("client_credentials");
  });

  it("supports authorization_code flow", () => {
    const config: OAuth2Config = {
      flow: "authorization_code",
      accessTokenUrl: "https://auth.example.com/token",
      authorizationUrl: "https://auth.example.com/authorize",
      redirectUri: "https://localhost/callback",
      clientId: "client",
      scope: "read",
    };
    expect(config.flow).toBe("authorization_code");
  });
});
