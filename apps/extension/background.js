// Basic request capture using Chrome webRequest API
// Logs completed requests to the service worker console

chrome.webRequest.onCompleted.addListener(
  (details) => {
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

      console.log("[api-debugger] request", record);
    } catch (err) {
      console.error("[api-debugger] capture error", err);
    }
  },
  { urls: ["<all_urls>"] }
);
