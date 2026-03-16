import { useState, useRef, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";

interface SocketEvent {
  id: string;
  type: "connect" | "disconnect" | "event" | "error" | "emit";
  eventName?: string;
  data: unknown;
  timestamp: number;
  direction: "in" | "out";
}

export function SocketIOClient() {
  const [url, setUrl] = useState("");
  const [namespace, setNamespace] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [emitEventName, setEmitEventName] = useState("");
  const [emitEventData, setEmitEventData] = useState("");
  const [listenEvents, setListenEvents] = useState<string[]>(["message"]);
  const [newListenEvent, setNewListenEvent] = useState("");
  const [auth, setAuth] = useState("");
  const [transport, setTransport] = useState<string>("polling");

  const socketRef = useRef<Socket | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events]);

  const addEvent = useCallback(
    (event: Omit<SocketEvent, "id" | "timestamp">) => {
      setEvents((prev) => [
        ...prev,
        {
          ...event,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        },
      ]);
    },
    [],
  );

  const connect = useCallback(() => {
    if (!url || isConnected) return;

    try {
      let authData: Record<string, unknown> | undefined;
      if (auth) {
        try {
          authData = JSON.parse(auth);
        } catch {
          authData = { token: auth };
        }
      }

      const fullUrl = namespace ? `${url}${namespace}` : url;

      const socket = io(fullUrl, {
        auth: authData,
        transports: [transport as "polling" | "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        addEvent({
          type: "connect",
          data: `Connected (ID: ${socket.id})`,
          direction: "in",
        });
        setIsConnected(true);
        setTransport(socket.io.engine?.transport.name || transport);
      });

      socket.on("disconnect", (reason) => {
        addEvent({
          type: "disconnect",
          data: `Disconnected: ${reason}`,
          direction: "in",
        });
        setIsConnected(false);
      });

      socket.on("connect_error", (error) => {
        addEvent({ type: "error", data: error.message, direction: "in" });
      });

      listenEvents.forEach((eventName) => {
        socket.on(eventName, (data: unknown) => {
          addEvent({ type: "event", eventName, data, direction: "in" });
        });
      });
    } catch (error) {
      addEvent({
        type: "error",
        data: error instanceof Error ? error.message : "Failed to connect",
        direction: "in",
      });
    }
  }, [url, namespace, isConnected, auth, transport, listenEvents, addEvent]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback(() => {
    if (!socketRef.current || !emitEventName || !isConnected) return;

    let data: unknown;
    if (emitEventData) {
      try {
        data = JSON.parse(emitEventData);
      } catch {
        data = emitEventData;
      }
    }

    socketRef.current.emit(emitEventName, data);
    addEvent({
      type: "emit",
      eventName: emitEventName,
      data,
      direction: "out",
    });
    setEmitEventName("");
    setEmitEventData("");
  }, [emitEventName, emitEventData, isConnected, addEvent]);

  const addListenEvent = useCallback(() => {
    if (!newListenEvent || listenEvents.includes(newListenEvent)) return;

    setListenEvents((prev) => [...prev, newListenEvent]);

    if (socketRef.current && isConnected) {
      socketRef.current.on(newListenEvent, (data: unknown) => {
        addEvent({
          type: "event",
          eventName: newListenEvent,
          data,
          direction: "in",
        });
      });
    }

    setNewListenEvent("");
  }, [newListenEvent, listenEvents, isConnected, addEvent]);

  const removeListenEvent = useCallback((eventName: string) => {
    setListenEvents((prev) => prev.filter((e) => e !== eventName));
    if (socketRef.current) {
      socketRef.current.off(eventName);
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const filteredEvents = searchQuery
    ? events.filter(
        (e) =>
          e.eventName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          JSON.stringify(e.data)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : events;

  const exportEvents = () => {
    const data = events.map((e) => ({
      timestamp: new Date(e.timestamp).toISOString(),
      type: e.type,
      eventName: e.eventName,
      direction: e.direction,
      data: e.data,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `socketio-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex">
      <div className="w-72 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-medium mb-2">Connection</h3>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:3000"
            disabled={isConnected}
            className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded mb-2 disabled:opacity-50"
          />
          <input
            type="text"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            placeholder="Namespace (e.g., /chat)"
            disabled={isConnected}
            className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded mb-2 disabled:opacity-50"
          />
          <input
            type="text"
            value={auth}
            onChange={(e) => setAuth(e.target.value)}
            placeholder='Auth token or {"key":"value"}'
            disabled={isConnected}
            className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded mb-2 disabled:opacity-50"
          />
          <div className="flex gap-2 mb-2">
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              disabled={isConnected}
              className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded disabled:opacity-50"
            >
              <option value="polling">Polling</option>
              <option value="websocket">WebSocket</option>
            </select>
          </div>
          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={connect}
                disabled={!url}
                className="flex-1 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="flex-1 py-1.5 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-medium mb-2">Listen Events</h3>
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              value={newListenEvent}
              onChange={(e) => setNewListenEvent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addListenEvent()}
              placeholder="Event name"
              className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded"
            />
            <button
              onClick={addListenEvent}
              className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {listenEvents.map((event) => (
              <div
                key={event}
                className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs"
              >
                <span>{event}</span>
                <button
                  onClick={() => removeListenEvent(event)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 flex-1">
          <h3 className="text-sm font-medium mb-2">Emit Event</h3>
          <input
            type="text"
            value={emitEventName}
            onChange={(e) => setEmitEventName(e.target.value)}
            placeholder="Event name"
            disabled={!isConnected}
            className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded mb-2 disabled:opacity-50"
          />
          <textarea
            value={emitEventData}
            onChange={(e) => setEmitEventData(e.target.value)}
            placeholder='{"key": "value"}'
            disabled={!isConnected}
            rows={3}
            className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded mb-2 disabled:opacity-50 font-mono"
          />
          <button
            onClick={emit}
            disabled={!isConnected || !emitEventName}
            className="w-full py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            Emit
          </button>
        </div>

        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex justify-between mb-1">
            <span>Status:</span>
            <span className={isConnected ? "text-success" : ""}>
              {isConnected ? "● Connected" : "○ Disconnected"}
            </span>
          </div>
          {isConnected && (
            <div className="flex justify-between">
              <span>Transport:</span>
              <span>{transport}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-2 border-b border-border flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="flex-1 px-2 py-1.5 bg-input border border-border rounded text-xs"
          />
          <button
            onClick={clearEvents}
            className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded text-secondary-foreground"
          >
            Clear
          </button>
          <button
            onClick={exportEvents}
            disabled={events.length === 0}
            className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded text-secondary-foreground disabled:opacity-50"
          >
            Export
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-background">
          {filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">
                  {events.length === 0
                    ? "Connect to a Socket.IO server to see events"
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
                      ? "bg-destructive/10 border-destructive"
                      : event.type === "connect"
                        ? "bg-success/10 border-success"
                        : event.type === "disconnect"
                          ? "bg-warning/10 border-warning"
                          : event.direction === "out"
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/30 border-primary"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`text-xs ${
                        event.direction === "out"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {event.direction === "out" ? "↑" : "↓"}
                    </span>
                    {event.eventName && (
                      <span className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded font-mono">
                        {event.eventName}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium ${
                        event.type === "error"
                          ? "text-destructive"
                          : event.type === "connect"
                            ? "text-success"
                            : event.type === "disconnect"
                              ? "text-warning"
                              : "text-foreground"
                      }`}
                    >
                      {event.type.toUpperCase()}
                    </span>
                  </div>
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                    {typeof event.data === "object"
                      ? JSON.stringify(event.data, null, 2)
                      : String(event.data)}
                  </pre>
                </div>
              ))}
              <div ref={eventsEndRef} />
            </div>
          )}
        </div>

        <div className="p-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          {events.length} events
        </div>
      </div>
    </div>
  );
}
