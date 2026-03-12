import type { AuthType, AuthConfig } from "@/types";

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const AUTH_TYPES: { value: AuthType; label: string; description: string }[] = [
  { value: "none", label: "No Auth", description: "No authentication" },
  { value: "bearer", label: "Bearer Token", description: "OAuth 2.0 / JWT tokens" },
  { value: "basic", label: "Basic Auth", description: "Username and password" },
  { value: "api-key", label: "API Key", description: "Custom header or query param" },
  { value: "oauth2", label: "OAuth 2.0", description: "OAuth 2.0 authorization" },
];

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const updateAuth = (updates: Partial<AuthConfig>) => {
    onChange({ ...auth, ...updates });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Authorization</span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {AUTH_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => updateAuth({ type: type.value })}
              className={`p-2 text-left rounded border ${
                auth.type === type.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="text-xs font-medium">{type.label}</div>
              <div className="text-xs text-muted-foreground">{type.description}</div>
            </button>
          ))}
        </div>

        {auth.type === "bearer" && (
          <div className="space-y-2">
            <label className="text-xs font-medium">Token</label>
            <input
              type="password"
              value={auth.bearer?.token || ""}
              onChange={(e) =>
                updateAuth({
                  bearer: { token: e.target.value },
                })
              }
              placeholder="Enter bearer token"
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Authorization: Bearer {"{{token}}"}
            </p>
          </div>
        )}

        {auth.type === "basic" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">Username</label>
              <input
                type="text"
                value={auth.basic?.username || ""}
                onChange={(e) =>
                  updateAuth({
                    basic: { username: e.target.value, password: auth.basic?.password || "" },
                  })
                }
                placeholder="Username"
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Password</label>
              <input
                type="password"
                value={auth.basic?.password || ""}
                onChange={(e) =>
                  updateAuth({
                    basic: { username: auth.basic?.username || "", password: e.target.value },
                  })
                }
                placeholder="Password"
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {auth.type === "api-key" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">Key</label>
              <input
                type="text"
                value={auth.apiKey?.key || ""}
                onChange={(e) =>
                  updateAuth({
                    apiKey: {
                      key: e.target.value,
                      value: auth.apiKey?.value || "",
                      addTo: auth.apiKey?.addTo || "header",
                    },
                  })
                }
                placeholder="X-API-Key"
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Value</label>
              <input
                type="password"
                value={auth.apiKey?.value || ""}
                onChange={(e) =>
                  updateAuth({
                    apiKey: {
                      key: auth.apiKey?.key || "",
                      value: e.target.value,
                      addTo: auth.apiKey?.addTo || "header",
                    },
                  })
                }
                placeholder="api-key-value"
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Add to</label>
              <select
                value={auth.apiKey?.addTo || "header"}
                onChange={(e) =>
                  updateAuth({
                    apiKey: {
                      key: auth.apiKey?.key || "",
                      value: auth.apiKey?.value || "",
                      addTo: e.target.value as "header" | "query",
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="header">Header</option>
                <option value="query">Query Parameter</option>
              </select>
            </div>
          </div>
        )}

        {auth.type === "oauth2" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">Access Token URL</label>
              <input
                type="text"
                value={auth.oauth2?.accessTokenUrl || ""}
                onChange={(e) =>
                  updateAuth({
                    oauth2: {
                      accessTokenUrl: e.target.value,
                      clientId: auth.oauth2?.clientId || "",
                      clientSecret: auth.oauth2?.clientSecret || "",
                      scope: auth.oauth2?.scope || "",
                    },
                  })
                }
                placeholder="https://oauth.example.com/token"
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium">Client ID</label>
                <input
                  type="text"
                  value={auth.oauth2?.clientId || ""}
                  onChange={(e) =>
                    updateAuth({
                      oauth2: {
                        accessTokenUrl: auth.oauth2?.accessTokenUrl || "",
                        clientId: e.target.value,
                        clientSecret: auth.oauth2?.clientSecret || "",
                        scope: auth.oauth2?.scope || "",
                      },
                    })
                  }
                  placeholder="Client ID"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Client Secret</label>
                <input
                  type="password"
                  value={auth.oauth2?.clientSecret || ""}
                  onChange={(e) =>
                    updateAuth({
                      oauth2: {
                        accessTokenUrl: auth.oauth2?.accessTokenUrl || "",
                        clientId: auth.oauth2?.clientId || "",
                        clientSecret: e.target.value,
                        scope: auth.oauth2?.scope || "",
                      },
                    })
                  }
                  placeholder="Client Secret"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Scope</label>
              <input
                type="text"
                value={auth.oauth2?.scope || ""}
                onChange={(e) =>
                  updateAuth({
                    oauth2: {
                      accessTokenUrl: auth.oauth2?.accessTokenUrl || "",
                      clientId: auth.oauth2?.clientId || "",
                      clientSecret: auth.oauth2?.clientSecret || "",
                      scope: e.target.value,
                    },
                  })
                }
                placeholder="read write"
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button className="w-full py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md">
              Get Access Token
            </button>
            {auth.oauth2?.accessToken && (
              <div className="space-y-2">
                <label className="text-xs font-medium">Access Token</label>
                <div className="p-2 text-xs font-mono bg-muted rounded break-all">
                  {auth.oauth2.accessToken}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
