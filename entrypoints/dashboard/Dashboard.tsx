import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  RequestRecord,
  Collection,
  SavedRequest,
  Environment,
  RequestConfig,
} from "@/types";
import { RequestBuilderView } from "@/components/RequestBuilderView";
import { EnvironmentManager } from "@/components/EnvironmentManager";
import { CaptureFilter } from "@/components/CaptureFilter";
import { CookieManager } from "@/components/CookieManager";
import { WebSocketClient } from "@/components/protocol/WebSocketClient";
import { SSEClient } from "@/components/protocol/SSEClient";
import { SocketIOClient } from "@/components/protocol/SocketIOClient";
import { GraphQLClient } from "@/components/protocol/GraphQLClient";
import { DiffViewer } from "@/components/diff/DiffViewer";
import { ThemeToggle } from "@/hooks/useTheme";
import { RuntimeVariablesProvider } from "@/hooks/useRuntimeVariables";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { CollectionRunner } from "@/components/CollectionRunner";
import { WorkflowSimulator } from "@/components/WorkflowSimulator";
import { MockServerManager } from "@/components/MockServerManager";
import { ApiDocGenerator } from "@/components/ApiDocGenerator";
import { GitHubSyncPanel } from "@/components/GitHubSyncPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { CertificateViewer } from "@/components/CertificateViewer";
import { ImportModal } from "@/components/ImportModal";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { type ImportResult } from "@/lib/importers";
import { ProfileManager } from "@/components/ProfileManager";
import {
  initializeProfiles,
  getActiveProfileId,
  getProfileData,
  saveProfileData,
  getProfiles,
  setActiveProfileId as saveActiveProfileId,
  type Profile,
} from "@/lib/profiles";

type ViewType =
  | "overview"
  | "builder"
  | "websocket"
  | "sse"
  | "socketio"
  | "graphql"
  | "history"
  | "collections"
  | "workflows"
  | "cookies"
  | "mocks"
  | "docs"
  | "sync"
  | "diff"
  | "certs"
  | "settings";

interface DashboardState {
  requests: RequestRecord[];
  collections: Collection[];
  savedRequests: SavedRequest[];
  selectedRequestId: string | null;
  selectedCollectionId: string | null;
  selectedRequestIds: Set<string>;
  searchQuery: string;
  isLoading: boolean;
}

export default function Dashboard() {
  const [view, setView] = useState<ViewType>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    if (viewParam === "new-request") return "builder";
    if (viewParam === "websocket") return "websocket";
    if (viewParam === "graphql") return "graphql";
    if (viewParam === "history") return "history";
    if (viewParam === "settings") return "settings";
    return "overview";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string>("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [builderConfig, setBuilderConfig] = useState<RequestConfig | null>(
    null,
  );
  const [diffLeft, setDiffLeft] = useState("");
  const [diffRight, setDiffRight] = useState("");

  const openInBuilder = (config: RequestConfig) => {
    setBuilderConfig(config);
    setView("builder");
  };

  const [state, setState] = useState<DashboardState>({
    requests: [],
    collections: [],
    savedRequests: [],
    selectedRequestId: null,
    selectedCollectionId: null,
    selectedRequestIds: new Set(),
    searchQuery: "",
    isLoading: true,
  });

  useKeyboardShortcuts({
    onNewRequest: () => setView("builder"),
    onShowShortcuts: () => setShowShortcuts(true),
    onSendRequest: () => {
      if (view === "builder") {
        document.dispatchEvent(new CustomEvent("api-debugger:send-request"));
      }
    },
  });

  const handleImport = useCallback(
    async (result: ImportResult) => {
      const activeId = await getActiveProfileId();
      const currentData = await getProfileData(activeId);

      if (result.collections && result.collections.length > 0) {
        const newCollections: Collection[] = result.collections.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          requestCount:
            result.requests?.filter((r) => r.collectionId === c.id).length || 0,
        }));

        currentData.collections = [
          ...currentData.collections,
          ...newCollections,
        ];

        setState((s) => ({
          ...s,
          collections: [...s.collections, ...newCollections],
        }));
      }

      if (result.requests && result.requests.length > 0) {
        const collectionId =
          state.collections[0]?.id || result.collections?.[0]?.id || "";
        const newRequests: SavedRequest[] = result.requests.map((r) => ({
          id: r.id,
          name: r.name,
          collectionId: r.collectionId || collectionId,
          requestConfig: {
            method: r.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
            url: r.url,
            headers: r.headers || [],
            params: [],
            body: {
              raw: r.body?.raw,
              json:
                r.body?.mode === "raw" && r.body?.raw?.startsWith("{")
                  ? r.body.raw
                  : undefined,
              formData: r.body?.formData?.map((f) => ({
                name: f.key,
                value: f.value,
                type: f.type as "text" | "file",
              })),
              urlEncoded: r.body?.urlEncoded?.map((u) => ({
                name: u.key,
                value: u.value,
              })),
            },
            bodyType:
              r.body?.mode === "raw"
                ? "raw"
                : r.body?.mode === "formdata"
                  ? "form-data"
                  : r.body?.mode === "urlencoded"
                    ? "x-www-form-urlencoded"
                    : "none",
            auth:
              r.auth?.type === "apikey"
                ? {
                    type: "api-key" as const,
                    apiKey: {
                      key: r.auth.apikey?.key || "",
                      value: r.auth.apikey?.value || "",
                      addTo: r.auth.apikey?.addTo || ("header" as const),
                    },
                  }
                : r.auth?.type === "bearer"
                  ? { type: "bearer" as const, bearer: r.auth.bearer }
                  : r.auth?.type === "basic"
                    ? { type: "basic" as const, basic: r.auth.basic }
                    : { type: "none" as const },
          },
          request: {
            id: r.id,
            url: r.url,
            method: r.method,
            statusCode: 0,
            tabId: 0,
            startTime: Date.now(),
            timeStamp: Date.now(),
            duration: 0,
            requestHeaders: r.headers || [],
            requestBody: null,
            requestBodyText: r.body?.raw || null,
            responseHeaders: [],
          },
          tags: [],
          createdAt: Date.now(),
        }));

        currentData.savedRequests = [
          ...currentData.savedRequests,
          ...newRequests,
        ];

        setState((s) => ({
          ...s,
          savedRequests: [...s.savedRequests, ...newRequests],
        }));
      }

      if (result.environments && result.environments.length > 0) {
        const newEnvironments: Environment[] = result.environments.map((e) => ({
          id: e.id,
          name: e.name,
          variables: e.values,
          isActive: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));

        currentData.environments = [
          ...currentData.environments,
          ...newEnvironments,
        ];
      }

      await saveProfileData(activeId, currentData);
      setShowImport(false);
    },
    [state.collections],
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      // Initialize (migrate old data if needed) then get profiles
      await initializeProfiles();
      const allProfiles = await getProfiles();
      const activeId = await getActiveProfileId();

      setProfiles(allProfiles);
      setActiveProfileIdState(activeId);

      // Load history and profile data in parallel
      const [historyRes, profileData] = await Promise.all([
        chrome.runtime
          .sendMessage({ type: "GET_REQUESTS" })
          .catch(() => ({ requests: [] })),
        getProfileData(activeId),
      ]);

      if (profileData.environments && profileData.environments.length > 0) {
        await chrome.storage.sync.set({
          apiDebugger_environments: profileData.environments,
        });
      }

      if (profileData.aiSettings) {
        await chrome.storage.sync.set({
          "sync:ai_settings": profileData.aiSettings,
        });
      }

      const collections = profileData.collections || [];
      const savedRequests = profileData.savedRequests || [];

      // Auto-select first collection and first request so the builder isn't empty
      const firstCol = collections[0] || null;
      const firstReq = firstCol
        ? savedRequests.find(
            (r: SavedRequest) => r.collectionId === firstCol.id,
          ) || null
        : null;

      setState((s) => ({
        ...s,
        requests: historyRes.requests || [],
        collections,
        savedRequests,
        selectedCollectionId: firstCol?.id || null,
        selectedRequestId: firstReq?.id || null,
        isLoading: false,
      }));
    } catch (err) {
      console.error("[Dashboard] Failed to load data:", err);
      setState((s) => ({ ...s, isLoading: false }));
    }
  };

  const filteredRequests = useMemo(() => {
    if (!state.searchQuery) return state.requests;
    const q = state.searchQuery.toLowerCase();
    return state.requests.filter(
      (r) =>
        r.url.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        String(r.statusCode).includes(q),
    );
  }, [state.requests, state.searchQuery]);

  const selectedRequest = state.selectedRequestId
    ? state.requests.find((r) => r.id === state.selectedRequestId) ||
      state.savedRequests.find((r) => r.id === state.selectedRequestId)?.request
    : null;

  const clearHistory = async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR_REQUESTS" });
    setState((s) => ({
      ...s,
      requests: [],
      selectedRequestId: null,
      selectedRequestIds: new Set(),
    }));
  };

  const deleteRequest = (id: string) => {
    const newSelectedIds = new Set(state.selectedRequestIds);
    newSelectedIds.delete(id);
    setState((s) => ({
      ...s,
      requests: s.requests.filter((r) => r.id !== id),
      selectedRequestId:
        s.selectedRequestId === id ? null : s.selectedRequestId,
      selectedRequestIds: newSelectedIds,
    }));
  };

  const toggleSelectRequest = (id: string) => {
    const newSelectedIds = new Set(state.selectedRequestIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setState((s) => ({ ...s, selectedRequestIds: newSelectedIds }));
  };

  const selectAllRequests = () => {
    setState((s) => ({
      ...s,
      selectedRequestIds: new Set(filteredRequests.map((r) => r.id)),
    }));
  };

  const deselectAllRequests = () => {
    setState((s) => ({ ...s, selectedRequestIds: new Set() }));
  };

  const deleteSelectedRequests = async () => {
    const idsToDelete = state.selectedRequestIds;
    const remainingRequests = state.requests.filter(
      (r) => !idsToDelete.has(r.id),
    );

    await chrome.storage.local.set({ requests: remainingRequests });

    setState((s) => ({
      ...s,
      requests: remainingRequests,
      selectedRequestId: idsToDelete.has(s.selectedRequestId || "")
        ? null
        : s.selectedRequestId,
      selectedRequestIds: new Set(),
    }));
  };

  const exportSelectedRequests = () => {
    const selectedRequests = state.requests.filter((r) =>
      state.selectedRequestIds.has(r.id),
    );
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      requests: selectedRequests.map((r) => ({
        method: r.method,
        url: r.url,
        headers: r.requestHeaders || [],
        body: r.requestBodyText || null,
        response: {
          status: r.statusCode,
          body: r.responseBodyText || null,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-debugger-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-background text-foreground dark">
      {/* Sidebar */}
      <aside
        className={`${sidebarCollapsed ? "w-14" : "w-56"} flex-shrink-0 bg-card border-r border-border flex flex-col transition-all duration-200`}
      >
        {/* Profile Selector */}
        {!sidebarCollapsed && (
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <ProfileSelector
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelect={async (id: string) => {
                await saveActiveProfileId(id);
                setActiveProfileIdState(id);
                window.location.reload();
              }}
            />
          </div>
        )}

        {/* Logo */}
        <div
          className={`p-3 flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"}`}
        >
          <img
            src={chrome.runtime.getURL("/icon/32.png")}
            alt="API Debugger"
            className="w-8 h-8 rounded-lg cursor-pointer flex-shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm truncate">API Debugger</h1>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-accent rounded text-muted-foreground flex-shrink-0"
            >
              <ChevronIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <NavItem
            active={view === "overview"}
            onClick={() => setView("overview")}
            icon={<HomeIcon />}
            label="Overview"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "builder"}
            onClick={() => setView("builder")}
            icon={<PlusIcon />}
            label="New Request"
            collapsed={sidebarCollapsed}
          />
          {!sidebarCollapsed && (
            <div className="pt-2 pb-1">
              <span className="px-3 text-xs text-muted-foreground">
                Protocols
              </span>
            </div>
          )}
          <NavItem
            active={view === "websocket"}
            onClick={() => setView("websocket")}
            icon={<WebSocketIcon />}
            label="WebSocket"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "sse"}
            onClick={() => setView("sse")}
            icon={<SSEIcon />}
            label="SSE"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "socketio"}
            onClick={() => setView("socketio")}
            icon={<SocketIOIcon />}
            label="Socket.IO"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "graphql"}
            onClick={() => setView("graphql")}
            icon={<GraphQLIcon />}
            label="GraphQL"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "history"}
            onClick={() => setView("history")}
            icon={<HistoryIcon />}
            label="History"
            count={state.requests.length}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "collections"}
            onClick={() => setView("collections")}
            icon={<FolderIcon />}
            label="Collections"
            count={state.collections.length}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "workflows"}
            onClick={() => setView("workflows")}
            icon={<WorkflowIcon />}
            label="Workflows"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "cookies"}
            onClick={() => setView("cookies")}
            icon={<CookieIcon />}
            label="Cookies"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "mocks"}
            onClick={() => setView("mocks")}
            icon={<MockIcon />}
            label="Mocks"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "docs"}
            onClick={() => setView("docs")}
            icon={<DocsIcon />}
            label="Docs"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "diff"}
            onClick={() => setView("diff")}
            icon={<DiffIcon />}
            label="Diff"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "certs"}
            onClick={() => setView("certs")}
            icon={<CertIcon />}
            label="Certs"
            collapsed={sidebarCollapsed}
          />
          {!sidebarCollapsed && (
            <div className="pt-2 pb-1">
              <span className="px-3 text-xs text-muted-foreground">
                Settings
              </span>
            </div>
          )}
          <NavItem
            active={view === "sync"}
            onClick={() => setView("sync")}
            icon={<SyncIcon />}
            label="Sync"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={view === "settings"}
            onClick={() => setView("settings")}
            icon={<SettingsIcon />}
            label="Settings"
            collapsed={sidebarCollapsed}
          />
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {state.requests.length} requests captured
            </div>
            <button
              onClick={() => setView("settings")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Help & Settings"
            >
              ?
            </button>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="p-2 border-t border-border flex justify-center">
            <button
              onClick={() => setView("settings")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Help & Settings"
            >
              ?
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex">
        {view === "overview" && (
          <OverviewView
            requests={state.requests}
            onNavigate={(v) => setView(v as ViewType)}
            onClearHistory={async () => {
              await chrome.runtime.sendMessage({ type: "CLEAR_REQUESTS" });
              setState((s) => ({ ...s, requests: [] }));
            }}
          />
        )}

        {view === "builder" && (
          <RuntimeVariablesProvider>
            <RequestBuilderView initialConfig={builderConfig || undefined} />
          </RuntimeVariablesProvider>
        )}

        {view === "websocket" && <WebSocketClient />}

        {view === "sse" && <SSEClient />}

        {view === "socketio" && <SocketIOClient />}

        {view === "graphql" && <GraphQLClient />}

        {view === "diff" && <DiffViewer left={diffLeft} right={diffRight} />}

        {view === "certs" && <CertificateViewer />}

        {view === "history" && (
          <>
            {/* Request List */}
            <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
              {/* Search */}
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={state.searchQuery}
                    onChange={(e) =>
                      setState((s) => ({ ...s, searchQuery: e.target.value }))
                    }
                    placeholder="Search requests..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Selection Actions */}
              {state.selectedRequestIds.size > 0 && (
                <div className="p-2 border-b border-border bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {state.selectedRequestIds.size} selected
                    </span>
                    <button
                      onClick={deselectAllRequests}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Deselect all
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={deleteSelectedRequests}
                      className="flex-1 px-2 py-1.5 text-xs bg-destructive hover:bg-destructive/90 rounded text-destructive-foreground flex items-center justify-center gap-1"
                    >
                      <TrashIcon className="w-3 h-3" />
                      Delete
                    </button>
                    <button
                      onClick={exportSelectedRequests}
                      className="flex-1 px-2 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded text-secondary-foreground flex items-center justify-center gap-1"
                    >
                      <ExportIcon className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-2 border-b border-border flex gap-2">
                <button
                  onClick={loadData}
                  className="flex-1 px-2 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded text-secondary-foreground flex items-center justify-center gap-1"
                >
                  <RefreshIcon className="w-3 h-3" />
                  Refresh
                </button>
                <button
                  onClick={clearHistory}
                  className="flex-1 px-2 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded text-secondary-foreground flex items-center justify-center gap-1"
                >
                  <TrashIcon className="w-3 h-3" />
                  Clear
                </button>
                {filteredRequests.length > 0 && (
                  <button
                    onClick={selectAllRequests}
                    className="px-2 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded text-secondary-foreground"
                    title="Select all"
                  >
                    <CheckIcon className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {state.isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                    <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                      <HistoryIcon className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-sm font-medium">
                      {state.searchQuery
                        ? "No matching requests"
                        : "No requests yet"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      {state.searchQuery
                        ? "Try a different search term"
                        : "Browse the web to capture API requests"}
                    </p>
                  </div>
                ) : (
                  filteredRequests.map((request) => (
                    <RequestListItem
                      key={request.id}
                      request={request}
                      selected={state.selectedRequestId === request.id}
                      checked={state.selectedRequestIds.has(request.id)}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          selectedRequestId: request.id,
                        }))
                      }
                      onToggleSelect={() => toggleSelectRequest(request.id)}
                      onDelete={() => deleteRequest(request.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Request Detail */}
            <div className="flex-1 flex flex-col">
              {selectedRequest ? (
                <RequestDetailView request={selectedRequest} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <CodeIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm">Select a request to view details</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {view === "collections" && (
          <CollectionsView
            collections={state.collections}
            savedRequests={state.savedRequests}
            selectedCollectionId={state.selectedCollectionId}
            onSelectCollection={(id) =>
              setState((s) => ({
                ...s,
                selectedCollectionId: id,
                selectedRequestId: null,
              }))
            }
            onOpenInBuilder={openInBuilder}
            onCompare={(leftBody, rightBody) => {
              setDiffLeft(leftBody);
              setDiffRight(rightBody);
              setView("diff");
            }}
          />
        )}

        {view === "cookies" && <CookieManager />}

        {view === "mocks" && <MockServerManager />}

        {view === "docs" && (
          <ApiDocGenerator
            collections={state.collections}
            savedRequests={state.savedRequests}
          />
        )}

        {view === "sync" && <GitHubSyncPanel />}

        {view === "workflows" && (
          <WorkflowSimulator
            requests={state.savedRequests}
            onRequestSend={async (config) => {
              if (!config) throw new Error("No config");
              const headers: Record<string, string> = {};
              config.headers.forEach((h) => {
                if (h.enabled !== false && h.name) {
                  headers[h.name] = h.value;
                }
              });
              if (config.auth.type === "bearer" && config.auth.bearer?.token) {
                headers["Authorization"] = "Bearer " + config.auth.bearer.token;
              }
              let body: string | undefined;
              if (config.bodyType === "json" && config.body.json) {
                body = config.body.json;
                if (!headers["Content-Type"])
                  headers["Content-Type"] = "application/json";
              } else if (config.bodyType === "raw" && config.body.raw) {
                body = config.body.raw;
              }
              let url = config.url;
              if (config.params.length > 0) {
                const enabledParams = config.params.filter(
                  (p) => p.enabled !== false,
                );
                if (enabledParams.length > 0) {
                  const sep = url.includes("?") ? "&" : "?";
                  url +=
                    sep +
                    enabledParams
                      .map(
                        (p) =>
                          `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`,
                      )
                      .join("&");
                }
              }
              const start = performance.now();
              const response = await fetch(url, {
                method: config.method,
                headers,
                body:
                  config.method !== "GET" && config.method !== "HEAD"
                    ? body
                    : undefined,
              });
              const responseBody = await response.text();
              const duration = performance.now() - start;
              const headerPairs: [string, string][] = [];
              response.headers.forEach((v, k) => headerPairs.push([k, v]));
              return {
                status: response.status,
                statusText: response.statusText,
                headers: headerPairs,
                body: responseBody,
                duration,
                size: responseBody.length,
              };
            }}
          />
        )}

        {view === "settings" && <SettingsView />}
      </main>

      {/* Modals */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}

      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

// Components

function ProfileSelector({
  profiles,
  activeProfileId,
  onSelect,
}: {
  profiles: Profile[];
  activeProfileId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const active = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2.5 py-2 bg-input border border-border rounded-md hover:bg-accent/30 transition-colors text-left"
      >
        <span className="text-base flex-shrink-0">{active?.icon || "🏠"}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">
            {active?.name || "Select profile"}
          </div>
          {active?.description && (
            <div className="text-[10px] text-muted-foreground truncate">
              {active.description}
            </div>
          )}
        </div>
        <svg
          className={`w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
            {profiles.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No profiles yet
              </div>
            ) : (
              profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setIsOpen(false);
                    onSelect(p.id);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors ${
                    p.id === activeProfileId ? "bg-accent/30" : ""
                  }`}
                >
                  <span className="text-base flex-shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    {p.description && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {p.description}
                      </div>
                    )}
                  </div>
                  {p.id === activeProfileId && (
                    <svg
                      className="w-3 h-3 text-primary flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  count,
  collapsed,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      } ${collapsed ? "justify-center" : ""}`}
    >
      {icon}
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {count !== undefined && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
        </>
      )}
    </button>
  );
}

function RequestListItem({
  request,
  selected,
  checked,
  onClick,
  onToggleSelect,
  onDelete,
}: {
  request: RequestRecord;
  selected: boolean;
  checked: boolean;
  onClick: () => void;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  const statusColor =
    request.statusCode >= 500
      ? "text-destructive"
      : request.statusCode >= 400
        ? "text-warning"
        : request.statusCode >= 300
          ? "text-primary"
          : "text-success";

  const methodBgColor =
    request.method === "GET"
      ? "bg-success/10 text-success"
      : request.method === "POST"
        ? "bg-warning/10 text-warning"
        : request.method === "PUT"
          ? "bg-primary/10 text-primary"
          : request.method === "DELETE"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground";

  return (
    <div
      className={`group px-3 py-2.5 border-b border-border cursor-pointer transition-colors ${
        selected ? "bg-accent/80" : "hover:bg-accent/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-border"
        />
        <span
          className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded ${methodBgColor}`}
        >
          {request.method}
        </span>
        <span className={`font-mono text-xs font-medium ${statusColor}`}>
          {request.statusCode}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
          {request.duration.toFixed(0)}ms
        </span>
      </div>
      <div
        className="text-xs text-muted-foreground truncate pl-6 hover:text-foreground transition-colors"
        onClick={onClick}
        title={request.url}
      >
        {request.url}
      </div>
      <div className="flex items-center gap-2 mt-1.5 pl-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function RequestDetailView({ request }: { request: RequestRecord }) {
  const [activeTab, setActiveTab] = useState<
    "headers" | "body" | "response" | "timing"
  >("headers");

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`font-mono text-sm font-semibold ${
              request.method === "GET"
                ? "text-success"
                : request.method === "POST"
                  ? "text-warning"
                  : request.method === "PUT"
                    ? "text-primary"
                    : request.method === "DELETE"
                      ? "text-destructive"
                      : "text-muted-foreground"
            }`}
          >
            {request.method}
          </span>
          <span
            className={`font-mono text-sm ${
              request.statusCode >= 500
                ? "text-destructive"
                : request.statusCode >= 400
                  ? "text-warning"
                  : request.statusCode >= 300
                    ? "text-primary"
                    : "text-success"
            }`}
          >
            {request.statusCode}
          </span>
        </div>
        <div className="font-mono text-xs text-muted-foreground break-all">
          {request.url}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {new Date(request.timeStamp).toLocaleString()} ·{" "}
          {request.duration.toFixed(0)}ms
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["headers", "body", "response", "timing"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "headers" && (
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              Request Headers
            </h3>
            {request.requestHeaders?.map((h, i) => (
              <div key={i} className="flex text-xs">
                <span className="text-primary w-40 flex-shrink-0 truncate">
                  {h.name}
                </span>
                <span className="text-muted-foreground truncate">
                  {h.value}
                </span>
              </div>
            ))}
            {request.responseHeaders && (
              <>
                <h3 className="text-xs font-medium text-muted-foreground mb-2 mt-4">
                  Response Headers
                </h3>
                {request.responseHeaders.map((h, i) => (
                  <div key={i} className="flex text-xs">
                    <span className="text-primary w-40 flex-shrink-0 truncate">
                      {h.name}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {h.value}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "body" && (
          <div>
            {request.requestBodyText ? (
              <pre className="text-xs font-mono text-foreground bg-muted p-3 rounded overflow-auto">
                {request.requestBodyText}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground">
                No request body
              </div>
            )}
          </div>
        )}

        {activeTab === "response" && (
          <div>
            {request.responseBodyText ? (
              <pre className="text-xs font-mono text-foreground bg-muted p-3 rounded overflow-auto">
                {request.responseBodyText}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground">
                No response body captured
              </div>
            )}
          </div>
        )}

        {activeTab === "timing" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Duration</span>
              <span className="font-mono text-foreground">
                {request.duration.toFixed(2)}ms
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status Code</span>
              <span className="font-mono text-foreground">
                {request.statusCode}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tab ID</span>
              <span className="font-mono text-foreground">{request.tabId}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Request Type</span>
              <span className="font-mono text-foreground">
                {request.type || "main_frame"}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function CollectionsView({
  collections,
  savedRequests,
  selectedCollectionId,
  onSelectCollection,
  onOpenInBuilder,
  onCompare,
}: {
  collections: Collection[];
  savedRequests: SavedRequest[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onOpenInBuilder: (config: RequestConfig) => void;
  onCompare: (leftBody: string, rightBody: string) => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const selectedCollection = collections.find(
    (c) => c.id === selectedCollectionId,
  );
  const collectionRequests = selectedCollectionId
    ? savedRequests.filter((r) => r.collectionId === selectedCollectionId)
    : [];
  const selectedRequest = collectionRequests.find(
    (r) => r.id === selectedRequestId,
  );

  const getMethodColor = (m: string) => {
    switch (m) {
      case "GET":
        return "text-green-600 dark:text-green-400";
      case "POST":
        return "text-blue-600 dark:text-blue-400";
      case "PUT":
        return "text-amber-600 dark:text-amber-400";
      case "PATCH":
        return "text-purple-600 dark:text-purple-400";
      case "DELETE":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const sendRequest = async (config: SavedRequest["requestConfig"]) => {
    if (!config) {
      throw new Error("No request config");
    }

    const headers: Record<string, string> = {};
    config.headers.forEach((h) => {
      if (h.enabled !== false && h.name) {
        headers[h.name] = h.value;
      }
    });

    if (config.auth.type === "bearer" && config.auth.bearer?.token) {
      headers["Authorization"] = "Bearer " + config.auth.bearer.token;
    } else if (config.auth.type === "basic" && config.auth.basic) {
      const encoded = btoa(
        config.auth.basic.username + ":" + config.auth.basic.password,
      );
      headers["Authorization"] = "Basic " + encoded;
    } else if (
      config.auth.type === "api-key" &&
      config.auth.apiKey?.addTo === "header"
    ) {
      headers[config.auth.apiKey.key] = config.auth.apiKey.value;
    }

    let body: string | undefined;
    if (config.bodyType === "json" && config.body.json) {
      body = config.body.json;
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    } else if (config.bodyType === "raw" && config.body.raw) {
      body = config.body.raw;
    }

    let url = config.url;
    if (config.params.length > 0) {
      const enabledParams = config.params.filter((p) => p.enabled !== false);
      if (enabledParams.length > 0) {
        const sep = url.includes("?") ? "&" : "?";
        const queryString = enabledParams
          .map(
            (p) =>
              encodeURIComponent(p.name) + "=" + encodeURIComponent(p.value),
          )
          .join("&");
        url = url + sep + queryString;
      }
    }

    const start = performance.now();
    const response = await fetch(url, {
      method: config.method,
      headers,
      body:
        config.method !== "GET" && config.method !== "HEAD" ? body : undefined,
    });

    const responseBody = await response.text();
    const duration = performance.now() - start;

    const headerPairs: [string, string][] = [];
    response.headers.forEach((v, k) => headerPairs.push([k, v]));

    return {
      status: response.status,
      statusText: response.statusText,
      headers: headerPairs,
      body: responseBody,
      duration,
      size: responseBody.length,
    };
  };

  return (
    <div className="flex-1 flex">
      {/* Collections List */}
      <div className="w-48 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-medium">Collections</h2>
        </div>
        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {collections.length === 0 ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No collections yet
              </p>
              <p className="text-xs text-muted-foreground">
                Create a new request or switch to the Demo profile to explore
                examples
              </p>
            </div>
          ) : (
            collections.map((col) => (
              <button
                key={col.id}
                onClick={() => {
                  onSelectCollection(col.id);
                  setIsRunning(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedCollectionId === col.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <FolderIcon className="w-4 h-4" />
                <span className="flex-1 text-left truncate">{col.name}</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {
                    savedRequests.filter((r) => r.collectionId === col.id)
                      .length
                  }
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Collection Content + Detail */}
      <div className="flex-1 flex">
        {/* Request List */}
        <div
          className={`${selectedRequest ? "w-72 border-r border-border" : "flex-1"} overflow-y-auto`}
        >
          {selectedCollection ? (
            isRunning ? (
              <CollectionRunner
                requests={collectionRequests}
                onRequestSend={sendRequest}
              />
            ) : (
              <div>
                <div className="p-4 border-b border-border flex items-start justify-between">
                  <div>
                    <h2 className="font-medium">{selectedCollection.name}</h2>
                    {selectedCollection.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedCollection.description}
                      </p>
                    )}
                  </div>
                  {collectionRequests.length > 0 && (
                    <button
                      onClick={() => setIsRunning(true)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 flex items-center gap-2"
                    >
                      <PlayIcon className="w-4 h-4" />
                      Run
                    </button>
                  )}
                </div>
                <div className="p-2">
                  {collectionRequests.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No requests in this collection
                    </div>
                  ) : (
                    collectionRequests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() =>
                          setSelectedRequestId(
                            selectedRequestId === req.id ? null : req.id,
                          )
                        }
                        className={`px-3 py-2 border-b border-border cursor-pointer transition-colors ${
                          selectedRequestId === req.id
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs font-bold ${getMethodColor(req.requestConfig?.method || req.request.method)}`}
                          >
                            {req.requestConfig?.method || req.request.method}
                          </span>
                          <span className="text-sm text-foreground">
                            {req.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-1 font-mono">
                          {req.requestConfig?.url || req.request.url}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FolderIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm">Select a collection to view</p>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedRequest && (
          <div className="flex-1 overflow-y-auto p-4">
            <SavedRequestDetail
              request={selectedRequest}
              onClose={() => setSelectedRequestId(null)}
              onOpenInBuilder={onOpenInBuilder}
              allRequests={collectionRequests}
              onCompare={(left, right) => {
                const leftReq = collectionRequests.find((r) => r.id === left);
                const rightReq = collectionRequests.find((r) => r.id === right);
                if (leftReq?.lastResponse && rightReq?.lastResponse) {
                  const pretty = (body: string) => {
                    try {
                      return JSON.stringify(JSON.parse(body), null, 2);
                    } catch {
                      return body;
                    }
                  };
                  onCompare(
                    pretty(leftReq.lastResponse.body),
                    pretty(rightReq.lastResponse.body),
                  );
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SavedRequestDetail({
  request,
  onClose,
  onOpenInBuilder,
  allRequests,
  onCompare,
}: {
  request: SavedRequest;
  onClose: () => void;
  onOpenInBuilder: (config: RequestConfig) => void;
  allRequests: SavedRequest[];
  onCompare: (left: string, right: string) => void;
}) {
  const config = request.requestConfig;
  if (!config) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <button
          onClick={onClose}
          className="p-1 hover:bg-accent rounded text-muted-foreground"
          title="Back to list"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h3 className="text-base font-medium flex-1 truncate">
          {request.name}
        </h3>
        <button
          onClick={() => onOpenInBuilder(config)}
          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Open in Builder
        </button>
      </div>

      {/* Two column layout */}
      <div className="flex-1 flex gap-4 overflow-hidden pt-4">
        {/* Left: Request details */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Method + URL */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Request
            </label>
            <div className="mt-1 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-muted">
                {config.method}
              </span>
              <span className="text-xs font-mono truncate flex-1">
                {config.url}
              </span>
            </div>
          </div>

          {/* Auth */}
          {config.auth.type !== "none" && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Auth
              </label>
              <div className="mt-1 text-xs">
                <span className="px-2 py-0.5 rounded bg-muted">
                  {config.auth.type}
                </span>
                {config.auth.type === "bearer" && (
                  <span className="ml-2 font-mono text-muted-foreground">
                    {config.auth.bearer?.token?.slice(0, 20)}...
                  </span>
                )}
                {config.auth.type === "basic" && (
                  <span className="ml-2 font-mono text-muted-foreground">
                    {config.auth.basic?.username}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Headers */}
          {config.headers.length > 0 && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Headers (
                {config.headers.filter((h) => h.enabled !== false).length})
              </label>
              <div className="mt-1 space-y-1">
                {config.headers
                  .filter((h) => h.enabled !== false)
                  .map((h, i) => (
                    <div key={i} className="text-xs font-mono">
                      <span className="text-primary">{h.name}</span>
                      <span className="text-muted-foreground">: </span>
                      <span className="text-muted-foreground truncate">
                        {h.value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Params */}
          {config.params.length > 0 && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Params (
                {config.params.filter((p) => p.enabled !== false).length})
              </label>
              <div className="mt-1 space-y-1">
                {config.params
                  .filter((p) => p.enabled !== false)
                  .map((p, i) => (
                    <div key={i} className="text-xs font-mono">
                      <span className="text-primary">{p.name}</span>
                      <span className="text-muted-foreground">=</span>
                      <span className="text-muted-foreground">{p.value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Body */}
          {config.bodyType !== "none" && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Body ({config.bodyType})
              </label>
              <pre className="mt-1 text-xs font-mono bg-muted p-2 rounded overflow-x-auto max-h-40">
                {config.body.raw || config.body.json || "(empty)"}
              </pre>
            </div>
          )}

          {/* Scripts */}
          {config.preRequestScript && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Pre-request Script
              </label>
              <pre className="mt-1 text-xs font-mono bg-muted p-2 rounded overflow-x-auto max-h-32">
                {config.preRequestScript}
              </pre>
            </div>
          )}
          {config.postResponseScript && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Post-response Script
              </label>
              <pre className="mt-1 text-xs font-mono bg-muted p-2 rounded overflow-x-auto max-h-32">
                {config.postResponseScript}
              </pre>
            </div>
          )}
        </div>

        {/* Right: Quick info */}
        <div className="w-48 space-y-3 overflow-y-auto border-l border-border pl-4">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Method
            </label>
            <div className="mt-1 text-sm font-mono font-bold">
              {config.method}
            </div>
          </div>
          {config.auth.type !== "none" && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Auth
              </label>
              <div className="mt-1 text-xs">{config.auth.type}</div>
            </div>
          )}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Headers
            </label>
            <div className="mt-1 text-sm font-mono">
              {config.headers.filter((h) => h.enabled !== false).length}
            </div>
          </div>
          {config.params.length > 0 && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Params
              </label>
              <div className="mt-1 text-sm font-mono">
                {config.params.filter((p) => p.enabled !== false).length}
              </div>
            </div>
          )}
          {config.bodyType !== "none" && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Body
              </label>
              <div className="mt-1 text-xs">{config.bodyType}</div>
            </div>
          )}
          {request.lastResponse && (
            <div className="pt-2 border-t border-border">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Last Response
              </label>
              <div className="mt-1">
                <span
                  className={`text-sm font-mono font-bold ${
                    request.lastResponse.status < 300
                      ? "text-success"
                      : request.lastResponse.status < 400
                        ? "text-warning"
                        : "text-destructive"
                  }`}
                >
                  {request.lastResponse.status}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {request.lastResponse.duration}ms
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(request.lastResponse.timestamp).toLocaleString()}
              </div>
              {/* Compare with another response */}
              {allRequests.filter((r) => r.id !== request.id && r.lastResponse)
                .length > 0 && (
                <div className="mt-2 space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Compare with
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        onCompare(request.id, e.target.value);
                      }
                    }}
                    className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
                  >
                    <option value="">Select request...</option>
                    {allRequests
                      .filter((r) => r.id !== request.id && r.lastResponse)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.lastResponse?.status})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AINudge({ onNavigate }: { onNavigate: (v: string) => void }) {
  const [hasAI, setHasAI] = useState<boolean | null>(null);

  useEffect(() => {
    chrome.storage.sync.get("sync:ai_settings").then((r) => {
      setHasAI(!!r["sync:ai_settings"]?.apiKey);
    });
  }, []);

  if (hasAI === null || hasAI) return null;

  return (
    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
      <span className="text-lg">🤖</span>
      <div className="flex-1">
        <p className="text-sm font-medium">Enable AI Assistant</p>
        <p className="text-xs text-muted-foreground">
          Add your OpenRouter key to get help debugging requests, explaining
          responses, and generating tests
        </p>
      </div>
      <button
        onClick={() => onNavigate("settings")}
        className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 whitespace-nowrap"
      >
        Set up AI
      </button>
    </div>
  );
}

function OverviewView({
  requests,
  onNavigate,
  onClearHistory,
}: {
  requests: RequestRecord[];
  onNavigate: (view: string) => void;
  onClearHistory: () => void;
}) {
  const [captureEnabled, setCaptureEnabled] = useState(true);
  const [filter, setFilter] = useState<"all" | "success" | "errors">("all");

  useEffect(() => {
    chrome.storage.local.get("captureEnabled").then((r) => {
      if (r.captureEnabled !== undefined) setCaptureEnabled(r.captureEnabled);
    });
  }, []);

  const toggleCapture = async () => {
    const next = !captureEnabled;
    setCaptureEnabled(next);
    await chrome.storage.local.set({ captureEnabled: next });
    await chrome.runtime.sendMessage({ type: "SET_CAPTURE", enabled: next });
  };

  const errorCount = requests.filter((r) => r.statusCode >= 400).length;
  const successCount = requests.filter(
    (r) => r.statusCode > 0 && r.statusCode < 400,
  ).length;

  const filtered = requests.filter((r) => {
    if (filter === "errors") return r.statusCode >= 400;
    if (filter === "success") return r.statusCode > 0 && r.statusCode < 400;
    return true;
  });

  const recent = filtered.slice(0, 15);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Overview</h1>
            <p className="text-sm text-muted-foreground">
              {requests.length} requests captured
            </p>
          </div>
          <button
            onClick={toggleCapture}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              captureEnabled ? "bg-success" : "bg-muted"
            }`}
            title={captureEnabled ? "Capturing enabled" : "Capturing disabled"}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                captureEnabled ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setFilter("all")}
            className={`p-4 rounded-lg border text-left transition-colors ${
              filter === "all"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-accent/30"
            }`}
          >
            <div className="text-2xl font-bold">{requests.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </button>
          <button
            onClick={() => setFilter("success")}
            className={`p-4 rounded-lg border text-left transition-colors ${
              filter === "success"
                ? "border-success bg-success/5"
                : "border-border bg-card hover:bg-accent/30"
            }`}
          >
            <div className="text-2xl font-bold text-success">
              {successCount}
            </div>
            <div className="text-sm text-muted-foreground">Success</div>
          </button>
          <button
            onClick={() => setFilter("errors")}
            className={`p-4 rounded-lg border text-left transition-colors ${
              filter === "errors"
                ? "border-destructive bg-destructive/5"
                : "border-border bg-card hover:bg-accent/30"
            }`}
          >
            <div className="text-2xl font-bold text-destructive">
              {errorCount}
            </div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate("builder")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            + New Request
          </button>
          <button
            onClick={() => onNavigate("websocket")}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80"
          >
            WebSocket
          </button>
          <button
            onClick={() => onNavigate("graphql")}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80"
          >
            GraphQL
          </button>
          <button
            onClick={() => onNavigate("collections")}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80"
          >
            Collections
          </button>
          <button
            onClick={() => onNavigate("settings")}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80"
          >
            Settings
          </button>
          {requests.length > 0 && (
            <button
              onClick={onClearHistory}
              className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm ml-auto"
            >
              Clear All
            </button>
          )}
        </div>

        {/* AI Nudge */}
        <AINudge onNavigate={onNavigate} />

        {/* Recent Requests */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">
              {filter === "all"
                ? "Recent Requests"
                : `${filter === "success" ? "Success" : "Error"} Requests`}
            </span>
            {filtered.length > 15 && (
              <button
                onClick={() => onNavigate("history")}
                className="text-xs text-primary hover:underline"
              >
                View all ({filtered.length})
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                {filter === "all"
                  ? "No requests captured yet"
                  : `No ${filter} requests`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse the web to capture API requests
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((req) => (
                <div
                  key={req.id}
                  className="px-4 py-2 flex items-center gap-3 hover:bg-accent/30 cursor-pointer"
                  onClick={() => onNavigate("history")}
                >
                  <span
                    className={`text-xs font-mono font-bold w-10 ${
                      req.statusCode >= 400
                        ? "text-destructive"
                        : req.statusCode >= 200
                          ? "text-success"
                          : "text-muted-foreground"
                    }`}
                  >
                    {req.statusCode || "---"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground w-12">
                    {req.method}
                  </span>
                  <span className="text-sm truncate flex-1">
                    {(() => {
                      try {
                        return new URL(req.url).pathname;
                      } catch {
                        return req.url;
                      }
                    })()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {req.duration ? `${req.duration}ms` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  const [settingsTab, setSettingsTab] = useState<
    "profiles" | "ai" | "environments" | "filters" | "shortcuts"
  >("profiles");

  return (
    <div className="flex-1 flex">
      {/* Settings Tabs */}
      <div className="w-48 border-r border-border p-2 space-y-1">
        <button
          onClick={() => setSettingsTab("profiles")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
            settingsTab === "profiles"
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          }`}
        >
          <FolderIcon className="w-4 h-4" />
          Profiles
        </button>
        <button
          onClick={() => setSettingsTab("ai")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
            settingsTab === "ai"
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          }`}
        >
          <SparklesIcon className="w-4 h-4" />
          AI Settings
        </button>
        <button
          onClick={() => setSettingsTab("environments")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
            settingsTab === "environments"
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          }`}
        >
          <GlobeIcon className="w-4 h-4" />
          Environments
        </button>
        <button
          onClick={() => setSettingsTab("filters")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
            settingsTab === "filters"
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          }`}
        >
          <FilterIcon className="w-4 h-4" />
          Capture Filters
        </button>
        <button
          onClick={() => setSettingsTab("shortcuts")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
            settingsTab === "shortcuts"
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          }`}
        >
          <KeyboardIcon className="w-4 h-4" />
          Shortcuts
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto">
        {settingsTab === "profiles" && <ProfileManager />}

        {settingsTab === "ai" && <SettingsPanel />}

        {settingsTab === "environments" && <EnvironmentManager />}

        {settingsTab === "filters" && <CaptureFilter />}

        {settingsTab === "shortcuts" && (
          <div className="p-6">
            <h3 className="font-medium mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-3">
              {[
                { key: "Ctrl+R", action: "Refresh request list" },
                { key: "Ctrl+F", action: "Focus search" },
                { key: "Ctrl+Enter", action: "Send request" },
                { key: "Ctrl+S", action: "Save to collection" },
                { key: "Ctrl+Shift+Delete", action: "Clear history" },
                { key: "Escape", action: "Close panel" },
              ].map(({ key, action }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 border-b border-border"
                >
                  <span className="text-sm text-muted-foreground">
                    {action}
                  </span>
                  <kbd className="px-3 py-1 text-xs bg-muted rounded font-mono">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons

function HistoryIcon({ className = "w-4 h-4" }: { className?: string } = {}) {
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
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChevronIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function FolderIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

function PlayIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CookieIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function MockIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      />
    </svg>
  );
}

function DocsIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function RefreshIcon({ className = "w-3 h-3" }: { className?: string }) {
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
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function TrashIcon({ className = "w-3 h-3" }: { className?: string }) {
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
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function ExportIcon({ className = "w-3 h-3" }: { className?: string }) {
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

function CheckIcon({ className = "w-3 h-3" }: { className?: string }) {
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

function CodeIcon({ className = "w-8 h-8" }: { className?: string }) {
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
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function GlobeIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function FilterIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function KeyboardIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function WebSocketIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function SSEIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function SocketIOIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function GraphQLIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      />
    </svg>
  );
}

function DiffIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function CertIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
