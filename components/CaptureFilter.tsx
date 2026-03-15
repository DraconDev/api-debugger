import { useState, useEffect } from "react";

interface FilterConfig {
  enabled: boolean;
  urlPatterns: string[];
  methods: string[];
  statusCodes: { min?: number; max?: number };
  domains: { include: string[]; exclude: string[] };
}

const DEFAULT_FILTER: FilterConfig = {
  enabled: true,
  urlPatterns: [],
  methods: [],
  statusCodes: {},
  domains: { include: [], exclude: [] },
};

const STORAGE_KEY = "sync:capture_filter";

const ALL_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export function CaptureFilter() {
  const [filter, setFilter] = useState<FilterConfig>(DEFAULT_FILTER);
  const [newUrlPattern, setNewUrlPattern] = useState("");
  const [newIncludeDomain, setNewIncludeDomain] = useState("");
  const [newExcludeDomain, setNewExcludeDomain] = useState("");

  useEffect(() => {
    loadFilter();
  }, []);

  const loadFilter = async () => {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        setFilter(result[STORAGE_KEY]);
      }
    } catch (err) {
      console.error("Failed to load filter:", err);
    }
  };

  const saveFilter = async (newFilter: FilterConfig) => {
    await chrome.storage.sync.set({ [STORAGE_KEY]: newFilter });
    setFilter(newFilter);
  };

  const toggleCapture = () => {
    saveFilter({ ...filter, enabled: !filter.enabled });
  };

  const toggleMethod = (method: string) => {
    const methods = filter.methods.includes(method)
      ? filter.methods.filter((m) => m !== method)
      : [...filter.methods, method];
    saveFilter({ ...filter, methods });
  };

  const addUrlPattern = () => {
    if (!newUrlPattern.trim()) return;
    saveFilter({
      ...filter,
      urlPatterns: [...filter.urlPatterns, newUrlPattern.trim()],
    });
    setNewUrlPattern("");
  };

  const removeUrlPattern = (index: number) => {
    saveFilter({
      ...filter,
      urlPatterns: filter.urlPatterns.filter((_, i) => i !== index),
    });
  };

  const addIncludeDomain = () => {
    if (!newIncludeDomain.trim()) return;
    saveFilter({
      ...filter,
      domains: {
        ...filter.domains,
        include: [...filter.domains.include, newIncludeDomain.trim()],
      },
    });
    setNewIncludeDomain("");
  };

  const removeIncludeDomain = (index: number) => {
    saveFilter({
      ...filter,
      domains: {
        ...filter.domains,
        include: filter.domains.include.filter((_, i) => i !== index),
      },
    });
  };

  const addExcludeDomain = () => {
    if (!newExcludeDomain.trim()) return;
    saveFilter({
      ...filter,
      domains: {
        ...filter.domains,
        exclude: [...filter.domains.exclude, newExcludeDomain.trim()],
      },
    });
    setNewExcludeDomain("");
  };

  const removeExcludeDomain = (index: number) => {
    saveFilter({
      ...filter,
      domains: {
        ...filter.domains,
        exclude: filter.domains.exclude.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Capture Filters</span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Capture Toggle */}
        <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
          <div>
            <div className="text-sm font-medium">Request Capture</div>
            <div className="text-xs text-muted-foreground">
              {filter.enabled ? "Capturing all network requests" : "Capture paused"}
            </div>
          </div>
          <button
            onClick={toggleCapture}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              filter.enabled ? "bg-success" : "bg-muted"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                filter.enabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Method Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Filter by Method</label>
          <p className="text-xs text-muted-foreground">
            Only capture selected methods (empty = all methods)
          </p>
          <div className="flex flex-wrap gap-1">
            {ALL_METHODS.map((method) => (
              <button
                key={method}
                onClick={() => toggleMethod(method)}
                className={`px-2 py-1 text-xs rounded ${
                  filter.methods.includes(method)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* URL Patterns */}
        <div className="space-y-2">
          <label className="text-xs font-medium">URL Patterns (Regex)</label>
          <p className="text-xs text-muted-foreground">
            Only capture URLs matching these patterns
          </p>
          <div className="space-y-1">
            {filter.urlPatterns.map((pattern, index) => (
              <div key={index} className="flex items-center gap-2">
                <code className="flex-1 px-2 py-1 text-xs bg-muted rounded truncate">{pattern}</code>
                <button
                  onClick={() => removeUrlPattern(index)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={newUrlPattern}
              onChange={(e) => setNewUrlPattern(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUrlPattern()}
              placeholder="/api/.*"
              className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded font-mono"
            />
            <button onClick={addUrlPattern} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md">
              Add
            </button>
          </div>
        </div>

        {/* Domain Whitelist */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Include Domains</label>
          <p className="text-xs text-muted-foreground">Only capture requests from these domains</p>
          <div className="space-y-1">
            {filter.domains.include.map((domain, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex-1 px-2 py-1 text-xs bg-muted rounded truncate">{domain}</span>
                <button
                  onClick={() => removeIncludeDomain(index)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={newIncludeDomain}
              onChange={(e) => setNewIncludeDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addIncludeDomain()}
              placeholder="api.example.com"
              className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded-md"
            />
            <button onClick={addIncludeDomain} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md">
              Add
            </button>
          </div>
        </div>

        {/* Domain Blacklist */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Exclude Domains</label>
          <p className="text-xs text-muted-foreground">Don't capture requests from these domains</p>
          <div className="space-y-1">
            {filter.domains.exclude.map((domain, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex-1 px-2 py-1 text-xs bg-muted rounded truncate">{domain}</span>
                <button
                  onClick={() => removeExcludeDomain(index)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={newExcludeDomain}
              onChange={(e) => setNewExcludeDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExcludeDomain()}
              placeholder="analytics.google.com"
              className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded-md"
            />
            <button onClick={addExcludeDomain} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md">
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
