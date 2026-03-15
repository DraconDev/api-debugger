import { useState, useRef, useCallback } from "react";
import { importContent, detectImportFormat } from "@/lib/importers";
import type { ImportResult } from "@/lib/importers";

interface ImportModalProps {
  onClose: () => void;
  onImport: (result: ImportResult) => void;
}

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    setFilename(file.name);
    setError(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      previewImport(text, file.name);
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsText(file);
  }, []);

  const previewImport = (text: string, name: string) => {
    try {
      const result = importContent(text, name);
      setPreview(result);
      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join("\n"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    setContent(text);
    setFilename("");
    setError(null);
    previewImport(text, "");
  }, []);

  const handleUrlImport = useCallback(async () => {
    const url = prompt("Enter URL to import:");
    if (!url) return;

    setImporting(true);
    setError(null);

    try {
      const response = await fetch(url);
      const text = await response.text();
      const name = url.split("/").pop() || "imported";
      setContent(text);
      setFilename(name);
      previewImport(text, name);
    } catch (err) {
      setError(
        `Failed to fetch: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setImporting(false);
    }
  }, []);

  const handleImport = useCallback(() => {
    if (!preview) return;

    setImporting(true);
    try {
      onImport(preview);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, [preview, onImport, onClose]);

  const detectedFormat = content ? detectImportFormat(content, filename) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Import</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onPaste={handlePaste}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml,.har"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
              className="hidden"
            />

            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <UploadIcon className="w-6 h-6 text-muted-foreground" />
            </div>

            <p className="text-sm font-medium mb-2">
              Drop a file here, paste content, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Supports: OpenAPI, Postman Collection, HAR, cURL
            </p>

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Browse Files
              </button>
              <button
                onClick={handleUrlImport}
                disabled={importing}
                className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
              >
                Import from URL
              </button>
            </div>
          </div>

          {/* Detected format */}
          {detectedFormat && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <CheckIcon className="w-4 h-4 text-success" />
                <span className="font-medium">Detected format:</span>
                <span className="text-muted-foreground capitalize">
                  {detectedFormat}
                </span>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && !preview.errors?.length && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
              <h3 className="text-sm font-medium mb-3">Preview</h3>

              {preview.collections && preview.collections.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Collections ({preview.collections.length})
                  </p>
                  {preview.collections.map((c) => (
                    <div key={c.id} className="text-sm font-medium">
                      {c.name}
                    </div>
                  ))}
                </div>
              )}

              {preview.requests && preview.requests.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Requests ({preview.requests.length})
                  </p>
                  <div className="max-h-40 overflow-auto space-y-1">
                    {preview.requests.slice(0, 10).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            r.method === "GET"
                              ? "bg-success/20 text-emerald-600"
                              : r.method === "POST"
                                ? "bg-warning/20 text-warning"
                                : r.method === "PUT"
                                  ? "bg-blue-500/20 text-blue-600"
                                  : r.method === "DELETE"
                                    ? "bg-destructive/20 text-red-600"
                                    : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {r.method}
                        </span>
                        <span className="truncate">{r.name}</span>
                      </div>
                    ))}
                    {preview.requests.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        +{preview.requests.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {preview.environments && preview.environments.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Environments ({preview.environments.length})
                  </p>
                  {preview.environments.map((e) => (
                    <div key={e.id} className="text-sm font-medium">
                      {e.name} ({e.values.length} variables)
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Or paste content directly into the drop zone
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!preview || !!preview.errors?.length || importing}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
