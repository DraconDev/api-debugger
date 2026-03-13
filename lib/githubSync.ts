export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  enabled: boolean;
  lastSync?: number;
}

export interface SyncStatus {
  lastSync: number | null;
  status: "idle" | "syncing" | "success" | "error";
  error?: string;
  ahead: number;
  behind: number;
}

export interface SyncData {
  version: string;
  exportedAt: string;
  collections: unknown[];
  savedRequests: unknown[];
  environments: unknown[];
  settings: {
    theme: string;
    captureFilter: unknown;
  };
}

const GITHUB_API = "https://api.github.com";
const SYNC_FILE = "api-debugger-sync.json";

export class GitHubSync {
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = endpoint.startsWith("http") ? endpoint : `${GITHUB_API}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return response;
  }

  async testConnection(): Promise<{ valid: boolean; user?: string; error?: string }> {
    try {
      const response = await this.request("/user");
      const user = await response.json();
      
      const repoResponse = await this.request(`/repos/${this.config.owner}/${this.config.repo}`);
      
      return { valid: true, user: user.login };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : "Connection failed" 
      };
    }
  }

  async getFile(): Promise<{ content: SyncData | null; sha: string | null }> {
    try {
      const path = this.config.path ? `${this.config.path}/${SYNC_FILE}` : SYNC_FILE;
      const response = await this.request(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`
      );
      const data = await response.json();
      
      const content = JSON.parse(atob(data.content));
      return { content, sha: data.sha };
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return { content: null, sha: null };
      }
      throw error;
    }
  }

  async push(data: SyncData, sha: string | null): Promise<void> {
    const path = this.config.path ? `${this.config.path}/${SYNC_FILE}` : SYNC_FILE;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

    const body: Record<string, unknown> = {
      message: `Update API Debugger sync - ${new Date().toISOString()}`,
      content,
      branch: this.config.branch,
    };

    if (sha) {
      body.sha = sha;
    }

    await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );
  }

  async createRepoIfNotExists(): Promise<void> {
    try {
      await this.request(`/repos/${this.config.owner}/${this.config.repo}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        await this.request("/user/repos", {
          method: "POST",
          body: JSON.stringify({
            name: this.config.repo,
            description: "API Debugger synced data",
            private: true,
            auto_init: true,
          }),
        });
      } else {
        throw error;
      }
    }
  }
}

export async function getGitHubConfig(): Promise<GitHubConfig | null> {
  const result = await chrome.storage.sync.get("githubSync");
  return result.githubSync || null;
}

export async function setGitHubConfig(config: GitHubConfig): Promise<void> {
  await chrome.storage.sync.set({ githubSync: config });
}

export async function clearGitHubConfig(): Promise<void> {
  await chrome.storage.sync.remove("githubSync");
}
