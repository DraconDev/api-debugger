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
          return {};
        }
        for (const server of mockServers) {
          if (!server.enabled) continue;
          let parsedUrl;
          try {
            parsedUrl = new URL(details.url);
          } catch {
            continue;
          }
          for (const endpoint of server.endpoints) {
            if (!endpoint.enabled) continue;
            if (details.method === endpoint.method && parsedUrl.pathname === endpoint.path) {
              return {
                redirectUrl: `data:${endpoint.contentType};base64,${btoa(endpoint.body)}`
              };
            }
          }
        }
        partial.set(details.requestId, {
          startTime: details.timeStamp,
          requestBody: details.requestBody?.formData || void 0,
          requestBodyText: serializeRequestBody(
            details
          )
        });
        return {};
      },
      { urls: ["<all_urls>"] },
      ["requestBody", "blocking"]
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
        console.log("[API Debugger] Updated mock servers:", mockServers.length);
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
      const serverUrl = "ws://localhost:3001";
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9OyIsImV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZFwiKTtcblxuICBjb25zdCBNQVhfSElTVE9SWSA9IDIwMDtcbiAgY29uc3QgdGV4dERlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKTtcblxuICBpbnRlcmZhY2UgUmVxdWVzdFJlY29yZCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB1cmw6IHN0cmluZztcbiAgICBtZXRob2Q6IHN0cmluZztcbiAgICBzdGF0dXNDb2RlOiBudW1iZXI7XG4gICAgdHlwZT86IHN0cmluZztcbiAgICB0YWJJZDogbnVtYmVyO1xuICAgIHN0YXJ0VGltZTogbnVtYmVyO1xuICAgIHRpbWVTdGFtcDogbnVtYmVyO1xuICAgIGR1cmF0aW9uOiBudW1iZXI7XG4gICAgcmVxdWVzdEhlYWRlcnM6IGNocm9tZS53ZWJSZXF1ZXN0Lkh0dHBIZWFkZXJbXTtcbiAgICByZXF1ZXN0Qm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsO1xuICAgIHJlcXVlc3RCb2R5VGV4dDogc3RyaW5nIHwgbnVsbDtcbiAgICByZXNwb25zZUJvZHlUZXh0Pzogc3RyaW5nO1xuICAgIHJlc3BvbnNlSGVhZGVyczogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICAgIHJlcXVlc3RDb25maWc/OiBpbXBvcnQoXCJAL3R5cGVzXCIpLlJlcXVlc3RDb25maWc7XG4gIH1cblxuICBpbnRlcmZhY2UgUGFydGlhbFJlcXVlc3Qge1xuICAgIHN0YXJ0VGltZT86IG51bWJlcjtcbiAgICByZXF1ZXN0Qm9keT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIHJlcXVlc3RCb2R5VGV4dD86IHN0cmluZyB8IG51bGw7XG4gICAgcmVxdWVzdEhlYWRlcnM/OiBjaHJvbWUud2ViUmVxdWVzdC5IdHRwSGVhZGVyW107XG4gICAgcmVzcG9uc2VIZWFkZXJzPzogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICB9XG5cbiAgY29uc3QgcGFydGlhbCA9IG5ldyBNYXA8c3RyaW5nLCBQYXJ0aWFsUmVxdWVzdD4oKTtcblxuICBjb25zdCBERUZBVUxUX0VYQ0xVREVfUEFUVEVSTlMgPSBbXG4gICAgL15jaHJvbWUtZXh0ZW5zaW9uOlxcL1xcLy9pLFxuICAgIC9eY2hyb21lOlxcL1xcLy9pLFxuICAgIC9eYWJvdXQ6L2ksXG4gICAgL15kYXRhOi9pLFxuICAgIC9eYmxvYjovaSxcbiAgICAvXmZpbGU6XFwvXFwvL2ksXG4gICAgL153czpcXC9cXC8vaSxcbiAgICAvXndzczpcXC9cXC8vaSxcbiAgICAvXFwuKHRzeD98anN4P3xjc3N8aHRtbHxtYXB8d29mZjI/fHR0Znxlb3R8c3ZnfHBuZ3xnaWZ8anBnfGpwZWd8aWNvfHdlYnApJC9pLFxuICAgIC9cXC9ub2RlX21vZHVsZXNcXC8vaSxcbiAgICAvXFwvX192aXRlX3BpbmcvaSxcbiAgICAvXFwvQHZpdGVcXC8vaSxcbiAgICAvXFwvQGZzXFwvL2ksXG4gICAgL1xcL0BpZFxcLy9pLFxuICAgIC9cXC9AcmVhY3QtcmVmcmVzaC9pLFxuICAgIC9ob3QtdXBkYXRlL2ksXG4gIF07XG5cbiAgZnVuY3Rpb24gc2hvdWxkQ2FwdHVyZSh1cmw6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBERUZBVUxUX0VYQ0xVREVfUEFUVEVSTlMpIHtcbiAgICAgIGlmIChwYXR0ZXJuLnRlc3QodXJsKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uc1xuICBmdW5jdGlvbiBzZXJpYWxpemVSZXF1ZXN0Qm9keShcbiAgICBkZXRhaWxzOiBjaHJvbWUud2ViUmVxdWVzdC5XZWJSZXF1ZXN0Qm9keURldGFpbHMsXG4gICk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGJvZHkgPSBkZXRhaWxzLnJlcXVlc3RCb2R5O1xuICAgIGlmICghYm9keSkgcmV0dXJuIG51bGw7XG5cbiAgICBpZiAoYm9keS5yYXcgJiYgYm9keS5yYXcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gYm9keS5yYXdcbiAgICAgICAgLm1hcCgoY2h1bmspID0+IHtcbiAgICAgICAgICBpZiAoY2h1bms/LmJ5dGVzKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICByZXR1cm4gdGV4dERlY29kZXIuZGVjb2RlKGNodW5rLmJ5dGVzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKFwiXCIpO1xuICAgIH1cblxuICAgIGlmIChib2R5LmZvcm1EYXRhKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoYm9keS5mb3JtRGF0YSlcbiAgICAgICAgLm1hcCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmFsdWVzID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZSA6IFt2YWx1ZV07XG4gICAgICAgICAgcmV0dXJuIGAke2tleX09JHt2YWx1ZXMuam9pbihcIixcIil9YDtcbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oXCImXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gYWRkUmVjb3JkKHJlY29yZDogUmVxdWVzdFJlY29yZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbXCJyZXF1ZXN0c1wiXSk7XG4gICAgY29uc3QgbGlzdCA9IChyZXN1bHQucmVxdWVzdHMgYXMgUmVxdWVzdFJlY29yZFtdKSB8fCBbXTtcblxuICAgIGxpc3QudW5zaGlmdChyZWNvcmQpO1xuICAgIGlmIChsaXN0Lmxlbmd0aCA+IE1BWF9ISVNUT1JZKSBsaXN0Lmxlbmd0aCA9IE1BWF9ISVNUT1JZO1xuXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgcmVxdWVzdHM6IGxpc3QgfSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBzZW5kUmVxdWVzdChcbiAgICBjb25maWc6IGltcG9ydChcIkAvdHlwZXNcIikuUmVxdWVzdENvbmZpZyxcbiAgKTogUHJvbWlzZTxpbXBvcnQoXCJAL3R5cGVzXCIpLkNhcHR1cmVkUmVzcG9uc2U+IHtcbiAgICBjb25zdCBzdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGNvbmZpZy5oZWFkZXJzLmZvckVhY2goKGgpID0+IHtcbiAgICAgIGlmIChoLmVuYWJsZWQgIT09IGZhbHNlICYmIGgubmFtZSkge1xuICAgICAgICBoZWFkZXJzW2gubmFtZV0gPSBoLnZhbHVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbmZpZy5hdXRoLnR5cGUgPT09IFwiYmVhcmVyXCIgJiYgY29uZmlnLmF1dGguYmVhcmVyPy50b2tlbikge1xuICAgICAgaGVhZGVyc1tcIkF1dGhvcml6YXRpb25cIl0gPSBcIkJlYXJlciBcIiArIGNvbmZpZy5hdXRoLmJlYXJlci50b2tlbjtcbiAgICB9IGVsc2UgaWYgKGNvbmZpZy5hdXRoLnR5cGUgPT09IFwiYmFzaWNcIiAmJiBjb25maWcuYXV0aC5iYXNpYykge1xuICAgICAgY29uc3QgZW5jb2RlZCA9IGJ0b2EoXG4gICAgICAgIGNvbmZpZy5hdXRoLmJhc2ljLnVzZXJuYW1lICsgXCI6XCIgKyBjb25maWcuYXV0aC5iYXNpYy5wYXNzd29yZCxcbiAgICAgICk7XG4gICAgICBoZWFkZXJzW1wiQXV0aG9yaXphdGlvblwiXSA9IFwiQmFzaWMgXCIgKyBlbmNvZGVkO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBjb25maWcuYXV0aC50eXBlID09PSBcImFwaS1rZXlcIiAmJlxuICAgICAgY29uZmlnLmF1dGguYXBpS2V5Py5hZGRUbyA9PT0gXCJoZWFkZXJcIlxuICAgICkge1xuICAgICAgaGVhZGVyc1tjb25maWcuYXV0aC5hcGlLZXkua2V5XSA9IGNvbmZpZy5hdXRoLmFwaUtleS52YWx1ZTtcbiAgICB9XG5cbiAgICBsZXQgYm9keTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGlmIChjb25maWcuYm9keVR5cGUgPT09IFwianNvblwiICYmIGNvbmZpZy5ib2R5Lmpzb24pIHtcbiAgICAgIGJvZHkgPSBjb25maWcuYm9keS5qc29uO1xuICAgICAgaWYgKCFoZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdKSB7XG4gICAgICAgIGhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbmZpZy5ib2R5VHlwZSA9PT0gXCJyYXdcIiAmJiBjb25maWcuYm9keS5yYXcpIHtcbiAgICAgIGJvZHkgPSBjb25maWcuYm9keS5yYXc7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGNvbmZpZy5ib2R5VHlwZSA9PT0gXCJ4LXd3dy1mb3JtLXVybGVuY29kZWRcIiAmJlxuICAgICAgY29uZmlnLmJvZHkudXJsRW5jb2RlZFxuICAgICkge1xuICAgICAgYm9keSA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoXG4gICAgICAgIGNvbmZpZy5ib2R5LnVybEVuY29kZWQubWFwKChmKSA9PiBbZi5uYW1lLCBmLnZhbHVlXSksXG4gICAgICApLnRvU3RyaW5nKCk7XG4gICAgICBpZiAoIWhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0pIHtcbiAgICAgICAgaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkXCI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHVybCA9IGNvbmZpZy51cmw7XG4gICAgaWYgKFxuICAgICAgY29uZmlnLmF1dGgudHlwZSA9PT0gXCJhcGkta2V5XCIgJiZcbiAgICAgIGNvbmZpZy5hdXRoLmFwaUtleT8uYWRkVG8gPT09IFwicXVlcnlcIlxuICAgICkge1xuICAgICAgY29uc3Qgc2VwID0gdXJsLmluY2x1ZGVzKFwiP1wiKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICB1cmwgPVxuICAgICAgICB1cmwgK1xuICAgICAgICBzZXAgK1xuICAgICAgICBjb25maWcuYXV0aC5hcGlLZXkua2V5ICtcbiAgICAgICAgXCI9XCIgK1xuICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoY29uZmlnLmF1dGguYXBpS2V5LnZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLnBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBlbmFibGVkUGFyYW1zID0gY29uZmlnLnBhcmFtcy5maWx0ZXIoKHApID0+IHAuZW5hYmxlZCAhPT0gZmFsc2UpO1xuICAgICAgaWYgKGVuYWJsZWRQYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBzZXAgPSB1cmwuaW5jbHVkZXMoXCI/XCIpID8gXCImXCIgOiBcIj9cIjtcbiAgICAgICAgY29uc3QgcXVlcnlTdHJpbmcgPSBlbmFibGVkUGFyYW1zXG4gICAgICAgICAgLm1hcChcbiAgICAgICAgICAgIChwKSA9PlxuICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQocC5uYW1lKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHAudmFsdWUpLFxuICAgICAgICAgIClcbiAgICAgICAgICAuam9pbihcIiZcIik7XG4gICAgICAgIHVybCA9IHVybCArIHNlcCArIHF1ZXJ5U3RyaW5nO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICBtZXRob2Q6IGNvbmZpZy5tZXRob2QsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keTpcbiAgICAgICAgY29uZmlnLm1ldGhvZCAhPT0gXCJHRVRcIiAmJiBjb25maWcubWV0aG9kICE9PSBcIkhFQURcIiA/IGJvZHkgOiB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZUJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgY29uc3QgZW5kID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgY29uc3QgZHVyYXRpb24gPSBlbmQgLSBzdGFydDtcblxuICAgIGNvbnN0IGhlYWRlclBhaXJzOiBbc3RyaW5nLCBzdHJpbmddW10gPSBbXTtcbiAgICByZXNwb25zZS5oZWFkZXJzLmZvckVhY2goKHYsIGspID0+IGhlYWRlclBhaXJzLnB1c2goW2ssIHZdKSk7XG5cbiAgICBsZXQgdGltaW5nOiBpbXBvcnQoXCJAL3R5cGVzXCIpLlRpbWluZ0JyZWFrZG93biB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBlbnRyaWVzID0gcGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5TmFtZShcbiAgICAgIHVybCxcbiAgICAgIFwicmVzb3VyY2VcIixcbiAgICApIGFzIFBlcmZvcm1hbmNlUmVzb3VyY2VUaW1pbmdbXTtcbiAgICBpZiAoZW50cmllcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXNbZW50cmllcy5sZW5ndGggLSAxXTtcbiAgICAgIHRpbWluZyA9IHtcbiAgICAgICAgZG5zOiBlbnRyeS5kb21haW5Mb29rdXBFbmQgLSBlbnRyeS5kb21haW5Mb29rdXBTdGFydCxcbiAgICAgICAgY29ubmVjdDogZW50cnkuY29ubmVjdEVuZCAtIGVudHJ5LmNvbm5lY3RTdGFydCxcbiAgICAgICAgdGxzOlxuICAgICAgICAgIGVudHJ5LnNlY3VyZUNvbm5lY3Rpb25TdGFydCA+IDBcbiAgICAgICAgICAgID8gZW50cnkuY29ubmVjdEVuZCAtIGVudHJ5LnNlY3VyZUNvbm5lY3Rpb25TdGFydFxuICAgICAgICAgICAgOiAwLFxuICAgICAgICB0dGZiOiBlbnRyeS5yZXNwb25zZVN0YXJ0IC0gZW50cnkucmVxdWVzdFN0YXJ0LFxuICAgICAgICBkb3dubG9hZDogZW50cnkucmVzcG9uc2VFbmQgLSBlbnRyeS5yZXNwb25zZVN0YXJ0LFxuICAgICAgICB0b3RhbDogZW50cnkuZHVyYXRpb24sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZDogUmVxdWVzdFJlY29yZCA9IHtcbiAgICAgIGlkOlxuICAgICAgICBcIm1hbnVhbF9cIiArIERhdGUubm93KCkgKyBcIl9cIiArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KSxcbiAgICAgIHVybCxcbiAgICAgIG1ldGhvZDogY29uZmlnLm1ldGhvZCxcbiAgICAgIHN0YXR1c0NvZGU6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHRhYklkOiAtMSxcbiAgICAgIHN0YXJ0VGltZTogc3RhcnQsXG4gICAgICB0aW1lU3RhbXA6IERhdGUubm93KCksXG4gICAgICBkdXJhdGlvbixcbiAgICAgIHJlcXVlc3RIZWFkZXJzOiBPYmplY3QuZW50cmllcyhoZWFkZXJzKS5tYXAoKFtuYW1lLCB2YWx1ZV0pID0+ICh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHZhbHVlLFxuICAgICAgfSkpLFxuICAgICAgcmVxdWVzdEJvZHk6IG51bGwsXG4gICAgICByZXF1ZXN0Qm9keVRleHQ6IGJvZHkgfHwgbnVsbCxcbiAgICAgIHJlc3BvbnNlQm9keVRleHQ6IHJlc3BvbnNlQm9keSxcbiAgICAgIHJlc3BvbnNlSGVhZGVyczogaGVhZGVyUGFpcnMubWFwKChbbmFtZSwgdmFsdWVdKSA9PiAoeyBuYW1lLCB2YWx1ZSB9KSksXG4gICAgICByZXF1ZXN0Q29uZmlnOiBjb25maWcsXG4gICAgfTtcblxuICAgIGF3YWl0IGFkZFJlY29yZChyZWNvcmQpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IGhlYWRlclBhaXJzLFxuICAgICAgYm9keTogcmVzcG9uc2VCb2R5LFxuICAgICAgZHVyYXRpb24sXG4gICAgICBzaXplOiByZXNwb25zZUJvZHkubGVuZ3RoLFxuICAgICAgdGltaW5nLFxuICAgIH07XG4gIH1cblxuICAvLyBSZXF1ZXN0IGxpZmVjeWNsZSBob29rc1xuICBjaHJvbWUud2ViUmVxdWVzdC5vbkJlZm9yZVJlcXVlc3QuYWRkTGlzdGVuZXIoXG4gICAgKGRldGFpbHMpID0+IHtcbiAgICAgIGlmICghc2hvdWxkQ2FwdHVyZShkZXRhaWxzLnVybCkpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHNlcnZlciBvZiBtb2NrU2VydmVycykge1xuICAgICAgICBpZiAoIXNlcnZlci5lbmFibGVkKSBjb250aW51ZTtcblxuICAgICAgICBsZXQgcGFyc2VkVXJsOiBVUkwgfCB1bmRlZmluZWQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFyc2VkVXJsID0gbmV3IFVSTChkZXRhaWxzLnVybCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbmRwb2ludCBvZiBzZXJ2ZXIuZW5kcG9pbnRzKSB7XG4gICAgICAgICAgaWYgKCFlbmRwb2ludC5lbmFibGVkKSBjb250aW51ZTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGRldGFpbHMubWV0aG9kID09PSBlbmRwb2ludC5tZXRob2QgJiZcbiAgICAgICAgICAgIHBhcnNlZFVybC5wYXRobmFtZSA9PT0gZW5kcG9pbnQucGF0aFxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgcmVkaXJlY3RVcmw6IGBkYXRhOiR7ZW5kcG9pbnQuY29udGVudFR5cGV9O2Jhc2U2NCwke2J0b2EoZW5kcG9pbnQuYm9keSl9YCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHBhcnRpYWwuc2V0KGRldGFpbHMucmVxdWVzdElkLCB7XG4gICAgICAgIHN0YXJ0VGltZTogZGV0YWlscy50aW1lU3RhbXAsXG4gICAgICAgIHJlcXVlc3RCb2R5OiBkZXRhaWxzLnJlcXVlc3RCb2R5Py5mb3JtRGF0YSB8fCB1bmRlZmluZWQsXG4gICAgICAgIHJlcXVlc3RCb2R5VGV4dDogc2VyaWFsaXplUmVxdWVzdEJvZHkoXG4gICAgICAgICAgZGV0YWlscyBhcyBjaHJvbWUud2ViUmVxdWVzdC5XZWJSZXF1ZXN0Qm9keURldGFpbHMsXG4gICAgICAgICksXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHt9O1xuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH0sXG4gICAgW1wicmVxdWVzdEJvZHlcIiwgXCJibG9ja2luZ1wiXSxcbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkJlZm9yZVNlbmRIZWFkZXJzLmFkZExpc3RlbmVyKFxuICAgIChkZXRhaWxzKSA9PiB7XG4gICAgICBjb25zdCBwID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgcC5yZXF1ZXN0SGVhZGVycyA9IGRldGFpbHMucmVxdWVzdEhlYWRlcnM7XG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwgcCk7XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXF1ZXN0SGVhZGVyc1wiXSxcbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkhlYWRlcnNSZWNlaXZlZC5hZGRMaXN0ZW5lcihcbiAgICAoZGV0YWlscykgPT4ge1xuICAgICAgY29uc3QgcCA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgIHAucmVzcG9uc2VIZWFkZXJzID0gZGV0YWlscy5yZXNwb25zZUhlYWRlcnM7XG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwgcCk7XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXNwb25zZUhlYWRlcnNcIl0sXG4gICk7XG5cbiAgY2hyb21lLndlYlJlcXVlc3Qub25Db21wbGV0ZWQuYWRkTGlzdGVuZXIoXG4gICAgYXN5bmMgKGRldGFpbHMpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICghc2hvdWxkQ2FwdHVyZShkZXRhaWxzLnVybCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBiYXNlID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgICBwYXJ0aWFsLmRlbGV0ZShkZXRhaWxzLnJlcXVlc3RJZCk7XG5cbiAgICAgICAgY29uc3Qgc3RhcnQgPSBiYXNlLnN0YXJ0VGltZSB8fCBkZXRhaWxzLnRpbWVTdGFtcDtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPVxuICAgICAgICAgIHR5cGVvZiBiYXNlLnN0YXJ0VGltZSA9PT0gXCJudW1iZXJcIlxuICAgICAgICAgICAgPyBkZXRhaWxzLnRpbWVTdGFtcCAtIGJhc2Uuc3RhcnRUaW1lXG4gICAgICAgICAgICA6IDA7XG5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBSZXF1ZXN0UmVjb3JkID0ge1xuICAgICAgICAgIGlkOiBkZXRhaWxzLnJlcXVlc3RJZCxcbiAgICAgICAgICB1cmw6IGRldGFpbHMudXJsLFxuICAgICAgICAgIG1ldGhvZDogZGV0YWlscy5tZXRob2QsXG4gICAgICAgICAgc3RhdHVzQ29kZTogZGV0YWlscy5zdGF0dXNDb2RlLFxuICAgICAgICAgIHR5cGU6IGRldGFpbHMudHlwZSxcbiAgICAgICAgICB0YWJJZDogZGV0YWlscy50YWJJZCxcbiAgICAgICAgICBzdGFydFRpbWU6IHN0YXJ0LFxuICAgICAgICAgIHRpbWVTdGFtcDogZGV0YWlscy50aW1lU3RhbXAsXG4gICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgcmVxdWVzdEhlYWRlcnM6IGJhc2UucmVxdWVzdEhlYWRlcnMgfHwgW10sXG4gICAgICAgICAgcmVxdWVzdEJvZHk6IGJhc2UucmVxdWVzdEJvZHkgfHwgbnVsbCxcbiAgICAgICAgICByZXF1ZXN0Qm9keVRleHQ6IGJhc2UucmVxdWVzdEJvZHlUZXh0IHx8IG51bGwsXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzOiBiYXNlLnJlc3BvbnNlSGVhZGVycyB8fCBbXSxcbiAgICAgICAgfTtcblxuICAgICAgICBhd2FpdCBhZGRSZWNvcmQocmVjb3JkKTtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgXCJbQVBJIERlYnVnZ2VyXSBDYXB0dXJlZDpcIixcbiAgICAgICAgICByZWNvcmQubWV0aG9kLFxuICAgICAgICAgIHJlY29yZC51cmwsXG4gICAgICAgICAgcmVjb3JkLnN0YXR1c0NvZGUsXG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEkgRGVidWdnZXJdIENhcHR1cmUgZXJyb3I6XCIsIGVycik7XG4gICAgICB9XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgKTtcblxuICAvLyBNZXNzYWdlIGhhbmRsZXJcbiAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBfc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIkdFVF9SRVFVRVNUU1wiKSB7XG4gICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wicmVxdWVzdHNcIl0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyByZXF1ZXN0czogcmVzLnJlcXVlc3RzIHx8IFtdIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIkNMRUFSX1JFUVVFU1RTXCIpIHtcbiAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHJlcXVlc3RzOiBbXSB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJTRU5EX1JFUVVFU1RcIikge1xuICAgICAgc2VuZFJlcXVlc3QobWVzc2FnZS5wYXlsb2FkLmNvbmZpZylcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCByZXNwb25zZSB9KSlcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT5cbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSksXG4gICAgICAgICk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIlJFUExBWV9SRVFVRVNUXCIpIHtcbiAgICAgIGNvbnN0IGNvbmZpZzogaW1wb3J0KFwiQC90eXBlc1wiKS5SZXF1ZXN0Q29uZmlnID0ge1xuICAgICAgICBtZXRob2Q6IG1lc3NhZ2UucGF5bG9hZC5tZXRob2QsXG4gICAgICAgIHVybDogbWVzc2FnZS5wYXlsb2FkLnVybCxcbiAgICAgICAgaGVhZGVyczogbWVzc2FnZS5wYXlsb2FkLmhlYWRlcnMgfHwgW10sXG4gICAgICAgIHBhcmFtczogW10sXG4gICAgICAgIGJvZHlUeXBlOiBcInJhd1wiLFxuICAgICAgICBib2R5OiB7IHJhdzogbWVzc2FnZS5wYXlsb2FkLmJvZHkgfSxcbiAgICAgICAgYXV0aDogeyB0eXBlOiBcIm5vbmVcIiB9LFxuICAgICAgfTtcbiAgICAgIHNlbmRSZXF1ZXN0KGNvbmZpZylcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCByZXNwb25zZSB9KSlcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT5cbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSksXG4gICAgICAgICk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIlVQREFURV9NT0NLX1NFUlZFUlNcIikge1xuICAgICAgbW9ja1NlcnZlcnMgPSBtZXNzYWdlLnBheWxvYWQuc2VydmVycyB8fCBbXTtcbiAgICAgIGNvbnNvbGUubG9nKFwiW0FQSSBEZWJ1Z2dlcl0gVXBkYXRlZCBtb2NrIHNlcnZlcnM6XCIsIG1vY2tTZXJ2ZXJzLmxlbmd0aCk7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbn0pO1xuXG5sZXQgbW9ja1NlcnZlcnM6IGltcG9ydChcIkAvdHlwZXNcIikuTW9ja1NlcnZlcltdID0gW107XG5cbmNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbXCJhcGlEZWJ1Z2dlcl9tb2NrU2VydmVyc1wiXSkudGhlbigocmVzdWx0KSA9PiB7XG4gIGlmIChyZXN1bHQuYXBpRGVidWdnZXJfbW9ja1NlcnZlcnMpIHtcbiAgICBtb2NrU2VydmVycyA9IHJlc3VsdC5hcGlEZWJ1Z2dlcl9tb2NrU2VydmVycztcbiAgfVxufSk7XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIGJyb3dzZXIkMSB9IGZyb20gXCJAd3h0LWRldi9icm93c2VyXCI7XG5cbi8vI3JlZ2lvbiBzcmMvYnJvd3Nlci50c1xuLyoqXG4qIENvbnRhaW5zIHRoZSBgYnJvd3NlcmAgZXhwb3J0IHdoaWNoIHlvdSBzaG91bGQgdXNlIHRvIGFjY2VzcyB0aGUgZXh0ZW5zaW9uIEFQSXMgaW4geW91ciBwcm9qZWN0OlxuKiBgYGB0c1xuKiBpbXBvcnQgeyBicm93c2VyIH0gZnJvbSAnd3h0L2Jyb3dzZXInO1xuKlxuKiBicm93c2VyLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xuKiAgIC8vIC4uLlxuKiB9KVxuKiBgYGBcbiogQG1vZHVsZSB3eHQvYnJvd3NlclxuKi9cbmNvbnN0IGJyb3dzZXIgPSBicm93c2VyJDE7XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgYnJvd3NlciB9OyIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsicmVzdWx0IiwiYnJvd3NlciJdLCJtYXBwaW5ncyI6Ijs7QUFDQSxXQUFTLGlCQUFpQixLQUFLO0FBQzlCLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUc7QUFDaEUsV0FBTztBQUFBLEVBQ1I7QUNKQSxRQUFBLGFBQUEsaUJBQUEsTUFBQTtBQUNFLFlBQUEsSUFBQSxrREFBQTtBQUVBLFVBQUEsY0FBQTtBQUNBLFVBQUEsY0FBQSxJQUFBLFlBQUEsT0FBQTtBQTRCQSxVQUFBLFVBQUEsb0JBQUEsSUFBQTtBQUVBLFVBQUEsMkJBQUE7QUFBQSxNQUFpQztBQUFBLE1BQy9CO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBR0YsYUFBQSxjQUFBLEtBQUE7QUFDRSxpQkFBQSxXQUFBLDBCQUFBO0FBQ0UsWUFBQSxRQUFBLEtBQUEsR0FBQSxHQUFBO0FBQ0UsaUJBQUE7QUFBQSxRQUFPO0FBQUEsTUFDVDtBQUVGLGFBQUE7QUFBQSxJQUFPO0FBSVQsYUFBQSxxQkFBQSxTQUFBO0FBR0UsWUFBQSxP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LEtBQUssSUFBSSxRQUFRO0FBQUEsSUFDaEg7QUFBQSxJQUNBLFlBQVksS0FBSztBQUNmLFlBQU0sTUFBTSxxRUFBcUU7QUFBQSxJQUNuRjtBQUFBLElBQ0EsV0FBVyxLQUFLO0FBQ2QsWUFBTSxNQUFNLG9FQUFvRTtBQUFBLElBQ2xGO0FBQUEsSUFDQSxXQUFXLEtBQUs7QUFDZCxZQUFNLE1BQU0sb0VBQW9FO0FBQUEsSUFDbEY7QUFBQSxJQUNBLHNCQUFzQixTQUFTO0FBQzdCLFlBQU0sVUFBVSxLQUFLLGVBQWUsT0FBTztBQUMzQyxZQUFNLGdCQUFnQixRQUFRLFFBQVEsU0FBUyxJQUFJO0FBQ25ELGFBQU8sT0FBTyxJQUFJLGFBQWEsR0FBRztBQUFBLElBQ3BDO0FBQUEsSUFDQSxlQUFlLFFBQVE7QUFDckIsYUFBTyxPQUFPLFFBQVEsdUJBQXVCLE1BQU07QUFBQSxJQUNyRDtBQUFBLEVBQ0Y7QUFDQSxNQUFJLGVBQWU7QUFDbkIsZUFBYSxZQUFZLENBQUMsUUFBUSxTQUFTLFFBQVEsT0FBTyxLQUFLO0FBQy9ELE1BQUksc0JBQXNCLGNBQWMsTUFBTTtBQUFBLElBQzVDLFlBQVksY0FBYyxRQUFRO0FBQ2hDLFlBQU0sMEJBQTBCLFlBQVksTUFBTSxNQUFNLEVBQUU7QUFBQSxJQUM1RDtBQUFBLEVBQ0Y7QUFDQSxXQUFTLGlCQUFpQixjQUFjLFVBQVU7QUFDaEQsUUFBSSxDQUFDLGFBQWEsVUFBVSxTQUFTLFFBQVEsS0FBSyxhQUFhO0FBQzdELFlBQU0sSUFBSTtBQUFBLFFBQ1I7QUFBQSxRQUNBLEdBQUcsUUFBUSwwQkFBMEIsYUFBYSxVQUFVLEtBQUssSUFBSSxDQUFDO0FBQUEsTUFDNUU7QUFBQSxFQUNBO0FBQ0EsV0FBUyxpQkFBaUIsY0FBYyxVQUFVO0FBQ2hELFFBQUksU0FBUyxTQUFTLEdBQUc7QUFDdkIsWUFBTSxJQUFJLG9CQUFvQixjQUFjLGdDQUFnQztBQUM5RSxRQUFJLFNBQVMsU0FBUyxHQUFHLEtBQUssU0FBUyxTQUFTLEtBQUssQ0FBQyxTQUFTLFdBQVcsSUFBSTtBQUM1RSxZQUFNLElBQUk7QUFBQSxRQUNSO0FBQUEsUUFDQTtBQUFBLE1BQ047QUFBQSxFQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwyLDMsNF19
