import { useState } from "react";

interface GraphQLClientProps {
  endpoint?: string;
}

interface GraphQLHistoryItem {
  id: string;
  query: string;
  variables: string;
  response: string;
  timestamp: number;
}

export function GraphQLClient({ endpoint: initialEndpoint }: GraphQLClientProps) {
  const [endpoint, setEndpoint] = useState(initialEndpoint || "");
  const [query, setQuery] = useState("{\n  \n}");
  const [variables, setVariables] = useState("{\n  \n}");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GraphQLHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);

  const executeQuery = async () => {
    if (!endpoint.trim()) {
      setError("Please enter an endpoint URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const headersObj: Record<string, string> = {
      "Content-Type": "application/json",
    };
    headers.forEach((h) => {
      if (h.key.trim()) {
        headersObj[h.key] = h.value;
      }
    });

    let parsedVariables = {};
    if (variables.trim() && variables.trim() !== "{}") {
      try {
        parsedVariables = JSON.parse(variables);
      } catch {
        setError("Invalid JSON in variables");
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: headersObj,
        body: JSON.stringify({
          query,
          variables: parsedVariables,
        }),
      });

      const data = await res.json();
      const formatted = JSON.stringify(data, null, 2);
      setResponse(formatted);

      setHistory((prev) => [
        {
          id: `gql_${Date.now()}`,
          query,
          variables,
          response: formatted,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const formatQuery = () => {
    try {
      const parsed = JSON.parse(query);
      setQuery(JSON.stringify(parsed, null, 2));
    } catch {
      // Not JSON, try to format as GraphQL
      const formatted = query
        .replace(/\s+/g, " ")
        .replace(/\s*{\s*/g, " {\n  ")
        .replace(/\s*}\s*/g, "\n}\n")
        .replace(/\s*,\s*/g, ",\n  ");
      setQuery(formatted);
    }
  };

  const loadFromHistory = (item: GraphQLHistoryItem) => {
    setQuery(item.query);
    setVariables(item.variables);
    setResponse(item.response);
    setShowHistory(false);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Endpoint */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <span className="text-xs text-muted-foreground">GraphQL</span>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://api.example.com/graphql"
          className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded font-mono"
        />
        <button
          onClick={executeQuery}
          disabled={isLoading || !endpoint.trim()}
          className="px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded disabled:opacity-50"
        >
          {isLoading ? "Running..." : "Run"}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Query Panel */}
        <div className="w-1/2 flex flex-col border-r border-border">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setShowVariables(false)}
              className={`px-3 py-1 text-xs ${!showVariables && !showHeaders ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
            >
              Query
            </button>
            <button
              onClick={() => { setShowVariables(true); setShowHeaders(false); }}
              className={`px-3 py-1 text-xs ${showVariables ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
            >
              Variables
            </button>
            <button
              onClick={() => { setShowHeaders(true); setShowVariables(false); }}
              className={`px-3 py-1 text-xs ${showHeaders ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
            >
              Headers
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-3 py-1 text-xs ml-auto ${showHistory ? "text-primary" : "text-muted-foreground"}`}
            >
              History ({history.length})
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-auto">
            {showHistory ? (
              <div className="p-2 space-y-1">
                {history.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No history yet
                  </div>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="w-full text-left p-2 text-xs bg-muted hover:bg-accent rounded truncate"
                    >
                      {item.query.slice(0, 50)}...
                    </button>
                  ))
                )}
              </div>
            ) : showVariables ? (
              <textarea
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full h-full p-2 text-xs font-mono bg-transparent resize-none focus:outline-none"
              />
            ) : showHeaders ? (
              <div className="p-2 space-y-1">
                {headers.map((h, i) => (
                  <div key={i} className="flex gap-1">
                    <input
                      type="text"
                      value={h.key}
                      onChange={(e) => updateHeader(i, "key", e.target.value)}
                      placeholder="Header name"
                      className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded"
                    />
                    <input
                      type="text"
                      value={h.value}
                      onChange={(e) => updateHeader(i, "value", e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded"
                    />
                    <button onClick={() => removeHeader(i)} className="px-2 py-1 text-xs text-muted-foreground hover:text-destructive">
                      ×
                    </button>
                  </div>
                ))}
                <button onClick={addHeader} className="w-full py-1 text-xs text-primary hover:bg-primary/10 rounded">
                  + Add Header
                </button>
              </div>
            ) : (
              <div className="relative h-full">
                <button
                  onClick={formatQuery}
                  className="absolute right-2 top-2 px-2 py-1 text-xs bg-muted hover:bg-accent rounded z-10"
                >
                  Format
                </button>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="query { ... }"
                  className="w-full h-full p-2 text-xs font-mono bg-transparent resize-none focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Response Panel */}
        <div className="w-1/2 flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-medium">Response</span>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : error ? (
              <div className="p-3 text-xs text-destructive bg-destructive/10 rounded">
                {error}
              </div>
            ) : response ? (
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">{response}</pre>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Run a query to see results
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
