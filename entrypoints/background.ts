export default defineBackground(() => {
  console.log("[API Debugger] Background service worker started");

  const MAX_HISTORY = 200;
  const textDecoder = new TextDecoder("utf-8");

  interface RequestRecord {
    id: string;
    url: string;
    method: string;
    statusCode: number;
    type?: string;
    tabId: number;
    startTime: number;
    timeStamp: number;
    duration: number;
    requestHeaders: chrome.webRequest.HttpHeader[];
    requestBody: Record<string, unknown> | null;
    requestBodyText: string | null;
    responseBodyText?: string;
    responseHeaders: chrome.webRequest.HttpHeader[];
    requestConfig?: import("@/types").RequestConfig;
  }

  interface PartialRequest {
    startTime?: number;
    requestBody?: Record<string, unknown>;
    requestBodyText?: string | null;
    requestHeaders?: chrome.webRequest.HttpHeader[];
    responseHeaders?: chrome.webRequest.HttpHeader[];
  }

  const partial = new Map<string, PartialRequest>();

  // Helper functions
  function serializeRequestBody(details: chrome.webRequest.WebRequestBodyDetails): string | null {
    const body = details.requestBody;
    if (!body) return null;

    if (body.raw && body.raw.length) {
      return body.raw
        .map((chunk) => {
          if (chunk?.bytes) {
            try {
              return textDecoder.decode(chunk.bytes);
            } catch {
              return "";
            }
          }
          return "";
        })
        .join("");
    }

    if (body.formData) {
      return Object.entries(body.formData)
        .map(([key, value]) => {
          const values = Array.isArray(value) ? value : [value];
          return `${key}=${values.join(",")}`;
        })
        .join("&");
    }

    return null;
  }

  async function addRecord(record: RequestRecord): Promise<void> {
    const result = await chrome.storage.local.get(["requests"]);
    const list = (result.requests as RequestRecord[]) || [];

    list.unshift(record);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;

    await chrome.storage.local.set({ requests: list });
  }

  async function sendRequest(config: import("@/types").RequestConfig): Promise<import("@/types").CapturedResponse> {
    const start = performance.now();

    const headers: Record<string, string> = {};
    config.headers.forEach((h) => {
      if (h.enabled !== false && h.name) {
        headers[h.name] = h.value;
      }
    });

    if (config.auth.type === "bearer" && config.auth.bearer?.token) {
      headers["Authorization"] = "Bearer " + config.auth.bearer.token;
    } else if (config.auth.type === "basic" && config.auth.basic) {
      const encoded = btoa(config.auth.basic.username + ":" + config.auth.basic.password);
      headers["Authorization"] = "Basic " + encoded;
    } else if (config.auth.type === "api-key" && config.auth.apiKey?.addTo === "header") {
      headers[config.auth.apiKey.key] = config.auth.apiKey.value;
    }

    let body: string | undefined;
    if (config.bodyType === "json" && config.body.json) {
      body = config.body.json;
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    } else if (config.bodyType === "raw" && config.body.raw) {
      body = config.body.raw;
    } else if (config.bodyType === "x-www-form-urlencoded" && config.body.urlEncoded) {
      body = new URLSearchParams(
        config.body.urlEncoded.map((f) => [f.name, f.value])
      ).toString();
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }
    }

    let url = config.url;
    if (config.auth.type === "api-key" && config.auth.apiKey?.addTo === "query") {
      const sep = url.includes("?") ? "&" : "?";
      url = url + sep + config.auth.apiKey.key + "=" + encodeURIComponent(config.auth.apiKey.value);
    }

    if (config.params.length > 0) {
      const enabledParams = config.params.filter((p) => p.enabled !== false);
      if (enabledParams.length > 0) {
        const sep = url.includes("?") ? "&" : "?";
        const queryString = enabledParams
          .map((p) => encodeURIComponent(p.name) + "=" + encodeURIComponent(p.value))
          .join("&");
        url = url + sep + queryString;
      }
    }

    const response = await fetch(url, {
      method: config.method,
      headers,
      body: config.method !== "GET" && config.method !== "HEAD" ? body : undefined,
    });

    const responseBody = await response.text();
    const end = performance.now();
    const duration = end - start;

    const headerPairs: [string, string][] = [];
    response.headers.forEach((v, k) => headerPairs.push([k, v]));

    let timing: import("@/types").TimingBreakdown | undefined;
    const entries = performance.getEntriesByName(url, "resource") as PerformanceResourceTiming[];
    if (entries.length > 0) {
      const entry = entries[entries.length - 1];
      timing = {
        dns: entry.domainLookupEnd - entry.domainLookupStart,
        connect: entry.connectEnd - entry.connectStart,
        tls: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
        ttfb: entry.responseStart - entry.requestStart,
        download: entry.responseEnd - entry.responseStart,
        total: entry.duration,
      };
    }

    const record: RequestRecord = {
      id: "manual_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      url,
      method: config.method,
      statusCode: response.status,
      tabId: -1,
      startTime: start,
      timeStamp: Date.now(),
      duration,
      requestHeaders: Object.entries(headers).map(([name, value]) => ({ name, value })),
      requestBody: null,
      requestBodyText: body || null,
      responseBodyText: responseBody,
      responseHeaders: headerPairs.map(([name, value]) => ({ name, value })),
      requestConfig: config,
    };

    await addRecord(record);

    return {
      status: response.status,
      statusText: response.statusText,
      headers: headerPairs,
      body: responseBody,
      duration,
      size: responseBody.length,
      timing,
    };
  }

  // Request lifecycle hooks
  chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    partial.set(details.requestId, {
      startTime: details.timeStamp,
      requestBody: details.requestBody?.formData || undefined,
      requestBodyText: serializeRequestBody(details as chrome.webRequest.WebRequestBodyDetails),
    });
  },
    { urls: ["<all_urls>"] },
    ["requestBody"]
  );

  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      const p = partial.get(details.requestId) || {};
      p.requestHeaders = details.requestHeaders;
      partial.set(details.requestId, p);
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders"]
  );

  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      const p = partial.get(details.requestId) || {};
      p.responseHeaders = details.responseHeaders;
      partial.set(details.requestId, p);
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
  );

  chrome.webRequest.onCompleted.addListener(
    async (details) => {
      try {
        const base = partial.get(details.requestId) || {};
        partial.delete(details.requestId);

        const start = base.startTime || details.timeStamp;
        const duration = typeof base.startTime === "number"
          ? details.timeStamp - base.startTime
          : 0;

        const record: RequestRecord = {
          id: details.requestId,
          url: details.url,
          method: details.method,
          statusCode: details.statusCode,
          type: details.type,
          tabId: details.tabId,
          startTime: start,
          timeStamp: details.timeStamp,
          duration,
          requestHeaders: base.requestHeaders || [],
          requestBody: base.requestBody || null,
          requestBodyText: base.requestBodyText || null,
          responseHeaders: base.responseHeaders || [],
        };

        await addRecord(record);
        console.log("[API Debugger] Captured:", record.method, record.url, record.statusCode);
      } catch (err) {
        console.error("[API Debugger] Capture error:", err);
      }
    },
    { urls: ["<all_urls>"] }
  );

  // Message handler
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_REQUESTS") {
      chrome.storage.local.get(["requests"]).then((res) => {
        sendResponse({ requests: res.requests || [] });
      });
      return true;
    }

    if (message.type === "CLEAR_REQUESTS") {
      chrome.storage.local.set({ requests: [] }).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (message.type === "SEND_REQUEST") {
      sendRequest(message.payload.config)
        .then((response) => sendResponse({ success: true, response }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.type === "REPLAY_REQUEST") {
      const config: import("@/types").RequestConfig = {
        method: message.payload.method,
        url: message.payload.url,
        headers: message.payload.headers || [],
        params: [],
        bodyType: "raw",
        body: { raw: message.payload.body },
        auth: { type: "none" },
      };
      sendRequest(config)
        .then((response) => sendResponse({ success: true, response }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    }

    return false;
  });
});
