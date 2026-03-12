import { useState, useMemo } from "react";

interface JsonViewerProps {
  data: unknown;
  depth?: number;
}

export function JsonViewer({ data, depth = 0 }: JsonViewerProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = (path: string) => {
    const newCollapsed = new Set(collapsed);
    if (newCollapsed.has(path)) {
      newCollapsed.delete(path);
    } else {
      newCollapsed.add(path);
    }
    setCollapsed(newCollapsed);
  };

  const renderValue = (value: unknown, path: string): React.ReactNode => {
    if (value === null) {
      return <span className="text-purple-400">null</span>;
    }

    if (typeof value === "boolean") {
      return <span className="text-amber-400">{value.toString()}</span>;
    }

    if (typeof value === "number") {
      return <span className="text-blue-400">{value}</span>;
    }

    if (typeof value === "string") {
      return <span className="text-emerald-400">"{escapeString(value)}"</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground">[]</span>;
      }

      const isCollapsed = collapsed.has(path);

      return (
        <span>
          <span
            className="cursor-pointer select-none text-muted-foreground hover:text-foreground"
            onClick={() => toggleCollapse(path)}
          >
            {isCollapsed ? "▶ [...]" : "▼ ["}
          </span>
          {!isCollapsed && (
            <>
              {value.map((item, index) => (
                <div key={index} style={{ marginLeft: `${(depth + 1) * 16}px` }}>
                  {renderValue(item, `${path}[${index}]`)}
                  {index < value.length - 1 && <span className="text-muted-foreground">,</span>}
                </div>
              ))}
              <span style={{ marginLeft: `${depth * 16}px` }} className="text-muted-foreground">
                ]
              </span>
            </>
          )}
        </span>
      );
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return <span className="text-muted-foreground">{"{}"}</span>;
      }

      const isCollapsed = collapsed.has(path);

      return (
        <span>
          <span
            className="cursor-pointer select-none text-muted-foreground hover:text-foreground"
            onClick={() => toggleCollapse(path)}
          >
            {isCollapsed ? "▶ {...}" : "▼ {"}
          </span>
          {!isCollapsed && (
            <>
              {entries.map(([k, v], index) => (
                <div key={k} style={{ marginLeft: `${(depth + 1) * 16}px` }}>
                  <span className="text-primary">"{k}"</span>
                  <span className="text-muted-foreground">: </span>
                  {renderValue(v, `${path}.${k}`)}
                  {index < entries.length - 1 && <span className="text-muted-foreground">,</span>}
                </div>
              ))}
              <span style={{ marginLeft: `${depth * 16}px` }} className="text-muted-foreground">
                {"}"}
              </span>
            </>
          )}
        </span>
      );
    }

    return <span>{String(value)}</span>;
  };

  return (
    <div className="font-mono text-xs leading-relaxed">
      {renderValue(data, "root")}
    </div>
  );
}

interface XmlViewerProps {
  xml: string;
}

function XmlViewer({ xml }: XmlViewerProps) {
  const highlighted = useMemo(() => {
    return xml
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/(&lt;\/?)([\w:-]+)/g, '$1<span class="text-blue-400">$2</span>')
      .replace(/([\w:-]+)(=)/g, '<span class="text-amber-400">$1</span>$2')
      .replace(/"([^"]*)"/g, '"<span class="text-emerald-400">$1</span>"');
  }, [xml]);

  return (
    <pre 
      className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

type ContentKind = "json" | "xml" | "html" | "image" | "text";
type ViewMode = "preview" | "pretty" | "raw";

function detectContentKind(body: string, contentType?: string): ContentKind {
  if (contentType?.includes("json")) return "json";
  if (contentType?.includes("xml")) return "xml";
  if (contentType?.includes("html")) return "html";
  if (contentType?.includes("image/")) return "image";
  
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { JSON.parse(body); return "json"; } catch {}
  }
  if (trimmed.startsWith("<") && (trimmed.includes("<?xml") || trimmed.includes("<!DOCTYPE"))) {
    return "xml";
  }
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.match(/^<\w+[^>]*>/)) {
    if (trimmed.includes("</html>") || trimmed.includes("</body>") || trimmed.includes("</div>")) {
      return "html";
    }
  }
  
  return "text";
}

interface ResponseViewerProps {
  body: string;
  contentType?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

export function ResponseViewer({ body, contentType, statusCode, headers }: ResponseViewerProps) {
  const contentKind = detectContentKind(body, contentType);
  const [viewMode, setViewMode] = useState<ViewMode>("pretty");

  const parsedData = useMemo(() => {
    if (contentKind === "json") {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    }
    return null;
  }, [body, contentKind]);

  const availableModes: ViewMode[] = useMemo(() => {
    const modes: ViewMode[] = [];
    if (contentKind === "html") {
      modes.push("preview");
    }
    if (contentKind === "json" || contentKind === "xml") {
      modes.push("pretty");
    }
    modes.push("raw");
    return modes;
  }, [contentKind]);

  const isImage = contentKind === "image";
  const imageUrl = useMemo(() => {
    if (!isImage || !body) return null;
    try {
      const base64 = body.startsWith("data:") ? body : `data:${contentType};base64,${body}`;
      return base64;
    } catch {
      return null;
    }
  }, [isImage, body, contentType]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Response Body</span>
          <span className="px-1.5 py-0.5 text-xs rounded bg-muted text-muted-foreground">
            {contentKind.toUpperCase()}
          </span>
          {statusCode && (
            <span className={`px-1.5 py-0.5 text-xs rounded ${
              statusCode >= 200 && statusCode < 300 ? "bg-emerald-500/20 text-emerald-500" :
              statusCode >= 400 ? "bg-red-500/20 text-red-500" :
              "bg-amber-500/20 text-amber-500"
            }`}>
              {statusCode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isImage && availableModes.length > 1 && (
            <div className="flex items-center gap-1">
              {availableModes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-0.5 text-xs rounded ${
                    viewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {formatBytes(body.length)}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-950">
        {isImage ? (
          <div className="flex items-center justify-center h-full p-4 bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)] bg-[length:16px_16px]">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Response preview" 
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-red-400 text-sm">Failed to load image</span>';
                }}
              />
            ) : (
              <span className="text-muted-foreground text-sm">Unable to preview image</span>
            )}
          </div>
        ) : contentKind === "html" && viewMode === "preview" ? (
          <iframe
            srcDoc={body}
            className="w-full h-full bg-white"
            sandbox="allow-same-origin"
            title="HTML Preview"
          />
        ) : contentKind === "json" && viewMode === "pretty" && parsedData ? (
          <div className="p-3">
            <JsonViewer data={parsedData} />
          </div>
        ) : contentKind === "xml" && viewMode === "pretty" ? (
          <div className="p-3">
            <XmlViewer xml={body} />
          </div>
        ) : (
          <div className="p-3">
            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
              {body}
            </pre>
          </div>
        )}
      </div>
      
      {headers && Object.keys(headers).length > 0 && (
        <div className="border-t border-border max-h-32 overflow-auto">
          <details className="text-xs">
            <summary className="px-3 py-1.5 cursor-pointer hover:bg-muted/50 text-muted-foreground">
              Response Headers ({Object.keys(headers).length})
            </summary>
            <div className="px-3 py-2 space-y-1 bg-muted/30">
              {Object.entries(headers).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-primary font-medium">{key}:</span>
                  <span className="text-muted-foreground">{value}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
