import { useState } from "react";
import type { AuthType, AuthConfig } from "@/types";
import { getOAuth2Token, type OAuth2Flow } from "@/lib/oauth2";

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const AUTH_TYPES: { value: AuthType; label: string; description: string }[] = [
  { value: "none", label: "No Auth", description: "No authentication" },
  {
    value: "bearer",
    label: "Bearer Token",
    description: "OAuth 2.0 / JWT tokens",
  },
  { value: "basic", label: "Basic Auth", description: "Username and password" },
  {
    value: "api-key",
    label: "API Key",
    description: "Custom header or query param",
  },
  {
    value: "oauth2",
    label: "OAuth 2.0",
    description: "OAuth 2.0 authorization",
  },
];

const OAUTH2_FLOWS: {
  value: OAuth2Flow;
  label: string;
  description: string;
}[] = [
  {
    value: "client_credentials",
    label: "Client Credentials",
    description: "Machine-to-machine (no user interaction)",
  },
  {
    value: "authorization_code",
    label: "Authorization Code + PKCE",
    description: "Interactive login in browser",
  },
];

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const updateAuth = (updates: Partial<AuthConfig>) => {
    onChange({ ...auth, ...updates });
  };

  const oauth2 = auth.oauth2 || {
    accessTokenUrl: "",
    clientId: "",
    clientSecret: "",
    scope: "",
  };

  const handleGetToken = async () => {
    if (!oauth2.accessTokenUrl || !oauth2.clientId) {
      setTokenError("Token URL and Client ID are required");
      return;
    }

    setIsRequestingToken(true);
    setTokenError(null);

    try {
      const result = await getOAuth2Token({
        flow: (oauth2 as any).flow || "client_credentials",
        accessTokenUrl: oauth2.accessTokenUrl,
        clientId: oauth2.clientId,
        clientSecret: oauth2.clientSecret,
        scope: oauth2.scope,
        authorizationUrl: (oauth2 as any).authorizationUrl,
      });

      updateAuth({
        oauth2: {
          ...oauth2,
          accessToken: result.accessToken,
        },
        bearer: {
          token: result.accessToken,
        },
      });
    } catch (err) {
      setTokenError(
        err instanceof Error ? err.message : "Token request failed",
      );
    } finally {
      setIsRequestingToken(false);
    }
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
              className={`p-2 rounded-lg border text-left transition-colors ${
                auth.type === type.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent/30"
              }`}
            >
              <div className="text-xs font-medium">{type.label}</div>
              <div className="text-[10px] text-muted-foreground">
                {type.description}
              </div>
            </button>
          ))}
        </div>

        {auth.type === "bearer" && (
          <div className="space-y-2">
            <label className="text-xs font-medium">Token</label>
            <input
              type="text"
              value={auth.bearer?.token || ""}
              onChange={(e) =>
                updateAuth({
                  bearer: { token: e.target.value },
                })
              }
              placeholder="Enter bearer token"
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {auth.type === "basic" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">Username</label>
              <input
                type="text"
                value={auth.basic?.username || ""}
                onChange={(e) =>
                  updateAuth({
                    basic: {
                      username: e.target.value,
                      password: auth.basic?.password || "",
                    },
                  })
                }
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
                    basic: {
                      username: auth.basic?.username || "",
                      password: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {auth.type === "api-key" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
                  type="text"
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
                  placeholder="your-api-key"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  updateAuth({
                    apiKey: { ...auth.apiKey!, addTo: "header" },
                  })
                }
                className={`px-3 py-1 text-xs rounded ${
                  auth.apiKey?.addTo === "header"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Header
              </button>
              <button
                onClick={() =>
                  updateAuth({
                    apiKey: { ...auth.apiKey!, addTo: "query" },
                  })
                }
                className={`px-3 py-1 text-xs rounded ${
                  auth.apiKey?.addTo === "query"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Query Param
              </button>
            </div>
          </div>
        )}

        {auth.type === "oauth2" && (
          <div className="space-y-3">
            {/* Flow Type */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Flow</label>
              <div className="grid grid-cols-2 gap-2">
                {OAUTH2_FLOWS.map((flow) => (
                  <button
                    key={flow.value}
                    onClick={() =>
                      updateAuth({
                        oauth2: { ...oauth2, flow: flow.value } as any,
                      })
                    }
                    className={`p-2 rounded border text-left text-xs transition-colors ${
                      ((oauth2 as any).flow || "client_credentials") ===
                      flow.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/30"
                    }`}
                  >
                    <div className="font-medium">{flow.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {flow.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Auth URL (only for PKCE) */}
            {((oauth2 as any).flow || "client_credentials") ===
              "authorization_code" && (
              <div className="space-y-2">
                <label className="text-xs font-medium">Authorization URL</label>
                <input
                  type="text"
                  value={(oauth2 as any).authorizationUrl || ""}
                  onChange={(e) =>
                    updateAuth({
                      oauth2: {
                        ...oauth2,
                        authorizationUrl: e.target.value,
                      } as any,
                    })
                  }
                  placeholder="https://accounts.example.com/authorize"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            {/* Token URL */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Token URL</label>
              <input
                type="text"
                value={oauth2.accessTokenUrl}
                onChange={(e) =>
                  updateAuth({
                    oauth2: { ...oauth2, accessTokenUrl: e.target.value },
                  })
                }
                placeholder="https://oauth.example.com/token"
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Client ID + Secret */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium">Client ID</label>
                <input
                  type="text"
                  value={oauth2.clientId}
                  onChange={(e) =>
                    updateAuth({
                      oauth2: { ...oauth2, clientId: e.target.value },
                    })
                  }
                  placeholder="Client ID"
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">
                  Client Secret{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional for PKCE)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={oauth2.clientSecret || ""}
                    onChange={(e) =>
                      updateAuth({
                        oauth2: { ...oauth2, clientSecret: e.target.value },
                      })
                    }
                    placeholder="Client Secret"
                    className="w-full px-3 py-2 pr-8 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                  >
                    {showSecret ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Scope</label>
              <input
                type="text"
                value={oauth2.scope}
                onChange={(e) =>
                  updateAuth({
                    oauth2: { ...oauth2, scope: e.target.value },
                  })
                }
                placeholder="read write openid"
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Get Token Button */}
            <button
              onClick={handleGetToken}
              disabled={
                isRequestingToken || !oauth2.accessTokenUrl || !oauth2.clientId
              }
              className="w-full py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRequestingToken ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Requesting token...
                </>
              ) : (
                "Get Access Token"
              )}
            </button>

            {/* Error */}
            {tokenError && (
              <div className="p-2 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded">
                {tokenError}
              </div>
            )}

            {/* Token Display */}
            {oauth2.accessToken && (
              <div className="space-y-2">
                <label className="text-xs font-medium">Access Token</label>
                <div className="p-2 text-xs font-mono bg-muted rounded break-all">
                  {oauth2.accessToken}
                </div>
                <button
                  onClick={() =>
                    updateAuth({
                      oauth2: { ...oauth2, accessToken: undefined },
                      bearer: { token: "" },
                    })
                  }
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear token
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
