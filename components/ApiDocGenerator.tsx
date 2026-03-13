import { useState, useCallback } from "react";
import type { SavedRequest, Collection } from "@/types";

interface ApiDocGeneratorProps {
  collections: Collection[];
  savedRequests: SavedRequest[];
}

interface ApiEndpoint {
  method: string;
  path: string;
  name: string;
  description?: string;
  headers?: Record<string, string>;
  queryParams?: string[];
  requestBody?: string;
  responseBody?: string;
  statusCode?: number;
}

export function ApiDocGenerator({ collections, savedRequests }: ApiDocGeneratorProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<"markdown" | "openapi" | "html">("markdown");
  const [generatedDoc, setGeneratedDoc] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  const generateDocumentation = useCallback(() => {
    const requests = selectedCollectionId
      ? savedRequests.filter((r) => r.collectionId === selectedCollectionId)
      : savedRequests;

    if (requests.length === 0) {
      setGeneratedDoc("No requests to document. Save some requests first.");
      setShowPreview(true);
      return;
    }

    const collection = selectedCollectionId
      ? collections.find((c) => c.id === selectedCollectionId)
      : null;

    const endpoints: ApiEndpoint[] = requests.map((req) => {
      const url = new URL(req.request.url);
      return {
        method: req.request.method,
        path: url.pathname,
        name: req.name,
        description: req.description,
        headers: Object.fromEntries(req.request.requestHeaders?.map((h) => [h.name, h.value]) || []),
        queryParams: url.searchParams.toString() ? Array.from(url.searchParams.keys()) : undefined,
        requestBody: req.request.requestBodyText || undefined,
        responseBody: req.request.responseBodyText || undefined,
        statusCode: req.request.statusCode,
      };
    });

    let doc = "";

    if (outputFormat === "markdown") {
      doc = generateMarkdown(collection || null, endpoints);
    } else if (outputFormat === "openapi") {
      doc = generateOpenAPI(collection || null, endpoints);
    } else if (outputFormat === "html") {
      doc = generateHTML(collection || null, endpoints);
    }

    setGeneratedDoc(doc);
    setShowPreview(true);
  }, [selectedCollectionId, savedRequests, collections, outputFormat]);

  const exportDoc = useCallback(() => {
    if (!generatedDoc) return;

    const ext = outputFormat === "markdown" ? "md" : outputFormat === "html" ? "html" : "json";
    const mime = outputFormat === "markdown" ? "text/markdown" : outputFormat === "html" ? "text/html" : "application/json";
    
    const blob = new Blob([generatedDoc], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-documentation.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedDoc, outputFormat]);

  const copyDoc = useCallback(() => {
    navigator.clipboard.writeText(generatedDoc);
  }, [generatedDoc]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">API Documentation Generator</h2>
        
        <div className="flex items-center gap-4 mb-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Collection</label>
            <select
              value={selectedCollectionId || ""}
              onChange={(e) => setSelectedCollectionId(e.target.value || null)}
              className="px-3 py-1.5 text-sm bg-input border border-border rounded"
            >
              <option value="">All Requests</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Format</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as typeof outputFormat)}
              className="px-3 py-1.5 text-sm bg-input border border-border rounded"
            >
              <option value="markdown">Markdown</option>
              <option value="openapi">OpenAPI 3.0</option>
              <option value="html">HTML</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={generateDocumentation}
            disabled={savedRequests.length === 0}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50"
          >
            Generate Documentation
          </button>
          {generatedDoc && (
            <>
              <button
                onClick={copyDoc}
                className="px-4 py-2 bg-secondary text-secondary-foreground text-sm rounded hover:bg-secondary/80"
              >
                Copy
              </button>
              <button
                onClick={exportDoc}
                className="px-4 py-2 bg-secondary text-secondary-foreground text-sm rounded hover:bg-secondary/80"
              >
                Export
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {!showPreview ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Generate API documentation from saved requests</p>
              <p className="text-xs mt-1 text-muted-foreground">
                {savedRequests.length} requests available
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap bg-zinc-950 p-4 rounded-lg text-muted-foreground overflow-auto">
              {generatedDoc}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function generateMarkdown(collection: Collection | null, endpoints: ApiEndpoint[]): string {
  const title = collection?.name || "API Documentation";
  const description = collection?.description || "Generated from API Debugger";

  let md = `# ${title}\n\n`;
  md += `> ${description}\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `---\n\n`;
  md += `## Endpoints\n\n`;

  const groupedByPath = endpoints.reduce((acc, ep) => {
    if (!acc[ep.path]) acc[ep.path] = [];
    acc[ep.path].push(ep);
    return acc;
  }, {} as Record<string, ApiEndpoint[]>);

  for (const [path, eps] of Object.entries(groupedByPath)) {
    md += `### \`${path}\`\n\n`;
    
    for (const ep of eps) {
      const methodColor = 
        ep.method === "GET" ? "🟢" :
        ep.method === "POST" ? "🟡" :
        ep.method === "PUT" ? "🔵" :
        ep.method === "DELETE" ? "🔴" :
        "⚪";
      
      md += `#### ${methodColor} ${ep.method}\n\n`;
      md += `**${ep.name}**\n\n`;
      
      if (ep.description) {
        md += `${ep.description}\n\n`;
      }
      
      if (ep.queryParams?.length) {
        md += `**Query Parameters:**\n\n`;
        md += `| Name | Required |\n`;
        md += `|------|----------|\n`;
        ep.queryParams.forEach((p) => {
          md += `| \`${p}\` | - |\n`;
        });
        md += `\n`;
      }
      
      if (ep.requestBody) {
        md += `**Request Body:**\n\n`;
        md += `\`\`\`json\n${ep.requestBody}\n\`\`\`\n\n`;
      }
      
      if (ep.responseBody) {
        md += `**Response:**\n\n`;
        md += `\`\`\`json\n${ep.responseBody}\n\`\`\`\n\n`;
      }
      
      md += `---\n\n`;
    }
  }

  return md;
}

function generateOpenAPI(collection: Collection | null, endpoints: ApiEndpoint[]): string {
  const title = collection?.name || "API";
  const description = collection?.description || "Generated from API Debugger";

  interface OpenApiSpec {
    openapi: string;
    info: {
      title: string;
      description: string;
      version: string;
    };
    paths: Record<string, Record<string, unknown>>;
  }

  const spec: OpenApiSpec = {
    openapi: "3.0.0",
    info: {
      title,
      description,
      version: "1.0.0",
    },
    paths: {},
  };

  for (const ep of endpoints) {
    if (!spec.paths[ep.path]) {
      spec.paths[ep.path] = {};
    }

    const method = ep.method.toLowerCase();
    const operation: Record<string, unknown> = {
      summary: ep.name,
      description: ep.description || "",
      responses: {},
    };

    if (ep.queryParams?.length) {
      operation.parameters = ep.queryParams.map((p) => ({
        name: p,
        in: "query",
        required: false,
        schema: { type: "string" },
      }));
    }

    if (ep.requestBody) {
      operation.requestBody = {
        content: {
          "application/json": {
            schema: { type: "object" },
            example: safeParseJSON(ep.requestBody),
          },
        },
      };
    }

    operation.responses = {
      [ep.statusCode || 200]: {
        description: "Successful response",
        content: ep.responseBody ? {
          "application/json": {
            schema: { type: "object" },
            example: safeParseJSON(ep.responseBody),
          },
        } : undefined,
      },
    };

    spec.paths[ep.path][method] = operation;
  }

  return JSON.stringify(spec, null, 2);
}

function generateHTML(collection: Collection | null, endpoints: ApiEndpoint[]): string {
  const title = collection?.name || "API Documentation";
  const description = collection?.description || "Generated from API Debugger";

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h3 { font-size: 1.25rem; margin: 1.5rem 0 0.5rem; }
    h4 { font-size: 1rem; margin: 1rem 0 0.5rem; }
    p { color: #6b7280; margin-bottom: 1rem; }
    code { font-family: 'Fira Code', monospace; background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.875rem; }
    pre { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
    pre code { background: none; padding: 0; color: inherit; }
    .method { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
    .method-get { background: #d1fae5; color: #065f46; }
    .method-post { background: #fef3c7; color: #92400e; }
    .method-put { background: #dbeafe; color: #1e40af; }
    .method-delete { background: #fee2e2; color: #991b1b; }
    .endpoint { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
    .path { font-family: monospace; font-size: 1.125rem; color: #4f46e5; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <p><em>Generated: ${new Date().toISOString()}</em></p>
  
  <h2>Endpoints</h2>
`;

  const groupedByPath = endpoints.reduce((acc, ep) => {
    if (!acc[ep.path]) acc[ep.path] = [];
    acc[ep.path].push(ep);
    return acc;
  }, {} as Record<string, ApiEndpoint[]>);

  for (const [path, eps] of Object.entries(groupedByPath)) {
    html += `  <div class="endpoint">\n`;
    html += `    <p class="path">${path}</p>\n`;
    
    for (const ep of eps) {
      html += `    <div style="margin-top: 1rem;">\n`;
      html += `      <span class="method method-${ep.method.toLowerCase()}">${ep.method}</span>\n`;
      html += `      <strong>${ep.name}</strong>\n`;
      
      if (ep.description) {
        html += `      <p>${ep.description}</p>\n`;
      }
      
      if (ep.requestBody) {
        html += `      <h4>Request Body</h4>\n`;
        html += `      <pre><code>${escapeHtml(ep.requestBody)}</code></pre>\n`;
      }
      
      if (ep.responseBody) {
        html += `      <h4>Response</h4>\n`;
        html += `      <pre><code>${escapeHtml(ep.responseBody)}</code></pre>\n`;
      }
      
      html += `    </div>\n`;
    }
    
    html += `  </div>\n`;
  }

  html += `</body>\n</html>`;
  return html;
}

function safeParseJSON(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
