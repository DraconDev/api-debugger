// Basic request capture using Chrome webRequest API
// Logs completed requests to the service worker console

const MAX_HISTORY = 200;

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
    partial.set(details.requestId, { requestBody: details.requestBody?.formData || null });
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
      const record = {
        id: details.requestId,
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        type: details.type,
        tabId: details.tabId,
        timeStamp: details.timeStamp,
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
});
