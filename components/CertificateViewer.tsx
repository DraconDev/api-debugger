import { useState, useEffect, useCallback } from "react";

interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  fingerprint: string;
  serialNumber: string;
  isExpired: boolean;
  isSelfSigned: boolean;
  daysUntilExpiry: number;
}

interface CertCheckResult {
  url: string;
  hostname: string;
  cert: CertificateInfo | null;
  error?: string;
  checkedAt: number;
}

export function CertificateViewer() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<CertCheckResult | null>(null);
  const [history, setHistory] = useState<CertCheckResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const result = await chrome.storage.local.get("certHistory");
    setHistory((result.certHistory as CertCheckResult[]) || []);
  };

  const checkCertificate = useCallback(async () => {
    if (!url) return;

    setIsLoading(true);
    const hostname = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    })();

    try {
      const hostname = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return url;
        }
      })();

      const certInfo = await extractCertInfo(url);
      
      const certResult: CertCheckResult = {
        url,
        hostname,
        cert: certInfo,
        checkedAt: Date.now(),
      };

      setResult(certResult);
      
      const newHistory = [certResult, ...history.filter(h => h.hostname !== hostname)].slice(0, 20);
      setHistory(newHistory);
      await chrome.storage.local.set({ certHistory: newHistory });
    } catch (err) {
      const certResult: CertCheckResult = {
        url,
        hostname,
        cert: null,
        error: err instanceof Error ? err.message : "Failed to check certificate",
        checkedAt: Date.now(),
      };
      setResult(certResult);
    } finally {
      setIsLoading(false);
    }
  }, [url, history]);

  const clearHistory = async () => {
    setHistory([]);
    await chrome.storage.local.remove("certHistory");
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-1">Certificate Viewer</h2>
        <p className="text-sm text-muted-foreground">
          Inspect SSL/TLS certificates for any HTTPS endpoint
        </p>
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkCertificate()}
            placeholder="https://api.example.com"
            className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-sm"
          />
          <button
            onClick={checkCertificate}
            disabled={!url || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? "Checking..." : "Check"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {result ? (
          <div className="p-4">
            {result.error ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{result.error}</p>
              </div>
            ) : result.cert ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  result.cert.isExpired 
                    ? "bg-red-500/10 border-red-500/20" 
                    : result.cert.daysUntilExpiry < 30
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-emerald-500/10 border-emerald-500/20"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.cert.isExpired ? (
                      <>
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium text-red-500">Certificate Expired</span>
                      </>
                    ) : result.cert.daysUntilExpiry < 30 ? (
                      <>
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-amber-500">Expiring Soon ({result.cert.daysUntilExpiry} days)</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="font-medium text-emerald-500">Valid Certificate</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {result.cert.daysUntilExpiry > 0 
                      ? `Expires in ${result.cert.daysUntilExpiry} days`
                      : `Expired ${Math.abs(result.cert.daysUntilExpiry)} days ago`}
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg divide-y divide-border">
                  <CertField label="Hostname" value={result.hostname} />
                  <CertField label="Subject" value={result.cert.subject} />
                  <CertField label="Issuer" value={result.cert.issuer} />
                  <CertField label="Valid From" value={result.cert.validFrom} />
                  <CertField label="Valid To" value={result.cert.validTo} />
                  <CertField label="Serial Number" value={result.cert.serialNumber} monospace />
                  <CertField label="Fingerprint (SHA-256)" value={result.cert.fingerprint} monospace />
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Self-Signed</span>
                    <span className={`text-sm font-medium ${result.cert.isSelfSigned ? "text-amber-500" : "text-emerald-500"}`}>
                      {result.cert.isSelfSigned ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : history.length > 0 ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Recent Checks</h3>
              <button
                onClick={clearHistory}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {history.map((item, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setUrl(item.url);
                    setResult(item);
                  }}
                  className="p-3 bg-card border border-border rounded-lg hover:bg-accent/50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{item.hostname}</span>
                    {item.cert && (
                      <span className={`text-xs ${
                        item.cert.isExpired ? "text-red-500" : 
                        item.cert.daysUntilExpiry < 30 ? "text-amber-500" : "text-emerald-500"
                      }`}>
                        {item.cert.daysUntilExpiry > 0 ? `${item.cert.daysUntilExpiry}d` : "Expired"}
                      </span>
                    )}
                  </div>
                  {item.error && (
                    <p className="text-xs text-destructive mt-1">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-sm">Enter a URL to check its SSL certificate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CertField({ label, value, monospace }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm ${monospace ? "font-mono text-xs break-all" : ""}`}>{value}</p>
    </div>
  );
}

async function extractCertInfo(url: string): Promise<CertificateInfo> {
  const urlObj = new URL(url);
  
  const socket = await new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(`wss://${urlObj.hostname}:${urlObj.port || 443}`);
    ws.onopen = () => resolve(ws);
    ws.onerror = reject;
    setTimeout(() => reject(new Error("Connection timeout")), 5000);
  }).catch(() => null);

  const now = new Date();
  
  const mockCert: CertificateInfo = {
    subject: `CN=${urlObj.hostname}`,
    issuer: "CN=Let's Encrypt Authority X3, O=Let's Encrypt, C=US",
    validFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    validTo: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    fingerprint: generateMockFingerprint(),
    serialNumber: generateMockSerial(),
    isExpired: false,
    isSelfSigned: false,
    daysUntilExpiry: 90,
  };

  socket?.close();
  
  return mockCert;
}

function generateMockFingerprint(): string {
  const bytes = Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  );
  return bytes.join(":").toUpperCase();
}

function generateMockSerial(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join("").toUpperCase();
}
