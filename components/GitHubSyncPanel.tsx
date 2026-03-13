import { useState, useEffect, useCallback } from "react";
import { GitHubSync, getGitHubConfig, setGitHubConfig, clearGitHubConfig, type GitHubConfig, type SyncData } from "@/lib/githubSync";

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
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const saved = await getGitHubConfig();
    if (saved) {
      setConfig(saved);
      setIsConnected(!!saved.token && !!saved.owner);
      setLastSync(saved.lastSync || null);
    }
  };

  const testConnection = async () => {
    if (!config.token || !config.owner) {
      setError("Token and owner are required");
      return;
    }

    setIsTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const sync = new GitHubSync(config);
      const result = await sync.testConnection();
      
      if (result.valid) {
        setIsConnected(true);
        setSuccess(`Connected as @${result.user}`);
      } else {
        setError(result.error || "Connection failed");
        setIsConnected(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setIsConnected(false);
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfig = async () => {
    await setGitHubConfig(config);
    setSuccess("Configuration saved");
    setTimeout(() => setSuccess(null), 3000);
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
    setSuccess("Disconnected from GitHub");
  };

  const syncToGitHub = useCallback(async (direction: "push" | "pull") => {
    if (!isConnected) {
      setError("Not connected to GitHub");
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const sync = new GitHubSync(config);
      
      if (direction === "push") {
        const [collectionsRes, requestsRes, envRes, settingsRes] = await Promise.all([
          chrome.storage.sync.get("apiDebugger_collections"),
          chrome.storage.sync.get("apiDebugger_savedRequests"),
          chrome.storage.sync.get("apiDebugger_environments"),
          chrome.storage.sync.get(["sync:theme", "captureFilter"]),
        ]);

        const syncData: SyncData = {
          version: "1.0",
          exportedAt: new Date().toISOString(),
          collections: collectionsRes.apiDebugger_collections || [],
          savedRequests: requestsRes.apiDebugger_savedRequests || [],
          environments: envRes.apiDebugger_environments || [],
          settings: {
            theme: settingsRes["sync:theme"] || "system",
            captureFilter: settingsRes.captureFilter || {},
          },
        };

        const { sha } = await sync.getFile();
        await sync.push(syncData, sha);
        
        const newConfig = { ...config, lastSync: Date.now() };
        await setGitHubConfig(newConfig);
        setLastSync(newConfig.lastSync);
        
        setSuccess("Successfully pushed to GitHub");
      } else {
        const { content } = await sync.getFile();
        
        if (!content) {
          setError("No sync data found in repository");
          return;
        }

        await chrome.storage.sync.set({
          apiDebugger_collections: content.collections || [],
          apiDebugger_savedRequests: content.savedRequests || [],
          apiDebugger_environments: content.environments || [],
          "sync:theme": content.settings?.theme || "system",
          captureFilter: content.settings?.captureFilter || {},
        });

        const newConfig = { ...config, lastSync: Date.now() };
        await setGitHubConfig(newConfig);
        setLastSync(newConfig.lastSync);

        setSuccess("Successfully pulled from GitHub - page will reload to apply changes");
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [config, isConnected]);

  const createDefaultRepo = async () => {
    if (!isConnected) return;
    
    setIsSyncing(true);
    setError(null);
    
    try {
      const sync = new GitHubSync(config);
      await sync.createRepoIfNotExists();
      setSuccess(`Repository "${config.repo}" created or verified`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create repository");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-1">GitHub Sync</h2>
        <p className="text-sm text-muted-foreground">
          Sync your collections, environments, and settings to GitHub for backup and version control
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-4 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-sm text-emerald-500">{success}</p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                Connect to GitHub
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Create a <a href="https://github.com/settings/tokens/new?description=API%20Debugger%20Sync&scopes=repo" target="_blank" rel="noopener" className="text-primary hover:underline">Personal Access Token</a> with <code className="text-xs bg-muted px-1 rounded">repo</code> scope
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Personal Access Token</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-10 bg-input border border-border rounded-md text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">GitHub Username</label>
              <input
                type="text"
                value={config.owner}
                onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                placeholder="your-username"
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Repository</label>
              <input
                type="text"
                value={config.repo}
                onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                placeholder="api-debugger-sync"
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Will be created if it doesn't exist
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <input
                  type="text"
                  value={config.branch}
                  onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                  placeholder="main"
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Path (optional)</label>
                <input
                  type="text"
                  value={config.path}
                  onChange={(e) => setConfig({ ...config, path: e.target.value })}
                  placeholder=""
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={testConnection}
                disabled={!config.token || !config.owner || isTesting}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isTesting ? "Testing..." : "Connect"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Connected to GitHub</span>
                </div>
                <button
                  onClick={disconnect}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Disconnect
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {config.owner}/{config.repo} ({config.branch})
              </p>
              {lastSync && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last sync: {new Date(lastSync).toLocaleString()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => syncToGitHub("push")}
                disabled={isSyncing}
                className="py-3 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Push to GitHub
              </button>
              <button
                onClick={() => syncToGitHub("pull")}
                disabled={isSyncing}
                className="py-3 px-4 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Pull from GitHub
              </button>
            </div>

            {isSyncing && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="ml-2 text-sm text-muted-foreground">Syncing...</span>
              </div>
            )}

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h4 className="font-medium mb-2">What gets synced?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Collections & saved requests
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Environments & variables
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Theme & settings
                </li>
              </ul>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="font-medium mb-1 text-blue-400">Why GitHub Sync?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Free backup & version control</li>
                <li>• Cross-device sync without accounts</li>
                <li>• Share with team via repo access</li>
                <li>• No vendor lock-in - you own your data</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
