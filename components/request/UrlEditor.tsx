import { useState, useEffect } from "react";
import type { QueryParam } from "@/types";

const METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE",
];

interface UrlEditorProps {
  method: string;
  url: string;
  params: QueryParam[];
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onParamsChange: (params: QueryParam[]) => void;
  onSend: () => void;
  isSending?: boolean;
}

export function UrlEditor({
  method,
  url,
  params,
  onMethodChange,
  onUrlChange,
  onParamsChange,
  onSend,
  isSending,
}: UrlEditorProps) {
  const [showParams, setShowParams] = useState(false);
  const [localUrl, setLocalUrl] = useState(url);

  useEffect(() => {
    setLocalUrl(url);
  }, [url]);

  const handleUrlChange = (newUrl: string) => {
    setLocalUrl(newUrl);
    onUrlChange(newUrl);

    const queryIndex = newUrl.indexOf("?");
    if (queryIndex !== -1) {
      const queryString = newUrl.slice(queryIndex + 1);
      const searchParams = new URLSearchParams(queryString);
      const newParams: QueryParam[] = [];
      searchParams.forEach((value, name) => {
        newParams.push({ name, value, enabled: true });
      });
      if (newParams.length > 0) {
        onParamsChange(newParams);
      }
    }
  };

  const getDisplayUrl = () => {
    if (!params.length) return localUrl;
    const baseUrl = localUrl.split("?")[0];
    return baseUrl;
  };

  const getParamCount = () => {
    return params.filter((p) => p.enabled !== false).length;
  };

  const methodColor = (m: string) => {
    switch (m) {
      case "GET":
        return "bg-success/15 text-success border border-success/30";
      case "POST":
        return "bg-primary/15 text-primary border border-primary/30";
      case "PUT":
        return "bg-warning/15 text-warning border border-warning/30";
      case "PATCH":
        return "bg-accent text-accent-foreground border border-accent";
      case "DELETE":
        return "bg-destructive/15 text-destructive border border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Method Selector */}
        <select
          value={method}
          onChange={(e) => onMethodChange(e.target.value)}
          className={`px-3 py-2 text-xs font-mono font-semibold rounded-md cursor-pointer ${methodColor(method)}`}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* URL Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={getDisplayUrl()}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Enter request URL"
            className="w-full px-3 py-2 text-sm font-mono bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {getParamCount() > 0 && (
            <button
              onClick={() => setShowParams(!showParams)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30"
            >
              {getParamCount()} params
            </button>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={onSend}
          disabled={isSending || !localUrl}
          className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending
            </>
          ) : (
            <>
              <SendIcon className="w-4 h-4" />
              Send
            </>
          )}
        </button>
      </div>

      {/* Params Panel */}
      {showParams && (
        <div className="border border-border rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
            <span className="text-xs font-medium">Query Parameters</span>
            <button
              onClick={() => {
                onParamsChange([
                  ...params,
                  { name: "", value: "", enabled: true },
                ]);
              }}
              className="text-xs text-primary hover:text-primary/80"
            >
              + Add
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {params.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">
                No parameters
              </div>
            ) : (
              params.map((param, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-2 py-1 border-b border-border last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={param.enabled !== false}
                    onChange={(e) => {
                      const newParams = [...params];
                      newParams[index] = {
                        ...param,
                        enabled: e.target.checked,
                      };
                      onParamsChange(newParams);
                    }}
                    className="w-3 h-3"
                  />
                  <input
                    type="text"
                    value={param.name}
                    onChange={(e) => {
                      const newParams = [...params];
                      newParams[index] = { ...param, name: e.target.value };
                      onParamsChange(newParams);
                    }}
                    placeholder="Name"
                    className="flex-1 px-2 py-1 text-xs bg-transparent border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => {
                      const newParams = [...params];
                      newParams[index] = { ...param, value: e.target.value };
                      onParamsChange(newParams);
                    }}
                    placeholder="Value"
                    className="flex-1 px-2 py-1 text-xs bg-transparent border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    onClick={() => {
                      onParamsChange(params.filter((_, i) => i !== index));
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SendIcon({ className }: { className?: string }) {
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
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
