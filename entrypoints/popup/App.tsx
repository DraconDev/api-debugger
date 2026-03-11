import { useEffect, useState } from "react";
import type { RequestRecord } from "@/types";

function App() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_REQUESTS" });
      setRequests(response.requests || []);
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("/dashboard.html") });
    window.close();
  };

  const recentRequests = requests.slice(0, 5);

  return (
    <div className="w-80 p-3 bg-zinc-900 text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <span className="text-white font-bold text-xs">AD</span>
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-sm">API Debugger</h1>
          <p className="text-xs text-zinc-500">{requests.length} requests captured</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-lg font-semibold text-zinc-100">{requests.length}</div>
          <div className="text-xs text-zinc-500">Total</div>
        </div>
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-lg font-semibold text-emerald-400">
            {requests.filter((r) => r.statusCode < 400).length}
          </div>
          <div className="text-xs text-zinc-500">Success</div>
        </div>
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-lg font-semibold text-red-400">
            {requests.filter((r) => r.statusCode >= 400).length}
          </div>
          <div className="text-xs text-zinc-500">Errors</div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="mb-3">
        <div className="text-xs text-zinc-500 mb-1">Recent Requests</div>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center py-3">No requests captured yet</div>
        ) : (
          <div className="space-y-1">
            {recentRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer"
                onClick={openDashboard}
              >
                <span
                  className={`font-mono text-xs font-medium ${
                    req.method === "GET"
                      ? "text-emerald-400"
                      : req.method === "POST"
                      ? "text-amber-400"
                      : req.method === "DELETE"
                      ? "text-red-400"
                      : "text-zinc-400"
                  }`}
                >
                  {req.method}
                </span>
                <span
                  className={`font-mono text-xs ${
                    req.statusCode >= 400 ? "text-red-400" : "text-zinc-400"
                  }`}
                >
                  {req.statusCode}
                </span>
                <span className="flex-1 text-xs truncate text-zinc-400">{new URL(req.url).pathname}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Dashboard Button */}
      <button
        onClick={openDashboard}
        className="w-full py-2 px-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
        Open Dashboard
      </button>
    </div>
  );
}

export default App;
