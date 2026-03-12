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

function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

interface ResponseViewerProps {
  body: string;
  contentType?: string;
}

export function ResponseViewer({ body, contentType }: ResponseViewerProps) {
  const [format, setFormat] = useState<"pretty" | "raw">("pretty");

  const parsedData = useMemo(() => {
    if (contentType?.includes("json") || body.trim().startsWith("{") || body.trim().startsWith("[")) {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    }
    return null;
  }, [body, contentType]);

  const isJson = parsedData !== null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Response Body</span>
        <div className="flex items-center gap-2">
          {isJson && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFormat("pretty")}
                className={`px-2 py-0.5 text-xs rounded ${
                  format === "pretty" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Pretty
              </button>
              <button
                onClick={() => setFormat("raw")}
                className={`px-2 py-0.5 text-xs rounded ${
                  format === "raw" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Raw
              </button>
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {body.length} bytes
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 bg-zinc-950">
        {isJson && format === "pretty" ? (
          <JsonViewer data={parsedData} />
        ) : (
          <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
            {body}
          </pre>
        )}
      </div>
    </div>
  );
}
