import { useState, useEffect, useMemo } from "react";
import type { RequestRecord, Collection, SavedRequest } from "@/types";

type ViewType = "history" | "collections" | "settings";

interface DashboardState {
  requests: RequestRecord[];
  collections: Collection[];
  savedRequests: SavedRequest[];
  selectedRequestId: string | null;
  selectedCollectionId: string | null;
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
    setState((s) => ({ ...s, requests: [], selectedRequestId: null }));
  };

  const deleteRequest = (id: string) => {
    setState((s) => ({
      ...s,
      requests: s.requests.filter((r) => r.id !== id),
      selectedRequestId: s.selectedRequestId === id ? null : s.selectedRequestId,
    }));
  };

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AD</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm">API Debugger</h1>
              <p className="text-xs text-zinc-500">v0.1.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
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
            active={view === "settings"}
            onClick={() => setView("settings")}
            icon={<SettingsIcon />}
            label="Settings"
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            {state.requests.length} requests captured
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex">
        {view === "history" && (
          <>
            {/* Request List */}
            <div className="w-80 flex-shrink-0 border-r border-zinc-800 flex flex-col">
              {/* Search */}
              <div className="p-3 border-b border-zinc-800">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={state.searchQuery}
                    onChange={(e) =>
                      setState((s) => ({ ...s, searchQuery: e.target.value }))
                    }
                    placeholder="Search requests..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-2 border-b border-zinc-800 flex gap-2">
                <button
                  onClick={loadData}
                  className="flex-1 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 flex items-center justify-center gap-1"
                >
                  <RefreshIcon className="w-3 h-3" />
                  Refresh
                </button>
                <button
                  onClick={clearHistory}
                  className="flex-1 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 flex items-center justify-center gap-1"
                >
                  <TrashIcon className="w-3 h-3" />
                  Clear
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {state.isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    {state.searchQuery ? "No matching requests" : "No requests captured yet"}
                  </div>
                ) : (
                  filteredRequests.map((request) => (
                    <RequestListItem
                      key={request.id}
                      request={request}
                      selected={state.selectedRequestId === request.id}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          selectedRequestId: request.id,
                        }))
                      }
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
                <div className="flex-1 flex items-center justify-center text-zinc-500">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                      <CodeIcon className="w-8 h-8 text-zinc-600" />
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
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded">{count}</span>
      )}
    </button>
  );
}

function RequestListItem({
  request,
  selected,
  onClick,
  onDelete,
}: {
  request: RequestRecord;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const statusColor =
    request.statusCode >= 500
      ? "text-red-400"
      : request.statusCode >= 400
      ? "text-amber-400"
      : request.statusCode >= 300
      ? "text-blue-400"
      : "text-emerald-400";

  const methodColor =
    request.method === "GET"
      ? "text-emerald-400"
      : request.method === "POST"
      ? "text-amber-400"
      : request.method === "PUT"
      ? "text-blue-400"
      : request.method === "DELETE"
      ? "text-red-400"
      : "text-zinc-400";

  return (
    <div
      onClick={onClick}
      className={`group px-3 py-2 border-b border-zinc-800 cursor-pointer ${
        selected ? "bg-zinc-800" : "hover:bg-zinc-800/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`font-mono text-xs font-medium ${methodColor}`}>
          {request.method}
        </span>
        <span className={`font-mono text-xs ${statusColor}`}>
          {request.statusCode}
        </span>
        <span className="text-xs text-zinc-500 ml-auto">{request.duration.toFixed(0)}ms</span>
      </div>
      <div className="text-xs text-zinc-400 truncate">{request.url}</div>
      <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-xs text-zinc-500 hover:text-red-400"
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
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`font-mono text-sm font-semibold ${
              request.method === "GET"
                ? "text-emerald-400"
                : request.method === "POST"
                ? "text-amber-400"
                : request.method === "PUT"
                ? "text-blue-400"
                : request.method === "DELETE"
                ? "text-red-400"
                : "text-zinc-400"
            }`}
          >
            {request.method}
          </span>
          <span
            className={`font-mono text-sm ${
              request.statusCode >= 500
                ? "text-red-400"
                : request.statusCode >= 400
                ? "text-amber-400"
                : request.statusCode >= 300
                ? "text-blue-400"
                : "text-emerald-400"
            }`}
          >
            {request.statusCode}
          </span>
        </div>
        <div className="font-mono text-xs text-zinc-400 break-all">{request.url}</div>
        <div className="text-xs text-zinc-500 mt-2">
          {new Date(request.timeStamp).toLocaleString()} · {request.duration.toFixed(0)}ms
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(["headers", "body", "response", "timing"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize ${
              activeTab === tab
                ? "text-zinc-100 border-b-2 border-violet-500"
                : "text-zinc-500 hover:text-zinc-300"
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
            <h3 className="text-xs font-medium text-zinc-500 mb-2">Request Headers</h3>
            {request.requestHeaders?.map((h, i) => (
              <div key={i} className="flex text-xs">
                <span className="text-violet-400 w-40 flex-shrink-0 truncate">{h.name}</span>
                <span className="text-zinc-400 truncate">{h.value}</span>
              </div>
            ))}
            {request.responseHeaders && (
              <>
                <h3 className="text-xs font-medium text-zinc-500 mb-2 mt-4">Response Headers</h3>
                {request.responseHeaders.map((h, i) => (
                  <div key={i} className="flex text-xs">
                    <span className="text-violet-400 w-40 flex-shrink-0 truncate">{h.name}</span>
                    <span className="text-zinc-400 truncate">{h.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "body" && (
          <div>
            {request.requestBodyText ? (
              <pre className="text-xs font-mono text-zinc-300 bg-zinc-800 p-3 rounded overflow-auto">
                {request.requestBodyText}
              </pre>
            ) : (
              <div className="text-sm text-zinc-500">No request body</div>
            )}
          </div>
        )}

        {activeTab === "response" && (
          <div>
            {request.responseBodyText ? (
              <pre className="text-xs font-mono text-zinc-300 bg-zinc-800 p-3 rounded overflow-auto">
                {request.responseBodyText}
              </pre>
            ) : (
              <div className="text-sm text-zinc-500">No response body captured</div>
            )}
          </div>
        )}

        {activeTab === "timing" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Total Duration</span>
              <span className="font-mono text-zinc-200">{request.duration.toFixed(2)}ms</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Status Code</span>
              <span className="font-mono text-zinc-200">{request.statusCode}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Tab ID</span>
              <span className="font-mono text-zinc-200">{request.tabId}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Request Type</span>
              <span className="font-mono text-zinc-200">{request.type || "main_frame"}</span>
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
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
  const collectionRequests = selectedCollectionId
    ? savedRequests.filter((r) => r.collectionId === selectedCollectionId)
    : [];

  return (
    <div className="flex-1 flex">
      {/* Collections List */}
      <div className="w-64 border-r border-zinc-800">
        <div className="p-3 border-b border-zinc-800">
          <h2 className="text-sm font-medium">Collections</h2>
        </div>
        <div className="p-2 space-y-1">
          {collections.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500 text-center">No collections yet</div>
          ) : (
            collections.map((col) => (
              <button
                key={col.id}
                onClick={() => onSelectCollection(col.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  selectedCollectionId === col.id
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <FolderIcon className="w-4 h-4" />
                <span className="flex-1 text-left truncate">{col.name}</span>
                <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded">
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
          <div>
            <div className="p-4 border-b border-zinc-800">
              <h2 className="font-medium">{selectedCollection.name}</h2>
              {selectedCollection.description && (
                <p className="text-sm text-zinc-400 mt-1">{selectedCollection.description}</p>
              )}
            </div>
            <div className="p-2">
              {collectionRequests.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500 text-center">
                  No requests in this collection
                </div>
              ) : (
                collectionRequests.map((req) => (
                  <div
                    key={req.id}
                    className="px-3 py-2 border-b border-zinc-800 hover:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-xs ${
                          req.request.method === "GET"
                            ? "text-emerald-400"
                            : req.request.method === "POST"
                            ? "text-amber-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {req.request.method}
                      </span>
                      <span className="text-sm text-zinc-300">{req.name}</span>
                    </div>
                    <div className="text-xs text-zinc-500 truncate mt-1">{req.request.url}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <FolderIcon className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-sm">Select a collection to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <h2 className="text-lg font-semibold mb-6">Settings</h2>

      <div className="max-w-lg space-y-6">
        <div className="p-4 bg-zinc-800 rounded-lg">
          <h3 className="font-medium mb-3">AI Integration</h3>
          <p className="text-sm text-zinc-400 mb-3">
            Configure AI providers for intelligent request analysis and debugging suggestions.
          </p>
          <a
            href={chrome.runtime.getURL("/popup.html")}
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 rounded text-white"
          >
            Open Settings
            <ExternalLinkIcon className="w-3 h-3" />
          </a>
        </div>

        <div className="p-4 bg-zinc-800 rounded-lg">
          <h3 className="font-medium mb-3">Keyboard Shortcuts</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Refresh</span>
              <kbd className="px-2 py-0.5 bg-zinc-700 rounded text-xs">Ctrl+R</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Search</span>
              <kbd className="px-2 py-0.5 bg-zinc-700 rounded text-xs">Ctrl+F</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Clear History</span>
              <kbd className="px-2 py-0.5 bg-zinc-700 rounded text-xs">Ctrl+Shift+Delete</kbd>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-800 rounded-lg">
          <h3 className="font-medium mb-3">About</h3>
          <div className="space-y-2 text-sm text-zinc-400">
            <p>API Debugger v0.1.0</p>
            <p>A browser-first API debugging tool for developers.</p>
          </div>
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

function FolderIcon({ className = "w-4 h-4" }) {
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

function SearchIcon({ className = "w-4 h-4" }) {
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

function RefreshIcon({ className = "w-3 h-3" }) {
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

function TrashIcon({ className = "w-3 h-3" }) {
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

function CodeIcon({ className = "w-8 h-8" }) {
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

function ExternalLinkIcon({ className = "w-3 h-3" }) {
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
