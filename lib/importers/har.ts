import type { ImportResult, ImportRequest } from "./types";
import { generateId } from "./types";

interface HarEntry {
  request: {
    method: string;
    url: string;
    headers?: Array<{ name: string; value: string }>;
    postData?: {
      mimeType?: string;
      text?: string;
      params?: Array<{ name: string; value: string }>;
    };
    comment?: string;
  };
  response: {
    status: number;
    statusText: string;
    headers?: Array<{ name: string; value: string }>;
    content?: {
      mimeType?: string;
      text?: string;
      size?: number;
    };
  };
  startedDateTime?: string;
  time?: number;
}

interface HarLog {
  entries?: HarEntry[];
  pages?: unknown[];
  comment?: string;
}

interface HarFile {
  log: HarLog;
}

export function parseHar(content: string): ImportResult {
  let har: HarFile;

  try {
    har = JSON.parse(content);
  } catch (error) {
    return {
      type: "requests",
      name: "Import Failed",
      errors: [
        `Failed to parse HAR file: ${error instanceof Error ? error.message : "Invalid JSON"}`,
      ],
      requests: [],
    };
  }

  const entries = har.log?.entries || [];

  const requests: ImportRequest[] = entries
    .filter((entry) => entry.request)
    .map((entry) => parseHarEntry(entry));

  return {
    type: "requests",
    name: "HAR Import",
    requests,
  };
}

function parseHarEntry(entry: HarEntry): ImportRequest {
  const { request } = entry;

  const headers = (request.headers || []).map((h) => ({
    name: h.name,
    value: h.value,
    enabled: true,
  }));

  let body: ImportRequest["body"];
  if (request.postData) {
    const mimeType = request.postData.mimeType || "";

    if (mimeType.includes("application/json")) {
      body = {
        mode: "raw",
        raw: request.postData.text || "",
      };
      if (!headers.find((h) => h.name.toLowerCase() === "content-type")) {
        headers.push({
          name: "Content-Type",
          value: "application/json",
          enabled: true,
        });
      }
    } else if (mimeType.includes("application/x-www-form-urlencoded")) {
      body = {
        mode: "urlencoded",
        urlEncoded: (request.postData.params || []).map((p) => ({
          key: p.name,
          value: p.value,
        })),
      };
    } else if (mimeType.includes("multipart/form-data")) {
      body = {
        mode: "formdata",
        formData: (request.postData.params || []).map((p) => ({
          key: p.name,
          value: p.value,
          type: "text",
        })),
      };
    } else if (request.postData.text) {
      body = {
        mode: "raw",
        raw: request.postData.text,
      };
    }
  }

  return {
    id: generateId(),
    name: `${request.method} ${getUrlPath(request.url)}`,
    method: request.method.toUpperCase(),
    url: request.url,
    headers: filterHeaders(headers),
    body,
    description: `Captured at ${entry.startedDateTime || "unknown time"}\nDuration: ${entry.time || 0}ms`,
  };
}

function getUrlPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch {
    return url.split("?")[0] || "/";
  }
}

function filterHeaders(
  headers: Array<{ name: string; value: string; enabled: boolean }>,
): Array<{ name: string; value: string; enabled: boolean }> {
  const skipHeaders = new Set([
    "host",
    "content-length",
    "connection",
    "accept-encoding",
    "accept-language",
    "user-agent",
    "origin",
    "referer",
    "sec-fetch-dest",
    "sec-fetch-mode",
    "sec-fetch-site",
    "sec-fetch-user",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
  ]);

  return headers.filter((h) => !skipHeaders.has(h.name.toLowerCase()));
}
