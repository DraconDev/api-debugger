import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GitHubSync,
  validateGitHubToken,
  getGitHubPATUrl,
  type GitHubConfig,
  type SyncData,
} from "@/lib/githubSync";

describe("GitHub Sync: Token Validation", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
  });
  afterEach(() => {
    mockFetch.mockReset();
  });

  it("returns valid=true and username on successful auth", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ login: "testuser" }),
    });

    const result = await validateGitHubToken("ghp_validtoken123");

    expect(result.valid).toBe(true);
    expect(result.username).toBe("testuser");
    expect(result.error).toBeUndefined();
  });

  it("calls /user endpoint with correct headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ login: "user" }),
    });

    await validateGitHubToken("ghp_test");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ghp_test",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        }),
      }),
    );
  });

  it("returns valid=false for 401 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await validateGitHubToken("bad-token");

    expect(result.valid).toBe(false);
    expect(result.username).toBeUndefined();
    expect(result.error).toBe("Invalid token");
  });

  it("returns valid=false for 403 Forbidden", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const result = await validateGitHubToken("forbidden-token");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid token");
  });

  it("returns valid=false and error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await validateGitHubToken("any-token");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Validation failed");
  });

  it("handles non-ok response without JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error")),
    });

    const result = await validateGitHubToken("any-token");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid token");
  });
});

describe("GitHub Sync: PAT URL Generation", () => {
  it("generates correct GitHub token creation URL", () => {
    const url = getGitHubPATUrl();

    expect(url).toContain("https://github.com/settings/tokens/new");
    expect(url).toContain("description=");
    expect(url).toContain("scopes=");
    expect(url).toContain("repo");
    expect(url).toContain("user:email");
  });

  it("encodes description properly", () => {
    const url = getGitHubPATUrl();
    const decoded = decodeURIComponent(url);

    expect(decoded).toContain("API Debugger Extension");
  });
});

describe("GitHub Sync: Class Methods", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
  });
  afterEach(() => {
    mockFetch.mockReset();
  });

  const createConfig = (): GitHubConfig => ({
    token: "ghp_test_token",
    owner: "testuser",
    repo: "test-repo",
    branch: "main",
    path: "",
    enabled: true,
  });

  describe("constructor", () => {
    it("creates instance with config", () => {
      const config = createConfig();
      const sync = new GitHubSync(config);

      expect(sync).toBeDefined();
    });
  });

  describe("testConnection", () => {
    it("returns valid=true when repo exists", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: "testuser" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: "test-repo" }),
        });

      const result = await sync.testConnection();

      expect(result.valid).toBe(true);
      expect(result.user).toBe("testuser");
      expect(result.error).toBeUndefined();
    });

    it("returns valid=false when repo not found", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: "testuser" }),
        })
        .mockRejectedValueOnce(new Error("404 Not Found"));

      const result = await sync.testConnection();

      expect(result.valid).toBe(false);
      expect(result.error).toContain("404");
    });

    it("returns error message on connection failure", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await sync.testConnection();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Connection refused");
    });
  });

  describe("getFile", () => {
    it("returns content and sha when file exists", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sha: "abc123",
            content: btoa(JSON.stringify({ version: "1.0" })),
          }),
      });

      const result = await sync.getFile();

      expect(result.content).toBeDefined();
      expect(result.sha).toBe("abc123");
    });

    it("returns null content and sha when file not found (404)", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch.mockRejectedValueOnce(new Error("404 Not Found"));

      const result = await sync.getFile();

      expect(result.content).toBeNull();
      expect(result.sha).toBeNull();
    });

    it("re-throws non-404 errors", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch.mockRejectedValueOnce(new Error("500 Internal Error"));

      await expect(sync.getFile()).rejects.toThrow("500 Internal Error");
    });

    it("decodes base64 content correctly", async () => {
      const sync = new GitHubSync(createConfig());
      const testData = { version: "1.0", collections: [] };
      const encoded = btoa(JSON.stringify(testData));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sha: "def456",
            content: encoded,
          }),
      });

      const result = await sync.getFile();

      expect(result.content).toEqual(testData);
    });

    it("constructs correct API path with custom path", async () => {
      const sync = new GitHubSync({ ...createConfig(), path: "data/api" });

      mockFetch.mockRejectedValueOnce(new Error("404"));

      await sync.getFile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("data/api/api-debugger-sync.json"),
        expect.any(Object),
      );
    });
  });

  describe("push", () => {
    it("sends PUT request with base64-encoded content", async () => {
      const sync = new GitHubSync(createConfig());
      const data: SyncData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        collections: [],
        savedRequests: [],
        environments: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await sync.push(data, null);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/repos/testuser/test-repo/contents/");
      expect(call[1].method).toBe("PUT");

      const body = JSON.parse(call[1].body);
      expect(body.message).toContain("Update API Debugger sync");
      expect(body.branch).toBe("main");
      expect(body.content).toBeDefined();
      // Verify content is valid base64
      const decoded = atob(body.content);
      expect(JSON.parse(decoded)).toEqual(data);
    });

    it("includes sha when updating existing file", async () => {
      const sync = new GitHubSync(createConfig());
      const data: SyncData = { version: "1.0", exportedAt: "" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await sync.push(data, "existing-sha");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.sha).toBe("existing-sha");
    });

    it("does not include sha when creating new file", async () => {
      const sync = new GitHubSync(createConfig());
      const data: SyncData = { version: "1.0", exportedAt: "" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await sync.push(data, null);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.sha).toBeUndefined();
    });

    it("constructs correct path with custom path", async () => {
      const sync = new GitHubSync({ ...createConfig(), path: "sync/data" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await sync.push({ version: "1.0", exportedAt: "" }, null);

      expect(mockFetch.mock.calls[0][0]).toContain(
        "sync/data/api-debugger-sync.json",
      );
    });
  });

  describe("createRepoIfNotExists", () => {
    it("does nothing when repo already exists", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: "test-repo" }),
      });

      await sync.createRepoIfNotExists();

      // Should only call /repos check, not POST
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("creates repo when 404 returned", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch
        .mockRejectedValueOnce(new Error("404 Not Found"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: "test-repo" }),
        });

      await sync.createRepoIfNotExists();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const createCall = mockFetch.mock.calls[1];
      expect(createCall[0]).toContain("/user/repos");
      expect(createCall[1].method).toBe("POST");
    });

    it("re-throws non-404 errors", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch.mockRejectedValueOnce(new Error("500 Internal Error"));

      await expect(sync.createRepoIfNotExists()).rejects.toThrow(
        "500 Internal Error",
      );
    });

    it("sends correct repo creation payload", async () => {
      const sync = new GitHubSync(createConfig());

      mockFetch
        .mockRejectedValueOnce(new Error("404 Not Found"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      await sync.createRepoIfNotExists();

      const createCall = mockFetch.mock.calls[1];
      const payload = JSON.parse(createCall[1].body);

      expect(payload.name).toBe("test-repo");
      expect(payload.description).toBe("API Debugger synced data");
      expect(payload.private).toBe(true);
      expect(payload.auto_init).toBe(true);
    });
  });
});

describe("GitHub Sync: SyncData Structure", () => {
  it("supports legacy flat data format", () => {
    const legacyData: SyncData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      collections: [
        {
          id: "col1",
          name: "Test",
          createdAt: 0,
          updatedAt: 0,
          requestCount: 1,
        },
      ],
      savedRequests: [],
      environments: [],
    };

    expect(legacyData.collections).toBeDefined();
    expect(legacyData.savedRequests).toBeDefined();
  });

  it("supports profile-based data format", () => {
    const profileData: SyncData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      profiles: [],
      activeProfileId: "profile-1",
      profileData: {
        "profile-1": {
          collections: [],
          savedRequests: [],
          environments: [],
        },
      },
    };

    expect(profileData.profiles).toBeDefined();
    expect(profileData.activeProfileId).toBeDefined();
    expect(profileData.profileData).toBeDefined();
  });

  it("supports settings in sync data", () => {
    const data: SyncData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      settings: {
        theme: "dark",
        captureFilter: { enabled: true },
      },
    };

    expect(data.settings?.theme).toBe("dark");
    expect(data.settings?.captureFilter).toBeDefined();
  });
});
