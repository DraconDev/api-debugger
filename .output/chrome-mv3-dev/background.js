var background = (function() {
  "use strict";
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const definition = defineBackground(() => {
    console.log("[API Debugger] Background service worker started");
    const MAX_HISTORY = 200;
    const textDecoder = new TextDecoder("utf-8");
    const partial = /* @__PURE__ */ new Map();
    function serializeRequestBody(details) {
      const body = details.requestBody;
      if (!body) return null;
      if (body.raw && body.raw.length) {
        return body.raw.map((chunk) => {
          if (chunk?.bytes) {
            try {
              return textDecoder.decode(chunk.bytes);
            } catch {
              return "";
            }
          }
          return "";
        }).join("");
      }
      if (body.formData) {
        return Object.entries(body.formData).map(([key, value]) => {
          const values = Array.isArray(value) ? value : [value];
          return `${key}=${values.join(",")}`;
        }).join("&");
      }
      return null;
    }
    async function addRecord(record) {
      const result2 = await chrome.storage.local.get(["requests"]);
      const list = result2.requests || [];
      list.unshift(record);
      if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
      await chrome.storage.local.set({ requests: list });
    }
    async function handleReplay(payload) {
      const start = performance.now();
      const headers = {};
      payload.headers?.forEach((h) => {
        headers[h.name] = h.value;
      });
      const response = await fetch(payload.url, {
        method: payload.method,
        headers,
        body: payload.body || void 0
      });
      const duration = performance.now() - start;
      const text = await response.text();
      const preview = text.slice(0, 2048);
      const headerPairs = [];
      response.headers.forEach((v, k) => headerPairs.push([k, v]));
      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        headers: headerPairs,
        bodyPreview: preview,
        duration
      };
    }
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        partial.set(details.requestId, {
          startTime: details.timeStamp,
          requestBody: details.requestBody?.formData || void 0,
          requestBodyText: serializeRequestBody(details)
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
          const duration = typeof base.startTime === "number" ? details.timeStamp - base.startTime : 0;
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
            requestBodyText: base.requestBodyText || null,
            responseHeaders: base.responseHeaders || []
          };
          await addRecord(record);
          console.log("[API Debugger] Captured:", record.method, record.url, record.statusCode);
        } catch (err) {
          console.error("[API Debugger] Capture error:", err);
        }
      },
      { urls: ["<all_urls>"] }
    );
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
  function initPlugins() {
  }
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
    else method("[wxt]", ...args);
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "ws://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws?.send(JSON.stringify({
        type: "custom",
        event,
        payload
      }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") ws?.dispatchEvent(new CustomEvent(message.event, { detail: message.data }));
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    if (browser.runtime.getManifest().manifest_version == 2) reloadContentScriptMv2();
    else reloadContentScriptMv3(payload);
  }
  async function reloadContentScriptMv3({ registration, contentScript }) {
    if (registration === "runtime") await reloadRuntimeContentScriptMv3(contentScript);
    else await reloadManifestContentScriptMv3(contentScript);
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{
        ...contentScript,
        id,
        css: contentScript.css ?? []
      }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{
        ...contentScript,
        id,
        css: contentScript.css ?? []
      }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      const hasJs = contentScript.js?.find((js) => cs.js?.includes(js));
      const hasCss = contentScript.css?.find((css) => cs.css?.includes(css));
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log("Content script is not registered yet, nothing to reload", contentScript);
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map((match) => new MatchPattern(match));
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(matchingTabs.map(async (tab) => {
      try {
        await browser.tabs.reload(tab.id);
      } catch (err) {
        logger.warn("Failed to reload tab:", err);
      }
    }));
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener("open", () => ws2.sendCustom("wxt:background-initialized"));
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") browser.runtime.reload();
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) console.warn("The background's main() function return a promise, but it must be synchronous");
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  var background_entrypoint_default = result;
  return background_entrypoint_default;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9OyIsImV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZFwiKTtcblxuICBjb25zdCBNQVhfSElTVE9SWSA9IDIwMDtcbiAgY29uc3QgdGV4dERlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKTtcblxuICBpbnRlcmZhY2UgUmVxdWVzdFJlY29yZCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB1cmw6IHN0cmluZztcbiAgICBtZXRob2Q6IHN0cmluZztcbiAgICBzdGF0dXNDb2RlOiBudW1iZXI7XG4gICAgdHlwZT86IHN0cmluZztcbiAgICB0YWJJZDogbnVtYmVyO1xuICAgIHN0YXJ0VGltZTogbnVtYmVyO1xuICAgIHRpbWVTdGFtcDogbnVtYmVyO1xuICAgIGR1cmF0aW9uOiBudW1iZXI7XG4gICAgcmVxdWVzdEhlYWRlcnM6IGNocm9tZS53ZWJSZXF1ZXN0Lkh0dHBIZWFkZXJbXTtcbiAgICByZXF1ZXN0Qm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsO1xuICAgIHJlcXVlc3RCb2R5VGV4dDogc3RyaW5nIHwgbnVsbDtcbiAgICByZXNwb25zZUJvZHlUZXh0Pzogc3RyaW5nO1xuICAgIHJlc3BvbnNlSGVhZGVyczogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICAgIHJlcXVlc3RDb25maWc/OiBpbXBvcnQoXCJAL3R5cGVzXCIpLlJlcXVlc3RDb25maWc7XG4gIH1cblxuICBpbnRlcmZhY2UgUGFydGlhbFJlcXVlc3Qge1xuICAgIHN0YXJ0VGltZT86IG51bWJlcjtcbiAgICByZXF1ZXN0Qm9keT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIHJlcXVlc3RCb2R5VGV4dD86IHN0cmluZyB8IG51bGw7XG4gICAgcmVxdWVzdEhlYWRlcnM/OiBjaHJvbWUud2ViUmVxdWVzdC5IdHRwSGVhZGVyW107XG4gICAgcmVzcG9uc2VIZWFkZXJzPzogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICB9XG5cbiAgY29uc3QgcGFydGlhbCA9IG5ldyBNYXA8c3RyaW5nLCBQYXJ0aWFsUmVxdWVzdD4oKTtcblxuICAvLyBIZWxwZXIgZnVuY3Rpb25zXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZVJlcXVlc3RCb2R5KGRldGFpbHM6IGNocm9tZS53ZWJSZXF1ZXN0LldlYlJlcXVlc3RCb2R5RGV0YWlscyk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGJvZHkgPSBkZXRhaWxzLnJlcXVlc3RCb2R5O1xuICAgIGlmICghYm9keSkgcmV0dXJuIG51bGw7XG5cbiAgICBpZiAoYm9keS5yYXcgJiYgYm9keS5yYXcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gYm9keS5yYXdcbiAgICAgICAgLm1hcCgoY2h1bmspID0+IHtcbiAgICAgICAgICBpZiAoY2h1bms/LmJ5dGVzKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICByZXR1cm4gdGV4dERlY29kZXIuZGVjb2RlKGNodW5rLmJ5dGVzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKFwiXCIpO1xuICAgIH1cblxuICAgIGlmIChib2R5LmZvcm1EYXRhKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoYm9keS5mb3JtRGF0YSlcbiAgICAgICAgLm1hcCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmFsdWVzID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZSA6IFt2YWx1ZV07XG4gICAgICAgICAgcmV0dXJuIGAke2tleX09JHt2YWx1ZXMuam9pbihcIixcIil9YDtcbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oXCImXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gYWRkUmVjb3JkKHJlY29yZDogUmVxdWVzdFJlY29yZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbXCJyZXF1ZXN0c1wiXSk7XG4gICAgY29uc3QgbGlzdCA9IChyZXN1bHQucmVxdWVzdHMgYXMgUmVxdWVzdFJlY29yZFtdKSB8fCBbXTtcblxuICAgIGxpc3QudW5zaGlmdChyZWNvcmQpO1xuICAgIGlmIChsaXN0Lmxlbmd0aCA+IE1BWF9ISVNUT1JZKSBsaXN0Lmxlbmd0aCA9IE1BWF9ISVNUT1JZO1xuXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgcmVxdWVzdHM6IGxpc3QgfSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBoYW5kbGVSZXBsYXkocGF5bG9hZDogUmVwbGF5UGF5bG9hZCk6IFByb21pc2U8UmVwbGF5UmVzcG9uc2U+IHtcbiAgICBjb25zdCBzdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIHBheWxvYWQuaGVhZGVycz8uZm9yRWFjaCgoaCkgPT4ge1xuICAgICAgaGVhZGVyc1toLm5hbWVdID0gaC52YWx1ZTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2gocGF5bG9hZC51cmwsIHtcbiAgICAgIG1ldGhvZDogcGF5bG9hZC5tZXRob2QsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keTogcGF5bG9hZC5ib2R5IHx8IHVuZGVmaW5lZCxcbiAgICB9KTtcblxuICAgIGNvbnN0IGR1cmF0aW9uID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydDtcbiAgICBjb25zdCB0ZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgIGNvbnN0IHByZXZpZXcgPSB0ZXh0LnNsaWNlKDAsIDIwNDgpO1xuXG4gICAgY29uc3QgaGVhZGVyUGFpcnM6IFtzdHJpbmcsIHN0cmluZ11bXSA9IFtdO1xuICAgIHJlc3BvbnNlLmhlYWRlcnMuZm9yRWFjaCgodiwgaykgPT4gaGVhZGVyUGFpcnMucHVzaChbaywgdl0pKTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IGhlYWRlclBhaXJzLFxuICAgICAgYm9keVByZXZpZXc6IHByZXZpZXcsXG4gICAgICBkdXJhdGlvbixcbiAgICB9O1xuICB9XG5cbiAgLy8gUmVxdWVzdCBsaWZlY3ljbGUgaG9va3NcbiAgY2hyb21lLndlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0LmFkZExpc3RlbmVyKFxuICAoZGV0YWlscykgPT4ge1xuICAgIHBhcnRpYWwuc2V0KGRldGFpbHMucmVxdWVzdElkLCB7XG4gICAgICBzdGFydFRpbWU6IGRldGFpbHMudGltZVN0YW1wLFxuICAgICAgcmVxdWVzdEJvZHk6IGRldGFpbHMucmVxdWVzdEJvZHk/LmZvcm1EYXRhIHx8IHVuZGVmaW5lZCxcbiAgICAgIHJlcXVlc3RCb2R5VGV4dDogc2VyaWFsaXplUmVxdWVzdEJvZHkoZGV0YWlscyBhcyBjaHJvbWUud2ViUmVxdWVzdC5XZWJSZXF1ZXN0Qm9keURldGFpbHMpLFxuICAgIH0pO1xuICB9LFxuICAgIHsgdXJsczogW1wiPGFsbF91cmxzPlwiXSB9LFxuICAgIFtcInJlcXVlc3RCb2R5XCJdXG4gICk7XG5cbiAgY2hyb21lLndlYlJlcXVlc3Qub25CZWZvcmVTZW5kSGVhZGVycy5hZGRMaXN0ZW5lcihcbiAgICAoZGV0YWlscykgPT4ge1xuICAgICAgY29uc3QgcCA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgIHAucmVxdWVzdEhlYWRlcnMgPSBkZXRhaWxzLnJlcXVlc3RIZWFkZXJzO1xuICAgICAgcGFydGlhbC5zZXQoZGV0YWlscy5yZXF1ZXN0SWQsIHApO1xuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH0sXG4gICAgW1wicmVxdWVzdEhlYWRlcnNcIl1cbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkhlYWRlcnNSZWNlaXZlZC5hZGRMaXN0ZW5lcihcbiAgICAoZGV0YWlscykgPT4ge1xuICAgICAgY29uc3QgcCA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgIHAucmVzcG9uc2VIZWFkZXJzID0gZGV0YWlscy5yZXNwb25zZUhlYWRlcnM7XG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwgcCk7XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXNwb25zZUhlYWRlcnNcIl1cbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkNvbXBsZXRlZC5hZGRMaXN0ZW5lcihcbiAgICBhc3luYyAoZGV0YWlscykgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYmFzZSA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgICAgcGFydGlhbC5kZWxldGUoZGV0YWlscy5yZXF1ZXN0SWQpO1xuXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gYmFzZS5zdGFydFRpbWUgfHwgZGV0YWlscy50aW1lU3RhbXA7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gdHlwZW9mIGJhc2Uuc3RhcnRUaW1lID09PSBcIm51bWJlclwiXG4gICAgICAgICAgPyBkZXRhaWxzLnRpbWVTdGFtcCAtIGJhc2Uuc3RhcnRUaW1lXG4gICAgICAgICAgOiAwO1xuXG4gICAgICAgIGNvbnN0IHJlY29yZDogUmVxdWVzdFJlY29yZCA9IHtcbiAgICAgICAgICBpZDogZGV0YWlscy5yZXF1ZXN0SWQsXG4gICAgICAgICAgdXJsOiBkZXRhaWxzLnVybCxcbiAgICAgICAgICBtZXRob2Q6IGRldGFpbHMubWV0aG9kLFxuICAgICAgICAgIHN0YXR1c0NvZGU6IGRldGFpbHMuc3RhdHVzQ29kZSxcbiAgICAgICAgICB0eXBlOiBkZXRhaWxzLnR5cGUsXG4gICAgICAgICAgdGFiSWQ6IGRldGFpbHMudGFiSWQsXG4gICAgICAgICAgc3RhcnRUaW1lOiBzdGFydCxcbiAgICAgICAgICB0aW1lU3RhbXA6IGRldGFpbHMudGltZVN0YW1wLFxuICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgIHJlcXVlc3RIZWFkZXJzOiBiYXNlLnJlcXVlc3RIZWFkZXJzIHx8IFtdLFxuICAgICAgICAgIHJlcXVlc3RCb2R5OiBiYXNlLnJlcXVlc3RCb2R5IHx8IG51bGwsXG4gICAgICAgICAgcmVxdWVzdEJvZHlUZXh0OiBiYXNlLnJlcXVlc3RCb2R5VGV4dCB8fCBudWxsLFxuICAgICAgICAgIHJlc3BvbnNlSGVhZGVyczogYmFzZS5yZXNwb25zZUhlYWRlcnMgfHwgW10sXG4gICAgICAgIH07XG5cbiAgICAgICAgYXdhaXQgYWRkUmVjb3JkKHJlY29yZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW0FQSSBEZWJ1Z2dlcl0gQ2FwdHVyZWQ6XCIsIHJlY29yZC5tZXRob2QsIHJlY29yZC51cmwsIHJlY29yZC5zdGF0dXNDb2RlKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSSBEZWJ1Z2dlcl0gQ2FwdHVyZSBlcnJvcjpcIiwgZXJyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHsgdXJsczogW1wiPGFsbF91cmxzPlwiXSB9XG4gICk7XG5cbiAgLy8gTWVzc2FnZSBoYW5kbGVyXG4gIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgX3NlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJHRVRfUkVRVUVTVFNcIikge1xuICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtcInJlcXVlc3RzXCJdKS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgcmVxdWVzdHM6IHJlcy5yZXF1ZXN0cyB8fCBbXSB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJDTEVBUl9SRVFVRVNUU1wiKSB7XG4gICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyByZXF1ZXN0czogW10gfSkudGhlbigoKSA9PiB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiUkVQTEFZX1JFUVVFU1RcIikge1xuICAgICAgaGFuZGxlUmVwbGF5KG1lc3NhZ2UucGF5bG9hZCkudGhlbihzZW5kUmVzcG9uc2UpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbn0pO1xuIiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBicm93c2VyJDEgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuXG4vLyNyZWdpb24gc3JjL2Jyb3dzZXIudHNcbi8qKlxuKiBDb250YWlucyB0aGUgYGJyb3dzZXJgIGV4cG9ydCB3aGljaCB5b3Ugc2hvdWxkIHVzZSB0byBhY2Nlc3MgdGhlIGV4dGVuc2lvbiBBUElzIGluIHlvdXIgcHJvamVjdDpcbiogYGBgdHNcbiogaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gJ3d4dC9icm93c2VyJztcbipcbiogYnJvd3Nlci5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiogICAvLyAuLi5cbiogfSlcbiogYGBgXG4qIEBtb2R1bGUgd3h0L2Jyb3dzZXJcbiovXG5jb25zdCBicm93c2VyID0gYnJvd3NlciQxO1xuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGJyb3dzZXIgfTsiLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbInJlc3VsdCIsImJyb3dzZXIiXSwibWFwcGluZ3MiOiI7O0FBQ0EsV0FBUyxpQkFBaUIsS0FBSztBQUM5QixRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFHO0FBQ2hFLFdBQU87QUFBQSxFQUNSO0FDSkEsUUFBQSxhQUFBLGlCQUFBLE1BQUE7QUFDRSxZQUFBLElBQUEsa0RBQUE7QUFFQSxVQUFBLGNBQUE7QUFDQSxVQUFBLGNBQUEsSUFBQSxZQUFBLE9BQUE7QUE0QkEsVUFBQSxVQUFBLG9CQUFBLElBQUE7QUFHQSxhQUFBLHFCQUFBLFNBQUE7QUFDRSxZQUFBLE9BQUEsUUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLFFBQUE7QUFFQSxVQUFBLEtBQUEsT0FBQSxLQUFBLElBQUEsUUFBQTtBQUNFLGVBQUEsS0FBQSxJQUFBLElBQUEsQ0FBQSxVQUFBO0FBRUksY0FBQSxPQUFBLE9BQUE7QUFDRSxnQkFBQTtBQUNFLHFCQUFBLFlBQUEsT0FBQSxNQUFBLEtBQUE7QUFBQSxZQUFxQyxRQUFBO0FBRXJDLHFCQUFBO0FBQUEsWUFBTztBQUFBLFVBQ1Q7QUFFRixpQkFBQTtBQUFBLFFBQU8sQ0FBQSxFQUFBLEtBQUEsRUFBQTtBQUFBLE1BRUQ7QUFHWixVQUFBLEtBQUEsVUFBQTtBQUNFLGVBQUEsT0FBQSxRQUFBLEtBQUEsUUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBLEtBQUEsS0FBQSxNQUFBO0FBRUksZ0JBQUEsU0FBQSxNQUFBLFFBQUEsS0FBQSxJQUFBLFFBQUEsQ0FBQSxLQUFBO0FBQ0EsaUJBQUEsR0FBQSxHQUFBLElBQUEsT0FBQSxLQUFBLEdBQUEsQ0FBQTtBQUFBLFFBQWlDLENBQUEsRUFBQSxLQUFBLEdBQUE7QUFBQSxNQUUxQjtBQUdiLGFBQUE7QUFBQSxJQUFPO0FBR1QsbUJBQUEs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
