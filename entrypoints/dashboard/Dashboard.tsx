import { useState, useEffect, useMemo } from "react";
import type { RequestRecord, Collection, SavedRequest } from "@/types";
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
import { CollectionRunner } from "@/components/CollectionRunner";
import { MockServerManager } from "@/components/MockServerManager";
import { ApiDocGenerator } from "@/components/ApiDocGenerator";

type ViewType = "builder" | "websocket" | "sse" | "socketio" | "graphql" | "history" | "collections" | "cookies" | "mocks" | "docs" | "diff" | "settings";

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
  const [view, setView] = useState<ViewType>("history");
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const historyRes = await chrome.runtime.sendMessage({ type: "GET_REQUESTS" });
      const storageRes = await chrome.storage.sync.get(["apiDebugger_collections", "apiDebugger_savedRequests"]);

      setState((s) => ({
        ...s,
        requests: historyRes.requests || [],
        collections: storageRes.apiDebugger_collections || [],
        savedRequests: storageRes.apiDebugger_savedRequests || [],
        isLoading: false,
      }));
    } catch (err) {
      console.error("Failed to load data:", err);
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
        String(r.statusCode).includes(q)
    );
  }, [state.requests, state.searchQuery]);

  const selectedRequest = state.selectedRequestId
    ? state.requests.find((r) => r.id === state.selectedRequestId) ||
      state.savedRequests.find((r) => r.id === state.selectedRequestId)?.request
    : null;

  const clearHistory = async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR_REQUESTS" });
    setState((s) => ({ ...s, requests: [], selectedRequestId: null, selectedRequestIds: new Set() }));
  };

  const deleteRequest = (id: string) => {
    const newSelectedIds = new Set(state.selectedRequestIds);
    newSelectedIds.delete(id);
    setState((s) => ({
      ...s,
      requests: s.requests.filter((r) => r.id !== id),
      selectedRequestId: s.selectedRequestId === id ? null : s.selectedRequestId,
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
    const remainingRequests = state.requests.filter((r) => !idsToDelete.has(r.id));
    
    await chrome.storage.local.set({ requests: remainingRequests });
    
    setState((s) => ({
      ...s,
      requests: remainingRequests,
      selectedRequestId: idsToDelete.has(s.selectedRequestId || "") ? null : s.selectedRequestId,
      selectedRequestIds: new Set(),
    }));
  };

  const exportSelectedRequests = () => {
    const selectedRequests = state.requests.filter((r) => state.selectedRequestIds.has(r.id));
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
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
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
      <aside className="w-56 flex-shrink-0 bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img
              src={chrome.runtime.getURL("/icon/32.png")}
              alt="API Debugger"
              className="w-8 h-8 rounded-lg"
            />
            <div>
              <h1 className="font-semibold text-sm">API Debugger</h1>
              <p className="text-xs text-muted-foreground">v0.1.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          <NavItem
            active={view === "builder"}
            onClick={() => setView("builder")}
            icon={<PlusIcon />}
            label="New Request"
          />
          <div className="pt-2 pb-1">
            <span className="px-3 text-xs text-muted-foreground">Protocols</span>
          </div>
          <NavItem
            active={view === "websocket"}
            onClick={() => setView("websocket")}
            icon={<WebSocketIcon />}
            label="WebSocket"
          />
          <NavItem
            active={view === "sse"}
            onClick={() => setView("sse")}
            icon={<SSEIcon />}
            label="SSE"
          />
          <NavItem
            active={view === "socketio"}
            onClick={() => setView("socketio")}
            icon={<SocketIOIcon />}
            label="Socket.IO"
          />
          <NavItem
            active={view === "graphql"}
            onClick={() => setView("graphql")}
            icon={<GraphQLIcon />}
            label="GraphQL"
          />
          <div className="pt-2 pb-1">
            <span className="px-3 text-xs text-muted-foreground">Tools</span>
          </div>
          <NavItem
            active={view === "history"}
            onClick={() => setView("history")}
            icon={<HistoryIcon />}
            label="History"
            count={state.requests.length}
          />
          <NavItem
            active={view === "collections"}
            onClick={() => setView("collections")}
            icon={<FolderIcon />}
            label="Collections"
            count={state.collections.length}
          />
          <NavItem
            active={view === "cookies"}
            onClick={() => setView("cookies")}
            icon={<CookieIcon />}
            label="Cookies"
          />
          <NavItem
            active={view === "mocks"}
            onClick={() => setView("mocks")}
            icon={<MockIcon />}
            label="Mocks"
          />
          <NavItem
            active={view === "docs"}
            onClick={() => setView("docs")}
            icon={<DocsIcon />}
            label="Docs"
          />
          <NavItem
            active={view === "diff"}
            onClick={() => setView("diff")}
            icon={<DiffIcon />}
            label="Diff"
          />
          <NavItem
            active={view === "settings"}
            onClick={() => setView("settings")}
            icon={<SettingsIcon />}
            label="Settings"
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {state.requests.length} requests captured
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex">
        {view === "builder" && (
          <RuntimeVariablesProvider>
            <RequestBuilderView />
          </RuntimeVariablesProvider>
        )}

        {view === "websocket" && <WebSocketClient />}

        {view === "sse" && <SSEClient />}

        {view === "socketio" && <SocketIOClient />}

        {view === "graphql" && <GraphQLClient />}

        {view === "diff" && <DiffViewer left="" right="" />}

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
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {state.searchQuery ? "No matching requests" : "No requests captured yet"}
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
              setState((s) => ({ ...s, selectedCollectionId: id, selectedRequestId: null }))
            }
          />
        )}

        {view === "cookies" && <CookieManager />}

        {view === "mocks" && <MockServerManager />}

        {view === "settings" && <SettingsView />}
      </main>
    </div>
  );
}

// Components

function NavItem({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{count}</span>
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
      ? "text-red-500"
      : request.statusCode >= 400
      ? "text-amber-500"
      : request.statusCode >= 300
      ? "text-blue-500"
      : "text-emerald-500";

  const methodColor =
    request.method === "GET"
      ? "text-emerald-500"
      : request.method === "POST"
      ? "text-amber-500"
      : request.method === "PUT"
      ? "text-blue-500"
      : request.method === "DELETE"
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <div
      className={`group px-3 py-2 border-b border-border cursor-pointer transition-colors ${
        selected ? "bg-accent" : "hover:bg-accent/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-border"
        />
        <span className={`font-mono text-xs font-medium ${methodColor}`}>
          {request.method}
        </span>
        <span className={`font-mono text-xs ${statusColor}`}>
          {request.statusCode}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">{request.duration.toFixed(0)}ms</span>
      </div>
      <div className="text-xs text-muted-foreground truncate pl-6" onClick={onClick}>{request.url}</div>
      <div className="flex items-center gap-2 mt-1 pl-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function RequestDetailView({ request }: { request: RequestRecord }) {
  const [activeTab, setActiveTab] = useState<"headers" | "body" | "response" | "timing">("headers");

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`font-mono text-sm font-semibold ${
              request.method === "GET"
                ? "text-emerald-500"
                : request.method === "POST"
                ? "text-amber-500"
                : request.method === "PUT"
                ? "text-blue-500"
                : request.method === "DELETE"
                ? "text-red-500"
                : "text-muted-foreground"
            }`}
          >
            {request.method}
          </span>
          <span
            className={`font-mono text-sm ${
              request.statusCode >= 500
                ? "text-red-500"
                : request.statusCode >= 400
                ? "text-amber-500"
                : request.statusCode >= 300
                ? "text-blue-500"
                : "text-emerald-500"
            }`}
          >
            {request.statusCode}
          </span>
        </div>
        <div className="font-mono text-xs text-muted-foreground break-all">{request.url}</div>
        <div className="text-xs text-muted-foreground mt-2">
          {new Date(request.timeStamp).toLocaleString()} · {request.duration.toFixed(0)}ms
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
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Request Headers</h3>
            {request.requestHeaders?.map((h, i) => (
              <div key={i} className="flex text-xs">
                <span className="text-primary w-40 flex-shrink-0 truncate">{h.name}</span>
                <span className="text-muted-foreground truncate">{h.value}</span>
              </div>
            ))}
            {request.responseHeaders && (
              <>
                <h3 className="text-xs font-medium text-muted-foreground mb-2 mt-4">Response Headers</h3>
                {request.responseHeaders.map((h, i) => (
                  <div key={i} className="flex text-xs">
                    <span className="text-primary w-40 flex-shrink-0 truncate">{h.name}</span>
                    <span className="text-muted-foreground truncate">{h.value}</span>
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
              <div className="text-sm text-muted-foreground">No request body</div>
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
              <div className="text-sm text-muted-foreground">No response body captured</div>
            )}
          </div>
        )}

        {activeTab === "timing" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Duration</span>
              <span className="font-mono text-foreground">{request.duration.toFixed(2)}ms</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status Code</span>
              <span className="font-mono text-foreground">{request.statusCode}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tab ID</span>
              <span className="font-mono text-foreground">{request.tabId}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Request Type</span>
              <span className="font-mono text-foreground">{request.type || "main_frame"}</span>
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
}: {
  collections: Collection[];
  savedRequests: SavedRequest[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
  const collectionRequests = selectedCollectionId
    ? savedRequests.filter((r) => r.collectionId === selectedCollectionId)
    : [];

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
      const encoded = btoa(config.auth.basic.username + ":" + config.auth.basic.password);
      headers["Authorization"] = "Basic " + encoded;
    } else if (config.auth.type === "api-key" && config.auth.apiKey?.addTo === "header") {
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
          .map((p) => encodeURIComponent(p.name) + "=" + encodeURIComponent(p.value))
          .join("&");
        url = url + sep + queryString;
      }
    }

    const start = performance.now();
    const response = await fetch(url, {
      method: config.method,
      headers,
      body: config.method !== "GET" && config.method !== "HEAD" ? body : undefined,
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
      <div className="w-64 border-r border-border">
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-medium">Collections</h2>
        </div>
        <div className="p-2 space-y-1">
          {collections.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No collections yet</div>
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
                  {savedRequests.filter((r) => r.collectionId === col.id).length}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Collection Content */}
      <div className="flex-1">
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
                    <p className="text-sm text-muted-foreground mt-1">{selectedCollection.description}</p>
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
                      className="px-3 py-2 border-b border-border hover:bg-accent/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs ${
                            req.request.method === "GET"
                              ? "text-emerald-500"
                              : req.request.method === "POST"
                              ? "text-amber-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {req.request.method}
                        </span>
                        <span className="text-sm text-foreground">{req.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-1">{req.request.url}</div>
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
    </div>
  );
}

function SettingsView() {
  const [settingsTab, setSettingsTab] = useState<"ai" | "environments" | "filters" | "shortcuts">("ai");

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Settings Tabs */}
        <div className="w-48 border-r border-border p-2 space-y-1">
          <button
            onClick={() => setSettingsTab("ai")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
              settingsTab === "ai" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            }`}
          >
            <SparklesIcon className="w-4 h-4" />
            AI Settings
          </button>
          <button
            onClick={() => setSettingsTab("environments")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
              settingsTab === "environments" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            }`}
          >
            <GlobeIcon className="w-4 h-4" />
            Environments
          </button>
          <button
            onClick={() => setSettingsTab("filters")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
              settingsTab === "filters" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            }`}
          >
            <FilterIcon className="w-4 h-4" />
            Capture Filters
          </button>
          <button
            onClick={() => setSettingsTab("shortcuts")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
              settingsTab === "shortcuts" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            }`}
          >
            <KeyboardIcon className="w-4 h-4" />
            Shortcuts
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-auto">
          {settingsTab === "ai" && (
            <div className="p-6">
              <h3 className="font-medium mb-3">AI Integration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure AI providers for intelligent request analysis and debugging suggestions.
              </p>
              <a
                href={chrome.runtime.getURL("/popup.html")}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary hover:bg-primary/90 rounded text-primary-foreground"
              >
                Open AI Settings
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            </div>
          )}

          {settingsTab === "environments" && (
            <EnvironmentManager />
          )}

          {settingsTab === "filters" && (
            <CaptureFilter />
          )}

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
                  <div key={key} className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">{action}</span>
                    <kbd className="px-3 py-1 text-xs bg-muted rounded font-mono">{key}</kbd>
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
    </div>
  );
}

// Icons

function HistoryIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}
