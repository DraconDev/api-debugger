// Basic request capture using Chrome webRequest API
// Logs completed requests to the service worker console

const MAX_HISTORY = 200;
const textDecoder = new TextDecoder("utf-8");

function serializeRequestBody(details) {
  const body = details.requestBody;
  if (!body) return null;

  if (Array.isArray(body.raw) && body.raw.length) {
    return body.raw
      .map((chunk) => {
        if (chunk?.bytes) {
          try {
            return textDecoder.decode(chunk.bytes);
          } catch (err) {
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

async function addRecord(record) {
  const res = await chrome.storage.local.get(["requests"]);
  const list = res.requests || [];

  list.unshift(record);
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;

  await chrome.storage.local.set({ requests: list });
}

// Capture full request/response details
const partial = new Map();

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // record start time and optional request body
    partial.set(details.requestId, {
      startTime: details.timeStamp,
      requestBody: details.requestBody?.formData || null,
      requestBodyText: serializeRequestBody(details),
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
        : undefined;
      const record = {
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
        responseHeaders: base.responseHeaders || []
      };

      await addRecord(record);
      console.log("[api-debugger] record saved", record);
    } catch (err) {
      console.error("[api-debugger] capture error", err);
    }
  },
  { urls: ["<all_urls>"] }
);

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_REQUESTS") {
    chrome.storage.local.get(["requests"]).then((res) => {
      sendResponse({ requests: res.requests || [] });
    });
    return true;
  }
  if (msg.type === "REPLAY_REQUEST") {
    handleReplay(msg.payload)
      .then((res) => sendResponse({ success: true, ...res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

/**
 * Replay a modified request and return simplified result.
 */
async function handleReplay({ method, url, headers, body }) {
  const start = performance.now();
  const res = await fetch(url, { method, headers, body: body || undefined });
  const duration = performance.now() - start;
  const text = await res.text().catch(() => "");
  const preview = text.slice(0, 2048);
  return {
    status: res.status,
    statusText: res.statusText,
    duration,
    headers: Array.from(res.headers.entries()).map(([name, value]) => ({ name, value })),
    bodyPreview: preview,
  };
}
