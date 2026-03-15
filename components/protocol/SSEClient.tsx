import { useState, useRef, useCallback, useEffect } from "react";

interface SSEEvent {
  id: string;
  type: "message" | "error" | "open" | "close";
  data: string;
  eventType?: string;
  timestamp: number;
}

export function SSEClient() {
  const [url, setUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [reconnect, setReconnect] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, autoScroll]);

  const addEvent = useCallback((event: Omit<SSEEvent, "id" | "timestamp">) => {
    setEvents((prev) => [
      ...prev,
      {
        ...event,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const connect = useCallback(() => {
    if (!url || isConnected) return;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        addEvent({ type: "open", data: "Connected to SSE endpoint" });
        setIsConnected(true);
      };

      eventSource.onerror = (error) => {
        addEvent({
          type: "error",
          data:
            error instanceof ErrorEvent ? error.message : "Connection error",
        });

        if (eventSource.readyState === EventSource.CLOSED) {
          setIsConnected(false);
          if (reconnect) {
            reconnectTimeoutRef.current = setTimeout(() => {
              addEvent({ type: "message", data: "Attempting to reconnect..." });
              connect();
            }, 3000);
          }
        }
      };

      eventSource.onmessage = (event) => {
        addEvent({ type: "message", data: event.data });
      };

      eventSource.addEventListener("*", (event) => {
        if (event instanceof MessageEvent) {
          addEvent({
            type: "message",
            data: event.data,
            eventType: (event as MessageEvent).type,
          });
        }
      });
    } catch (error) {
      addEvent({
        type: "error",
        data: error instanceof Error ? error.message : "Failed to connect",
      });
    }
  }, [url, isConnected, addEvent, reconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    addEvent({ type: "close", data: "Disconnected" });
  }, [addEvent]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const filteredEvents = searchQuery
    ? events.filter(
        (e) =>
          e.data.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.eventType?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : events;

  const exportEvents = () => {
    const data = events.map((e) => ({
      timestamp: new Date(e.timestamp).toISOString(),
      type: e.type,
      eventType: e.eventType,
      data: e.data,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sse-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border bg-muted/30">
        <h2 className="text-lg font-semibold mb-3">Server-Sent Events</h2>

        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isConnected && connect()}
            placeholder="https://api.example.com/events"
            disabled={isConnected}
            className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={!url}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-md hover:bg-destructive/90 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={reconnect}
              onChange={(e) => setReconnect(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            Auto-reconnect
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            Auto-scroll
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground"}`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-border flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events..."
          className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={clearEvents}
          className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md text-secondary-foreground transition-colors"
        >
          Clear
        </button>
        <button
          onClick={exportEvents}
          disabled={events.length === 0}
          className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md text-secondary-foreground disabled:opacity-50 transition-colors"
        >
          Export
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-950">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">
                {events.length === 0
                  ? "Connect to an SSE endpoint to receive events"
                  : "No events match your search"}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`p-2 rounded border-l-2 ${
                  event.type === "error"
                    ? "bg-red-500/10 border-red-500"
                    : event.type === "open"
                      ? "bg-success/10 border-success"
                      : event.type === "close"
                        ? "bg-amber-500/10 border-amber-500"
                        : "bg-muted/30 border-primary"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  {event.eventType && (
                    <span className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded">
                      {event.eventType}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium ${
                      event.type === "error"
                        ? "text-red-400"
                        : event.type === "open"
                          ? "text-success"
                          : event.type === "close"
                            ? "text-amber-400"
                            : "text-foreground"
                    }`}
                  >
                    {event.type.toUpperCase()}
                  </span>
                </div>
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {event.data}
                </pre>
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex justify-between">
        <span>{events.length} events</span>
        <span>{isConnected ? "● Connected" : "○ Disconnected"}</span>
      </div>
    </div>
  );
}
