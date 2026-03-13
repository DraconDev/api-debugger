import { useState, useRef, useEffect } from "react";
import type { HttpHeader } from "@/types";
import { COMMON_HEADERS, HEADER_PRESETS, filterHeaders, getHeaderValueSuggestions } from "@/lib/headers";

interface HeadersEditorProps {
  headers: HttpHeader[];
  onChange: (headers: HttpHeader[]) => void;
}

export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [activeAutocomplete, setActiveAutocomplete] = useState<number | null>(null);
  const [autocompleteOptions, setAutocompleteOptions] = useState<string[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const inputRefs = useRef<Array<{ name: HTMLInputElement | null; value: HTMLInputElement | null }>>([]);

  const enabledCount = headers.filter((h) => h.enabled !== false).length;

  const addHeader = () => {
    onChange([...headers, { name: "", value: "", enabled: true }]);
    setTimeout(() => {
      const lastInput = inputRefs.current[headers.length];
      lastInput?.name?.focus();
    }, 0);
  };

  const updateHeader = (index: number, field: "name" | "value", value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    onChange(newHeaders);

    if (field === "name") {
      const filtered = filterHeaders(value);
      setAutocompleteOptions(filtered);
      setActiveAutocomplete(index);
      setAutocompleteIndex(0);
    } else if (field === "value") {
      const headerName = headers[index]?.name || "";
      const suggestions = getHeaderValueSuggestions(headerName);
      if (suggestions.length > 0 && value.length > 0) {
        const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
        setAutocompleteOptions(filtered);
        setActiveAutocomplete(index);
        setAutocompleteIndex(0);
      }
    }
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

  const applyPreset = (presetName: string) => {
    const preset = HEADER_PRESETS[presetName];
    if (!preset) return;

    const newHeaders = [...headers];
    for (const { name, value } of preset) {
      const existingIndex = newHeaders.findIndex((h) => h.name.toLowerCase() === name.toLowerCase());
      if (existingIndex >= 0) {
        newHeaders[existingIndex] = { ...newHeaders[existingIndex], value };
      } else {
        newHeaders.push({ name, value, enabled: true });
      }
    }
    onChange(newHeaders);
    setShowPresets(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: "name" | "value") => {
    if (autocompleteOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutocompleteIndex((prev) => (prev + 1) % autocompleteOptions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutocompleteIndex((prev) => (prev - 1 + autocompleteOptions.length) % autocompleteOptions.length);
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const selected = autocompleteOptions[autocompleteIndex];
        updateHeader(index, field, selected);
        setActiveAutocomplete(null);
        setAutocompleteOptions([]);
      } else if (e.key === "Escape") {
        setActiveAutocomplete(null);
        setAutocompleteOptions([]);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-medium">Headers {enabledCount > 0 && `(${enabledCount})`}</span>
        <div className="flex items-center gap-2">
          {bulkMode ? (
            <button
              onClick={switchToTable}
              className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
            >
              Table View
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded"
              >
                Presets
              </button>
              <button
                onClick={switchToBulk}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded"
              >
                Bulk
              </button>
              <button
                onClick={addHeader}
                className="px-2 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded"
              >
                + Add
              </button>
            </>
          )}
        </div>
      </div>

      {showPresets && (
        <div className="p-2 border-b border-border bg-muted/20">
          <div className="text-[10px] text-muted-foreground mb-2">Add preset headers:</div>
          <div className="flex flex-wrap gap-1">
            {Object.keys(HEADER_PRESETS).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="px-2 py-1 text-[10px] bg-background border border-border rounded hover:bg-accent"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {bulkMode ? (
          <div className="p-3">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Header-Name: Header-Value&#10;Content-Type: application/json&#10;Authorization: Bearer token"
              className="w-full h-full min-h-[200px] p-3 text-sm font-mono bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="mt-2 text-[10px] text-muted-foreground">
              One header per line: <code className="px-1 bg-muted rounded">Name: Value</code>
            </div>
          </div>
        ) : headers.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <HeadersIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">No headers</p>
            <button
              onClick={addHeader}
              className="text-xs text-primary hover:text-primary/80"
            >
              + Add header
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {headers.map((header, index) => (
              <div key={index} className="relative">
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={header.enabled !== false}
                    onChange={() => toggleHeader(index)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <div className="flex-1 relative">
                    <input
                      ref={(el) => {
                        inputRefs.current[index] = { ...inputRefs.current[index], name: el };
                      }}
                      type="text"
                      value={header.name}
                      onChange={(e) => updateHeader(index, "name", e.target.value)}
                      onFocus={() => {
                        if (header.name) {
                          setAutocompleteOptions(filterHeaders(header.name));
                          setActiveAutocomplete(index);
                        }
                      }}
                      onBlur={() => setTimeout(() => setActiveAutocomplete(null), 200)}
                      onKeyDown={(e) => handleKeyDown(e, index, "name")}
                      placeholder="Header name"
                      className="w-full px-3 py-1.5 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {activeAutocomplete === index && autocompleteOptions.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                        {autocompleteOptions.map((option, optIndex) => (
                          <button
                            key={option}
                            onClick={() => {
                              updateHeader(index, "name", option);
                              setActiveAutocomplete(null);
                              setAutocompleteOptions([]);
                            }}
                            className={`w-full px-3 py-1.5 text-left text-xs ${
                              optIndex === autocompleteIndex ? "bg-accent" : "hover:bg-accent/50"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 relative">
                    <input
                      ref={(el) => {
                        inputRefs.current[index] = { ...inputRefs.current[index], value: el };
                      }}
                      type="text"
                      value={header.value}
                      onChange={(e) => updateHeader(index, "value", e.target.value)}
                      onFocus={() => {
                        const suggestions = getHeaderValueSuggestions(header.name);
                        if (suggestions.length > 0 && header.value) {
                          setAutocompleteOptions(suggestions.filter((s) => s.toLowerCase().includes(header.value.toLowerCase())));
                          setActiveAutocomplete(index);
                        }
                      }}
                      onBlur={() => setTimeout(() => setActiveAutocomplete(null), 200)}
                      onKeyDown={(e) => handleKeyDown(e, index, "value")}
                      placeholder="Value"
                      className="w-full px-3 py-1.5 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <button
                    onClick={() => deleteHeader(index)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

function HeadersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16m-7 6h7"
      />
    </svg>
  );
}
