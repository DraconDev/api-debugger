import { useState, useMemo } from "react";
import { JsonViewerWithSearch } from "@/components/response/JsonViewer";
import DOMPurify from "dompurify";

interface XmlViewerProps {
  xml: string;
}

function XmlViewer({ xml }: XmlViewerProps) {
  const highlighted = useMemo(() => {
    const escaped = xml
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/(&lt;\/?)([\w:-]+)/g, '$1<span class="text-primary">$2</span>')
      .replace(/([\w:-]+)(=)/g, '<span class="text-warning">$1</span>$2')
      .replace(/"([^"]*)"/g, '"<span class="text-success">$1</span>"');
    return DOMPurify.sanitize(escaped, { USE_PROFILES: { html: false } });
  }, [xml]);

  return (
    <pre 
      className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

type ContentKind = "json" | "xml" | "html" | "image" | "text";
type ViewMode = "preview" | "pretty" | "raw";

function detectContentKind(body: string, contentType?: string): ContentKind {
  if (contentType?.includes("json")) return "json";
  if (contentType?.includes("xml")) return "xml";
  if (contentType?.includes("html")) return "html";
  if (contentType?.includes("image/")) return "image";
  
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { JSON.parse(body); return "json"; } catch {}
  }
  if (trimmed.startsWith("<") && (trimmed.includes("<?xml") || trimmed.includes("<!DOCTYPE"))) {
    return "xml";
  }
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.match(/^<\w+[^>]*>/)) {
    if (trimmed.includes("</html>") || trimmed.includes("</body>") || trimmed.includes("</div>")) {
      return "html";
    }
  }
  
  return "text";
}

interface ResponseViewerProps {
  body: string;
  contentType?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

export function ResponseViewer({ body, contentType, statusCode, headers }: ResponseViewerProps) {
  const contentKind = detectContentKind(body, contentType);
  const [viewMode, setViewMode] = useState<ViewMode>("pretty");

  const availableModes: ViewMode[] = useMemo(() => {
    const modes: ViewMode[] = [];
    if (contentKind === "html") {
      modes.push("preview");
    }
    if (contentKind === "json" || contentKind === "xml") {
      modes.push("pretty");
    }
    modes.push("raw");
    return modes;
  }, [contentKind]);

  const isImage = contentKind === "image";
  const imageUrl = useMemo(() => {
    if (!isImage || !body) return null;
    try {
      const base64 = body.startsWith("data:") ? body : `data:${contentType};base64,${body}`;
      return base64;
    } catch {
      return null;
    }
  }, [isImage, body, contentType]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(body);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Response Body</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-mono">
            {contentKind.toUpperCase()}
          </span>
          {statusCode && (
            <span className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
              statusCode >= 200 && statusCode < 300 ? "bg-success/20 text-success" :
              statusCode >= 400 ? "bg-destructive/20 text-destructive" :
              "bg-warning/20 text-warning"
            }`}>
              {statusCode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isImage && availableModes.length > 1 && (
            <div className="flex items-center gap-1">
              {availableModes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    viewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={copyToClipboard}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
            title="Copy response"
          >
            <CopyIcon className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatBytes(body.length)}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isImage ? (
          <div className="flex items-center justify-center h-full p-4 bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)] bg-[length:16px_16px]">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Response preview" 
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-destructive text-sm">Failed to load image</span>';
                }}
              />
            ) : (
              <span className="text-muted-foreground text-sm">Unable to preview image</span>
            )}
          </div>
        ) : contentKind === "html" && viewMode === "preview" ? (
          <iframe
            srcDoc={body}
            className="w-full h-full bg-white"
            sandbox="allow-same-origin"
            title="HTML Preview"
          />
        ) : contentKind === "json" && viewMode === "pretty" ? (
          <JsonViewerWithSearch body={body} />
        ) : contentKind === "xml" && viewMode === "pretty" ? (
          <div className="p-4">
            <XmlViewer xml={body} />
          </div>
        ) : (
          <div className="p-4">
            <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-all">
              {body}
            </pre>
          </div>
        )}
      </div>
      
      {headers && Object.keys(headers).length > 0 && (
        <div className="border-t border-border max-h-32 overflow-auto">
          <details className="text-xs">
            <summary className="px-4 py-2 cursor-pointer hover:bg-muted/50 text-muted-foreground">
              Response Headers ({Object.keys(headers).length})
            </summary>
            <div className="px-4 py-2 space-y-1 bg-muted/30">
              {Object.entries(headers).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-primary font-medium">{key}:</span>
                  <span className="text-muted-foreground">{value}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
