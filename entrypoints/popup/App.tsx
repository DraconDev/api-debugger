import { useEffect, useState } from "react";
import { RequestList } from "@/components/RequestList";
import { RequestDetail } from "@/components/RequestDetail";
import { CollectionsView } from "@/components/CollectionsView";
import type { RequestRecord } from "@/types";

type ViewType = "history" | "collections";

function App() {
  const [view, setView] = useState<ViewType>("history");
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
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

  const clearRequests = async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR_REQUESTS" });
    setRequests([]);
    setSelectedRequest(null);
  };

  const handleSelectRequest = (request: RequestRecord) => {
    setSelectedRequest(request);
  };

  const handleBack = () => {
    setSelectedRequest(null);
  };

  if (isLoading) {
    return (
      <div className="w-[500px] min-h-[400px] p-4 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-[500px] min-h-[400px] max-h-[600px] flex flex-col">
      {/* Header */}
      <header className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/icon/32.png" alt="API Debugger" className="w-6 h-6" />
          <h1 className="text-sm font-semibold">API Debugger</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadRequests}
            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
          >
            Refresh
          </button>
          <button
            onClick={clearRequests}
            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
          >
            Clear
          </button>
        </div>
      </header>

      {/* View Tabs */}
      <nav className="flex border-b">
        <button
          onClick={() => setView("history")}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            view === "history"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          History
        </button>
        <button
          onClick={() => setView("collections")}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            view === "collections"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Collections
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {selectedRequest ? (
          <RequestDetail request={selectedRequest} onBack={handleBack} />
        ) : view === "history" ? (
          <RequestList
            requests={requests}
            onSelectRequest={handleSelectRequest}
          />
        ) : (
          <CollectionsView onSelectRequest={handleSelectRequest} />
        )}
      </main>
    </div>
  );
}

export default App;
