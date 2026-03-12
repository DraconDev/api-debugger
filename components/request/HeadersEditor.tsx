import { useState } from "react";
import type { HttpHeader } from "@/types";

interface HeadersEditorProps {
  headers: HttpHeader[];
  onChange: (headers: HttpHeader[]) => void;
}

const COMMON_HEADERS = [
  "Accept",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Type",
  "Cookie",
  "Host",
  "Origin",
  "Referer",
  "User-Agent",
  "X-API-Key",
];

export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const enabledCount = headers.filter((h) => h.enabled !== false).length;

  const addHeader = () => {
    onChange([...headers, { name: "", value: "", enabled: true }]);
  };

  const updateHeader = (index: number, field: "name" | "value", value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    onChange(newHeaders);
  };

  const toggleHeader = (index: number) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], enabled: !newHeaders[index].enabled };
    onChange(newHeaders);
  };

  const deleteHeader = (index: number) => {
    onChange(headers.filter((_, i) => i !== index));
  };

  const switchToBulk = () => {
    const text = headers
      .filter((h) => h.name)
      .map((h) => `${h.name}: ${h.value}`)
      .join("\n");
    setBulkText(text);
    setBulkMode(true);
  };

  const switchToTable = () => {
    const newHeaders: HttpHeader[] = [];
    const lines = bulkText.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        const name = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        newHeaders.push({ name, value, enabled: true });
      }
    }
    onChange(newHeaders);
    setBulkMode(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Headers ({enabledCount})</span>
        <div className="flex items-center gap-2">
          {bulkMode ? (
            <button onClick={switchToTable} className="text-xs text-primary hover:text-primary/80">
              Table View
            </button>
          ) : (
            <>
              <button onClick={switchToBulk} className="text-xs text-muted-foreground hover:text-foreground">
                Bulk Edit
              </button>
              <button onClick={addHeader} className="text-xs text-primary hover:text-primary/80">
                + Add
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {bulkMode ? (
          <div className="p-2">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Header-Name: Header-Value&#10;Content-Type: application/json&#10;Authorization: Bearer token"
              className="w-full h-full min-h-[200px] p-2 text-xs font-mono bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        ) : headers.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No headers. Click "Add" to add one.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {headers.map((header, index) => (
              <div key={index} className="flex items-center gap-2 px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={header.enabled !== false}
                  onChange={() => toggleHeader(index)}
                  className="w-3 h-3"
                />
                <input
                  type="text"
                  value={header.name}
                  onChange={(e) => updateHeader(index, "name", e.target.value)}
                  list="common-headers"
                  placeholder="Name"
                  className="flex-1 px-2 py-1.5 text-xs bg-transparent border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => updateHeader(index, "value", e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-2 py-1.5 text-xs bg-transparent border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => deleteHeader(index)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <datalist id="common-headers">
        {COMMON_HEADERS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
