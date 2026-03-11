export default defineBackground(() => {
  console.log("[API Debugger] Background service worker started");

  // Constants
  const MAX_HISTORY = 200;
  const textDecoder = new TextDecoder("utf-8");

  // Types
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
    responseHeaders: chrome.webRequest.HttpHeader[];
  }

  interface PartialRequest {
    startTime?: number;
    requestBody?: Record<string, unknown>;
    requestBodyText?: string | null;
    requestHeaders?: chrome.webRequest.HttpHeader[];
    responseHeaders?: chrome.webRequest.HttpHeader[];
  }

  interface ReplayPayload {
    method: string;
    url: string;
    headers: Array<{ name: string; value: string }>;
    body?: string;
  }

  interface ReplayResponse {
    success: boolean;
    status: number;
    statusText: string;
    headers: Array<[string, string]>;
    bodyPreview: string;
    duration: number;
  }

  // State
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

  async function handleReplay(payload: ReplayPayload): Promise<ReplayResponse> {
    const start = performance.now();

    const headers: Record<string, string> = {};
    payload.headers?.forEach((h) => {
      headers[h.name] = h.value;
    });

    const response = await fetch(payload.url, {
      method: payload.method,
      headers,
      body: payload.body || undefined,
    });

    const duration = performance.now() - start;
    const text = await response.text();
    const preview = text.slice(0, 2048);

    const headerPairs: [string, string][] = [];
    response.headers.forEach((v, k) => headerPairs.push([k, v]));
    
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: headerPairs,
      bodyPreview: preview,
      duration,
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

    if (message.type === "REPLAY_REQUEST") {
      handleReplay(message.payload).then(sendResponse);
      return true;
    }

    return false;
  });
});
