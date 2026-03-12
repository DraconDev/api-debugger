import { useState } from "react";
import type { VariableExtraction } from "@/types";

interface VariableExtractorProps {
  extractions: VariableExtraction[];
  onChange: (extractions: VariableExtraction[]) => void;
}

export function VariableExtractor({ extractions, onChange }: VariableExtractorProps) {
  const [newExtraction, setNewExtraction] = useState<Partial<VariableExtraction>>({
    variableName: "",
    source: "body",
    path: "",
  });

  const addExtraction = () => {
    if (!newExtraction.variableName || !newExtraction.path) return;
    
    const extraction: VariableExtraction = {
      id: `ext_${Date.now()}`,
      variableName: newExtraction.variableName,
      source: newExtraction.source || "body",
      path: newExtraction.path,
      enabled: true,
    };
    
    onChange([...extractions, extraction]);
    setNewExtraction({ variableName: "", source: "body", path: "" });
  };

  const removeExtraction = (id: string) => {
    onChange(extractions.filter((e) => e.id !== id));
  };

  const toggleExtraction = (id: string) => {
    onChange(extractions.map((e) => 
      e.id === id ? { ...e, enabled: !e.enabled } : e
    ));
  };

  const updateExtraction = (id: string, updates: Partial<VariableExtraction>) => {
    onChange(extractions.map((e) => 
      e.id === id ? { ...e, ...updates } : e
    ));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium mb-1">Variable Extraction</h3>
        <p className="text-xs text-muted-foreground">
          Extract values from responses to use in subsequent requests as {"{{variableName}}"}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {extractions.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            No extractions defined. Add one to extract values from responses.
          </div>
        ) : (
          <div className="space-y-2">
            {extractions.map((extraction) => (
              <div
                key={extraction.id}
                className={`p-3 border rounded-lg ${extraction.enabled !== false ? "bg-card" : "bg-muted/50 opacity-60"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={extraction.enabled !== false}
                    onChange={() => toggleExtraction(extraction.id)}
                    className="rounded border-border"
                  />
                  <span className="text-xs font-mono text-primary">
                    {"{{" + extraction.variableName + "}}"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    from {extraction.source}
                  </span>
                  <button
                    onClick={() => removeExtraction(extraction.id)}
                    className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Variable Name</label>
                    <input
                      type="text"
                      value={extraction.variableName}
                      onChange={(e) => updateExtraction(extraction.id, { variableName: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
                      placeholder="token"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Source</label>
                    <select
                      value={extraction.source}
                      onChange={(e) => updateExtraction(extraction.id, { source: e.target.value as "body" | "header" })}
                      className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
                    >
                      <option value="body">Response Body</option>
                      <option value="header">Response Header</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">
                      {extraction.source === "body" ? "JSON Path (e.g., data.token)" : "Header Name"}
                    </label>
                    <input
                      type="text"
                      value={extraction.path}
                      onChange={(e) => updateExtraction(extraction.id, { path: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-input border border-border rounded font-mono"
                      placeholder={extraction.source === "body" ? "data.access_token" : "X-Auth-Token"}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <input
            type="text"
            value={newExtraction.variableName || ""}
            onChange={(e) => setNewExtraction({ ...newExtraction, variableName: e.target.value })}
            placeholder="Variable name"
            className="px-2 py-1.5 text-xs bg-input border border-border rounded"
          />
          <select
            value={newExtraction.source || "body"}
            onChange={(e) => setNewExtraction({ ...newExtraction, source: e.target.value as "body" | "header" })}
            className="px-2 py-1.5 text-xs bg-input border border-border rounded"
          >
            <option value="body">Body</option>
            <option value="header">Header</option>
          </select>
          <input
            type="text"
            value={newExtraction.path || ""}
            onChange={(e) => setNewExtraction({ ...newExtraction, path: e.target.value })}
            placeholder={newExtraction.source === "body" ? "JSON path" : "Header name"}
            className="px-2 py-1.5 text-xs bg-input border border-border rounded font-mono"
          />
        </div>
        <button
          onClick={addExtraction}
          disabled={!newExtraction.variableName || !newExtraction.path}
          className="w-full py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          Add Extraction
        </button>
      </div>
    </div>
  );
}
