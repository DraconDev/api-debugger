import type { ImportResult, ImportRequest } from "./types";
import { generateId } from "./types";

export function parseCurl(content: string): ImportResult {
  const trimmed = content.trim();
  
  if (!trimmed.toLowerCase().startsWith("curl")) {
    return {
      type: "requests",
      name: "Import Failed",
      errors: ["Not a valid cURL command - must start with 'curl'"],
      requests: [],
    };
  }

  try {
    const request = parseCurlCommand(trimmed);
    return {
      type: "requests",
      name: "cURL Import",
      requests: [request],
    };
  } catch (error) {
    return {
      type: "requests",
      name: "Import Failed",
      errors: [`Failed to parse cURL: ${error instanceof Error ? error.message : "Unknown error"}`],
      requests: [],
    };
  }
}

function parseCurlCommand(curl: string): ImportRequest {
  const tokens = tokenize(curl);
  
  let method = "GET";
  let url = "";
  const headers: Array<{ name: string; value: string; enabled: boolean }> = [];
  let body: ImportRequest["body"];
  let auth: ImportRequest["auth"] = { type: "none" };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "-X" || token === "--request") {
      method = tokens[++i]?.toUpperCase() || "GET";
      i++;
      continue;
    }

    if (token === "-H" || token === "--header") {
      const headerValue = tokens[++i] || "";
      const colonIndex = headerValue.indexOf(":");
      if (colonIndex > 0) {
        const name = headerValue.slice(0, colonIndex).trim();
        const value = headerValue.slice(colonIndex + 1).trim();
        
        if (name.toLowerCase() === "authorization") {
          if (value.toLowerCase().startsWith("bearer ")) {
            auth = { type: "bearer", bearer: { token: value.slice(7) } };
          } else if (value.toLowerCase().startsWith("basic ")) {
            try {
              const decoded = atob(value.slice(6));
              const [username, password] = decoded.split(":");
              auth = { type: "basic", basic: { username: username || "", password: password || "" } };
            } catch {}
          }
        } else {
          headers.push({ name, value, enabled: true });
        }
      }
      i++;
      continue;
    }

    if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") {
      const data = tokens[++i] || "";
      body = { mode: "raw", raw: data };
      
      if (!headers.find((h) => h.name.toLowerCase() === "content-type")) {
        headers.push({ name: "Content-Type", value: "application/x-www-form-urlencoded", enabled: true });
      }
      
      if (method === "GET") {
        method = "POST";
      }
      i++;
      continue;
    }

    if (token === "--json") {
      const data = tokens[++i] || "";
      body = { mode: "raw", raw: data };
      headers.push({ name: "Content-Type", value: "application/json", enabled: true });
      
      if (method === "GET") {
        method = "POST";
      }
      i++;
      continue;
    }

    if (token === "-u" || token === "--user") {
      const userPass = tokens[++i] || "";
      const colonIndex = userPass.indexOf(":");
      if (colonIndex >= 0) {
        auth = {
          type: "basic",
          basic: {
            username: userPass.slice(0, colonIndex),
            password: userPass.slice(colonIndex + 1),
          },
        };
      } else {
        auth = {
          type: "basic",
          basic: { username: userPass, password: "" },
        };
      }
      i++;
      continue;
    }

    if (token === "-A" || token === "--user-agent") {
      const userAgent = tokens[++i] || "";
      headers.push({ name: "User-Agent", value: userAgent, enabled: true });
      i++;
      continue;
    }

    if (token === "-b" || token === "--cookie") {
      const cookie = tokens[++i] || "";
      headers.push({ name: "Cookie", value: cookie, enabled: true });
      i++;
      continue;
    }

    if (token === "-e" || token === "--referer") {
      const referer = tokens[++i] || "";
      headers.push({ name: "Referer", value: referer, enabled: true });
      i++;
      continue;
    }

    if (!token.startsWith("-") && !token.startsWith("--")) {
      if (token.startsWith("http://") || token.startsWith("https://") || token.startsWith("www.")) {
        url = token;
      } else if (token !== "curl") {
        if (!url && (token.startsWith("'http") || token.startsWith('"http'))) {
          url = token;
        }
      }
    }

    i++;
  }

  if (!url) {
    url = "https://api.example.com";
  }

  return {
    id: generateId(),
    name: `${method} ${getUrlPath(url)}`,
    method,
    url,
    headers,
    body,
    auth,
  };
}

function tokenize(curl: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote: '"' | "'" | null = null;
  let escaped = false;

  for (let i = 0; i < curl.length; i++) {
    const char = curl[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (inQuote) {
      if (char === inQuote) {
        tokens.push(current);
        current = "";
        inQuote = null;
      } else {
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        if (current) {
          tokens.push(current);
          current = "";
        }
        inQuote = char;
      } else if (char === " " || char === "\t" || char === "\n") {
        if (current) {
          tokens.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function getUrlPath(url: string): string {
  try {
    const parsed = new URL(url.replace(/['"]/g, ""));
    return parsed.pathname || "/";
  } catch {
    return url.split("?")[0].replace(/['"]/g, "") || "/";
  }
}
