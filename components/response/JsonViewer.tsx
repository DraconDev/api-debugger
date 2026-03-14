import { useState, useCallback } from "react";

interface JsonViewerProps {
  data: unknown;
  depth?: number;
  searchTerm?: string;
  onCopy?: (value: string) => void;
}

export function JsonViewer({
  data,
  depth = 0,
  searchTerm,
  onCopy,
}: JsonViewerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleCopy = useCallback(
    (value: string, path: string) => {
      navigator.clipboard.writeText(value);
      setCopiedPath(path);
      onCopy?.(value);
      setTimeout(() => setCopiedPath(null), 2000);
    },
    [onCopy],
  );

  if (data === null) {
    return <span className="text-purple-400">null</span>;
  }

  if (data === undefined) {
    return <span className="text-gray-500">undefined</span>;
  }

  if (typeof data === "boolean") {
    return <span className="text-amber-400">{data.toString()}</span>;
  }

  if (typeof data === "number") {
    return <span className="text-blue-400">{data}</span>;
  }

  if (typeof data === "string") {
    if (searchTerm && data.toLowerCase().includes(searchTerm.toLowerCase())) {
      return (
        <span className="text-emerald-400">
          &quot;{highlightMatch(data, searchTerm)}&quot;
        </span>
      );
    }
    return (
      <span className="text-emerald-400">&quot;{escapeHtml(data)}&quot;</span>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-400">[]</span>;
    }

    const path = `arr_${depth}`;
    const isExpanded = expanded.has(path) || depth < 2;

    return (
      <span>
        <span
          className="cursor-pointer select-none text-gray-500 hover:text-gray-300 mr-1"
          onClick={() => toggleExpand(path)}
        >
          {isExpanded ? "▼" : "▶"}
        </span>
        <span className="text-gray-400">[</span>
        {isExpanded ? (
          <div className="ml-4 border-l border-border pl-2">
            {data.map((item, index) => (
              <div key={index} className="group relative">
                <span className="text-gray-500 mr-2">{index}:</span>
                <JsonViewer
                  data={item}
                  depth={depth + 1}
                  searchTerm={searchTerm}
                  onCopy={onCopy}
                />
                {index < data.length - 1 && (
                  <span className="text-gray-400">,</span>
                )}
                <button
                  className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 px-1 text-[10px] text-primary hover:bg-primary/10 rounded"
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(item, null, 2),
                      `${path}[${index}]`,
                    )
                  }
                >
                  {copiedPath === `${path}[${index}]` ? "✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-gray-500 mx-1">...{data.length} items</span>
        )}
        <span className="text-gray-400">]</span>
      </span>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span className="text-gray-400">{"{}"}</span>;
    }

    const path = `obj_${depth}`;
    const isExpanded = expanded.has(path) || depth < 2;

    return (
      <span>
        <span
          className="cursor-pointer select-none text-gray-500 hover:text-gray-300 mr-1"
          onClick={() => toggleExpand(path)}
        >
          {isExpanded ? "▼" : "▶"}
        </span>
        <span className="text-gray-400">{"{"}</span>
        {isExpanded ? (
          <div className="ml-4 border-l border-border pl-2">
            {entries.map(([key, value], index) => {
              const isMatch =
                searchTerm &&
                key.toLowerCase().includes(searchTerm.toLowerCase());
              return (
                <div key={key} className="group relative">
                  <span
                    className={
                      isMatch
                        ? "text-yellow-400 bg-yellow-400/20 px-0.5 rounded"
                        : "text-cyan-400"
                    }
                  >
                    {escapeHtml(key)}
                  </span>
                  <span className="text-gray-400">: </span>
                  <JsonViewer
                    data={value}
                    depth={depth + 1}
                    searchTerm={searchTerm}
                    onCopy={onCopy}
                  />
                  {index < entries.length - 1 && (
                    <span className="text-gray-400">,</span>
                  )}
                  <button
                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 px-1 text-[10px] text-primary hover:bg-primary/10 rounded"
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(value, null, 2),
                        `${path}.${key}`,
                      )
                    }
                  >
                    {copiedPath === `${path}.${key}` ? "✓" : "Copy"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-gray-500 mx-1">...{entries.length} keys</span>
        )}
        <span className="text-gray-400">{"}"}</span>
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightMatch(text: string, term: string): React.ReactNode {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);

  if (index === -1) return escapeHtml(text);

  const before = text.slice(0, index);
  const match = text.slice(index, index + term.length);
  const after = text.slice(index + term.length);

  return (
    <>
      {escapeHtml(before)}
      <span className="bg-yellow-400/30 text-yellow-300">
        {escapeHtml(match)}
      </span>
      {escapeHtml(after)}
    </>
  );
}

interface JsonViewerWithSearchProps {
  body: string;
}

export function JsonViewerWithSearch({ body }: JsonViewerWithSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return <pre className="text-sm whitespace-pre-wrap break-all">{body}</pre>;
  }

  const handleCopy = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    setCopyMessage("Copied!");
    setTimeout(() => setCopyMessage(null), 2000);
  }, []);

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
    setCopyMessage("Copied all!");
    setTimeout(() => setCopyMessage(null), 2000);
  }, [parsed]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`p-1.5 rounded text-xs ${showSearch ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          title="Search (Ctrl+F)"
        >
          <SearchIcon className="w-4 h-4" />
        </button>
        <button
          onClick={copyAll}
          className="p-1.5 rounded text-xs hover:bg-accent"
          title="Copy formatted"
        >
          <CopyIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(parsed, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "response.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="p-1.5 rounded text-xs hover:bg-accent"
          title="Download"
        >
          <DownloadIcon className="w-4 h-4" />
        </button>
        {copyMessage && (
          <span className="text-xs text-emerald-500 ml-auto">
            {copyMessage}
          </span>
        )}
      </div>

      {showSearch && (
        <div className="p-2 border-b border-border">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keys and values..."
            className="w-full px-3 py-1.5 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        <JsonViewer data={parsed} searchTerm={searchTerm} onCopy={handleCopy} />
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
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
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
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
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}
