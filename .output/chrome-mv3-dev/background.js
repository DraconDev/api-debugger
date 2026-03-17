var background = (function() {
  "use strict";
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const definition = defineBackground(() => {
    console.log("[API Debugger] Background service worker started");
    chrome.action.onClicked.addListener(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL("/dashboard.html") });
    });
    const MAX_HISTORY = 200;
    const textDecoder = new TextDecoder("utf-8");
    const partial = /* @__PURE__ */ new Map();
    const DEFAULT_EXCLUDE_PATTERNS = [
      /^chrome-extension:\/\//i,
      /^chrome:\/\//i,
      /^about:/i,
      /^data:/i,
      /^blob:/i,
      /^file:\/\//i,
      /^ws:\/\//i,
      /^wss:\/\//i,
      /\.(tsx?|jsx?|css|html|map|woff2?|ttf|eot|svg|png|gif|jpg|jpeg|ico|webp)$/i,
      /\/node_modules\//i,
      /\/__vite_ping/i,
      /\/@vite\//i,
      /\/@fs\//i,
      /\/@id\//i,
      /\/@react-refresh/i,
      /hot-update/i
    ];
    function shouldCapture(url) {
      for (const pattern of DEFAULT_EXCLUDE_PATTERNS) {
        if (pattern.test(url)) {
          return false;
        }
      }
      return true;
    }
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
    async function sendRequest(config) {
      const start = performance.now();
      const headers = {};
      config.headers.forEach((h) => {
        if (h.enabled !== false && h.name) {
          headers[h.name] = h.value;
        }
      });
      if (config.auth.type === "bearer" && config.auth.bearer?.token) {
        headers["Authorization"] = "Bearer " + config.auth.bearer.token;
      } else if (config.auth.type === "basic" && config.auth.basic) {
        const encoded = btoa(
          config.auth.basic.username + ":" + config.auth.basic.password
        );
        headers["Authorization"] = "Basic " + encoded;
      } else if (config.auth.type === "api-key" && config.auth.apiKey?.addTo === "header") {
        headers[config.auth.apiKey.key] = config.auth.apiKey.value;
      }
      let body;
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
          const queryString = enabledParams.map(
            (p) => encodeURIComponent(p.name) + "=" + encodeURIComponent(p.value)
          ).join("&");
          url = url + sep + queryString;
        }
      }
      const response = await fetch(url, {
        method: config.method,
        headers,
        body: config.method !== "GET" && config.method !== "HEAD" ? body : void 0
      });
      const responseBody = await response.text();
      const end = performance.now();
      const duration = end - start;
      const headerPairs = [];
      response.headers.forEach((v, k) => headerPairs.push([k, v]));
      let timing;
      const entries = performance.getEntriesByName(
        url,
        "resource"
      );
      if (entries.length > 0) {
        const entry = entries[entries.length - 1];
        timing = {
          dns: entry.domainLookupEnd - entry.domainLookupStart,
          connect: entry.connectEnd - entry.connectStart,
          tls: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
          ttfb: entry.responseStart - entry.requestStart,
          download: entry.responseEnd - entry.responseStart,
          total: entry.duration
        };
      }
      const record = {
        id: "manual_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        url,
        method: config.method,
        statusCode: response.status,
        tabId: -1,
        startTime: start,
        timeStamp: Date.now(),
        duration,
        requestHeaders: Object.entries(headers).map(([name, value]) => ({
          name,
          value
        })),
        requestBody: null,
        requestBodyText: body || null,
        responseBodyText: responseBody,
        responseHeaders: headerPairs.map(([name, value]) => ({ name, value })),
        requestConfig: config
      };
      await addRecord(record);
      return {
        status: response.status,
        statusText: response.statusText,
        headers: headerPairs,
        body: responseBody,
        duration,
        size: responseBody.length,
        timing
      };
    }
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        if (!shouldCapture(details.url)) {
          return;
        }
        partial.set(details.requestId, {
          startTime: details.timeStamp,
          requestBody: details.requestBody?.formData || void 0,
          requestBodyText: serializeRequestBody(
            details
          )
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
          if (!shouldCapture(details.url)) {
            return;
          }
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
          console.log(
            "[API Debugger] Captured:",
            record.method,
            record.url,
            record.statusCode
          );
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
      if (message.type === "SEND_REQUEST") {
        sendRequest(message.payload.config).then((response) => sendResponse({ success: true, response })).catch(
          (error) => sendResponse({ success: false, error: error.message })
        );
        return true;
      }
      if (message.type === "REPLAY_REQUEST") {
        const config = {
          method: message.payload.method,
          url: message.payload.url,
          headers: message.payload.headers || [],
          params: [],
          bodyType: "raw",
          body: { raw: message.payload.body },
          auth: { type: "none" }
        };
        sendRequest(config).then((response) => sendResponse({ success: true, response })).catch(
          (error) => sendResponse({ success: false, error: error.message })
        );
        return true;
      }
      if (message.type === "UPDATE_MOCK_SERVERS") {
        mockServers = message.payload.servers || [];
        console.log(
          "[API Debugger] Mock servers updated (requires declarativeNetRequest for interception):",
          mockServers.length
        );
        sendResponse({ success: true });
        return true;
      }
      return false;
    });
  });
  let mockServers = [];
  chrome.storage.local.get(["apiDebugger_mockServers"]).then((result2) => {
    if (result2.apiDebugger_mockServers) {
      mockServers = result2.apiDebugger_mockServers;
    }
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
      const serverUrl = "ws://localhost:3003";
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9OyIsImV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZFwiKTtcblxuICAvLyBPcGVuIGRhc2hib2FyZCB3aGVuIGNsaWNraW5nIGV4dGVuc2lvbiBpY29uIChubyBwb3B1cClcbiAgY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xuICAgIGNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKFwiL2Rhc2hib2FyZC5odG1sXCIpIH0pO1xuICB9KTtcblxuICBjb25zdCBNQVhfSElTVE9SWSA9IDIwMDtcbiAgY29uc3QgdGV4dERlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKTtcblxuICBpbnRlcmZhY2UgUmVxdWVzdFJlY29yZCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB1cmw6IHN0cmluZztcbiAgICBtZXRob2Q6IHN0cmluZztcbiAgICBzdGF0dXNDb2RlOiBudW1iZXI7XG4gICAgdHlwZT86IHN0cmluZztcbiAgICB0YWJJZDogbnVtYmVyO1xuICAgIHN0YXJ0VGltZTogbnVtYmVyO1xuICAgIHRpbWVTdGFtcDogbnVtYmVyO1xuICAgIGR1cmF0aW9uOiBudW1iZXI7XG4gICAgcmVxdWVzdEhlYWRlcnM6IGNocm9tZS53ZWJSZXF1ZXN0Lkh0dHBIZWFkZXJbXTtcbiAgICByZXF1ZXN0Qm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsO1xuICAgIHJlcXVlc3RCb2R5VGV4dDogc3RyaW5nIHwgbnVsbDtcbiAgICByZXNwb25zZUJvZHlUZXh0Pzogc3RyaW5nO1xuICAgIHJlc3BvbnNlSGVhZGVyczogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICAgIHJlcXVlc3RDb25maWc/OiBpbXBvcnQoXCJAL3R5cGVzXCIpLlJlcXVlc3RDb25maWc7XG4gIH1cblxuICBpbnRlcmZhY2UgUGFydGlhbFJlcXVlc3Qge1xuICAgIHN0YXJ0VGltZT86IG51bWJlcjtcbiAgICByZXF1ZXN0Qm9keT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIHJlcXVlc3RCb2R5VGV4dD86IHN0cmluZyB8IG51bGw7XG4gICAgcmVxdWVzdEhlYWRlcnM/OiBjaHJvbWUud2ViUmVxdWVzdC5IdHRwSGVhZGVyW107XG4gICAgcmVzcG9uc2VIZWFkZXJzPzogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICB9XG5cbiAgY29uc3QgcGFydGlhbCA9IG5ldyBNYXA8c3RyaW5nLCBQYXJ0aWFsUmVxdWVzdD4oKTtcblxuICBjb25zdCBERUZBVUxUX0VYQ0xVREVfUEFUVEVSTlMgPSBbXG4gICAgL15jaHJvbWUtZXh0ZW5zaW9uOlxcL1xcLy9pLFxuICAgIC9eY2hyb21lOlxcL1xcLy9pLFxuICAgIC9eYWJvdXQ6L2ksXG4gICAgL15kYXRhOi9pLFxuICAgIC9eYmxvYjovaSxcbiAgICAvXmZpbGU6XFwvXFwvL2ksXG4gICAgL153czpcXC9cXC8vaSxcbiAgICAvXndzczpcXC9cXC8vaSxcbiAgICAvXFwuKHRzeD98anN4P3xjc3N8aHRtbHxtYXB8d29mZjI/fHR0Znxlb3R8c3ZnfHBuZ3xnaWZ8anBnfGpwZWd8aWNvfHdlYnApJC9pLFxuICAgIC9cXC9ub2RlX21vZHVsZXNcXC8vaSxcbiAgICAvXFwvX192aXRlX3BpbmcvaSxcbiAgICAvXFwvQHZpdGVcXC8vaSxcbiAgICAvXFwvQGZzXFwvL2ksXG4gICAgL1xcL0BpZFxcLy9pLFxuICAgIC9cXC9AcmVhY3QtcmVmcmVzaC9pLFxuICAgIC9ob3QtdXBkYXRlL2ksXG4gIF07XG5cbiAgZnVuY3Rpb24gc2hvdWxkQ2FwdHVyZSh1cmw6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBERUZBVUxUX0VYQ0xVREVfUEFUVEVSTlMpIHtcbiAgICAgIGlmIChwYXR0ZXJuLnRlc3QodXJsKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uc1xuICBmdW5jdGlvbiBzZXJpYWxpemVSZXF1ZXN0Qm9keShcbiAgICBkZXRhaWxzOiBjaHJvbWUud2ViUmVxdWVzdC5XZWJSZXF1ZXN0Qm9keURldGFpbHMsXG4gICk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGJvZHkgPSBkZXRhaWxzLnJlcXVlc3RCb2R5O1xuICAgIGlmICghYm9keSkgcmV0dXJuIG51bGw7XG5cbiAgICBpZiAoYm9keS5yYXcgJiYgYm9keS5yYXcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gYm9keS5yYXdcbiAgICAgICAgLm1hcCgoY2h1bmspID0+IHtcbiAgICAgICAgICBpZiAoY2h1bms/LmJ5dGVzKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICByZXR1cm4gdGV4dERlY29kZXIuZGVjb2RlKGNodW5rLmJ5dGVzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKFwiXCIpO1xuICAgIH1cblxuICAgIGlmIChib2R5LmZvcm1EYXRhKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoYm9keS5mb3JtRGF0YSlcbiAgICAgICAgLm1hcCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmFsdWVzID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZSA6IFt2YWx1ZV07XG4gICAgICAgICAgcmV0dXJuIGAke2tleX09JHt2YWx1ZXMuam9pbihcIixcIil9YDtcbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oXCImXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gYWRkUmVjb3JkKHJlY29yZDogUmVxdWVzdFJlY29yZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbXCJyZXF1ZXN0c1wiXSk7XG4gICAgY29uc3QgbGlzdCA9IChyZXN1bHQucmVxdWVzdHMgYXMgUmVxdWVzdFJlY29yZFtdKSB8fCBbXTtcblxuICAgIGxpc3QudW5zaGlmdChyZWNvcmQpO1xuICAgIGlmIChsaXN0Lmxlbmd0aCA+IE1BWF9ISVNUT1JZKSBsaXN0Lmxlbmd0aCA9IE1BWF9ISVNUT1JZO1xuXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgcmVxdWVzdHM6IGxpc3QgfSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBzZW5kUmVxdWVzdChcbiAgICBjb25maWc6IGltcG9ydChcIkAvdHlwZXNcIikuUmVxdWVzdENvbmZpZyxcbiAgKTogUHJvbWlzZTxpbXBvcnQoXCJAL3R5cGVzXCIpLkNhcHR1cmVkUmVzcG9uc2U+IHtcbiAgICBjb25zdCBzdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGNvbmZpZy5oZWFkZXJzLmZvckVhY2goKGgpID0+IHtcbiAgICAgIGlmIChoLmVuYWJsZWQgIT09IGZhbHNlICYmIGgubmFtZSkge1xuICAgICAgICBoZWFkZXJzW2gubmFtZV0gPSBoLnZhbHVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbmZpZy5hdXRoLnR5cGUgPT09IFwiYmVhcmVyXCIgJiYgY29uZmlnLmF1dGguYmVhcmVyPy50b2tlbikge1xuICAgICAgaGVhZGVyc1tcIkF1dGhvcml6YXRpb25cIl0gPSBcIkJlYXJlciBcIiArIGNvbmZpZy5hdXRoLmJlYXJlci50b2tlbjtcbiAgICB9IGVsc2UgaWYgKGNvbmZpZy5hdXRoLnR5cGUgPT09IFwiYmFzaWNcIiAmJiBjb25maWcuYXV0aC5iYXNpYykge1xuICAgICAgY29uc3QgZW5jb2RlZCA9IGJ0b2EoXG4gICAgICAgIGNvbmZpZy5hdXRoLmJhc2ljLnVzZXJuYW1lICsgXCI6XCIgKyBjb25maWcuYXV0aC5iYXNpYy5wYXNzd29yZCxcbiAgICAgICk7XG4gICAgICBoZWFkZXJzW1wiQXV0aG9yaXphdGlvblwiXSA9IFwiQmFzaWMgXCIgKyBlbmNvZGVkO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBjb25maWcuYXV0aC50eXBlID09PSBcImFwaS1rZXlcIiAmJlxuICAgICAgY29uZmlnLmF1dGguYXBpS2V5Py5hZGRUbyA9PT0gXCJoZWFkZXJcIlxuICAgICkge1xuICAgICAgaGVhZGVyc1tjb25maWcuYXV0aC5hcGlLZXkua2V5XSA9IGNvbmZpZy5hdXRoLmFwaUtleS52YWx1ZTtcbiAgICB9XG5cbiAgICBsZXQgYm9keTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGlmIChjb25maWcuYm9keVR5cGUgPT09IFwianNvblwiICYmIGNvbmZpZy5ib2R5Lmpzb24pIHtcbiAgICAgIGJvZHkgPSBjb25maWcuYm9keS5qc29uO1xuICAgICAgaWYgKCFoZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdKSB7XG4gICAgICAgIGhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbmZpZy5ib2R5VHlwZSA9PT0gXCJyYXdcIiAmJiBjb25maWcuYm9keS5yYXcpIHtcbiAgICAgIGJvZHkgPSBjb25maWcuYm9keS5yYXc7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGNvbmZpZy5ib2R5VHlwZSA9PT0gXCJ4LXd3dy1mb3JtLXVybGVuY29kZWRcIiAmJlxuICAgICAgY29uZmlnLmJvZHkudXJsRW5jb2RlZFxuICAgICkge1xuICAgICAgYm9keSA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoXG4gICAgICAgIGNvbmZpZy5ib2R5LnVybEVuY29kZWQubWFwKChmKSA9PiBbZi5uYW1lLCBmLnZhbHVlXSksXG4gICAgICApLnRvU3RyaW5nKCk7XG4gICAgICBpZiAoIWhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0pIHtcbiAgICAgICAgaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkXCI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHVybCA9IGNvbmZpZy51cmw7XG4gICAgaWYgKFxuICAgICAgY29uZmlnLmF1dGgudHlwZSA9PT0gXCJhcGkta2V5XCIgJiZcbiAgICAgIGNvbmZpZy5hdXRoLmFwaUtleT8uYWRkVG8gPT09IFwicXVlcnlcIlxuICAgICkge1xuICAgICAgY29uc3Qgc2VwID0gdXJsLmluY2x1ZGVzKFwiP1wiKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICB1cmwgPVxuICAgICAgICB1cmwgK1xuICAgICAgICBzZXAgK1xuICAgICAgICBjb25maWcuYXV0aC5hcGlLZXkua2V5ICtcbiAgICAgICAgXCI9XCIgK1xuICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoY29uZmlnLmF1dGguYXBpS2V5LnZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLnBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBlbmFibGVkUGFyYW1zID0gY29uZmlnLnBhcmFtcy5maWx0ZXIoKHApID0+IHAuZW5hYmxlZCAhPT0gZmFsc2UpO1xuICAgICAgaWYgKGVuYWJsZWRQYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBzZXAgPSB1cmwuaW5jbHVkZXMoXCI/XCIpID8gXCImXCIgOiBcIj9cIjtcbiAgICAgICAgY29uc3QgcXVlcnlTdHJpbmcgPSBlbmFibGVkUGFyYW1zXG4gICAgICAgICAgLm1hcChcbiAgICAgICAgICAgIChwKSA9PlxuICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQocC5uYW1lKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHAudmFsdWUpLFxuICAgICAgICAgIClcbiAgICAgICAgICAuam9pbihcIiZcIik7XG4gICAgICAgIHVybCA9IHVybCArIHNlcCArIHF1ZXJ5U3RyaW5nO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICBtZXRob2Q6IGNvbmZpZy5tZXRob2QsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keTpcbiAgICAgICAgY29uZmlnLm1ldGhvZCAhPT0gXCJHRVRcIiAmJiBjb25maWcubWV0aG9kICE9PSBcIkhFQURcIiA/IGJvZHkgOiB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZUJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgY29uc3QgZW5kID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgY29uc3QgZHVyYXRpb24gPSBlbmQgLSBzdGFydDtcblxuICAgIGNvbnN0IGhlYWRlclBhaXJzOiBbc3RyaW5nLCBzdHJpbmddW10gPSBbXTtcbiAgICByZXNwb25zZS5oZWFkZXJzLmZvckVhY2goKHYsIGspID0+IGhlYWRlclBhaXJzLnB1c2goW2ssIHZdKSk7XG5cbiAgICBsZXQgdGltaW5nOiBpbXBvcnQoXCJAL3R5cGVzXCIpLlRpbWluZ0JyZWFrZG93biB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBlbnRyaWVzID0gcGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5TmFtZShcbiAgICAgIHVybCxcbiAgICAgIFwicmVzb3VyY2VcIixcbiAgICApIGFzIFBlcmZvcm1hbmNlUmVzb3VyY2VUaW1pbmdbXTtcbiAgICBpZiAoZW50cmllcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXNbZW50cmllcy5sZW5ndGggLSAxXTtcbiAgICAgIHRpbWluZyA9IHtcbiAgICAgICAgZG5zOiBlbnRyeS5kb21haW5Mb29rdXBFbmQgLSBlbnRyeS5kb21haW5Mb29rdXBTdGFydCxcbiAgICAgICAgY29ubmVjdDogZW50cnkuY29ubmVjdEVuZCAtIGVudHJ5LmNvbm5lY3RTdGFydCxcbiAgICAgICAgdGxzOlxuICAgICAgICAgIGVudHJ5LnNlY3VyZUNvbm5lY3Rpb25TdGFydCA+IDBcbiAgICAgICAgICAgID8gZW50cnkuY29ubmVjdEVuZCAtIGVudHJ5LnNlY3VyZUNvbm5lY3Rpb25TdGFydFxuICAgICAgICAgICAgOiAwLFxuICAgICAgICB0dGZiOiBlbnRyeS5yZXNwb25zZVN0YXJ0IC0gZW50cnkucmVxdWVzdFN0YXJ0LFxuICAgICAgICBkb3dubG9hZDogZW50cnkucmVzcG9uc2VFbmQgLSBlbnRyeS5yZXNwb25zZVN0YXJ0LFxuICAgICAgICB0b3RhbDogZW50cnkuZHVyYXRpb24sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZDogUmVxdWVzdFJlY29yZCA9IHtcbiAgICAgIGlkOlxuICAgICAgICBcIm1hbnVhbF9cIiArIERhdGUubm93KCkgKyBcIl9cIiArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KSxcbiAgICAgIHVybCxcbiAgICAgIG1ldGhvZDogY29uZmlnLm1ldGhvZCxcbiAgICAgIHN0YXR1c0NvZGU6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHRhYklkOiAtMSxcbiAgICAgIHN0YXJ0VGltZTogc3RhcnQsXG4gICAgICB0aW1lU3RhbXA6IERhdGUubm93KCksXG4gICAgICBkdXJhdGlvbixcbiAgICAgIHJlcXVlc3RIZWFkZXJzOiBPYmplY3QuZW50cmllcyhoZWFkZXJzKS5tYXAoKFtuYW1lLCB2YWx1ZV0pID0+ICh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHZhbHVlLFxuICAgICAgfSkpLFxuICAgICAgcmVxdWVzdEJvZHk6IG51bGwsXG4gICAgICByZXF1ZXN0Qm9keVRleHQ6IGJvZHkgfHwgbnVsbCxcbiAgICAgIHJlc3BvbnNlQm9keVRleHQ6IHJlc3BvbnNlQm9keSxcbiAgICAgIHJlc3BvbnNlSGVhZGVyczogaGVhZGVyUGFpcnMubWFwKChbbmFtZSwgdmFsdWVdKSA9PiAoeyBuYW1lLCB2YWx1ZSB9KSksXG4gICAgICByZXF1ZXN0Q29uZmlnOiBjb25maWcsXG4gICAgfTtcblxuICAgIGF3YWl0IGFkZFJlY29yZChyZWNvcmQpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IGhlYWRlclBhaXJzLFxuICAgICAgYm9keTogcmVzcG9uc2VCb2R5LFxuICAgICAgZHVyYXRpb24sXG4gICAgICBzaXplOiByZXNwb25zZUJvZHkubGVuZ3RoLFxuICAgICAgdGltaW5nLFxuICAgIH07XG4gIH1cblxuICAvLyBSZXF1ZXN0IGxpZmVjeWNsZSBob29rc1xuICBjaHJvbWUud2ViUmVxdWVzdC5vbkJlZm9yZVJlcXVlc3QuYWRkTGlzdGVuZXIoXG4gICAgKGRldGFpbHMpID0+IHtcbiAgICAgIGlmICghc2hvdWxkQ2FwdHVyZShkZXRhaWxzLnVybCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwge1xuICAgICAgICBzdGFydFRpbWU6IGRldGFpbHMudGltZVN0YW1wLFxuICAgICAgICByZXF1ZXN0Qm9keTogZGV0YWlscy5yZXF1ZXN0Qm9keT8uZm9ybURhdGEgfHwgdW5kZWZpbmVkLFxuICAgICAgICByZXF1ZXN0Qm9keVRleHQ6IHNlcmlhbGl6ZVJlcXVlc3RCb2R5KFxuICAgICAgICAgIGRldGFpbHMgYXMgY2hyb21lLndlYlJlcXVlc3QuV2ViUmVxdWVzdEJvZHlEZXRhaWxzLFxuICAgICAgICApLFxuICAgICAgfSk7XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXF1ZXN0Qm9keVwiXSxcbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkJlZm9yZVNlbmRIZWFkZXJzLmFkZExpc3RlbmVyKFxuICAgIChkZXRhaWxzKSA9PiB7XG4gICAgICBjb25zdCBwID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgcC5yZXF1ZXN0SGVhZGVycyA9IGRldGFpbHMucmVxdWVzdEhlYWRlcnM7XG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwgcCk7XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXF1ZXN0SGVhZGVyc1wiXSxcbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkhlYWRlcnNSZWNlaXZlZC5hZGRMaXN0ZW5lcihcbiAgICAoZGV0YWlscykgPT4ge1xuICAgICAgY29uc3QgcCA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgIHAucmVzcG9uc2VIZWFkZXJzID0gZGV0YWlscy5yZXNwb25zZUhlYWRlcnM7XG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwgcCk7XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXNwb25zZUhlYWRlcnNcIl0sXG4gICk7XG5cbiAgY2hyb21lLndlYlJlcXVlc3Qub25Db21wbGV0ZWQuYWRkTGlzdGVuZXIoXG4gICAgYXN5bmMgKGRldGFpbHMpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICghc2hvdWxkQ2FwdHVyZShkZXRhaWxzLnVybCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBiYXNlID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgICBwYXJ0aWFsLmRlbGV0ZShkZXRhaWxzLnJlcXVlc3RJZCk7XG5cbiAgICAgICAgY29uc3Qgc3RhcnQgPSBiYXNlLnN0YXJ0VGltZSB8fCBkZXRhaWxzLnRpbWVTdGFtcDtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPVxuICAgICAgICAgIHR5cGVvZiBiYXNlLnN0YXJ0VGltZSA9PT0gXCJudW1iZXJcIlxuICAgICAgICAgICAgPyBkZXRhaWxzLnRpbWVTdGFtcCAtIGJhc2Uuc3RhcnRUaW1lXG4gICAgICAgICAgICA6IDA7XG5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBSZXF1ZXN0UmVjb3JkID0ge1xuICAgICAgICAgIGlkOiBkZXRhaWxzLnJlcXVlc3RJZCxcbiAgICAgICAgICB1cmw6IGRldGFpbHMudXJsLFxuICAgICAgICAgIG1ldGhvZDogZGV0YWlscy5tZXRob2QsXG4gICAgICAgICAgc3RhdHVzQ29kZTogZGV0YWlscy5zdGF0dXNDb2RlLFxuICAgICAgICAgIHR5cGU6IGRldGFpbHMudHlwZSxcbiAgICAgICAgICB0YWJJZDogZGV0YWlscy50YWJJZCxcbiAgICAgICAgICBzdGFydFRpbWU6IHN0YXJ0LFxuICAgICAgICAgIHRpbWVTdGFtcDogZGV0YWlscy50aW1lU3RhbXAsXG4gICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgcmVxdWVzdEhlYWRlcnM6IGJhc2UucmVxdWVzdEhlYWRlcnMgfHwgW10sXG4gICAgICAgICAgcmVxdWVzdEJvZHk6IGJhc2UucmVxdWVzdEJvZHkgfHwgbnVsbCxcbiAgICAgICAgICByZXF1ZXN0Qm9keVRleHQ6IGJhc2UucmVxdWVzdEJvZHlUZXh0IHx8IG51bGwsXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzOiBiYXNlLnJlc3BvbnNlSGVhZGVycyB8fCBbXSxcbiAgICAgICAgfTtcblxuICAgICAgICBhd2FpdCBhZGRSZWNvcmQocmVjb3JkKTtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgXCJbQVBJIERlYnVnZ2VyXSBDYXB0dXJlZDpcIixcbiAgICAgICAgICByZWNvcmQubWV0aG9kLFxuICAgICAgICAgIHJlY29yZC51cmwsXG4gICAgICAgICAgcmVjb3JkLnN0YXR1c0NvZGUsXG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEkgRGVidWdnZXJdIENhcHR1cmUgZXJyb3I6XCIsIGVycik7XG4gICAgICB9XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgKTtcblxuICAvLyBNZXNzYWdlIGhhbmRsZXJcbiAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBfc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIkdFVF9SRVFVRVNUU1wiKSB7XG4gICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wicmVxdWVzdHNcIl0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyByZXF1ZXN0czogcmVzLnJlcXVlc3RzIHx8IFtdIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIkNMRUFSX1JFUVVFU1RTXCIpIHtcbiAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHJlcXVlc3RzOiBbXSB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJTRU5EX1JFUVVFU1RcIikge1xuICAgICAgc2VuZFJlcXVlc3QobWVzc2FnZS5wYXlsb2FkLmNvbmZpZylcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCByZXNwb25zZSB9KSlcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT5cbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSksXG4gICAgICAgICk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIlJFUExBWV9SRVFVRVNUXCIpIHtcbiAgICAgIGNvbnN0IGNvbmZpZzogaW1wb3J0KFwiQC90eXBlc1wiKS5SZXF1ZXN0Q29uZmlnID0ge1xuICAgICAgICBtZXRob2Q6IG1lc3NhZ2UucGF5bG9hZC5tZXRob2QsXG4gICAgICAgIHVybDogbWVzc2FnZS5wYXlsb2FkLnVybCxcbiAgICAgICAgaGVhZGVyczogbWVzc2FnZS5wYXlsb2FkLmhlYWRlcnMgfHwgW10sXG4gICAgICAgIHBhcmFtczogW10sXG4gICAgICAgIGJvZHlUeXBlOiBcInJhd1wiLFxuICAgICAgICBib2R5OiB7IHJhdzogbWVzc2FnZS5wYXlsb2FkLmJvZHkgfSxcbiAgICAgICAgYXV0aDogeyB0eXBlOiBcIm5vbmVcIiB9LFxuICAgICAgfTtcbiAgICAgIHNlbmRSZXF1ZXN0KGNvbmZpZylcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCByZXNwb25zZSB9KSlcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT5cbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSksXG4gICAgICAgICk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIlVQREFURV9NT0NLX1NFUlZFUlNcIikge1xuICAgICAgbW9ja1NlcnZlcnMgPSBtZXNzYWdlLnBheWxvYWQuc2VydmVycyB8fCBbXTtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBcIltBUEkgRGVidWdnZXJdIE1vY2sgc2VydmVycyB1cGRhdGVkIChyZXF1aXJlcyBkZWNsYXJhdGl2ZU5ldFJlcXVlc3QgZm9yIGludGVyY2VwdGlvbik6XCIsXG4gICAgICAgIG1vY2tTZXJ2ZXJzLmxlbmd0aCxcbiAgICAgICk7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbn0pO1xuXG4vLyBUT0RPOiBNb2NrIHNlcnZlcnMgcmVxdWlyZSBkZWNsYXJhdGl2ZU5ldFJlcXVlc3QgQVBJIGluIE1WM1xuLy8gVGhlIHdlYlJlcXVlc3QgYmxvY2tpbmcgQVBJIGlzIG5vdCBhdmFpbGFibGUgZm9yIHJlZ3VsYXIgZXh0ZW5zaW9uc1xuLy8gVG8gaW1wbGVtZW50IG1vY2sgc2VydmVycywgdXNlIGNocm9tZS5kZWNsYXJhdGl2ZU5ldFJlcXVlc3QgaW5zdGVhZFxubGV0IG1vY2tTZXJ2ZXJzOiBpbXBvcnQoXCJAL3R5cGVzXCIpLk1vY2tTZXJ2ZXJbXSA9IFtdO1xuXG5jaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wiYXBpRGVidWdnZXJfbW9ja1NlcnZlcnNcIl0pLnRoZW4oKHJlc3VsdCkgPT4ge1xuICBpZiAocmVzdWx0LmFwaURlYnVnZ2VyX21vY2tTZXJ2ZXJzKSB7XG4gICAgbW9ja1NlcnZlcnMgPSByZXN1bHQuYXBpRGVidWdnZXJfbW9ja1NlcnZlcnM7XG4gIH1cbn0pO1xuIiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBicm93c2VyJDEgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuXG4vLyNyZWdpb24gc3JjL2Jyb3dzZXIudHNcbi8qKlxuKiBDb250YWlucyB0aGUgYGJyb3dzZXJgIGV4cG9ydCB3aGljaCB5b3Ugc2hvdWxkIHVzZSB0byBhY2Nlc3MgdGhlIGV4dGVuc2lvbiBBUElzIGluIHlvdXIgcHJvamVjdDpcbiogYGBgdHNcbiogaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gJ3d4dC9icm93c2VyJztcbipcbiogYnJvd3Nlci5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiogICAvLyAuLi5cbiogfSlcbiogYGBgXG4qIEBtb2R1bGUgd3h0L2Jyb3dzZXJcbiovXG5jb25zdCBicm93c2VyID0gYnJvd3NlciQxO1xuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGJyb3dzZXIgfTsiLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbInJlc3VsdCIsImJyb3dzZXIiXSwibWFwcGluZ3MiOiI7O0FBQ0EsV0FBUyxpQkFBaUIsS0FBSztBQUM5QixRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFHO0FBQ2hFLFdBQU87QUFBQSxFQUNSO0FDSkEsUUFBQSxhQUFBLGlCQUFBLE1BQUE7QUFDRSxZQUFBLElBQUEsa0RBQUE7QUFHQSxXQUFBLE9BQUEsVUFBQSxZQUFBLE1BQUE7QUFDRSxhQUFBLEtBQUEsT0FBQSxFQUFBLEtBQUEsT0FBQSxRQUFBLE9BQUEsaUJBQUEsR0FBQTtBQUFBLElBQW9FLENBQUE7QUFHdEUsVUFBQSxjQUFBO0FBQ0EsVUFBQSxjQUFBLElBQUEsWUFBQSxPQUFBO0FBNEJBLFVBQUEsVUFBQSxvQkFBQSxJQUFBO0FBRUEsVUFBQSwyQkFBQTtBQUFBLE1BQWlDO0FBQUEsTUFDL0I7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFHRixhQUFBLGNBQUEsS0FBQTtBQUNFLGlCQUFBLFdBQUEsMEJBQUE7QUFDRSxZQUFBLFFBQUEsS0FBQSxHQUFBLEdBQUE7QUFDRSxpQkFBQTtBQUFBLFFBQU87QUFBQSxNQUNUO0FBRUYsYUFBQTtBQUFBLElBQU87QUFJVCxhQUFBLHFCQUFBLFNBQUE7QUFHRSxZQUFBLE9BQUEsUUFBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLFFBQUE7QUFFQSxVQUFBLEtBQUEsT0FBQSxLQUFBLElBQUEsUUFBQTtBQUNFLGVBQUEsS0FBQSxJ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
