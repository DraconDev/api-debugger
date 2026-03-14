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
        const encoded = btoa(config.auth.basic.username + ":" + config.auth.basic.password);
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
          const queryString = enabledParams.map((p) => encodeURIComponent(p.name) + "=" + encodeURIComponent(p.value)).join("&");
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
      const entries = performance.getEntriesByName(url, "resource");
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
        requestHeaders: Object.entries(headers).map(([name, value]) => ({ name, value })),
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
        const url = new URL(details.url);
        for (const server of mockServers) {
          if (!server.enabled) continue;
          for (const endpoint of server.endpoints) {
            if (!endpoint.enabled) continue;
            if (details.method === endpoint.method && url.pathname === endpoint.path) {
              return {
                redirectUrl: `data:${endpoint.contentType};base64,${btoa(endpoint.body)}`
              };
            }
          }
        }
        partial.set(details.requestId, {
          startTime: details.timeStamp,
          requestBody: details.requestBody?.formData || void 0,
          requestBodyText: serializeRequestBody(details)
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
      if (message.type === "SEND_REQUEST") {
        sendRequest(message.payload.config).then((response) => sendResponse({ success: true, response })).catch((error) => sendResponse({ success: false, error: error.message }));
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
        sendRequest(config).then((response) => sendResponse({ success: true, response })).catch((error) => sendResponse({ success: false, error: error.message }));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9OyIsImV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZFwiKTtcblxuICBjb25zdCBNQVhfSElTVE9SWSA9IDIwMDtcbiAgY29uc3QgdGV4dERlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKTtcblxuICBpbnRlcmZhY2UgUmVxdWVzdFJlY29yZCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB1cmw6IHN0cmluZztcbiAgICBtZXRob2Q6IHN0cmluZztcbiAgICBzdGF0dXNDb2RlOiBudW1iZXI7XG4gICAgdHlwZT86IHN0cmluZztcbiAgICB0YWJJZDogbnVtYmVyO1xuICAgIHN0YXJ0VGltZTogbnVtYmVyO1xuICAgIHRpbWVTdGFtcDogbnVtYmVyO1xuICAgIGR1cmF0aW9uOiBudW1iZXI7XG4gICAgcmVxdWVzdEhlYWRlcnM6IGNocm9tZS53ZWJSZXF1ZXN0Lkh0dHBIZWFkZXJbXTtcbiAgICByZXF1ZXN0Qm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsO1xuICAgIHJlcXVlc3RCb2R5VGV4dDogc3RyaW5nIHwgbnVsbDtcbiAgICByZXNwb25zZUJvZHlUZXh0Pzogc3RyaW5nO1xuICAgIHJlc3BvbnNlSGVhZGVyczogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICAgIHJlcXVlc3RDb25maWc/OiBpbXBvcnQoXCJAL3R5cGVzXCIpLlJlcXVlc3RDb25maWc7XG4gIH1cblxuICBpbnRlcmZhY2UgUGFydGlhbFJlcXVlc3Qge1xuICAgIHN0YXJ0VGltZT86IG51bWJlcjtcbiAgICByZXF1ZXN0Qm9keT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIHJlcXVlc3RCb2R5VGV4dD86IHN0cmluZyB8IG51bGw7XG4gICAgcmVxdWVzdEhlYWRlcnM/OiBjaHJvbWUud2ViUmVxdWVzdC5IdHRwSGVhZGVyW107XG4gICAgcmVzcG9uc2VIZWFkZXJzPzogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICB9XG5cbiAgY29uc3QgcGFydGlhbCA9IG5ldyBNYXA8c3RyaW5nLCBQYXJ0aWFsUmVxdWVzdD4oKTtcblxuICBjb25zdCBERUZBVUxUX0VYQ0xVREVfUEFUVEVSTlMgPSBbXG4gICAgL15jaHJvbWUtZXh0ZW5zaW9uOlxcL1xcLy9pLFxuICAgIC9eY2hyb21lOlxcL1xcLy9pLFxuICAgIC9eYWJvdXQ6L2ksXG4gICAgL15kYXRhOi9pLFxuICAgIC9eYmxvYjovaSxcbiAgICAvXmZpbGU6XFwvXFwvL2ksXG4gICAgL1xcLih0c3g/fGpzeD98Y3NzfGh0bWx8bWFwfHdvZmYyP3x0dGZ8ZW90fHN2Z3xwbmd8Z2lmfGpwZ3xqcGVnfGljb3x3ZWJwKSQvaSxcbiAgICAvXFwvbm9kZV9tb2R1bGVzXFwvL2ksXG4gICAgL1xcL19fdml0ZV9waW5nL2ksXG4gICAgL1xcL0B2aXRlXFwvL2ksXG4gICAgL1xcL0Bmc1xcLy9pLFxuICAgIC9cXC9AaWRcXC8vaSxcbiAgICAvaG90LXVwZGF0ZS9pLFxuICBdO1xuXG4gIGZ1bmN0aW9uIHNob3VsZENhcHR1cmUodXJsOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgREVGQVVMVF9FWENMVURFX1BBVFRFUk5TKSB7XG4gICAgICBpZiAocGF0dGVybi50ZXN0KHVybCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbnNcbiAgZnVuY3Rpb24gc2VyaWFsaXplUmVxdWVzdEJvZHkoZGV0YWlsczogY2hyb21lLndlYlJlcXVlc3QuV2ViUmVxdWVzdEJvZHlEZXRhaWxzKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgY29uc3QgYm9keSA9IGRldGFpbHMucmVxdWVzdEJvZHk7XG4gICAgaWYgKCFib2R5KSByZXR1cm4gbnVsbDtcblxuICAgIGlmIChib2R5LnJhdyAmJiBib2R5LnJhdy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBib2R5LnJhd1xuICAgICAgICAubWFwKChjaHVuaykgPT4ge1xuICAgICAgICAgIGlmIChjaHVuaz8uYnl0ZXMpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHJldHVybiB0ZXh0RGVjb2Rlci5kZWNvZGUoY2h1bmsuYnl0ZXMpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oXCJcIik7XG4gICAgfVxuXG4gICAgaWYgKGJvZHkuZm9ybURhdGEpIHtcbiAgICAgIHJldHVybiBPYmplY3QuZW50cmllcyhib2R5LmZvcm1EYXRhKVxuICAgICAgICAubWFwKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBBcnJheS5pc0FycmF5KHZhbHVlKSA/IHZhbHVlIDogW3ZhbHVlXTtcbiAgICAgICAgICByZXR1cm4gYCR7a2V5fT0ke3ZhbHVlcy5qb2luKFwiLFwiKX1gO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIiZcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBhZGRSZWNvcmQocmVjb3JkOiBSZXF1ZXN0UmVjb3JkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtcInJlcXVlc3RzXCJdKTtcbiAgICBjb25zdCBsaXN0ID0gKHJlc3VsdC5yZXF1ZXN0cyBhcyBSZXF1ZXN0UmVjb3JkW10pIHx8IFtdO1xuXG4gICAgbGlzdC51bnNoaWZ0KHJlY29yZCk7XG4gICAgaWYgKGxpc3QubGVuZ3RoID4gTUFYX0hJU1RPUlkpIGxpc3QubGVuZ3RoID0gTUFYX0hJU1RPUlk7XG5cbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyByZXF1ZXN0czogbGlzdCB9KTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHNlbmRSZXF1ZXN0KGNvbmZpZzogaW1wb3J0KFwiQC90eXBlc1wiKS5SZXF1ZXN0Q29uZmlnKTogUHJvbWlzZTxpbXBvcnQoXCJAL3R5cGVzXCIpLkNhcHR1cmVkUmVzcG9uc2U+IHtcbiAgICBjb25zdCBzdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGNvbmZpZy5oZWFkZXJzLmZvckVhY2goKGgpID0+IHtcbiAgICAgIGlmIChoLmVuYWJsZWQgIT09IGZhbHNlICYmIGgubmFtZSkge1xuICAgICAgICBoZWFkZXJzW2gubmFtZV0gPSBoLnZhbHVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbmZpZy5hdXRoLnR5cGUgPT09IFwiYmVhcmVyXCIgJiYgY29uZmlnLmF1dGguYmVhcmVyPy50b2tlbikge1xuICAgICAgaGVhZGVyc1tcIkF1dGhvcml6YXRpb25cIl0gPSBcIkJlYXJlciBcIiArIGNvbmZpZy5hdXRoLmJlYXJlci50b2tlbjtcbiAgICB9IGVsc2UgaWYgKGNvbmZpZy5hdXRoLnR5cGUgPT09IFwiYmFzaWNcIiAmJiBjb25maWcuYXV0aC5iYXNpYykge1xuICAgICAgY29uc3QgZW5jb2RlZCA9IGJ0b2EoY29uZmlnLmF1dGguYmFzaWMudXNlcm5hbWUgKyBcIjpcIiArIGNvbmZpZy5hdXRoLmJhc2ljLnBhc3N3b3JkKTtcbiAgICAgIGhlYWRlcnNbXCJBdXRob3JpemF0aW9uXCJdID0gXCJCYXNpYyBcIiArIGVuY29kZWQ7XG4gICAgfSBlbHNlIGlmIChjb25maWcuYXV0aC50eXBlID09PSBcImFwaS1rZXlcIiAmJiBjb25maWcuYXV0aC5hcGlLZXk/LmFkZFRvID09PSBcImhlYWRlclwiKSB7XG4gICAgICBoZWFkZXJzW2NvbmZpZy5hdXRoLmFwaUtleS5rZXldID0gY29uZmlnLmF1dGguYXBpS2V5LnZhbHVlO1xuICAgIH1cblxuICAgIGxldCBib2R5OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGNvbmZpZy5ib2R5VHlwZSA9PT0gXCJqc29uXCIgJiYgY29uZmlnLmJvZHkuanNvbikge1xuICAgICAgYm9keSA9IGNvbmZpZy5ib2R5Lmpzb247XG4gICAgICBpZiAoIWhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0pIHtcbiAgICAgICAgaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24vanNvblwiO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29uZmlnLmJvZHlUeXBlID09PSBcInJhd1wiICYmIGNvbmZpZy5ib2R5LnJhdykge1xuICAgICAgYm9keSA9IGNvbmZpZy5ib2R5LnJhdztcbiAgICB9IGVsc2UgaWYgKGNvbmZpZy5ib2R5VHlwZSA9PT0gXCJ4LXd3dy1mb3JtLXVybGVuY29kZWRcIiAmJiBjb25maWcuYm9keS51cmxFbmNvZGVkKSB7XG4gICAgICBib2R5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhcbiAgICAgICAgY29uZmlnLmJvZHkudXJsRW5jb2RlZC5tYXAoKGYpID0+IFtmLm5hbWUsIGYudmFsdWVdKVxuICAgICAgKS50b1N0cmluZygpO1xuICAgICAgaWYgKCFoZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdKSB7XG4gICAgICAgIGhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCB1cmwgPSBjb25maWcudXJsO1xuICAgIGlmIChjb25maWcuYXV0aC50eXBlID09PSBcImFwaS1rZXlcIiAmJiBjb25maWcuYXV0aC5hcGlLZXk/LmFkZFRvID09PSBcInF1ZXJ5XCIpIHtcbiAgICAgIGNvbnN0IHNlcCA9IHVybC5pbmNsdWRlcyhcIj9cIikgPyBcIiZcIiA6IFwiP1wiO1xuICAgICAgdXJsID0gdXJsICsgc2VwICsgY29uZmlnLmF1dGguYXBpS2V5LmtleSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbmZpZy5hdXRoLmFwaUtleS52YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5wYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZW5hYmxlZFBhcmFtcyA9IGNvbmZpZy5wYXJhbXMuZmlsdGVyKChwKSA9PiBwLmVuYWJsZWQgIT09IGZhbHNlKTtcbiAgICAgIGlmIChlbmFibGVkUGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3Qgc2VwID0gdXJsLmluY2x1ZGVzKFwiP1wiKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICAgIGNvbnN0IHF1ZXJ5U3RyaW5nID0gZW5hYmxlZFBhcmFtc1xuICAgICAgICAgIC5tYXAoKHApID0+IGVuY29kZVVSSUNvbXBvbmVudChwLm5hbWUpICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQocC52YWx1ZSkpXG4gICAgICAgICAgLmpvaW4oXCImXCIpO1xuICAgICAgICB1cmwgPSB1cmwgKyBzZXAgKyBxdWVyeVN0cmluZztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgbWV0aG9kOiBjb25maWcubWV0aG9kLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IGNvbmZpZy5tZXRob2QgIT09IFwiR0VUXCIgJiYgY29uZmlnLm1ldGhvZCAhPT0gXCJIRUFEXCIgPyBib2R5IDogdW5kZWZpbmVkLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgIGNvbnN0IGVuZCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIGNvbnN0IGR1cmF0aW9uID0gZW5kIC0gc3RhcnQ7XG5cbiAgICBjb25zdCBoZWFkZXJQYWlyczogW3N0cmluZywgc3RyaW5nXVtdID0gW107XG4gICAgcmVzcG9uc2UuaGVhZGVycy5mb3JFYWNoKCh2LCBrKSA9PiBoZWFkZXJQYWlycy5wdXNoKFtrLCB2XSkpO1xuXG4gICAgbGV0IHRpbWluZzogaW1wb3J0KFwiQC90eXBlc1wiKS5UaW1pbmdCcmVha2Rvd24gfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgZW50cmllcyA9IHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeU5hbWUodXJsLCBcInJlc291cmNlXCIpIGFzIFBlcmZvcm1hbmNlUmVzb3VyY2VUaW1pbmdbXTtcbiAgICBpZiAoZW50cmllcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXNbZW50cmllcy5sZW5ndGggLSAxXTtcbiAgICAgIHRpbWluZyA9IHtcbiAgICAgICAgZG5zOiBlbnRyeS5kb21haW5Mb29rdXBFbmQgLSBlbnRyeS5kb21haW5Mb29rdXBTdGFydCxcbiAgICAgICAgY29ubmVjdDogZW50cnkuY29ubmVjdEVuZCAtIGVudHJ5LmNvbm5lY3RTdGFydCxcbiAgICAgICAgdGxzOiBlbnRyeS5zZWN1cmVDb25uZWN0aW9uU3RhcnQgPiAwID8gZW50cnkuY29ubmVjdEVuZCAtIGVudHJ5LnNlY3VyZUNvbm5lY3Rpb25TdGFydCA6IDAsXG4gICAgICAgIHR0ZmI6IGVudHJ5LnJlc3BvbnNlU3RhcnQgLSBlbnRyeS5yZXF1ZXN0U3RhcnQsXG4gICAgICAgIGRvd25sb2FkOiBlbnRyeS5yZXNwb25zZUVuZCAtIGVudHJ5LnJlc3BvbnNlU3RhcnQsXG4gICAgICAgIHRvdGFsOiBlbnRyeS5kdXJhdGlvbixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkOiBSZXF1ZXN0UmVjb3JkID0ge1xuICAgICAgaWQ6IFwibWFudWFsX1wiICsgRGF0ZS5ub3coKSArIFwiX1wiICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpLFxuICAgICAgdXJsLFxuICAgICAgbWV0aG9kOiBjb25maWcubWV0aG9kLFxuICAgICAgc3RhdHVzQ29kZTogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgdGFiSWQ6IC0xLFxuICAgICAgc3RhcnRUaW1lOiBzdGFydCxcbiAgICAgIHRpbWVTdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgIGR1cmF0aW9uLFxuICAgICAgcmVxdWVzdEhlYWRlcnM6IE9iamVjdC5lbnRyaWVzKGhlYWRlcnMpLm1hcCgoW25hbWUsIHZhbHVlXSkgPT4gKHsgbmFtZSwgdmFsdWUgfSkpLFxuICAgICAgcmVxdWVzdEJvZHk6IG51bGwsXG4gICAgICByZXF1ZXN0Qm9keVRleHQ6IGJvZHkgfHwgbnVsbCxcbiAgICAgIHJlc3BvbnNlQm9keVRleHQ6IHJlc3BvbnNlQm9keSxcbiAgICAgIHJlc3BvbnNlSGVhZGVyczogaGVhZGVyUGFpcnMubWFwKChbbmFtZSwgdmFsdWVdKSA9PiAoeyBuYW1lLCB2YWx1ZSB9KSksXG4gICAgICByZXF1ZXN0Q29uZmlnOiBjb25maWcsXG4gICAgfTtcblxuICAgIGF3YWl0IGFkZFJlY29yZChyZWNvcmQpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IGhlYWRlclBhaXJzLFxuICAgICAgYm9keTogcmVzcG9uc2VCb2R5LFxuICAgICAgZHVyYXRpb24sXG4gICAgICBzaXplOiByZXNwb25zZUJvZHkubGVuZ3RoLFxuICAgICAgdGltaW5nLFxuICAgIH07XG4gIH1cblxuICAvLyBSZXF1ZXN0IGxpZmVjeWNsZSBob29rc1xuICBjaHJvbWUud2ViUmVxdWVzdC5vbkJlZm9yZVJlcXVlc3QuYWRkTGlzdGVuZXIoXG4gIChkZXRhaWxzKSA9PiB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChkZXRhaWxzLnVybCk7XG4gICAgXG4gICAgZm9yIChjb25zdCBzZXJ2ZXIgb2YgbW9ja1NlcnZlcnMpIHtcbiAgICAgIGlmICghc2VydmVyLmVuYWJsZWQpIGNvbnRpbnVlO1xuICAgICAgXG4gICAgICBmb3IgKGNvbnN0IGVuZHBvaW50IG9mIHNlcnZlci5lbmRwb2ludHMpIHtcbiAgICAgICAgaWYgKCFlbmRwb2ludC5lbmFibGVkKSBjb250aW51ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkZXRhaWxzLm1ldGhvZCA9PT0gZW5kcG9pbnQubWV0aG9kICYmIHVybC5wYXRobmFtZSA9PT0gZW5kcG9pbnQucGF0aCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZWRpcmVjdFVybDogYGRhdGE6JHtlbmRwb2ludC5jb250ZW50VHlwZX07YmFzZTY0LCR7YnRvYShlbmRwb2ludC5ib2R5KX1gLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcGFydGlhbC5zZXQoZGV0YWlscy5yZXF1ZXN0SWQsIHtcbiAgICAgIHN0YXJ0VGltZTogZGV0YWlscy50aW1lU3RhbXAsXG4gICAgICByZXF1ZXN0Qm9keTogZGV0YWlscy5yZXF1ZXN0Qm9keT8uZm9ybURhdGEgfHwgdW5kZWZpbmVkLFxuICAgICAgcmVxdWVzdEJvZHlUZXh0OiBzZXJpYWxpemVSZXF1ZXN0Qm9keShkZXRhaWxzIGFzIGNocm9tZS53ZWJSZXF1ZXN0LldlYlJlcXVlc3RCb2R5RGV0YWlscyksXG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHt9O1xuICB9LFxuICAgIHsgdXJsczogW1wiPGFsbF91cmxzPlwiXSB9LFxuICAgIFtcInJlcXVlc3RCb2R5XCIsIFwiYmxvY2tpbmdcIl1cbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkJlZm9yZVNlbmRIZWFkZXJzLmFkZExpc3RlbmVyKFxuICAgIChkZXRhaWxzKSA9PiB7XG4gICAgICBjb25zdCBwID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgcC5yZXF1ZXN0SGVhZGVycyA9IGRldGFpbHMucmVxdWVzdEhlYWRlcnM7XG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwgcCk7XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXF1ZXN0SGVhZGVyc1wiXVxuICApO1xuXG4gIGNocm9tZS53ZWJSZXF1ZXN0Lm9uSGVhZGVyc1JlY2VpdmVkLmFkZExpc3RlbmVyKFxuICAgIChkZXRhaWxzKSA9PiB7XG4gICAgICBjb25zdCBwID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgcC5yZXNwb25zZUhlYWRlcnMgPSBkZXRhaWxzLnJlc3BvbnNlSGVhZGVycztcbiAgICAgIHBhcnRpYWwuc2V0KGRldGFpbHMucmVxdWVzdElkLCBwKTtcbiAgICB9LFxuICAgIHsgdXJsczogW1wiPGFsbF91cmxzPlwiXSB9LFxuICAgIFtcInJlc3BvbnNlSGVhZGVyc1wiXVxuICApO1xuXG4gIGNocm9tZS53ZWJSZXF1ZXN0Lm9uQ29tcGxldGVkLmFkZExpc3RlbmVyKFxuICAgIGFzeW5jIChkZXRhaWxzKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBiYXNlID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgICBwYXJ0aWFsLmRlbGV0ZShkZXRhaWxzLnJlcXVlc3RJZCk7XG5cbiAgICAgICAgY29uc3Qgc3RhcnQgPSBiYXNlLnN0YXJ0VGltZSB8fCBkZXRhaWxzLnRpbWVTdGFtcDtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSB0eXBlb2YgYmFzZS5zdGFydFRpbWUgPT09IFwibnVtYmVyXCJcbiAgICAgICAgICA/IGRldGFpbHMudGltZVN0YW1wIC0gYmFzZS5zdGFydFRpbWVcbiAgICAgICAgICA6IDA7XG5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBSZXF1ZXN0UmVjb3JkID0ge1xuICAgICAgICAgIGlkOiBkZXRhaWxzLnJlcXVlc3RJZCxcbiAgICAgICAgICB1cmw6IGRldGFpbHMudXJsLFxuICAgICAgICAgIG1ldGhvZDogZGV0YWlscy5tZXRob2QsXG4gICAgICAgICAgc3RhdHVzQ29kZTogZGV0YWlscy5zdGF0dXNDb2RlLFxuICAgICAgICAgIHR5cGU6IGRldGFpbHMudHlwZSxcbiAgICAgICAgICB0YWJJZDogZGV0YWlscy50YWJJZCxcbiAgICAgICAgICBzdGFydFRpbWU6IHN0YXJ0LFxuICAgICAgICAgIHRpbWVTdGFtcDogZGV0YWlscy50aW1lU3RhbXAsXG4gICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgcmVxdWVzdEhlYWRlcnM6IGJhc2UucmVxdWVzdEhlYWRlcnMgfHwgW10sXG4gICAgICAgICAgcmVxdWVzdEJvZHk6IGJhc2UucmVxdWVzdEJvZHkgfHwgbnVsbCxcbiAgICAgICAgICByZXF1ZXN0Qm9keVRleHQ6IGJhc2UucmVxdWVzdEJvZHlUZXh0IHx8IG51bGwsXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzOiBiYXNlLnJlc3BvbnNlSGVhZGVycyB8fCBbXSxcbiAgICAgICAgfTtcblxuICAgICAgICBhd2FpdCBhZGRSZWNvcmQocmVjb3JkKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJbQVBJIERlYnVnZ2VyXSBDYXB0dXJlZDpcIiwgcmVjb3JkLm1ldGhvZCwgcmVjb3JkLnVybCwgcmVjb3JkLnN0YXR1c0NvZGUpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJIERlYnVnZ2VyXSBDYXB0dXJlIGVycm9yOlwiLCBlcnIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH1cbiAgKTtcblxuICAvLyBNZXNzYWdlIGhhbmRsZXJcbiAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBfc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIkdFVF9SRVFVRVNUU1wiKSB7XG4gICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wicmVxdWVzdHNcIl0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyByZXF1ZXN0czogcmVzLnJlcXVlc3RzIHx8IFtdIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIkNMRUFSX1JFUVVFU1RTXCIpIHtcbiAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHJlcXVlc3RzOiBbXSB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJTRU5EX1JFUVVFU1RcIikge1xuICAgICAgc2VuZFJlcXVlc3QobWVzc2FnZS5wYXlsb2FkLmNvbmZpZylcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCByZXNwb25zZSB9KSlcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT4gc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiUkVQTEFZX1JFUVVFU1RcIikge1xuICAgICAgY29uc3QgY29uZmlnOiBpbXBvcnQoXCJAL3R5cGVzXCIpLlJlcXVlc3RDb25maWcgPSB7XG4gICAgICAgIG1ldGhvZDogbWVzc2FnZS5wYXlsb2FkLm1ldGhvZCxcbiAgICAgICAgdXJsOiBtZXNzYWdlLnBheWxvYWQudXJsLFxuICAgICAgICBoZWFkZXJzOiBtZXNzYWdlLnBheWxvYWQuaGVhZGVycyB8fCBbXSxcbiAgICAgICAgcGFyYW1zOiBbXSxcbiAgICAgICAgYm9keVR5cGU6IFwicmF3XCIsXG4gICAgICAgIGJvZHk6IHsgcmF3OiBtZXNzYWdlLnBheWxvYWQuYm9keSB9LFxuICAgICAgICBhdXRoOiB7IHR5cGU6IFwibm9uZVwiIH0sXG4gICAgICB9O1xuICAgICAgc2VuZFJlcXVlc3QoY29uZmlnKVxuICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHJlc3BvbnNlIH0pKVxuICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJVUERBVEVfTU9DS19TRVJWRVJTXCIpIHtcbiAgICAgIG1vY2tTZXJ2ZXJzID0gbWVzc2FnZS5wYXlsb2FkLnNlcnZlcnMgfHwgW107XG4gICAgICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIFVwZGF0ZWQgbW9jayBzZXJ2ZXJzOlwiLCBtb2NrU2VydmVycy5sZW5ndGgpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59KTtcblxubGV0IG1vY2tTZXJ2ZXJzOiBpbXBvcnQoXCJAL3R5cGVzXCIpLk1vY2tTZXJ2ZXJbXSA9IFtdO1xuXG5jaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wiYXBpRGVidWdnZXJfbW9ja1NlcnZlcnNcIl0pLnRoZW4oKHJlc3VsdCkgPT4ge1xuICBpZiAocmVzdWx0LmFwaURlYnVnZ2VyX21vY2tTZXJ2ZXJzKSB7XG4gICAgbW9ja1NlcnZlcnMgPSByZXN1bHQuYXBpRGVidWdnZXJfbW9ja1NlcnZlcnM7XG4gIH1cbn0pO1xuIiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBicm93c2VyJDEgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuXG4vLyNyZWdpb24gc3JjL2Jyb3dzZXIudHNcbi8qKlxuKiBDb250YWlucyB0aGUgYGJyb3dzZXJgIGV4cG9ydCB3aGljaCB5b3Ugc2hvdWxkIHVzZSB0byBhY2Nlc3MgdGhlIGV4dGVuc2lvbiBBUElzIGluIHlvdXIgcHJvamVjdDpcbiogYGBgdHNcbiogaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gJ3d4dC9icm93c2VyJztcbipcbiogYnJvd3Nlci5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiogICAvLyAuLi5cbiogfSlcbiogYGBgXG4qIEBtb2R1bGUgd3h0L2Jyb3dzZXJcbiovXG5jb25zdCBicm93c2VyID0gYnJvd3NlciQxO1xuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGJyb3dzZXIgfTsiLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbInJlc3VsdCIsImJyb3dzZXIiXSwibWFwcGluZ3MiOiI7O0FBQ0EsV0FBUyxpQkFBaUIsS0FBSztBQUM5QixRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFHO0FBQ2hFLFdBQU87QUFBQSxFQUNSO0FDSkEsUUFBQSxhQUFBLGlCQUFBLE1BQUE7QUFDRSxZQUFBLElBQUEsa0RBQUE7QUFFQSxVQUFBLGNBQUE7QUFDQSxVQUFBLGNBQUEsSUFBQSxZQUFBLE9BQUE7QUE0QkEsVUFBQSxVQUFBLG9CQUFBLElBQUE7QUE0QkEsYUFBQSxxQkFBQSxTQUFBO0FBQ0UsWUFBQSxPQUFBLFFBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxRQUFBO0FBRUEsVUFBQSxLQUFBLE9BQUEsS0FBQSxJQUFBLFFBQUE7QUFDRSxlQUFBLEtBQUEsSUFBQSxJQUFBLENBQUEsVUFBQTtBQUVJLGNBQUEsT0FBQSxPQUFBO0FBQ0UsZ0JBQUE7QUFDRSxxQkFBQSxZQUFBLE9BQUEsTUFBQSxLQUFBO0FBQUEsWUFBcUMsUUFBQTtBQUVyQyxxQkFBQTtBQUFBLFlBQU87QUFBQSxVQUNUO0FBRUYsaUJBQUE7QUFBQSxRQUFP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
