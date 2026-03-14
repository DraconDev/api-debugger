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
      /\.(tsx?|jsx?|css|html|map|woff2?|ttf|eot|svg|png|gif|jpg|jpeg|ico|webp)$/i,
      /\/node_modules\//i,
      /\/__vite_ping/i,
      /\/@vite\//i,
      /\/@fs\//i,
      /\/@id\//i,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9OyIsImV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZFwiKTtcblxuICBjb25zdCBNQVhfSElTVE9SWSA9IDIwMDtcbiAgY29uc3QgdGV4dERlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKTtcblxuICBpbnRlcmZhY2UgUmVxdWVzdFJlY29yZCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB1cmw6IHN0cmluZztcbiAgICBtZXRob2Q6IHN0cmluZztcbiAgICBzdGF0dXNDb2RlOiBudW1iZXI7XG4gICAgdHlwZT86IHN0cmluZztcbiAgICB0YWJJZDogbnVtYmVyO1xuICAgIHN0YXJ0VGltZTogbnVtYmVyO1xuICAgIHRpbWVTdGFtcDogbnVtYmVyO1xuICAgIGR1cmF0aW9uOiBudW1iZXI7XG4gICAgcmVxdWVzdEhlYWRlcnM6IGNocm9tZS53ZWJSZXF1ZXN0Lkh0dHBIZWFkZXJbXTtcbiAgICByZXF1ZXN0Qm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsO1xuICAgIHJlcXVlc3RCb2R5VGV4dDogc3RyaW5nIHwgbnVsbDtcbiAgICByZXNwb25zZUJvZHlUZXh0Pzogc3RyaW5nO1xuICAgIHJlc3BvbnNlSGVhZGVyczogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICAgIHJlcXVlc3RDb25maWc/OiBpbXBvcnQoXCJAL3R5cGVzXCIpLlJlcXVlc3RDb25maWc7XG4gIH1cblxuICBpbnRlcmZhY2UgUGFydGlhbFJlcXVlc3Qge1xuICAgIHN0YXJ0VGltZT86IG51bWJlcjtcbiAgICByZXF1ZXN0Qm9keT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIHJlcXVlc3RCb2R5VGV4dD86IHN0cmluZyB8IG51bGw7XG4gICAgcmVxdWVzdEhlYWRlcnM/OiBjaHJvbWUud2ViUmVxdWVzdC5IdHRwSGVhZGVyW107XG4gICAgcmVzcG9uc2VIZWFkZXJzPzogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICB9XG5cbiAgY29uc3QgcGFydGlhbCA9IG5ldyBNYXA8c3RyaW5nLCBQYXJ0aWFsUmVxdWVzdD4oKTtcblxuICBjb25zdCBERUZBVUxUX0VYQ0xVREVfUEFUVEVSTlMgPSBbXG4gICAgL15jaHJvbWUtZXh0ZW5zaW9uOlxcL1xcLy9pLFxuICAgIC9eY2hyb21lOlxcL1xcLy9pLFxuICAgIC9eYWJvdXQ6L2ksXG4gICAgL15kYXRhOi9pLFxuICAgIC9eYmxvYjovaSxcbiAgICAvXmZpbGU6XFwvXFwvL2ksXG4gICAgL1xcLih0c3g/fGpzeD98Y3NzfGh0bWx8bWFwfHdvZmYyP3x0dGZ8ZW90fHN2Z3xwbmd8Z2lmfGpwZ3xqcGVnfGljb3x3ZWJwKSQvaSxcbiAgICAvXFwvbm9kZV9tb2R1bGVzXFwvL2ksXG4gICAgL1xcL19fdml0ZV9waW5nL2ksXG4gICAgL1xcL0B2aXRlXFwvL2ksXG4gICAgL1xcL0Bmc1xcLy9pLFxuICAgIC9cXC9AaWRcXC8vaSxcbiAgICAvaG90LXVwZGF0ZS9pLFxuICBdO1xuXG4gIGZ1bmN0aW9uIHNob3VsZENhcHR1cmUodXJsOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgREVGQVVMVF9FWENMVURFX1BBVFRFUk5TKSB7XG4gICAgICBpZiAocGF0dGVybi50ZXN0KHVybCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbnNcbiAgZnVuY3Rpb24gc2VyaWFsaXplUmVxdWVzdEJvZHkoXG4gICAgZGV0YWlsczogY2hyb21lLndlYlJlcXVlc3QuV2ViUmVxdWVzdEJvZHlEZXRhaWxzLFxuICApOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBib2R5ID0gZGV0YWlscy5yZXF1ZXN0Qm9keTtcbiAgICBpZiAoIWJvZHkpIHJldHVybiBudWxsO1xuXG4gICAgaWYgKGJvZHkucmF3ICYmIGJvZHkucmF3Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGJvZHkucmF3XG4gICAgICAgIC5tYXAoKGNodW5rKSA9PiB7XG4gICAgICAgICAgaWYgKGNodW5rPy5ieXRlcykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRleHREZWNvZGVyLmRlY29kZShjaHVuay5ieXRlcyk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIlwiKTtcbiAgICB9XG5cbiAgICBpZiAoYm9keS5mb3JtRGF0YSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKGJvZHkuZm9ybURhdGEpXG4gICAgICAgIC5tYXAoKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IEFycmF5LmlzQXJyYXkodmFsdWUpID8gdmFsdWUgOiBbdmFsdWVdO1xuICAgICAgICAgIHJldHVybiBgJHtrZXl9PSR7dmFsdWVzLmpvaW4oXCIsXCIpfWA7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKFwiJlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGFkZFJlY29yZChyZWNvcmQ6IFJlcXVlc3RSZWNvcmQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wicmVxdWVzdHNcIl0pO1xuICAgIGNvbnN0IGxpc3QgPSAocmVzdWx0LnJlcXVlc3RzIGFzIFJlcXVlc3RSZWNvcmRbXSkgfHwgW107XG5cbiAgICBsaXN0LnVuc2hpZnQocmVjb3JkKTtcbiAgICBpZiAobGlzdC5sZW5ndGggPiBNQVhfSElTVE9SWSkgbGlzdC5sZW5ndGggPSBNQVhfSElTVE9SWTtcblxuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHJlcXVlc3RzOiBsaXN0IH0pO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gc2VuZFJlcXVlc3QoXG4gICAgY29uZmlnOiBpbXBvcnQoXCJAL3R5cGVzXCIpLlJlcXVlc3RDb25maWcsXG4gICk6IFByb21pc2U8aW1wb3J0KFwiQC90eXBlc1wiKS5DYXB0dXJlZFJlc3BvbnNlPiB7XG4gICAgY29uc3Qgc3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBjb25maWcuaGVhZGVycy5mb3JFYWNoKChoKSA9PiB7XG4gICAgICBpZiAoaC5lbmFibGVkICE9PSBmYWxzZSAmJiBoLm5hbWUpIHtcbiAgICAgICAgaGVhZGVyc1toLm5hbWVdID0gaC52YWx1ZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChjb25maWcuYXV0aC50eXBlID09PSBcImJlYXJlclwiICYmIGNvbmZpZy5hdXRoLmJlYXJlcj8udG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbXCJBdXRob3JpemF0aW9uXCJdID0gXCJCZWFyZXIgXCIgKyBjb25maWcuYXV0aC5iZWFyZXIudG9rZW47XG4gICAgfSBlbHNlIGlmIChjb25maWcuYXV0aC50eXBlID09PSBcImJhc2ljXCIgJiYgY29uZmlnLmF1dGguYmFzaWMpIHtcbiAgICAgIGNvbnN0IGVuY29kZWQgPSBidG9hKFxuICAgICAgICBjb25maWcuYXV0aC5iYXNpYy51c2VybmFtZSArIFwiOlwiICsgY29uZmlnLmF1dGguYmFzaWMucGFzc3dvcmQsXG4gICAgICApO1xuICAgICAgaGVhZGVyc1tcIkF1dGhvcml6YXRpb25cIl0gPSBcIkJhc2ljIFwiICsgZW5jb2RlZDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgY29uZmlnLmF1dGgudHlwZSA9PT0gXCJhcGkta2V5XCIgJiZcbiAgICAgIGNvbmZpZy5hdXRoLmFwaUtleT8uYWRkVG8gPT09IFwiaGVhZGVyXCJcbiAgICApIHtcbiAgICAgIGhlYWRlcnNbY29uZmlnLmF1dGguYXBpS2V5LmtleV0gPSBjb25maWcuYXV0aC5hcGlLZXkudmFsdWU7XG4gICAgfVxuXG4gICAgbGV0IGJvZHk6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoY29uZmlnLmJvZHlUeXBlID09PSBcImpzb25cIiAmJiBjb25maWcuYm9keS5qc29uKSB7XG4gICAgICBib2R5ID0gY29uZmlnLmJvZHkuanNvbjtcbiAgICAgIGlmICghaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSkge1xuICAgICAgICBoZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdID0gXCJhcHBsaWNhdGlvbi9qc29uXCI7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb25maWcuYm9keVR5cGUgPT09IFwicmF3XCIgJiYgY29uZmlnLmJvZHkucmF3KSB7XG4gICAgICBib2R5ID0gY29uZmlnLmJvZHkucmF3O1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBjb25maWcuYm9keVR5cGUgPT09IFwieC13d3ctZm9ybS11cmxlbmNvZGVkXCIgJiZcbiAgICAgIGNvbmZpZy5ib2R5LnVybEVuY29kZWRcbiAgICApIHtcbiAgICAgIGJvZHkgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKFxuICAgICAgICBjb25maWcuYm9keS51cmxFbmNvZGVkLm1hcCgoZikgPT4gW2YubmFtZSwgZi52YWx1ZV0pLFxuICAgICAgKS50b1N0cmluZygpO1xuICAgICAgaWYgKCFoZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdKSB7XG4gICAgICAgIGhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCB1cmwgPSBjb25maWcudXJsO1xuICAgIGlmIChcbiAgICAgIGNvbmZpZy5hdXRoLnR5cGUgPT09IFwiYXBpLWtleVwiICYmXG4gICAgICBjb25maWcuYXV0aC5hcGlLZXk/LmFkZFRvID09PSBcInF1ZXJ5XCJcbiAgICApIHtcbiAgICAgIGNvbnN0IHNlcCA9IHVybC5pbmNsdWRlcyhcIj9cIikgPyBcIiZcIiA6IFwiP1wiO1xuICAgICAgdXJsID1cbiAgICAgICAgdXJsICtcbiAgICAgICAgc2VwICtcbiAgICAgICAgY29uZmlnLmF1dGguYXBpS2V5LmtleSArXG4gICAgICAgIFwiPVwiICtcbiAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KGNvbmZpZy5hdXRoLmFwaUtleS52YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5wYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZW5hYmxlZFBhcmFtcyA9IGNvbmZpZy5wYXJhbXMuZmlsdGVyKChwKSA9PiBwLmVuYWJsZWQgIT09IGZhbHNlKTtcbiAgICAgIGlmIChlbmFibGVkUGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3Qgc2VwID0gdXJsLmluY2x1ZGVzKFwiP1wiKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICAgIGNvbnN0IHF1ZXJ5U3RyaW5nID0gZW5hYmxlZFBhcmFtc1xuICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAocCkgPT5cbiAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHAubmFtZSkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChwLnZhbHVlKSxcbiAgICAgICAgICApXG4gICAgICAgICAgLmpvaW4oXCImXCIpO1xuICAgICAgICB1cmwgPSB1cmwgKyBzZXAgKyBxdWVyeVN0cmluZztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgbWV0aG9kOiBjb25maWcubWV0aG9kLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6XG4gICAgICAgIGNvbmZpZy5tZXRob2QgIT09IFwiR0VUXCIgJiYgY29uZmlnLm1ldGhvZCAhPT0gXCJIRUFEXCIgPyBib2R5IDogdW5kZWZpbmVkLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgIGNvbnN0IGVuZCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIGNvbnN0IGR1cmF0aW9uID0gZW5kIC0gc3RhcnQ7XG5cbiAgICBjb25zdCBoZWFkZXJQYWlyczogW3N0cmluZywgc3RyaW5nXVtdID0gW107XG4gICAgcmVzcG9uc2UuaGVhZGVycy5mb3JFYWNoKCh2LCBrKSA9PiBoZWFkZXJQYWlycy5wdXNoKFtrLCB2XSkpO1xuXG4gICAgbGV0IHRpbWluZzogaW1wb3J0KFwiQC90eXBlc1wiKS5UaW1pbmdCcmVha2Rvd24gfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgZW50cmllcyA9IHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeU5hbWUoXG4gICAgICB1cmwsXG4gICAgICBcInJlc291cmNlXCIsXG4gICAgKSBhcyBQZXJmb3JtYW5jZVJlc291cmNlVGltaW5nW107XG4gICAgaWYgKGVudHJpZXMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZW50cnkgPSBlbnRyaWVzW2VudHJpZXMubGVuZ3RoIC0gMV07XG4gICAgICB0aW1pbmcgPSB7XG4gICAgICAgIGRuczogZW50cnkuZG9tYWluTG9va3VwRW5kIC0gZW50cnkuZG9tYWluTG9va3VwU3RhcnQsXG4gICAgICAgIGNvbm5lY3Q6IGVudHJ5LmNvbm5lY3RFbmQgLSBlbnRyeS5jb25uZWN0U3RhcnQsXG4gICAgICAgIHRsczpcbiAgICAgICAgICBlbnRyeS5zZWN1cmVDb25uZWN0aW9uU3RhcnQgPiAwXG4gICAgICAgICAgICA/IGVudHJ5LmNvbm5lY3RFbmQgLSBlbnRyeS5zZWN1cmVDb25uZWN0aW9uU3RhcnRcbiAgICAgICAgICAgIDogMCxcbiAgICAgICAgdHRmYjogZW50cnkucmVzcG9uc2VTdGFydCAtIGVudHJ5LnJlcXVlc3RTdGFydCxcbiAgICAgICAgZG93bmxvYWQ6IGVudHJ5LnJlc3BvbnNlRW5kIC0gZW50cnkucmVzcG9uc2VTdGFydCxcbiAgICAgICAgdG90YWw6IGVudHJ5LmR1cmF0aW9uLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCByZWNvcmQ6IFJlcXVlc3RSZWNvcmQgPSB7XG4gICAgICBpZDpcbiAgICAgICAgXCJtYW51YWxfXCIgKyBEYXRlLm5vdygpICsgXCJfXCIgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSksXG4gICAgICB1cmwsXG4gICAgICBtZXRob2Q6IGNvbmZpZy5tZXRob2QsXG4gICAgICBzdGF0dXNDb2RlOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICB0YWJJZDogLTEsXG4gICAgICBzdGFydFRpbWU6IHN0YXJ0LFxuICAgICAgdGltZVN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgZHVyYXRpb24sXG4gICAgICByZXF1ZXN0SGVhZGVyczogT2JqZWN0LmVudHJpZXMoaGVhZGVycykubWFwKChbbmFtZSwgdmFsdWVdKSA9PiAoe1xuICAgICAgICBuYW1lLFxuICAgICAgICB2YWx1ZSxcbiAgICAgIH0pKSxcbiAgICAgIHJlcXVlc3RCb2R5OiBudWxsLFxuICAgICAgcmVxdWVzdEJvZHlUZXh0OiBib2R5IHx8IG51bGwsXG4gICAgICByZXNwb25zZUJvZHlUZXh0OiByZXNwb25zZUJvZHksXG4gICAgICByZXNwb25zZUhlYWRlcnM6IGhlYWRlclBhaXJzLm1hcCgoW25hbWUsIHZhbHVlXSkgPT4gKHsgbmFtZSwgdmFsdWUgfSkpLFxuICAgICAgcmVxdWVzdENvbmZpZzogY29uZmlnLFxuICAgIH07XG5cbiAgICBhd2FpdCBhZGRSZWNvcmQocmVjb3JkKTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHJlc3BvbnNlLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBoZWFkZXJQYWlycyxcbiAgICAgIGJvZHk6IHJlc3BvbnNlQm9keSxcbiAgICAgIGR1cmF0aW9uLFxuICAgICAgc2l6ZTogcmVzcG9uc2VCb2R5Lmxlbmd0aCxcbiAgICAgIHRpbWluZyxcbiAgICB9O1xuICB9XG5cbiAgLy8gUmVxdWVzdCBsaWZlY3ljbGUgaG9va3NcbiAgY2hyb21lLndlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0LmFkZExpc3RlbmVyKFxuICAgIChkZXRhaWxzKSA9PiB7XG4gICAgICBpZiAoIXNob3VsZENhcHR1cmUoZGV0YWlscy51cmwpKSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBzZXJ2ZXIgb2YgbW9ja1NlcnZlcnMpIHtcbiAgICAgICAgaWYgKCFzZXJ2ZXIuZW5hYmxlZCkgY29udGludWU7XG5cbiAgICAgICAgbGV0IHBhcnNlZFVybDogVVJMIHwgdW5kZWZpbmVkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHBhcnNlZFVybCA9IG5ldyBVUkwoZGV0YWlscy51cmwpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZW5kcG9pbnQgb2Ygc2VydmVyLmVuZHBvaW50cykge1xuICAgICAgICAgIGlmICghZW5kcG9pbnQuZW5hYmxlZCkgY29udGludWU7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBkZXRhaWxzLm1ldGhvZCA9PT0gZW5kcG9pbnQubWV0aG9kICYmXG4gICAgICAgICAgICBwYXJzZWRVcmwucGF0aG5hbWUgPT09IGVuZHBvaW50LnBhdGhcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHJlZGlyZWN0VXJsOiBgZGF0YToke2VuZHBvaW50LmNvbnRlbnRUeXBlfTtiYXNlNjQsJHtidG9hKGVuZHBvaW50LmJvZHkpfWAsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwge1xuICAgICAgICBzdGFydFRpbWU6IGRldGFpbHMudGltZVN0YW1wLFxuICAgICAgICByZXF1ZXN0Qm9keTogZGV0YWlscy5yZXF1ZXN0Qm9keT8uZm9ybURhdGEgfHwgdW5kZWZpbmVkLFxuICAgICAgICByZXF1ZXN0Qm9keVRleHQ6IHNlcmlhbGl6ZVJlcXVlc3RCb2R5KFxuICAgICAgICAgIGRldGFpbHMgYXMgY2hyb21lLndlYlJlcXVlc3QuV2ViUmVxdWVzdEJvZHlEZXRhaWxzLFxuICAgICAgICApLFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9LFxuICAgIHsgdXJsczogW1wiPGFsbF91cmxzPlwiXSB9LFxuICAgIFtcInJlcXVlc3RCb2R5XCIsIFwiYmxvY2tpbmdcIl0sXG4gICk7XG5cbiAgY2hyb21lLndlYlJlcXVlc3Qub25CZWZvcmVTZW5kSGVhZGVycy5hZGRMaXN0ZW5lcihcbiAgICAoZGV0YWlscykgPT4ge1xuICAgICAgY29uc3QgcCA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgIHAucmVxdWVzdEhlYWRlcnMgPSBkZXRhaWxzLnJlcXVlc3RIZWFkZXJzO1xuICAgICAgcGFydGlhbC5zZXQoZGV0YWlscy5yZXF1ZXN0SWQsIHApO1xuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH0sXG4gICAgW1wicmVxdWVzdEhlYWRlcnNcIl0sXG4gICk7XG5cbiAgY2hyb21lLndlYlJlcXVlc3Qub25IZWFkZXJzUmVjZWl2ZWQuYWRkTGlzdGVuZXIoXG4gICAgKGRldGFpbHMpID0+IHtcbiAgICAgIGNvbnN0IHAgPSBwYXJ0aWFsLmdldChkZXRhaWxzLnJlcXVlc3RJZCkgfHwge307XG4gICAgICBwLnJlc3BvbnNlSGVhZGVycyA9IGRldGFpbHMucmVzcG9uc2VIZWFkZXJzO1xuICAgICAgcGFydGlhbC5zZXQoZGV0YWlscy5yZXF1ZXN0SWQsIHApO1xuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH0sXG4gICAgW1wicmVzcG9uc2VIZWFkZXJzXCJdLFxuICApO1xuXG4gIGNocm9tZS53ZWJSZXF1ZXN0Lm9uQ29tcGxldGVkLmFkZExpc3RlbmVyKFxuICAgIGFzeW5jIChkZXRhaWxzKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoIXNob3VsZENhcHR1cmUoZGV0YWlscy51cmwpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYmFzZSA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgICAgcGFydGlhbC5kZWxldGUoZGV0YWlscy5yZXF1ZXN0SWQpO1xuXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gYmFzZS5zdGFydFRpbWUgfHwgZGV0YWlscy50aW1lU3RhbXA7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID1cbiAgICAgICAgICB0eXBlb2YgYmFzZS5zdGFydFRpbWUgPT09IFwibnVtYmVyXCJcbiAgICAgICAgICAgID8gZGV0YWlscy50aW1lU3RhbXAgLSBiYXNlLnN0YXJ0VGltZVxuICAgICAgICAgICAgOiAwO1xuXG4gICAgICAgIGNvbnN0IHJlY29yZDogUmVxdWVzdFJlY29yZCA9IHtcbiAgICAgICAgICBpZDogZGV0YWlscy5yZXF1ZXN0SWQsXG4gICAgICAgICAgdXJsOiBkZXRhaWxzLnVybCxcbiAgICAgICAgICBtZXRob2Q6IGRldGFpbHMubWV0aG9kLFxuICAgICAgICAgIHN0YXR1c0NvZGU6IGRldGFpbHMuc3RhdHVzQ29kZSxcbiAgICAgICAgICB0eXBlOiBkZXRhaWxzLnR5cGUsXG4gICAgICAgICAgdGFiSWQ6IGRldGFpbHMudGFiSWQsXG4gICAgICAgICAgc3RhcnRUaW1lOiBzdGFydCxcbiAgICAgICAgICB0aW1lU3RhbXA6IGRldGFpbHMudGltZVN0YW1wLFxuICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgIHJlcXVlc3RIZWFkZXJzOiBiYXNlLnJlcXVlc3RIZWFkZXJzIHx8IFtdLFxuICAgICAgICAgIHJlcXVlc3RCb2R5OiBiYXNlLnJlcXVlc3RCb2R5IHx8IG51bGwsXG4gICAgICAgICAgcmVxdWVzdEJvZHlUZXh0OiBiYXNlLnJlcXVlc3RCb2R5VGV4dCB8fCBudWxsLFxuICAgICAgICAgIHJlc3BvbnNlSGVhZGVyczogYmFzZS5yZXNwb25zZUhlYWRlcnMgfHwgW10sXG4gICAgICAgIH07XG5cbiAgICAgICAgYXdhaXQgYWRkUmVjb3JkKHJlY29yZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgIFwiW0FQSSBEZWJ1Z2dlcl0gQ2FwdHVyZWQ6XCIsXG4gICAgICAgICAgcmVjb3JkLm1ldGhvZCxcbiAgICAgICAgICByZWNvcmQudXJsLFxuICAgICAgICAgIHJlY29yZC5zdGF0dXNDb2RlLFxuICAgICAgICApO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJIERlYnVnZ2VyXSBDYXB0dXJlIGVycm9yOlwiLCBlcnIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH0sXG4gICk7XG5cbiAgLy8gTWVzc2FnZSBoYW5kbGVyXG4gIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgX3NlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJHRVRfUkVRVUVTVFNcIikge1xuICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtcInJlcXVlc3RzXCJdKS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgcmVxdWVzdHM6IHJlcy5yZXF1ZXN0cyB8fCBbXSB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJDTEVBUl9SRVFVRVNUU1wiKSB7XG4gICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyByZXF1ZXN0czogW10gfSkudGhlbigoKSA9PiB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0VORF9SRVFVRVNUXCIpIHtcbiAgICAgIHNlbmRSZXF1ZXN0KG1lc3NhZ2UucGF5bG9hZC5jb25maWcpXG4gICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4gc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgcmVzcG9uc2UgfSkpXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pLFxuICAgICAgICApO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJSRVBMQVlfUkVRVUVTVFwiKSB7XG4gICAgICBjb25zdCBjb25maWc6IGltcG9ydChcIkAvdHlwZXNcIikuUmVxdWVzdENvbmZpZyA9IHtcbiAgICAgICAgbWV0aG9kOiBtZXNzYWdlLnBheWxvYWQubWV0aG9kLFxuICAgICAgICB1cmw6IG1lc3NhZ2UucGF5bG9hZC51cmwsXG4gICAgICAgIGhlYWRlcnM6IG1lc3NhZ2UucGF5bG9hZC5oZWFkZXJzIHx8IFtdLFxuICAgICAgICBwYXJhbXM6IFtdLFxuICAgICAgICBib2R5VHlwZTogXCJyYXdcIixcbiAgICAgICAgYm9keTogeyByYXc6IG1lc3NhZ2UucGF5bG9hZC5ib2R5IH0sXG4gICAgICAgIGF1dGg6IHsgdHlwZTogXCJub25lXCIgfSxcbiAgICAgIH07XG4gICAgICBzZW5kUmVxdWVzdChjb25maWcpXG4gICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4gc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgcmVzcG9uc2UgfSkpXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+XG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pLFxuICAgICAgICApO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJVUERBVEVfTU9DS19TRVJWRVJTXCIpIHtcbiAgICAgIG1vY2tTZXJ2ZXJzID0gbWVzc2FnZS5wYXlsb2FkLnNlcnZlcnMgfHwgW107XG4gICAgICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIFVwZGF0ZWQgbW9jayBzZXJ2ZXJzOlwiLCBtb2NrU2VydmVycy5sZW5ndGgpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59KTtcblxubGV0IG1vY2tTZXJ2ZXJzOiBpbXBvcnQoXCJAL3R5cGVzXCIpLk1vY2tTZXJ2ZXJbXSA9IFtdO1xuXG5jaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wiYXBpRGVidWdnZXJfbW9ja1NlcnZlcnNcIl0pLnRoZW4oKHJlc3VsdCkgPT4ge1xuICBpZiAocmVzdWx0LmFwaURlYnVnZ2VyX21vY2tTZXJ2ZXJzKSB7XG4gICAgbW9ja1NlcnZlcnMgPSByZXN1bHQuYXBpRGVidWdnZXJfbW9ja1NlcnZlcnM7XG4gIH1cbn0pO1xuIiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBicm93c2VyJDEgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuXG4vLyNyZWdpb24gc3JjL2Jyb3dzZXIudHNcbi8qKlxuKiBDb250YWlucyB0aGUgYGJyb3dzZXJgIGV4cG9ydCB3aGljaCB5b3Ugc2hvdWxkIHVzZSB0byBhY2Nlc3MgdGhlIGV4dGVuc2lvbiBBUElzIGluIHlvdXIgcHJvamVjdDpcbiogYGBgdHNcbiogaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gJ3d4dC9icm93c2VyJztcbipcbiogYnJvd3Nlci5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiogICAvLyAuLi5cbiogfSlcbiogYGBgXG4qIEBtb2R1bGUgd3h0L2Jyb3dzZXJcbiovXG5jb25zdCBicm93c2VyID0gYnJvd3NlciQxO1xuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGJyb3dzZXIgfTsiLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbInJlc3VsdCIsImJyb3dzZXIiXSwibWFwcGluZ3MiOiI7O0FBQ0EsV0FBUyxpQkFBaUIsS0FBSztBQUM5QixRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFHO0FBQ2hFLFdBQU87QUFBQSxFQUNSO0FDSkEsUUFBQSxhQUFBLGlCQUFBLE1BQUE7QUFDRSxZQUFBLElBQUEsa0RBQUE7QUFFQSxVQUFBLGNBQUE7QUFDQSxVQUFBLGNBQUEsSUFBQSxZQUFBLE9BQUE7QUE0QkEsVUFBQSxVQUFBLG9CQUFBLElBQUE7QUFFQSxVQUFBLDJCQUFBO0FBQUEsTUFBaUM7QUFBQSxNQUMvQjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDQTtBQUdGLGFBQUEsY0FBQSxLQUFBO0FBQ0UsaUJBQUEsV0FBQSwwQkFBQTtBQUNFLFlBQUEsUUFBQSxLQUFBLEdBQUEsR0FBQTtBQUNFLGlCQUFBO0FBQUEsUUFBTztBQUFBLE1BQ1Q7QUFFRixhQUFBO0FBQUEsSUFBTztBQUlULGFBQUEscUJBQUEsU0FBQTtBQUdFLFlBQUEsT0FBQSxRQUFBO0FBQ0EsVUFBQSxDQUFBLEtBQUEsUUFBQTtBQUVBLFVBQUEsS0FBQSxPQUFBLEtBQUEsSUFBQSxRQUFBO0FBQ0UsZUFBQSxLQUFBLElBQUEsSUFBQSxDQUFB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
