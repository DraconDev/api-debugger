import { useState, useRef, useCallback } from "react";

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
      addMessage("system", "Failed to connect: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current) return;

    try {
      wsRef.current.send(inputMessage);
      addMessage("sent", inputMessage);
      setInputMessage("");
    } catch (err) {
      addMessage("system", "Failed to send: " + (err instanceof Error ? err.message : "Unknown error"));
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
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div
          className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-muted-foreground"}`}
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="wss://echo.websocket.org"
          disabled={isConnected}
          className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded font-mono disabled:opacity-50"
        />
        {isConnected ? (
          <button
            onClick={disconnect}
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            className="px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded"
          >
            Connect
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
                {formatTimestamp(msg.timestamp)}
              </span>
              <span className={`text-xs ${msg.type === "sent" ? "bg-blue-500/20" : msg.type === "received" ? "bg-emerald-500/20" : "bg-muted"} px-2 py-0.5 rounded`}>
                {msg.type === "sent" ? "↑" : msg.type === "received" ? "↓" : "•"}
              </span>
              <pre className={`flex-1 text-xs font-mono ${getMessageColor(msg.type)} whitespace-pre-wrap break-all`}>
                {msg.content}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-border">
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
          className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded resize-none disabled:opacity-50"
          rows={2}
        />
        <div className="flex flex-col gap-1">
          <button
            onClick={sendMessage}
            disabled={!isConnected || !inputMessage.trim()}
            className="px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded disabled:opacity-50"
          >
            Send
          </button>
          <button
            onClick={clearMessages}
            className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
