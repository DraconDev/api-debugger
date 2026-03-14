import { useState } from "react";
import type { RequestRecord } from "@/types";

interface ReplayPanelProps {
  request: RequestRecord;
}

interface ReplayResponse {
  success: boolean;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  bodyPreview: string;
  duration: number;
}

export function ReplayPanel({ request }: ReplayPanelProps) {
  const [method, setMethod] = useState(request.method);
  const [url, setUrl] = useState(request.url);
  const [headersText, setHeadersText] = useState(() => {
    return (
      request.requestHeaders?.map((h) => `${h.name}: ${h.value}`).join("\n") ||
      ""
    );
  });
  const [body, setBody] = useState(request.requestBodyText || "");
  const [isReplaying, setIsReplaying] = useState(false);
  const [response, setResponse] = useState<ReplayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReplay = async () => {
    setIsReplaying(true);
    setError(null);
    setResponse(null);

    const headers = headersText
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, ...rest] = line.split(":");
        return { name: name.trim(), value: rest.join(":").trim() };
      });

    try {
      const result = await chrome.runtime.sendMessage({
        type: "REPLAY_REQUEST",
        payload: {
          method,
          url,
          headers,
          body: body || undefined,
        },
      });

      if (result.success) {
        setResponse(result);
      } else {
        setError(result.error || "Replay failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replay failed");
    } finally {
      setIsReplaying(false);
    }
  };

  return (
    <div className="p-3">
      <h3 className="text-xs font-medium mb-2">Replay Request</h3>

      <div className="space-y-2">
        <div className="flex gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="px-2 py-1 text-xs bg-secondary rounded w-20"
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-2 py-1 text-xs bg-muted rounded"
          />
        </div>

        <textarea
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          placeholder="Headers (name: value)"
          className="w-full px-2 py-1 text-xs bg-muted rounded h-16"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Request body"
          className="w-full px-2 py-1 text-xs bg-muted rounded h-16"
        />

        <button
          onClick={handleReplay}
          disabled={isReplaying}
          className="w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {isReplaying ? "Replaying..." : "Send Replay"}
        </button>

        {error && (
          <div className="p-2 text-xs bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
            {error}
          </div>
        )}

        {response && (
          <div className="p-2 bg-muted rounded text-xs">
            <div className="flex justify-between mb-2">
              <span
                className={
                  response.status < 400
                    ? "text-emerald-500"
                    : "text-destructive"
                }
              >
                {response.status} {response.statusText}
              </span>
              <span className="text-muted-foreground">
                {response.duration.toFixed(0)}ms
              </span>
            </div>
            <pre className="bg-background p-2 rounded overflow-auto max-h-[100px]">
              {response.bodyPreview}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
