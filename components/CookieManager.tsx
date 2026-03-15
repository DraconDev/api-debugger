import { useState, useEffect, useCallback } from "react";

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "unspecified" | "no_restriction" | "lax" | "strict";
  expirationDate?: number;
  hostOnly?: boolean;
  session?: boolean;
}

interface CookieEditState {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "unspecified" | "no_restriction" | "lax" | "strict";
  expirationDate: string;
}

const emptyCookie: CookieEditState = {
  name: "",
  value: "",
  domain: "",
  path: "/",
  secure: false,
  httpOnly: false,
  sameSite: "lax",
  expirationDate: "",
};

export function CookieManager() {
  const [domain, setDomain] = useState("");
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingCookie, setEditingCookie] = useState<Cookie | null>(null);
  const [isNewCookie, setIsNewCookie] = useState(false);
  const [formData, setFormData] = useState<CookieEditState>(emptyCookie);
  const [error, setError] = useState<string | null>(null);

  const loadCookies = useCallback(async (domainFilter: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const allCookies = await chrome.cookies.getAll({});
      let filtered = allCookies;
      if (domainFilter) {
        const lowerDomain = domainFilter.toLowerCase();
        filtered = allCookies.filter((c) =>
          c.domain.toLowerCase().includes(lowerDomain)
        );
      }
      setCookies(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cookies");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCookies(domain);
  }, [domain, loadCookies]);

  const filteredCookies = searchQuery
    ? cookies.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cookies;

  const deleteCookie = async (cookie: Cookie) => {
    const url = `http${cookie.secure ? "s" : ""}://${cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`;
    await chrome.cookies.remove({ url, name: cookie.name });
    setCookies(cookies.filter((c) => !(c.name === cookie.name && c.domain === cookie.domain)));
  };

  const clearDomainCookies = async () => {
    if (!domain) return;
    const domainCookies = cookies.filter((c) =>
      c.domain.toLowerCase().includes(domain.toLowerCase())
    );
    for (const cookie of domainCookies) {
      const url = `http${cookie.secure ? "s" : ""}://${cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`;
      await chrome.cookies.remove({ url, name: cookie.name });
    }
    loadCookies(domain);
  };

  const startEdit = (cookie: Cookie) => {
    setEditingCookie(cookie);
    setIsNewCookie(false);
    setFormData({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate
        ? new Date(cookie.expirationDate * 1000).toISOString().slice(0, 16)
        : "",
    });
  };

  const startNew = () => {
    setEditingCookie(null);
    setIsNewCookie(true);
    setFormData({
      ...emptyCookie,
      domain: domain || "",
    });
  };

  const saveCookie = async () => {
    const url = `https://${formData.domain.startsWith(".") ? formData.domain.slice(1) : formData.domain}`;
    
    const cookieDetails: Record<string, unknown> = {
      url,
      name: formData.name,
      value: formData.value,
      path: formData.path,
      secure: formData.secure,
      httpOnly: formData.httpOnly,
      sameSite: formData.sameSite,
    };

    if (formData.expirationDate) {
      cookieDetails.expirationDate = Math.floor(new Date(formData.expirationDate).getTime() / 1000);
    }

    try {
      await chrome.cookies.set(cookieDetails as unknown as chrome.cookies.SetDetails);
      setEditingCookie(null);
      setIsNewCookie(false);
      setFormData(emptyCookie);
      loadCookies(domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cookie");
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Session";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const groupedCookies = filteredCookies.reduce((acc, cookie) => {
    const d = cookie.domain;
    if (!acc[d]) acc[d] = [];
    acc[d].push(cookie);
    return acc;
  }, {} as Record<string, Cookie[]>);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Cookie Manager</h2>
        
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Filter by domain (e.g., google.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="flex-1 px-3 py-2 bg-input border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            placeholder="Search cookies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 px-3 py-2 bg-input border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={startNew}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90"
          >
            Add Cookie
          </button>
          {domain && (
            <button
              onClick={clearDomainCookies}
              className="px-3 py-1.5 bg-destructive text-destructive-foreground text-sm rounded hover:bg-destructive/90"
            >
              Clear Domain Cookies
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-b border-border">
          {error}
        </div>
      )}

      {(editingCookie || isNewCookie) && (
        <div className="p-4 bg-card border-b border-border">
          <h3 className="font-medium mb-3">{isNewCookie ? "New Cookie" : "Edit Cookie"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2 py-1.5 bg-input border border-border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Value</label>
              <input
                type="text"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-2 py-1.5 bg-input border border-border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Domain</label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder=".example.com"
                className="w-full px-2 py-1.5 bg-input border border-border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Path</label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                className="w-full px-2 py-1.5 bg-input border border-border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">SameSite</label>
              <select
                value={formData.sameSite}
                onChange={(e) => setFormData({ ...formData, sameSite: e.target.value as CookieEditState["sameSite"] })}
                className="w-full px-2 py-1.5 bg-input border border-border rounded text-sm"
              >
                <option value="unspecified">Unspecified</option>
                <option value="no_restriction">No Restriction</option>
                <option value="lax">Lax</option>
                <option value="strict">Strict</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Expiration</label>
              <input
                type="datetime-local"
                value={formData.expirationDate}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                className="w-full px-2 py-1.5 bg-input border border-border rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-4 col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.secure}
                  onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
                  className="rounded border-border"
                />
                Secure
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.httpOnly}
                  onChange={(e) => setFormData({ ...formData, httpOnly: e.target.checked })}
                  className="rounded border-border"
                />
                HttpOnly
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveCookie}
              disabled={!formData.name || !formData.domain}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingCookie(null);
                setIsNewCookie(false);
                setFormData(emptyCookie);
              }}
              className="px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded hover:bg-muted/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : Object.keys(groupedCookies).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {domain ? "No cookies found for this domain" : "Enter a domain to filter cookies or view all"}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedCookies).map(([domainKey, domainCookies]) => (
              <div key={domainKey} className="border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 text-sm font-medium flex justify-between items-center">
                  <span>{domainKey}</span>
                  <span className="text-xs text-muted-foreground">{domainCookies.length} cookies</span>
                </div>
                <div className="divide-y divide-border">
                  {domainCookies.map((cookie, idx) => (
                    <div key={`${cookie.name}-${idx}`} className="px-3 py-2 hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">{cookie.name}</span>
                            <div className="flex gap-1">
                              {cookie.secure && (
                                <span className="px-1 py-0.5 text-xs bg-blue-500/20 text-blue-500 rounded">Secure</span>
                              )}
                              {cookie.httpOnly && (
                                <span className="px-1 py-0.5 text-xs bg-warning/20 text-warning rounded">HttpOnly</span>
                              )}
                            </div>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground truncate mt-0.5">
                            {cookie.value.length > 100 ? `${cookie.value.slice(0, 100)}...` : cookie.value}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Path: {cookie.path} | Expires: {formatDate(cookie.expirationDate)} | SameSite: {cookie.sameSite}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(cookie)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteCookie(cookie)}
                            className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        {filteredCookies.length} cookies {domain && `matching "${domain}"`}
      </div>
    </div>
  );
}
