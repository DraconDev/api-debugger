import { useState, useCallback, useEffect } from "react";
import type { MockServer, MockEndpoint } from "@/types";

const STORAGE_KEY = "apiDebugger_mockServers";

export function MockServerManager() {
  const [servers, setServers] = useState<MockServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEndpoint, setEditingEndpoint] = useState<MockEndpoint | null>(
    null,
  );
  const [isNewEndpoint, setIsNewEndpoint] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setIsLoading(true);
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      setServers((result[STORAGE_KEY] as MockServer[]) || []);
    } catch (error) {
      console.error("Failed to load mock servers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveServers = async (newServers: MockServer[]) => {
    await chrome.storage.local.set({ [STORAGE_KEY]: newServers });
    setServers(newServers);

    await chrome.runtime.sendMessage({
      type: "UPDATE_MOCK_SERVERS",
      payload: { servers: newServers },
    });
  };

  const createServer = useCallback(() => {
    const server: MockServer = {
      id: `mock_${Date.now()}`,
      name: `Mock Server ${servers.length + 1}`,
      endpoints: [],
      enabled: true,
      createdAt: Date.now(),
    };
    saveServers([...servers, server]);
    setSelectedServerId(server.id);
  }, [servers]);

  const deleteServer = useCallback(
    (id: string) => {
      saveServers(servers.filter((s) => s.id !== id));
      if (selectedServerId === id) {
        setSelectedServerId(null);
      }
    },
    [servers, selectedServerId],
  );

  const toggleServer = useCallback(
    (id: string) => {
      saveServers(
        servers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
      );
    },
    [servers],
  );

  const updateServerName = useCallback(
    (id: string, name: string) => {
      saveServers(servers.map((s) => (s.id === id ? { ...s, name } : s)));
    },
    [servers],
  );

  const selectedServer = servers.find((s) => s.id === selectedServerId);

  const createEndpoint = useCallback(() => {
    if (!selectedServer) return;

    const endpoint: MockEndpoint = {
      id: `ep_${Date.now()}`,
      name: "New Endpoint",
      path: "/api/example",
      method: "GET",
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello from mock server" }, null, 2),
      contentType: "application/json",
      delay: 0,
      enabled: true,
      createdAt: Date.now(),
    };

    saveServers(
      servers.map((s) =>
        s.id === selectedServerId
          ? { ...s, endpoints: [...s.endpoints, endpoint] }
          : s,
      ),
    );

    setEditingEndpoint(endpoint);
    setIsNewEndpoint(true);
  }, [servers, selectedServerId, selectedServer]);

  const updateEndpoint = useCallback(
    (endpointId: string, updates: Partial<MockEndpoint>) => {
      saveServers(
        servers.map((s) =>
          s.id === selectedServerId
            ? {
                ...s,
                endpoints: s.endpoints.map((e) =>
                  e.id === endpointId ? { ...e, ...updates } : e,
                ),
              }
            : s,
        ),
      );

      if (editingEndpoint?.id === endpointId) {
        setEditingEndpoint({ ...editingEndpoint, ...updates });
      }
    },
    [servers, selectedServerId, editingEndpoint],
  );

  const deleteEndpoint = useCallback(
    (endpointId: string) => {
      saveServers(
        servers.map((s) =>
          s.id === selectedServerId
            ? {
                ...s,
                endpoints: s.endpoints.filter((e) => e.id !== endpointId),
              }
            : s,
        ),
      );

      if (editingEndpoint?.id === endpointId) {
        setEditingEndpoint(null);
        setIsNewEndpoint(false);
      }
    },
    [servers, selectedServerId, editingEndpoint],
  );

  const toggleEndpoint = useCallback(
    (endpointId: string) => {
      saveServers(
        servers.map((s) =>
          s.id === selectedServerId
            ? {
                ...s,
                endpoints: s.endpoints.map((e) =>
                  e.id === endpointId ? { ...e, enabled: !e.enabled } : e,
                ),
              }
            : s,
        ),
      );
    },
    [servers, selectedServerId],
  );

  const exportServer = useCallback((server: MockServer) => {
    const data = {
      name: server.name,
      endpoints: server.endpoints.map((e) => ({
        name: e.name,
        path: e.path,
        method: e.method,
        statusCode: e.statusCode,
        headers: e.headers,
        body: e.body,
        contentType: e.contentType,
        delay: e.delay,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mock-server-${server.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const generateServerScript = useCallback((server: MockServer) => {
    const enabledEndpoints = server.endpoints.filter((e) => e.enabled);
    if (enabledEndpoints.length === 0) return;

    const routes = enabledEndpoints.map((e) => {
      const headers = Object.entries(e.headers || {})
        .map(([k, v]) => `      '${k}': '${v}'`)
        .join(",\n");
      const body = e.body || "{}";
      return `  // ${e.name}
  app.${e.method.toLowerCase()}('${e.path}', async (req, res) => {
    ${e.delay ? `await new Promise(r => setTimeout(r, ${e.delay}));` : ""}
    res.set({
${headers}
    });
    res.status(${e.statusCode}).send(${JSON.stringify(body)});
  });`;
    });

    const script = `#!/usr/bin/env node
// Mock Server: ${server.name}
// Generated by API Debugger
// Run: node mock-server.js [port]

const http = require('http');
const port = parseInt(process.argv[2] || '3100');

const routes = ${JSON.stringify(
      enabledEndpoints.map((e) => ({
        method: e.method,
        path: e.path,
        status: e.statusCode,
        headers: e.headers || {},
        body: e.body || "{}",
        delay: e.delay || 0,
      })),
      null,
      2,
    )};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, \`http://localhost:\${port}\`);
  const route = routes.find(
    (r) => r.method === req.method && r.path === url.pathname
  );

  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: url.pathname }));
    return;
  }

  if (route.delay) {
    await new Promise((r) => setTimeout(r, route.delay));
  }

  Object.entries(route.headers).forEach(([k, v]) => res.setHeader(k, v));
  res.writeHead(route.status);
  res.end(route.body);
});

server.listen(port, () => {
  console.log(\`Mock server "${server.name || ""}" running at http://localhost:\${port}\`);
  routes.forEach((r) => console.log(\`  \${r.method} http://localhost:\${port}\${r.path}\`));
});
`;

    const blob = new Blob([script], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mock-server.js`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="h-full w-full flex">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium">Mock Servers</h2>
          <button
            onClick={createServer}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : servers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No mock servers. Click + to create one.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className={`group p-2 rounded cursor-pointer transition-colors ${
                    selectedServerId === server.id
                      ? "bg-accent"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedServerId(server.id)}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleServer(server.id);
                      }}
                      className={`w-2 h-2 rounded-full ${
                        server.enabled ? "bg-success" : "bg-muted-foreground/50"
                      }`}
                    />
                    <span className="flex-1 text-sm truncate">
                      {server.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {server.endpoints.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteServer(server.id);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedServer ? (
          <>
            <div className="p-3 border-b border-border flex items-center gap-2">
              <input
                type="text"
                value={selectedServer.name}
                onChange={(e) =>
                  updateServerName(selectedServer.id, e.target.value)
                }
                className="flex-1 px-2 py-1 text-sm bg-transparent font-medium focus:outline-none"
              />
              <button
                onClick={() => exportServer(selectedServer)}
                className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded text-secondary-foreground"
              >
                Export
              </button>
              <button
                onClick={() => generateServerScript(selectedServer)}
                className="px-2 py-1 text-xs bg-primary hover:bg-primary/90 rounded text-primary-foreground"
              >
                Generate Script
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Endpoints</h3>
                  <button
                    onClick={createEndpoint}
                    className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    + Add Endpoint
                  </button>
                </div>

                {selectedServer.endpoints.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No endpoints defined. Add one to mock API responses.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedServer.endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className={`p-3 border rounded-lg ${
                          endpoint.enabled
                            ? "bg-card"
                            : "bg-muted/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={endpoint.enabled}
                            onChange={() => toggleEndpoint(endpoint.id)}
                            className="rounded border-border"
                          />
                          <span
                            className={`font-mono text-xs font-medium ${
                              endpoint.method === "GET"
                                ? "text-success"
                                : endpoint.method === "POST"
                                  ? "text-warning"
                                  : endpoint.method === "PUT"
                                    ? "text-primary"
                                    : endpoint.method === "DELETE"
                                      ? "text-destructive"
                                      : "text-muted-foreground"
                            }`}
                          >
                            {endpoint.method}
                          </span>
                          <span className="font-mono text-xs text-primary">
                            {endpoint.path}
                          </span>
                          <span
                            className={`font-mono text-xs ${
                              endpoint.statusCode >= 400
                                ? "text-destructive"
                                : "text-success"
                            }`}
                          >
                            {endpoint.statusCode}
                          </span>
                          <div className="flex-1" />
                          <button
                            onClick={() => {
                              setEditingEndpoint(endpoint);
                              setIsNewEndpoint(false);
                            }}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteEndpoint(endpoint.id)}
                            className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                          >
                            <svg
                              className="w-4 h-4"
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
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {endpoint.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {editingEndpoint && (
              <div className="border-t border-border p-3 bg-card max-h-96 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">
                    {isNewEndpoint ? "New Endpoint" : "Edit Endpoint"}
                  </h4>
                  <button
                    onClick={() => {
                      setEditingEndpoint(null);
                      setIsNewEndpoint(false);
                    }}
                    className="p-1 hover:bg-muted rounded text-muted-foreground"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editingEndpoint.name}
                      onChange={(e) =>
                        updateEndpoint(editingEndpoint.id, {
                          name: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Path
                    </label>
                    <input
                      type="text"
                      value={editingEndpoint.path}
                      onChange={(e) =>
                        updateEndpoint(editingEndpoint.id, {
                          path: e.target.value,
                        })
                      }
                      placeholder="/api/users"
                      className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Method
                    </label>
                    <select
                      value={editingEndpoint.method}
                      onChange={(e) =>
                        updateEndpoint(editingEndpoint.id, {
                          method: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded"
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>PATCH</option>
                      <option>DELETE</option>
                      <option>HEAD</option>
                      <option>OPTIONS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Status Code
                    </label>
                    <input
                      type="number"
                      value={editingEndpoint.statusCode}
                      onChange={(e) =>
                        updateEndpoint(editingEndpoint.id, {
                          statusCode: parseInt(e.target.value) || 200,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Content-Type
                    </label>
                    <select
                      value={editingEndpoint.contentType}
                      onChange={(e) =>
                        updateEndpoint(editingEndpoint.id, {
                          contentType: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded"
                    >
                      <option value="application/json">application/json</option>
                      <option value="text/plain">text/plain</option>
                      <option value="text/html">text/html</option>
                      <option value="application/xml">application/xml</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Delay (ms)
                    </label>
                    <input
                      type="number"
                      value={editingEndpoint.delay}
                      onChange={(e) =>
                        updateEndpoint(editingEndpoint.id, {
                          delay: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-muted-foreground mb-1">
                    Response Body
                  </label>
                  <textarea
                    value={editingEndpoint.body}
                    onChange={(e) =>
                      updateEndpoint(editingEndpoint.id, {
                        body: e.target.value,
                      })
                    }
                    rows={6}
                    className="w-full px-2 py-1.5 text-xs bg-input border border-border rounded font-mono"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
              <p className="text-sm">Select or create a mock server</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
