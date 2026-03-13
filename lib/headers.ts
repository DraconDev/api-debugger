export const COMMON_HEADERS = [
  "Accept",
  "Accept-CH",
  "Accept-CH-Lifetime",
  "Accept-Encoding",
  "Accept-Language",
  "Accept-Ranges",
  "Access-Control-Allow-Credentials",
  "Access-Control-Allow-Headers",
  "Access-Control-Allow-Methods",
  "Access-Control-Allow-Origin",
  "Access-Control-Expose-Headers",
  "Access-Control-Max-Age",
  "Access-Control-Request-Headers",
  "Access-Control-Request-Method",
  "Age",
  "Allow",
  "Alt-Svc",
  "Authorization",
  "Cache-Control",
  "Clear-Site-Data",
  "Connection",
  "Content-Disposition",
  "Content-Encoding",
  "Content-Language",
  "Content-Length",
  "Content-Location",
  "Content-Range",
  "Content-Security-Policy",
  "Content-Security-Policy-Report-Only",
  "Content-Type",
  "Cookie",
  "Cross-Origin-Embedder-Policy",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
  "Date",
  "Device-Memory",
  "Digest",
  "DNT",
  "ETag",
  "Early-Data",
  "Expect",
  "Expect-CT",
  "Expires",
  "Feature-Policy",
  "Forwarded",
  "From",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "If-Range",
  "If-Unmodified-Since",
  "Keep-Alive",
  "Last-Modified",
  "Link",
  "Location",
  "Max-Forwards",
  "Origin",
  "Permissions-Policy",
  "Pragma",
  "Proxy-Authenticate",
  "Proxy-Authorization",
  "Range",
  "Referer",
  "Referrer-Policy",
  "Retry-After",
  "Save-Data",
  "Sec-CH-Prefers-Color-Scheme",
  "Sec-CH-Prefers-Reduced-Motion",
  "Sec-CH-UA",
  "Sec-CH-UA-Arch",
  "Sec-CH-UA-Bitness",
  "Sec-CH-UA-Full-Version",
  "Sec-CH-UA-Full-Version-List",
  "Sec-CH-UA-Mobile",
  "Sec-CH-UA-Model",
  "Sec-CH-UA-Platform",
  "Sec-CH-UA-Platform-Version",
  "Sec-Fetch-Dest",
  "Sec-Fetch-Mode",
  "Sec-Fetch-Site",
  "Sec-Fetch-User",
  "Sec-WebSocket-Accept",
  "Sec-WebSocket-Extensions",
  "Sec-WebSocket-Key",
  "Sec-WebSocket-Protocol",
  "Sec-WebSocket-Version",
  "Server",
  "Server-Timing",
  "Service-Worker-Allowed",
  "Service-Worker-Navigation-Preload",
  "Set-Cookie",
  "SourceMap",
  "Strict-Transport-Security",
  "TE",
  "Timing-Allow-Origin",
  "Tk",
  "Trailer",
  "Transfer-Encoding",
  "Upgrade",
  "Upgrade-Insecure-Requests",
  "User-Agent",
  "Vary",
  "Via",
  "Viewport-Width",
  "WWW-Authenticate",
  "Warning",
  "Width",
  "X-Content-Type-Options",
  "X-DNS-Prefetch-Control",
  "X-Forwarded-For",
  "X-Forwarded-Host",
  "X-Forwarded-Proto",
  "X-Frame-Options",
  "X-Permitted-Cross-Domain-Policies",
  "X-Powered-By",
  "X-Requested-With",
  "X-XSS-Protection",
];

export const HEADER_PRESETS: Record<string, Array<{ name: string; value: string; description: string }>> = {
  "JSON Request": [
    { name: "Content-Type", value: "application/json", description: "JSON body" },
    { name: "Accept", value: "application/json", description: "Accept JSON response" },
  ],
  "Form Data": [
    { name: "Content-Type", value: "multipart/form-data", description: "Multipart form" },
  ],
  "URL Encoded": [
    { name: "Content-Type", value: "application/x-www-form-urlencoded", description: "URL encoded form" },
  ],
  "CORS Headers": [
    { name: "Access-Control-Allow-Origin", value: "*", description: "Allow all origins" },
    { name: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS", description: "Allowed methods" },
    { name: "Access-Control-Allow-Headers", value: "Content-Type, Authorization", description: "Allowed headers" },
  ],
  "Bearer Auth": [
    { name: "Authorization", value: "Bearer <token>", description: "Bearer token" },
  ],
  "Basic Auth": [
    { name: "Authorization", value: "Basic <base64>", description: "Basic auth" },
  ],
  "API Key": [
    { name: "X-API-Key", value: "<api-key>", description: "API key header" },
  ],
  "Cache Control": [
    { name: "Cache-Control", value: "no-cache", description: "No cache" },
  ],
  "No Sniff": [
    { name: "X-Content-Type-Options", value: "nosniff", description: "Prevent MIME sniffing" },
  ],
  "CSP Basic": [
    { name: "Content-Security-Policy", value: "default-src 'self'", description: "Basic CSP" },
  ],
};

export const CONTENT_TYPES = [
  "application/json",
  "application/xml",
  "application/xhtml+xml",
  "application/octet-stream",
  "application/pdf",
  "application/zip",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "text/xml",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "video/webm",
];

export const ACCEPT_VALUES = [
  "*/*",
  "application/json",
  "application/xml",
  "text/html",
  "text/plain",
  "text/css",
  "text/javascript",
  "image/*",
];

export const COMMON_USER_AGENTS = [
  {
    name: "Chrome (Windows)",
    value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  {
    name: "Chrome (Mac)",
    value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  {
    name: "Firefox (Windows)",
    value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  },
  {
    name: "Firefox (Mac)",
    value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  },
  {
    name: "Safari (Mac)",
    value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  },
  {
    name: "Edge (Windows)",
    value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  },
  {
    name: "iPhone Safari",
    value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  },
  {
    name: "Android Chrome",
    value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  },
  {
    name: "Googlebot",
    value: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  },
  {
    name: "curl",
    value: "curl/8.4.0",
  },
];

export function filterHeaders(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  return COMMON_HEADERS.filter((h) => h.toLowerCase().includes(lowerQuery)).slice(0, 10);
}

export function getHeaderValueSuggestions(headerName: string): string[] {
  const lowerName = headerName.toLowerCase();
  
  if (lowerName === "content-type" || lowerName === "accept") {
    return CONTENT_TYPES;
  }
  
  if (lowerName === "accept-encoding") {
    return ["gzip", "deflate", "br", "gzip, deflate", "gzip, deflate, br"];
  }
  
  if (lowerName === "user-agent") {
    return COMMON_USER_AGENTS.map((ua) => ua.value);
  }
  
  if (lowerName === "cache-control") {
    return [
      "no-cache",
      "no-store",
      "max-age=3600",
      "max-age=86400",
      "must-revalidate",
      "public",
      "private",
      "no-transform",
    ];
  }
  
  if (lowerName.startsWith("access-control-")) {
    return ["*", "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "GET, POST, PUT, DELETE"];
  }
  
  return [];
}
