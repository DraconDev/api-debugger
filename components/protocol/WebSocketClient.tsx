import { useState, useRef, useCallback, useEffect } from "react";

interface WSMessage {
  id: string;
  type: "sent" | "received" | "system";
  content: string;
  timestamp: number;
}

export function WebSocketClient() {
  const [url, setUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const addMessage = useCallback((type: WSMessage["type"], content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const connect = () => {
    if (!url.trim()) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        addMessage("system", "Connected to " + url);
      };

      ws.onmessage = (event) => {
        addMessage("received", event.data);
      };

      ws.onclose = () => {
        setIsConnected(false);
        addMessage("system", "Connection closed");
      };

      ws.onerror = () => {
        addMessage("system", "Connection error");
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      addMessage(
        "system",
        "Failed to connect: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current) return;

    try {
      wsRef.current.send(inputMessage);
      addMessage("sent", inputMessage);
      setInputMessage("");
    } catch (err) {
      addMessage(
        "system",
        "Failed to send: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString();
  };

  const getMessageColor = (type: WSMessage["type"]) => {
    switch (type) {
      case "sent":
        return "text-blue-400";
      case "received":
        return "text-emerald-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Connection Bar */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
        <div
          className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground"}`}
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="wss://echo.websocket.org"
          disabled={isConnected}
          className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        {isConnected ? (
          <button
            onClick={disconnect}
            className="px-4 py-2 text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
          >
            Connect
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-14 h-14 mb-3 rounded-full bg-muted flex items-center justify-center">
              <WebSocketIcon className="w-7 h-7 opacity-50" />
            </div>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect and send a message to get started
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0 tabular-nums">
                {formatTimestamp(msg.timestamp)}
              </span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  msg.type === "sent"
                    ? "bg-blue-500/20 text-blue-400"
                    : msg.type === "received"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {msg.type === "sent"
                  ? "↑ SENT"
                  : msg.type === "received"
                    ? "↓ RECV"
                    : "• SYS"}
              </span>
              <pre
                className={`flex-1 text-xs font-mono ${getMessageColor(msg.type)} whitespace-pre-wrap break-all`}
              >
                {msg.content}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex items-start gap-3 p-4 border-t border-border bg-muted/30">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type message... (Enter to send, Shift+Enter for new line)"
          disabled={!isConnected}
          className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          rows={2}
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={sendMessage}
            disabled={!isConnected || !inputMessage.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md disabled:opacity-50 transition-colors"
          >
            Send
          </button>
          <button
            onClick={clearMessages}
            className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

function WebSocketIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M4 4h16v16H4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9h6M9 12h6M9 15h6" strokeLinecap="round" />
    </svg>
  );
}
