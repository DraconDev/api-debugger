import { useState } from "react";
import type { RequestConfig } from "@/types";

interface ImportExportProps {
  onImport?: (config: RequestConfig) => void;
  request?: RequestConfig;
}

export function ImportExport({ onImport, request }: ImportExportProps) {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [importType, setImportType] = useState<"curl" | "postman" | "openapi">("curl");
  const [importText, setImportText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    setError(null);

    try {
      if (importType === "curl") {
        const config = parseCurl(importText);
        onImport?.(config);
        setImportText("");
      } else if (importType === "postman") {
        const configs = parsePostman(importText);
        if (configs.length > 0) {
          onImport?.(configs[0]);
          setImportText("");
        }
      } else if (importType === "openapi") {
        const configs = parseOpenApi(importText);
        if (configs.length > 0) {
          onImport?.(configs[0]);
          setImportText("");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse");
    }
  };

  const handleExport = (format: "curl" | "postman" | "json") => {
    if (!request) return;

    let content = "";
    let filename = "request";

    if (format === "curl") {
      content = generateCurlExport(request);
      filename = "request.sh";
    } else if (format === "postman") {
      content = JSON.stringify(generatePostmanExport(request), null, 2);
      filename = "collection.json";
    } else {
      content = JSON.stringify(request, null, 2);
      filename = "request.json";
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        <button
          onClick={() => setActiveTab("import")}
          className={`px-3 py-1 text-xs rounded ${
            activeTab === "import" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          Import
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`px-3 py-1 text-xs rounded ${
            activeTab === "export" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          Export
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {activeTab === "import" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {(["curl", "postman", "openapi"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setImportType(type)}
                  className={`px-3 py-1 text-xs rounded ${
                    importType === type ? "bg-muted text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {type === "curl" ? "cURL" : type === "postman" ? "Postman" : "OpenAPI"}
                </button>
              ))}
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={
                importType === "curl"
                  ? "curl -X GET 'https://api.example.com/users' -H 'Authorization: Bearer token'"
                  : importType === "postman"
                  ? "Paste Postman collection JSON..."
                  : "Paste OpenAPI/Swagger JSON..."
              }
              className="w-full h-48 p-2 text-xs font-mono bg-input border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {error && (
              <div className="text-xs text-destructive">{error}</div>
            )}

            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="w-full py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded disabled:opacity-50"
            >
              Import
            </button>
          </div>
        )}

        {activeTab === "export" && (
          <div className="space-y-3">
            {request ? (
              <>
                <p className="text-xs text-muted-foreground">Export current request:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleExport("curl")}
                    className="p-3 text-sm border border-border rounded hover:bg-accent"
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => handleExport("postman")}
                    className="p-3 text-sm border border-border rounded hover:bg-accent"
                  >
                    Postman
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="p-3 text-sm border border-border rounded hover:bg-accent"
                  >
                    JSON
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                No request to export
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function parseCurl(curl: string): RequestConfig {
  const config: RequestConfig = {
    method: "GET",
    url: "",
    params: [],
    headers: [],
    bodyType: "none",
    body: {},
    auth: { type: "none" },
  };

  const normalized = curl.trim().replace(/\s+/g, " ");

  const methodMatch = normalized.match(/-X\s+(\w+)/i);
  if (methodMatch) {
    config.method = methodMatch[1].toUpperCase();
  }

  const urlMatch = normalized.match(/(?:curl\s+)?['"]?(https?:\/\/[^'"\s]+)['"]?/i);
  if (urlMatch) {
    config.url = urlMatch[1];
  }

  const headerMatches = normalized.matchAll(/-H\s+['"]([^'"]+)['"]/g);
  for (const match of headerMatches) {
    const [name, ...valueParts] = match[1].split(": ");
    config.headers.push({ name: name.trim(), value: valueParts.join(": ").trim(), enabled: true });
  }

  const dataMatch = normalized.match(/-d\s+['"]([^'"]+)['"]/);
  if (dataMatch) {
    config.bodyType = "raw";
    config.body = { raw: dataMatch[1] };

    const contentType = config.headers.find((h) => h.name.toLowerCase() === "content-type");
    if (contentType?.value.includes("json")) {
      config.bodyType = "json";
      config.body = { json: dataMatch[1] };
    }
  }

  const authHeader = config.headers.find((h) => h.name.toLowerCase() === "authorization");
  if (authHeader) {
    if (authHeader.value.startsWith("Bearer ")) {
      config.auth = { type: "bearer", bearer: { token: authHeader.value.slice(7) } };
    } else if (authHeader.value.startsWith("Basic ")) {
      const decoded = atob(authHeader.value.slice(6));
      const [username, password] = decoded.split(":");
      config.auth = { type: "basic", basic: { username: username || "", password: password || "" } };
    }
  }

  return config;
}

function parsePostman(json: string): RequestConfig[] {
  const collection = JSON.parse(json);
  const configs: RequestConfig[] = [];

  const parseItem = (item: any) => {
    if (item.request) {
      const config: RequestConfig = {
        method: item.request.method || "GET",
        url: typeof item.request.url === "string" ? item.request.url : item.request.url?.raw || "",
        params: [],
        headers: [],
        bodyType: "none",
        body: {},
        auth: { type: "none" },
      };

      if (item.request.header) {
        config.headers = item.request.header.map((h: any) => ({
          name: h.key,
          value: h.value,
          enabled: !h.disabled,
        }));
      }

      if (item.request.body?.raw) {
        config.bodyType = "json";
        config.body = { json: item.request.body.raw };
      }

      configs.push(config);
    }

    if (item.item) {
      item.item.forEach(parseItem);
    }
  };

  if (collection.item) {
    collection.item.forEach(parseItem);
  }

  return configs;
}

function parseOpenApi(json: string): RequestConfig[] {
  const spec = JSON.parse(json);
  const configs: RequestConfig[] = [];

  const baseUrl = spec.servers?.[0]?.url || "";

  if (spec.paths) {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, details] of Object.entries(methods as Record<string, any>)) {
        if (["get", "post", "put", "patch", "delete"].includes(method)) {
          const config: RequestConfig = {
            method: method.toUpperCase(),
            url: baseUrl + path,
            params: [],
            headers: [],
            bodyType: "none",
            body: {},
            auth: { type: "none" },
          };

          if ((details as any).parameters) {
            for (const param of (details as any).parameters) {
              if (param.in === "query") {
                config.params.push({
                  name: param.name,
                  value: "",
                  enabled: true,
                  description: param.description,
                });
              }
            }
          }

          configs.push(config);
        }
      }
    }
  }

  return configs;
}

function generateCurlExport(config: RequestConfig): string {
  const parts = ["curl"];

  parts.push(`-X ${config.method}`);

  config.headers.forEach((h) => {
    if (h.enabled !== false && h.name) {
      parts.push(`-H '${h.name}: ${h.value}'`);
    }
  });

  if (config.body.json) {
    parts.push(`-d '${config.body.json}'`);
  } else if (config.body.raw) {
    parts.push(`-d '${config.body.raw}'`);
  }

  parts.push(`'${config.url}'`);

  return parts.join(" \\\n  ");
}

function generatePostmanExport(config: RequestConfig): any {
  return {
    info: {
      name: "API Debugger Export",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [
      {
        name: config.url || "Request",
        request: {
          method: config.method,
          url: config.url,
          header: config.headers.map((h) => ({
            key: h.name,
            value: h.value,
            disabled: h.enabled === false,
          })),
          body: config.body.json
            ? {
                mode: "raw",
                raw: config.body.json,
                options: { raw: { language: "json" } },
              }
            : undefined,
        },
      },
    ],
  };
}
