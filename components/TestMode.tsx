import { useState, useCallback } from "react";

interface Example {
  id: string;
  name: string;
  description: string;
  category: "rest" | "graphql" | "websocket" | "sse";
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  icon: string;
}

const EXAMPLES: Example[] = [
  // REST APIs
  {
    id: "jsonplaceholder-posts",
    name: "Get Posts",
    description: "Fetch sample blog posts from JSONPlaceholder",
    category: "rest",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts?_limit=5",
    icon: "📝",
  },
  {
    id: "jsonplaceholder-create",
    name: "Create Post",
    description: "Create a new post (simulated)",
    category: "rest",
    method: "POST",
    url: "https://jsonplaceholder.typicode.com/posts",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      {
        title: "Hello from API Debugger",
        body: "Testing POST request",
        userId: 1,
      },
      null,
      2,
    ),
    icon: "✏️",
  },
  {
    id: "httpbin-get",
    name: "Echo Request",
    description: "httpbin echoes back your request details",
    category: "rest",
    method: "GET",
    url: "https://httpbin.org/get?tool=api-debugger&version=1.0",
    icon: "🔄",
  },
  {
    id: "httpbin-headers",
    name: "Custom Headers",
    description: "Test custom header handling",
    category: "rest",
    method: "GET",
    url: "https://httpbin.org/headers",
    headers: { "X-Custom-Header": "Hello", "X-Request-Id": "test-123" },
    icon: "📋",
  },
  {
    id: "httpbin-status",
    name: "Status Codes",
    description: "Test different HTTP status codes",
    category: "rest",
    method: "GET",
    url: "https://httpbin.org/status/200,201,400,404,500",
    icon: "🚦",
  },
  {
    id: "httpbin-delay",
    name: "Slow Response",
    description: "2 second delayed response - test timeouts",
    category: "rest",
    method: "GET",
    url: "https://httpbin.org/delay/2",
    icon: "⏱️",
  },
  {
    id: "dog-ceo",
    name: "Random Dog",
    description: "Get a random dog image URL",
    category: "rest",
    method: "GET",
    url: "https://dog.ceo/api/breeds/image/random",
    icon: "🐕",
  },
  {
    id: "coingecko",
    name: "Bitcoin Price",
    description: "Current Bitcoin price in USD/EUR",
    category: "rest",
    method: "GET",
    url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur",
    icon: "₿",
  },
  {
    id: "rest-countries",
    name: "Country Info",
    description: "Get information about a country",
    category: "rest",
    method: "GET",
    url: "https://restcountries.com/v3.1/name/estonia?fields=name,capital,population,flags",
    icon: "🇪🇪",
  },
  {
    id: "httpbin-auth",
    name: "Basic Auth",
    description: "Test basic authentication",
    category: "rest",
    method: "GET",
    url: "https://httpbin.org/basic-auth/user/pass",
    headers: { Authorization: "Basic dXNlcjpwYXNz" },
    icon: "🔐",
  },

  // GraphQL
  {
    id: "countries-query",
    name: "Countries Query",
    description: "Query countries, capitals, and currencies",
    category: "graphql",
    method: "POST",
    url: "https://countries.trevorblades.com/graphql",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      {
        query: `{
  countries(filter: { continent: "EU" }) {
    code
    name
    capital
    currency
    emoji
  }
}`,
      },
      null,
      2,
    ),
    icon: "🌍",
  },
  {
    id: "countries-languages",
    name: "Languages Query",
    description: "Query languages spoken in countries",
    category: "graphql",
    method: "POST",
    url: "https://countries.trevorblades.com/graphql",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      {
        query: `{
  languages(filter: { code: { in: ["en", "fr", "de", "es", "ja"] } }) {
    code
    name
    native
  }
}`,
      },
      null,
      2,
    ),
    icon: "🗣️",
  },

  // WebSocket
  {
    id: "ws-echo",
    name: "WebSocket Echo",
    description: "Connect to echo.websocket.org - messages are echoed back",
    category: "websocket",
    url: "wss://echo.websocket.org",
    icon: "🔌",
  },

  // SSE
  {
    id: "sse-demo",
    name: "SSE Stream",
    description: "Server-Sent Events demo - real-time text stream",
    category: "sse",
    url: "https://sse.dev/test",
    icon: "📡",
  },
];

interface TestResult {
  exampleId: string;
  status: "running" | "success" | "error";
  statusCode?: number;
  duration?: number;
  body?: string;
  headers?: [string, string][];
  error?: string;
}

export function TestMode({
  onRequestSend,
}: {
  onRequestSend?: (config: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }) => Promise<{
    status: number;
    statusText: string;
    headers: [string, string][];
    body: string;
    duration: number;
  }>;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("rest");
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const categories = [
    {
      id: "rest",
      label: "REST",
      count: EXAMPLES.filter((e) => e.category === "rest").length,
    },
    {
      id: "graphql",
      label: "GraphQL",
      count: EXAMPLES.filter((e) => e.category === "graphql").length,
    },
    {
      id: "websocket",
      label: "WebSocket",
      count: EXAMPLES.filter((e) => e.category === "websocket").length,
    },
    {
      id: "sse",
      label: "SSE",
      count: EXAMPLES.filter((e) => e.category === "sse").length,
    },
  ];

  const filteredExamples = EXAMPLES.filter(
    (e) => e.category === activeCategory,
  );

  const runExample = useCallback(async (example: Example) => {
    if (example.category === "websocket" || example.category === "sse") {
      // These use their own UIs - just signal to open them
      return;
    }

    setResults((r) => ({
      ...r,
      [example.id]: { exampleId: example.id, status: "running" },
    }));

    try {
      const headers: Record<string, string> = example.headers || {};
      const start = performance.now();

      const response = await fetch(example.url, {
        method: example.method || "GET",
        headers,
        body:
          example.body && example.method !== "GET" ? example.body : undefined,
      });

      const body = await response.text();
      const duration = performance.now() - start;
      const headerPairs: [string, string][] = [];
      response.headers.forEach((v, k) => headerPairs.push([k, v]));

      setResults((r) => ({
        ...r,
        [example.id]: {
          exampleId: example.id,
          status: response.ok ? "success" : "error",
          statusCode: response.status,
          duration,
          body,
          headers: headerPairs,
        },
      }));
    } catch (err) {
      setResults((r) => ({
        ...r,
        [example.id]: {
          exampleId: example.id,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  }, []);

  const runAll = useCallback(async () => {
    for (const example of filteredExamples) {
      if (example.category !== "websocket" && example.category !== "sse") {
        await runExample(example);
      }
    }
  }, [filteredExamples, runExample]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">🧪 Test Mode</h2>
            <p className="text-sm text-muted-foreground">
              Try these examples - no setup needed
            </p>
          </div>
          <button
            onClick={runAll}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Run All
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-border">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              activeCategory === cat.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Examples */}
      <div className="flex-1 overflow-auto">
        <div className="p-3 space-y-2">
          {filteredExamples.map((example) => {
            const result = results[example.id];
            const isExpanded = expandedResult === example.id;

            return (
              <div
                key={example.id}
                className="border border-border rounded-lg overflow-hidden"
              >
                <div
                  className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() =>
                    setExpandedResult(isExpanded ? null : example.id)
                  }
                >
                  <span className="text-xl">{example.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {example.name}
                      </span>
                      {example.method && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            example.method === "GET"
                              ? "bg-success/10 text-success"
                              : example.method === "POST"
                                ? "bg-warning/10 text-warning"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {example.method}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {example.description}
                    </p>
                  </div>

                  {/* Status indicator */}
                  {result && (
                    <div className="flex items-center gap-2">
                      {result.status === "running" && (
                        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                      )}
                      {result.status === "success" && (
                        <span className="text-xs px-2 py-0.5 bg-success/10 text-success rounded">
                          {result.statusCode} · {result.duration?.toFixed(0)}ms
                        </span>
                      )}
                      {result.status === "error" && (
                        <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded">
                          {result.statusCode || "ERR"}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      runExample(example);
                    }}
                    disabled={result?.status === "running"}
                    className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
                  >
                    Run
                  </button>
                </div>

                {/* Expanded result */}
                {isExpanded && result && (
                  <div className="border-t border-border">
                    {result.body && (
                      <div className="p-3">
                        <div className="text-xs font-medium mb-1">Response</div>
                        <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto max-h-64 whitespace-pre-wrap">
                          {(() => {
                            try {
                              return JSON.stringify(
                                JSON.parse(result.body),
                                null,
                                2,
                              );
                            } catch {
                              return result.body;
                            }
                          })()}
                        </pre>
                      </div>
                    )}
                    {result.error && (
                      <div className="p-3">
                        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                          {result.error}
                        </div>
                      </div>
                    )}
                    {result.headers && result.headers.length > 0 && (
                      <div className="px-3 pb-3">
                        <div className="text-xs font-medium mb-1">
                          Headers ({result.headers.length})
                        </div>
                        <div className="text-xs font-mono bg-muted p-2 rounded max-h-24 overflow-auto">
                          {result.headers.slice(0, 10).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-primary">{k}:</span>
                              <span className="text-muted-foreground truncate">
                                {v}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          All examples use free public APIs. No authentication required.
        </p>
      </div>
    </div>
  );
}
