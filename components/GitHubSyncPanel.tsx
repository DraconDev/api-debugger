import { useState, useEffect, useCallback } from "react";
import {
  GitHubSync,
  getGitHubConfig,
  setGitHubConfig,
  clearGitHubConfig,
  getGitHubPATUrl,
  validateGitHubToken,
  type GitHubConfig,
  type SyncData,
} from "@/lib/githubSync";
import {
  getProfiles,
  getActiveProfileId,
  getProfileData,
  saveProfileData,
  setActiveProfileId,
  saveProfiles,
  type Profile,
} from "@/lib/profiles";

export function GitHubSyncPanel() {
  const [config, setConfig] = useState<GitHubConfig>({
    token: "",
    owner: "",
    repo: "api-debugger-sync",
    branch: "main",
    path: "",
    enabled: false,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const saved = await getGitHubConfig();
    if (saved) {
      setConfig(saved);
      setIsConnected(!!saved.token && !!saved.owner);
      setLastSync(saved.lastSync || null);
      if (saved.owner) {
        setUsername(saved.owner);
      }
    }
  };

  const openGitHubPATPage = () => {
    chrome.tabs.create({ url: getGitHubPATUrl() });
    setShowTokenInput(true);
  };

  const connectWithToken = async () => {
    if (!tokenInput.trim()) {
      setError("Please enter your token");
      return;
    }

    setIsValidating(true);
    setError(null);

    const result = await validateGitHubToken(tokenInput.trim());

    if (!result.valid) {
      setError(result.error || "Invalid token");
      setIsValidating(false);
      return;
    }

    const newConfig: GitHubConfig = {
      ...config,
      token: tokenInput.trim(),
      owner: result.username!,
      enabled: true,
    };

    await setGitHubConfig(newConfig);
    setConfig(newConfig);
    setIsConnected(true);
    setUsername(result.username!);
    setTokenInput("");
    setShowTokenInput(false);
    setSuccess(`Connected as @${result.username}`);
    setIsValidating(false);
  };

  const disconnect = async () => {
    await clearGitHubConfig();
    setConfig({
      token: "",
      owner: "",
      repo: "api-debugger-sync",
      branch: "main",
      path: "",
      enabled: false,
    });
    setIsConnected(false);
    setLastSync(null);
    setUsername(null);
    setSuccess("Disconnected from GitHub");
  };

  const syncToGitHub = useCallback(
    async (direction: "push" | "pull") => {
      if (!isConnected) {
        setError("Not connected to GitHub");
        return;
      }

      setIsSyncing(true);
      setError(null);
      setSuccess(null);

      try {
        const sync = new GitHubSync(config);

        await sync.createRepoIfNotExists();

        if (direction === "push") {
          // Read all profiles and their data
          const [profiles, activeProfileId, settingsRes] = await Promise.all([
            getProfiles(),
            getActiveProfileId(),
            chrome.storage.sync.get(["sync:theme", "captureFilter"]),
          ]);

          const profileData: Record<string, unknown> = {};
          for (const profile of profiles) {
            profileData[profile.id] = await getProfileData(profile.id);
          }

          const syncData: SyncData = {
            version: "2.0",
            exportedAt: new Date().toISOString(),
            profiles,
            activeProfileId,
            profileData: profileData as SyncData["profileData"],
            settings: {
              theme: settingsRes["sync:theme"] || "system",
              captureFilter: settingsRes.captureFilter || null,
            },
          };

          const { sha } = await sync.getFile();
          await sync.push(syncData, sha);

          const now = Date.now();
          await setGitHubConfig({ ...config, lastSync: now });
          setLastSync(now);
          setSuccess("Successfully pushed to GitHub");
        } else {
          const { content } = await sync.getFile();

          if (content) {
            if (content.version === "2.0" && content.profiles) {
              // New profile-based format
              await saveProfiles(content.profiles as Profile[]);
              if (content.profileData) {
                for (const [profileId, data] of Object.entries(
                  content.profileData,
                )) {
                  await saveProfileData(profileId, data);
                }
              }
              if (content.activeProfileId) {
                await setActiveProfileId(content.activeProfileId);
              }
            } else if (content.collections) {
              // Legacy format - migrate into the active profile
              const activeId = await getActiveProfileId();
              await saveProfileData(activeId, {
                collections: content.collections || [],
                savedRequests: content.savedRequests || [],
                environments: content.environments || [],
              });
            }
            if (content.settings) {
              await chrome.storage.sync.set({
                "sync:theme": content.settings.theme,
                captureFilter: content.settings.captureFilter,
              });
            }

            const now = Date.now();
            await setGitHubConfig({ ...config, lastSync: now });
            setLastSync(now);
            setSuccess("Successfully pulled from GitHub");
          } else {
            setError("No synced data found in repository");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sync failed");
      } finally {
        setIsSyncing(false);
      }
    },
    [config, isConnected],
  );

  const updateConfig = (updates: Partial<GitHubConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const saveSettings = async () => {
    await setGitHubConfig(config);
    setSuccess("Settings saved");
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-1">GitHub Sync</h2>
        <p className="text-sm text-muted-foreground">
          Backup and sync your collections, environments, and settings
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-sm text-success">{success}</p>
          </div>
        )}

        {!isConnected ? (
          <div className="py-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <GitHubIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Connect to GitHub</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Create a Personal Access Token to sync your data to a private
                GitHub repository
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={openGitHubPATPage}
                className="w-full px-4 py-3 bg-foreground text-background rounded-md text-sm hover:bg-foreground/90 flex items-center justify-center gap-2"
              >
                <GitHubIcon className="w-4 h-4" />
                Create GitHub Token
              </button>

              {showTokenInput && (
                <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    Click "Generate token" on GitHub, then paste it below:
                  </p>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTokenInput(false)}
                      className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={connectWithToken}
                      disabled={isValidating || !tokenInput.trim()}
                      className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isValidating ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Connect"
                      )}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Your token is stored locally and never sent to our servers
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Connected</p>
                    <p className="text-xs text-muted-foreground">@{username}</p>
                  </div>
                </div>
                <button
                  onClick={disconnect}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Disconnect
                </button>
              </div>
              {lastSync && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last sync: {new Date(lastSync).toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Repository
                </label>
                <input
                  type="text"
                  value={config.repo}
                  onChange={(e) => updateConfig({ repo: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
                  placeholder="api-debugger-sync"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A private repo will be created if it doesn't exist
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Branch
                </label>
                <input
                  type="text"
                  value={config.branch}
                  onChange={(e) => updateConfig({ branch: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
                  placeholder="main"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Path (optional)
                </label>
                <input
                  type="text"
                  value={config.path}
                  onChange={(e) => updateConfig({ path: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
                  placeholder="Leave empty for root"
                />
              </div>

              <button
                onClick={saveSettings}
                className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80"
              >
                Save Settings
              </button>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium mb-3">Sync</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => syncToGitHub("push")}
                  disabled={isSyncing}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSyncing ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UploadIcon className="w-4 h-4" />
                  )}
                  Push
                </button>
                <button
                  onClick={() => syncToGitHub("pull")}
                  disabled={isSyncing}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSyncing ? (
                    <div className="w-4 h-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <DownloadIcon className="w-4 h-4" />
                  )}
                  Pull
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Push uploads your local data. Pull downloads from GitHub.
              </p>
            </div>
          </>
        )}

        <div className="border-t border-border pt-4 mt-4">
          <h3 className="text-sm font-medium mb-2">What gets synced</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3 text-success" />
              Collections and saved requests
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3 text-success" />
              Environments and variables
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3 text-success" />
              Settings and preferences
            </li>
            <li className="flex items-center gap-2">
              <XIcon className="w-3 h-3 text-muted-foreground" />
              Request history (local only)
            </li>
            <li className="flex items-center gap-2">
              <XIcon className="w-3 h-3 text-muted-foreground" />
              AI API keys (local only)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}
