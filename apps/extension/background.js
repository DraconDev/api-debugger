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

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    try {
      const record = {
        id: details.requestId,
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        type: details.type,
        tabId: details.tabId,
        timeStamp: details.timeStamp
      };

      await addRecord(record);
      console.log("[api-debugger] request", record);
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
