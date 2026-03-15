import { useEffect, useState, useCallback } from "react";
import type { RequestRecord } from "@/types";
import "./style.css";

type QuickAction =
  | "new-request"
  | "websocket"
  | "graphql"
  | "history"
  | "settings";

function App() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [captureEnabled, setCaptureEnabled] = useState(true);
  const [filter, setFilter] = useState<"all" | "errors" | "success">("all");
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    checkFirstLaunch();
    loadData();
  }, []);

  const checkFirstLaunch = async () => {
    const result = await chrome.storage.local.get("apiDebugger_welcomed");
    if (!result.apiDebugger_welcomed) {
      setIsFirstLaunch(true);
    }
  };

  const dismissWelcome = async () => {
    await chrome.storage.local.set({ apiDebugger_welcomed: true });
    setIsFirstLaunch(false);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [requestsRes, filterRes] = await Promise.all([
        chrome.runtime.sendMessage({ type: "GET_REQUESTS" }),
        chrome.storage.sync.get("captureFilter"),
      ]);
      setRequests(requestsRes.requests || []);
      const captureFilter = filterRes.captureFilter;
      setCaptureEnabled(captureFilter?.enabled !== false);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCapture = async () => {
    const newState = !captureEnabled;
    setCaptureEnabled(newState);
    const result = await chrome.storage.sync.get("captureFilter");
    await chrome.storage.sync.set({
      captureFilter: { ...(result.captureFilter || {}), enabled: newState },
    });
  };

  const openDashboard = useCallback((view?: QuickAction) => {
    const url = view
      ? `${chrome.runtime.getURL("/dashboard.html")}?view=${view}`
      : chrome.runtime.getURL("/dashboard.html");
    chrome.tabs.create({ url });
    window.close();
  }, []);

  const clearHistory = async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR_REQUESTS" });
    setRequests([]);
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "errors") return r.statusCode >= 400;
    if (filter === "success") return r.statusCode < 400;
    return true;
  });

  const recentRequests = filteredRequests.slice(0, 5);
  const errorCount = requests.filter((r) => r.statusCode >= 400).length;
  const successCount = requests.filter((r) => r.statusCode < 400).length;

  return (
    <div className="w-96 bg-background text-foreground dark">
      {isFirstLaunch ? (
        <OnboardingScreen onDismiss={dismissWelcome} openDashboard={openDashboard} />
      ) : (
        <>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src={chrome.runtime.getURL("/icon/32.png")}
            alt="API Debugger"
            className="w-9 h-9 rounded-lg shadow-sm"
          />
          <div className="flex-1">
            <h1 className="font-semibold text-sm">API Debugger</h1>
            <p className="text-xs text-muted-foreground">
              {requests.length} requests captured
            </p>
          </div>
          <button
            onClick={toggleCapture}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              captureEnabled ? "bg-success" : "bg-muted"
            }`}
            title={captureEnabled ? "Capturing enabled" : "Capturing disabled"}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                captureEnabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-px bg-border">
        <button
          onClick={() => setFilter("all")}
          className={`p-3 text-center transition-colors ${
            filter === "all" ? "bg-accent" : "bg-card hover:bg-accent/50"
          }`}
        >
          <div className="text-xl font-bold">{requests.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </button>
        <button
          onClick={() => setFilter("success")}
          className={`p-3 text-center transition-colors ${
            filter === "success"
              ? "bg-success/10"
              : "bg-card hover:bg-accent/50"
          }`}
        >
          <div className="text-xl font-bold text-success">{successCount}</div>
          <div className="text-xs text-muted-foreground">Success</div>
        </button>
        <button
          onClick={() => setFilter("errors")}
          className={`p-3 text-center transition-colors ${
            filter === "errors"
              ? "bg-destructive/10"
              : "bg-card hover:bg-accent/50"
          }`}
        >
          <div className="text-xl font-bold text-destructive">{errorCount}</div>
          <div className="text-xs text-muted-foreground">Errors</div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-5 gap-1 p-2 border-b border-border bg-muted/30">
        <QuickActionButton
          icon={<NewRequestIcon />}
          label="New"
          onClick={() => openDashboard("new-request")}
        />
        <QuickActionButton
          icon={<WebSocketIcon />}
          label="WS"
          onClick={() => openDashboard("websocket")}
        />
        <QuickActionButton
          icon={<GraphQLIcon />}
          label="GQL"
          onClick={() => openDashboard("graphql")}
        />
        <QuickActionButton
          icon={<HistoryIcon />}
          label="History"
          onClick={() => openDashboard("history")}
        />
        <QuickActionButton
          icon={<SettingsIcon />}
          label="Settings"
          onClick={() => openDashboard("settings")}
        />
      </div>

      {/* Recent Requests */}
      <div className="max-h-64 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
              <EmptyIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "No requests captured yet"
                : `No ${filter} requests`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Browse the web to capture API requests
            </p>
          </div>
        ) : (
          <div>
            {recentRequests.map((req) => (
              <RequestRow
                key={req.id}
                request={req}
                onClick={() => openDashboard("history")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-2 border-t border-border flex gap-2 bg-muted/30">
        <button
          onClick={() => openDashboard()}
          className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md flex items-center justify-center gap-2"
        >
          <ExpandIcon className="w-4 h-4" />
          Open Dashboard
        </button>
        {requests.length > 0 && (
          <button
            onClick={clearHistory}
            className="py-2 px-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm rounded-md"
            title="Clear history"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
}
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 py-1.5 rounded hover:bg-accent transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </button>
  );
}

function RequestRow({
  request,
  onClick,
}: {
  request: RequestRecord;
  onClick: () => void;
}) {
  const getPath = (url: string) => {
    try {
      const u = new URL(url);
      return u.pathname + u.search;
    } catch {
      return url;
    }
  };

  const methodColorClass = (method: string) => {
    switch (method) {
      case "GET":
        return "text-success bg-success/10";
      case "POST":
        return "text-warning bg-warning/10";
      case "PUT":
        return "text-primary bg-primary/10";
      case "PATCH":
        return "text-accent bg-accent/10";
      case "DELETE":
        return "text-destructive bg-destructive/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const statusColorClass = (code: number) => {
    if (code >= 500) return "text-destructive";
    if (code >= 400) return "text-warning";
    if (code >= 300) return "text-primary";
    return "text-success";
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors"
    >
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${methodColorClass(request.method)}`}
      >
        {request.method}
      </span>
      <span
        className={`text-xs font-mono ${statusColorClass(request.statusCode)}`}
      >
        {request.statusCode}
      </span>
      <span className="flex-1 text-xs truncate text-muted-foreground font-mono">
        {getPath(request.url)}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {request.duration.toFixed(0)}ms
      </span>
    </div>
  );
}

function NewRequestIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M12 4v16m8-8H4"
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

function HistoryIcon({ className = "w-4 h-4" }: { className?: string }) {
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

function SettingsIcon({ className = "w-4 h-4" }: { className?: string }) {
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

function ExpandIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
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

function EmptyIcon({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

export default App;
