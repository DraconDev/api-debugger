import { useState, useCallback } from "react";
import type { SavedRequest, CapturedResponse } from "@/types";
import { interpolateVariables } from "@/hooks/useRuntimeVariables";

interface CollectionRunnerProps {
  requests: SavedRequest[];
  onRequestSend: (config: SavedRequest["requestConfig"]) => Promise<CapturedResponse>;
}

interface RunResult {
  requestId: string;
  requestName: string;
  status: "pending" | "running" | "success" | "error";
  response?: CapturedResponse;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export function CollectionRunner({ requests, onRequestSend }: CollectionRunnerProps) {
  const [results, setResults] = useState<RunResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeVariables, setRuntimeVariables] = useState<Record<string, string>>({});
  const [delay, setDelay] = useState(0);

  const runCollection = useCallback(async () => {
    if (requests.length === 0) return;

    setIsRunning(true);
    setResults(requests.map((r) => ({
      requestId: r.id,
      requestName: r.name,
      status: "pending",
    })));
    setRuntimeVariables({});

    const vars: Record<string, string> = {};

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      
      setResults((prev) => prev.map((r, idx) => 
        idx === i ? { ...r, status: "running", startTime: Date.now() } : r
      ));

      if (delay > 0 && i > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        let config = request.requestConfig;
        if (config) {
          config = {
            ...config,
            url: interpolateVariables(config.url, vars),
            headers: config.headers.map((h) => ({
              ...h,
              name: interpolateVariables(h.name, vars),
              value: interpolateVariables(h.value, vars),
            })),
            body: {
              ...config.body,
              json: config.body.json ? interpolateVariables(config.body.json, vars) : undefined,
              raw: config.body.raw ? interpolateVariables(config.body.raw, vars) : undefined,
            },
          };
        }

        const response = await onRequestSend(config);
        
        if (config?.extractions && config.extractions.length > 0) {
          for (const extraction of config.extractions) {
            if (extraction.enabled === false) continue;
            try {
              let value: string | undefined;
              if (extraction.source === "body") {
                const parsed = JSON.parse(response.body);
                value = getValueByPath(parsed, extraction.path);
              } else if (extraction.source === "header") {
                const header = response.headers.find(([name]) => 
                  name.toLowerCase() === extraction.path.toLowerCase()
                );
                value = header?.[1];
              }
              if (value !== undefined) {
                vars[extraction.variableName] = value;
              }
            } catch (e) {
              console.warn(`Failed to extract ${extraction.variableName}:`, e);
            }
          }
          setRuntimeVariables({ ...vars });
        }

        setResults((prev) => prev.map((r, idx) => 
          idx === i ? { 
            ...r, 
            status: "success", 
            response,
            endTime: Date.now(),
          } : r
        ));
      } catch (error) {
        setResults((prev) => prev.map((r, idx) => 
          idx === i ? { 
            ...r, 
            status: "error", 
            error: error instanceof Error ? error.message : "Request failed",
            endTime: Date.now(),
          } : r
        ));
      }
    }

    setIsRunning(false);
  }, [requests, onRequestSend, delay]);

  const stopRunning = () => {
    setIsRunning(false);
  };

  const stats = {
    total: results.length,
    success: results.filter((r) => r.status === "success").length,
    error: results.filter((r) => r.status === "error").length,
    pending: results.filter((r) => r.status === "pending").length,
    running: results.filter((r) => r.status === "running").length,
  };

  const totalTime = results.reduce((acc, r) => {
    if (r.startTime && r.endTime) {
      return acc + (r.endTime - r.startTime);
    }
    return acc;
  }, 0);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Collection Runner</h2>
        
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Delay (ms):</label>
            <input
              type="number"
              value={delay}
              onChange={(e) => setDelay(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 px-2 py-1 text-xs bg-input border border-border rounded"
              disabled={isRunning}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {!isRunning ? (
            <button
              onClick={runCollection}
              disabled={requests.length === 0}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50"
            >
              Run Collection ({requests.length} requests)
            </button>
          ) : (
            <button
              onClick={stopRunning}
              className="px-4 py-2 bg-destructive text-destructive-foreground text-sm rounded hover:bg-destructive/90"
            >
              Stop
            </button>
          )}
          <button
            onClick={() => {
              setResults([]);
              setRuntimeVariables({});
            }}
            disabled={isRunning}
            className="px-4 py-2 bg-secondary text-secondary-foreground text-sm rounded hover:bg-secondary/80 disabled:opacity-50"
          >
            Clear Results
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-medium">{stats.total}</span>
            </div>
            <div className="text-sm">
              <span className="text-success">✓ Passed: </span>
              <span className="font-medium">{stats.success}</span>
            </div>
            <div className="text-sm">
              <span className="text-destructive">✗ Failed: </span>
              <span className="font-medium">{stats.error}</span>
            </div>
            {totalTime > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Time: </span>
                <span className="font-medium">{(totalTime / 1000).toFixed(2)}s</span>
              </div>
            )}
          </div>
        </div>
      )}

      {Object.keys(runtimeVariables).length > 0 && (
        <div className="p-3 border-b border-border bg-card">
          <div className="text-xs font-medium mb-2">Runtime Variables</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(runtimeVariables).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                <span className="font-mono text-primary">{key}</span>
                <span className="text-muted-foreground">=</span>
                <span className="font-mono text-muted-foreground truncate max-w-24">
                  {value.length > 20 ? value.slice(0, 20) + "..." : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Click "Run Collection" to execute all requests</p>
              {requests.length === 0 && (
                <p className="text-xs mt-2 text-warning">No requests in collection</p>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {results.map((result, index) => (
              <div
                key={result.requestId}
                className={`p-3 ${
                  result.status === "running" ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 text-center">
                    {result.status === "pending" && (
                      <span className="text-muted-foreground text-xs">{index + 1}</span>
                    )}
                    {result.status === "running" && (
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    )}
                    {result.status === "success" && (
                      <span className="text-success">✓</span>
                    )}
                    {result.status === "error" && (
                      <span className="text-destructive">✗</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{result.requestName}</span>
                      {result.response && (
                        <span className={`text-xs font-mono ${
                          result.response.status >= 400 ? "text-destructive" : "text-success"
                        }`}>
                          {result.response.status}
                        </span>
                      )}
                    </div>
                    {result.error && (
                      <p className="text-xs text-destructive mt-1">{result.error}</p>
                    )}
                    {result.response && (
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{result.response.duration.toFixed(0)}ms</span>
                        <span>{formatBytes(result.response.size)}</span>
                      </div>
                    )}
                  </div>
                  {result.startTime && result.endTime && (
                    <span className="text-xs text-muted-foreground">
                      {((result.endTime - result.startTime) / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getValueByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".").flatMap((part) => {
    const match = part.match(/^(\w+)(?:\[(\d+)\])?$/);
    if (match) {
      return match[2] ? [match[1], parseInt(match[2], 10)] : [match[1]];
    }
    return [part];
  });

  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
    if (typeof part === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[part];
    } else {
      if (typeof current !== "object" || Array.isArray(current)) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
  }
  
  if (current === null || current === undefined) return undefined;
  return typeof current === "object" ? JSON.stringify(current) : String(current);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
