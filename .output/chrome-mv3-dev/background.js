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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9OyIsImV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZFwiKTtcblxuICBjb25zdCBNQVhfSElTVE9SWSA9IDIwMDtcbiAgY29uc3QgdGV4dERlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKTtcblxuICBpbnRlcmZhY2UgUmVxdWVzdFJlY29yZCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB1cmw6IHN0cmluZztcbiAgICBtZXRob2Q6IHN0cmluZztcbiAgICBzdGF0dXNDb2RlOiBudW1iZXI7XG4gICAgdHlwZT86IHN0cmluZztcbiAgICB0YWJJZDogbnVtYmVyO1xuICAgIHN0YXJ0VGltZTogbnVtYmVyO1xuICAgIHRpbWVTdGFtcDogbnVtYmVyO1xuICAgIGR1cmF0aW9uOiBudW1iZXI7XG4gICAgcmVxdWVzdEhlYWRlcnM6IGNocm9tZS53ZWJSZXF1ZXN0Lkh0dHBIZWFkZXJbXTtcbiAgICByZXF1ZXN0Qm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsO1xuICAgIHJlcXVlc3RCb2R5VGV4dDogc3RyaW5nIHwgbnVsbDtcbiAgICByZXNwb25zZUJvZHlUZXh0Pzogc3RyaW5nO1xuICAgIHJlc3BvbnNlSGVhZGVyczogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICAgIHJlcXVlc3RDb25maWc/OiBpbXBvcnQoXCJAL3R5cGVzXCIpLlJlcXVlc3RDb25maWc7XG4gIH1cblxuICBpbnRlcmZhY2UgUGFydGlhbFJlcXVlc3Qge1xuICAgIHN0YXJ0VGltZT86IG51bWJlcjtcbiAgICByZXF1ZXN0Qm9keT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIHJlcXVlc3RCb2R5VGV4dD86IHN0cmluZyB8IG51bGw7XG4gICAgcmVxdWVzdEhlYWRlcnM/OiBjaHJvbWUud2ViUmVxdWVzdC5IdHRwSGVhZGVyW107XG4gICAgcmVzcG9uc2VIZWFkZXJzPzogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICB9XG5cbiAgY29uc3QgcGFydGlhbCA9IG5ldyBNYXA8c3RyaW5nLCBQYXJ0aWFsUmVxdWVzdD4oKTtcblxuICAvLyBIZWxwZXIgZnVuY3Rpb25zXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZVJlcXVlc3RCb2R5KGRldGFpbHM6IGNocm9tZS53ZWJSZXF1ZXN0LldlYlJlcXVlc3RCb2R5RGV0YWlscyk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGJvZHkgPSBkZXRhaWxzLnJlcXVlc3RCb2R5O1xuICAgIGlmICghYm9keSkgcmV0dXJuIG51bGw7XG5cbiAgICBpZiAoYm9keS5yYXcgJiYgYm9keS5yYXcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gYm9keS5yYXdcbiAgICAgICAgLm1hcCgoY2h1bmspID0+IHtcbiAgICAgICAgICBpZiAoY2h1bms/LmJ5dGVzKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICByZXR1cm4gdGV4dERlY29kZXIuZGVjb2RlKGNodW5rLmJ5dGVzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKFwiXCIpO1xuICAgIH1cblxuICAgIGlmIChib2R5LmZvcm1EYXRhKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoYm9keS5mb3JtRGF0YSlcbiAgICAgICAgLm1hcCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmFsdWVzID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZSA6IFt2YWx1ZV07XG4gICAgICAgICAgcmV0dXJuIGAke2tleX09JHt2YWx1ZXMuam9pbihcIixcIil9YDtcbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oXCImXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gYWRkUmVjb3JkKHJlY29yZDogUmVxdWVzdFJlY29yZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbXCJyZXF1ZXN0c1wiXSk7XG4gICAgY29uc3QgbGlzdCA9IChyZXN1bHQucmVxdWVzdHMgYXMgUmVxdWVzdFJlY29yZFtdKSB8fCBbXTtcblxuICAgIGxpc3QudW5zaGlmdChyZWNvcmQpO1xuICAgIGlmIChsaXN0Lmxlbmd0aCA+IE1BWF9ISVNUT1JZKSBsaXN0Lmxlbmd0aCA9IE1BWF9ISVNUT1JZO1xuXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgcmVxdWVzdHM6IGxpc3QgfSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBzZW5kUmVxdWVzdChjb25maWc6IGltcG9ydChcIkAvdHlwZXNcIikuUmVxdWVzdENvbmZpZyk6IFByb21pc2U8aW1wb3J0KFwiQC90eXBlc1wiKS5DYXB0dXJlZFJlc3BvbnNlPiB7XG4gICAgY29uc3Qgc3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBjb25maWcuaGVhZGVycy5mb3JFYWNoKChoKSA9PiB7XG4gICAgICBpZiAoaC5lbmFibGVkICE9PSBmYWxzZSAmJiBoLm5hbWUpIHtcbiAgICAgICAgaGVhZGVyc1toLm5hbWVdID0gaC52YWx1ZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChjb25maWcuYXV0aC50eXBlID09PSBcImJlYXJlclwiICYmIGNvbmZpZy5hdXRoLmJlYXJlcj8udG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbXCJBdXRob3JpemF0aW9uXCJdID0gXCJCZWFyZXIgXCIgKyBjb25maWcuYXV0aC5iZWFyZXIudG9rZW47XG4gICAgfSBlbHNlIGlmIChjb25maWcuYXV0aC50eXBlID09PSBcImJhc2ljXCIgJiYgY29uZmlnLmF1dGguYmFzaWMpIHtcbiAgICAgIGNvbnN0IGVuY29kZWQgPSBidG9hKGNvbmZpZy5hdXRoLmJhc2ljLnVzZXJuYW1lICsgXCI6XCIgKyBjb25maWcuYXV0aC5iYXNpYy5wYXNzd29yZCk7XG4gICAgICBoZWFkZXJzW1wiQXV0aG9yaXphdGlvblwiXSA9IFwiQmFzaWMgXCIgKyBlbmNvZGVkO1xuICAgIH0gZWxzZSBpZiAoY29uZmlnLmF1dGgudHlwZSA9PT0gXCJhcGkta2V5XCIgJiYgY29uZmlnLmF1dGguYXBpS2V5Py5hZGRUbyA9PT0gXCJoZWFkZXJcIikge1xuICAgICAgaGVhZGVyc1tjb25maWcuYXV0aC5hcGlLZXkua2V5XSA9IGNvbmZpZy5hdXRoLmFwaUtleS52YWx1ZTtcbiAgICB9XG5cbiAgICBsZXQgYm9keTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGlmIChjb25maWcuYm9keVR5cGUgPT09IFwianNvblwiICYmIGNvbmZpZy5ib2R5Lmpzb24pIHtcbiAgICAgIGJvZHkgPSBjb25maWcuYm9keS5qc29uO1xuICAgICAgaWYgKCFoZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdKSB7XG4gICAgICAgIGhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbmZpZy5ib2R5VHlwZSA9PT0gXCJyYXdcIiAmJiBjb25maWcuYm9keS5yYXcpIHtcbiAgICAgIGJvZHkgPSBjb25maWcuYm9keS5yYXc7XG4gICAgfSBlbHNlIGlmIChjb25maWcuYm9keVR5cGUgPT09IFwieC13d3ctZm9ybS11cmxlbmNvZGVkXCIgJiYgY29uZmlnLmJvZHkudXJsRW5jb2RlZCkge1xuICAgICAgYm9keSA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoXG4gICAgICAgIGNvbmZpZy5ib2R5LnVybEVuY29kZWQubWFwKChmKSA9PiBbZi5uYW1lLCBmLnZhbHVlXSlcbiAgICAgICkudG9TdHJpbmcoKTtcbiAgICAgIGlmICghaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSkge1xuICAgICAgICBoZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdID0gXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgdXJsID0gY29uZmlnLnVybDtcbiAgICBpZiAoY29uZmlnLmF1dGgudHlwZSA9PT0gXCJhcGkta2V5XCIgJiYgY29uZmlnLmF1dGguYXBpS2V5Py5hZGRUbyA9PT0gXCJxdWVyeVwiKSB7XG4gICAgICBjb25zdCBzZXAgPSB1cmwuaW5jbHVkZXMoXCI/XCIpID8gXCImXCIgOiBcIj9cIjtcbiAgICAgIHVybCA9IHVybCArIHNlcCArIGNvbmZpZy5hdXRoLmFwaUtleS5rZXkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb25maWcuYXV0aC5hcGlLZXkudmFsdWUpO1xuICAgIH1cblxuICAgIGlmIChjb25maWcucGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGVuYWJsZWRQYXJhbXMgPSBjb25maWcucGFyYW1zLmZpbHRlcigocCkgPT4gcC5lbmFibGVkICE9PSBmYWxzZSk7XG4gICAgICBpZiAoZW5hYmxlZFBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHNlcCA9IHVybC5pbmNsdWRlcyhcIj9cIikgPyBcIiZcIiA6IFwiP1wiO1xuICAgICAgICBjb25zdCBxdWVyeVN0cmluZyA9IGVuYWJsZWRQYXJhbXNcbiAgICAgICAgICAubWFwKChwKSA9PiBlbmNvZGVVUklDb21wb25lbnQocC5uYW1lKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHAudmFsdWUpKVxuICAgICAgICAgIC5qb2luKFwiJlwiKTtcbiAgICAgICAgdXJsID0gdXJsICsgc2VwICsgcXVlcnlTdHJpbmc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIG1ldGhvZDogY29uZmlnLm1ldGhvZCxcbiAgICAgIGhlYWRlcnMsXG4gICAgICBib2R5OiBjb25maWcubWV0aG9kICE9PSBcIkdFVFwiICYmIGNvbmZpZy5tZXRob2QgIT09IFwiSEVBRFwiID8gYm9keSA6IHVuZGVmaW5lZCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICBjb25zdCBlbmQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICBjb25zdCBkdXJhdGlvbiA9IGVuZCAtIHN0YXJ0O1xuXG4gICAgY29uc3QgaGVhZGVyUGFpcnM6IFtzdHJpbmcsIHN0cmluZ11bXSA9IFtdO1xuICAgIHJlc3BvbnNlLmhlYWRlcnMuZm9yRWFjaCgodiwgaykgPT4gaGVhZGVyUGFpcnMucHVzaChbaywgdl0pKTtcblxuICAgIGxldCB0aW1pbmc6IGltcG9ydChcIkAvdHlwZXNcIikuVGltaW5nQnJlYWtkb3duIHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IGVudHJpZXMgPSBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlOYW1lKHVybCwgXCJyZXNvdXJjZVwiKSBhcyBQZXJmb3JtYW5jZVJlc291cmNlVGltaW5nW107XG4gICAgaWYgKGVudHJpZXMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZW50cnkgPSBlbnRyaWVzW2VudHJpZXMubGVuZ3RoIC0gMV07XG4gICAgICB0aW1pbmcgPSB7XG4gICAgICAgIGRuczogZW50cnkuZG9tYWluTG9va3VwRW5kIC0gZW50cnkuZG9tYWluTG9va3VwU3RhcnQsXG4gICAgICAgIGNvbm5lY3Q6IGVudHJ5LmNvbm5lY3RFbmQgLSBlbnRyeS5jb25uZWN0U3RhcnQsXG4gICAgICAgIHRsczogZW50cnkuc2VjdXJlQ29ubmVjdGlvblN0YXJ0ID4gMCA/IGVudHJ5LmNvbm5lY3RFbmQgLSBlbnRyeS5zZWN1cmVDb25uZWN0aW9uU3RhcnQgOiAwLFxuICAgICAgICB0dGZiOiBlbnRyeS5yZXNwb25zZVN0YXJ0IC0gZW50cnkucmVxdWVzdFN0YXJ0LFxuICAgICAgICBkb3dubG9hZDogZW50cnkucmVzcG9uc2VFbmQgLSBlbnRyeS5yZXNwb25zZVN0YXJ0LFxuICAgICAgICB0b3RhbDogZW50cnkuZHVyYXRpb24sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZDogUmVxdWVzdFJlY29yZCA9IHtcbiAgICAgIGlkOiBcIm1hbnVhbF9cIiArIERhdGUubm93KCkgKyBcIl9cIiArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KSxcbiAgICAgIHVybCxcbiAgICAgIG1ldGhvZDogY29uZmlnLm1ldGhvZCxcbiAgICAgIHN0YXR1c0NvZGU6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHRhYklkOiAtMSxcbiAgICAgIHN0YXJ0VGltZTogc3RhcnQsXG4gICAgICB0aW1lU3RhbXA6IERhdGUubm93KCksXG4gICAgICBkdXJhdGlvbixcbiAgICAgIHJlcXVlc3RIZWFkZXJzOiBPYmplY3QuZW50cmllcyhoZWFkZXJzKS5tYXAoKFtuYW1lLCB2YWx1ZV0pID0+ICh7IG5hbWUsIHZhbHVlIH0pKSxcbiAgICAgIHJlcXVlc3RCb2R5OiBudWxsLFxuICAgICAgcmVxdWVzdEJvZHlUZXh0OiBib2R5IHx8IG51bGwsXG4gICAgICByZXNwb25zZUJvZHlUZXh0OiByZXNwb25zZUJvZHksXG4gICAgICByZXNwb25zZUhlYWRlcnM6IGhlYWRlclBhaXJzLm1hcCgoW25hbWUsIHZhbHVlXSkgPT4gKHsgbmFtZSwgdmFsdWUgfSkpLFxuICAgICAgcmVxdWVzdENvbmZpZzogY29uZmlnLFxuICAgIH07XG5cbiAgICBhd2FpdCBhZGRSZWNvcmQocmVjb3JkKTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHJlc3BvbnNlLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBoZWFkZXJQYWlycyxcbiAgICAgIGJvZHk6IHJlc3BvbnNlQm9keSxcbiAgICAgIGR1cmF0aW9uLFxuICAgICAgc2l6ZTogcmVzcG9uc2VCb2R5Lmxlbmd0aCxcbiAgICAgIHRpbWluZyxcbiAgICB9O1xuICB9XG5cbiAgLy8gUmVxdWVzdCBsaWZlY3ljbGUgaG9va3NcbiAgY2hyb21lLndlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0LmFkZExpc3RlbmVyKFxuICAoZGV0YWlscykgPT4ge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoZGV0YWlscy51cmwpO1xuICAgIFxuICAgIGZvciAoY29uc3Qgc2VydmVyIG9mIG1vY2tTZXJ2ZXJzKSB7XG4gICAgICBpZiAoIXNlcnZlci5lbmFibGVkKSBjb250aW51ZTtcbiAgICAgIFxuICAgICAgZm9yIChjb25zdCBlbmRwb2ludCBvZiBzZXJ2ZXIuZW5kcG9pbnRzKSB7XG4gICAgICAgIGlmICghZW5kcG9pbnQuZW5hYmxlZCkgY29udGludWU7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGV0YWlscy5tZXRob2QgPT09IGVuZHBvaW50Lm1ldGhvZCAmJiB1cmwucGF0aG5hbWUgPT09IGVuZHBvaW50LnBhdGgpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVkaXJlY3RVcmw6IGBkYXRhOiR7ZW5kcG9pbnQuY29udGVudFR5cGV9O2Jhc2U2NCwke2J0b2EoZW5kcG9pbnQuYm9keSl9YCxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHBhcnRpYWwuc2V0KGRldGFpbHMucmVxdWVzdElkLCB7XG4gICAgICBzdGFydFRpbWU6IGRldGFpbHMudGltZVN0YW1wLFxuICAgICAgcmVxdWVzdEJvZHk6IGRldGFpbHMucmVxdWVzdEJvZHk/LmZvcm1EYXRhIHx8IHVuZGVmaW5lZCxcbiAgICAgIHJlcXVlc3RCb2R5VGV4dDogc2VyaWFsaXplUmVxdWVzdEJvZHkoZGV0YWlscyBhcyBjaHJvbWUud2ViUmVxdWVzdC5XZWJSZXF1ZXN0Qm9keURldGFpbHMpLFxuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiB7fTtcbiAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXF1ZXN0Qm9keVwiLCBcImJsb2NraW5nXCJdXG4gICk7XG5cbiAgY2hyb21lLndlYlJlcXVlc3Qub25CZWZvcmVTZW5kSGVhZGVycy5hZGRMaXN0ZW5lcihcbiAgICAoZGV0YWlscykgPT4ge1xuICAgICAgY29uc3QgcCA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgIHAucmVxdWVzdEhlYWRlcnMgPSBkZXRhaWxzLnJlcXVlc3RIZWFkZXJzO1xuICAgICAgcGFydGlhbC5zZXQoZGV0YWlscy5yZXF1ZXN0SWQsIHApO1xuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH0sXG4gICAgW1wicmVxdWVzdEhlYWRlcnNcIl1cbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkhlYWRlcnNSZWNlaXZlZC5hZGRMaXN0ZW5lcihcbiAgICAoZGV0YWlscykgPT4ge1xuICAgICAgY29uc3QgcCA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgIHAucmVzcG9uc2VIZWFkZXJzID0gZGV0YWlscy5yZXNwb25zZUhlYWRlcnM7XG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwgcCk7XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXNwb25zZUhlYWRlcnNcIl1cbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkNvbXBsZXRlZC5hZGRMaXN0ZW5lcihcbiAgICBhc3luYyAoZGV0YWlscykgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYmFzZSA9IHBhcnRpYWwuZ2V0KGRldGFpbHMucmVxdWVzdElkKSB8fCB7fTtcbiAgICAgICAgcGFydGlhbC5kZWxldGUoZGV0YWlscy5yZXF1ZXN0SWQpO1xuXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gYmFzZS5zdGFydFRpbWUgfHwgZGV0YWlscy50aW1lU3RhbXA7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gdHlwZW9mIGJhc2Uuc3RhcnRUaW1lID09PSBcIm51bWJlclwiXG4gICAgICAgICAgPyBkZXRhaWxzLnRpbWVTdGFtcCAtIGJhc2Uuc3RhcnRUaW1lXG4gICAgICAgICAgOiAwO1xuXG4gICAgICAgIGNvbnN0IHJlY29yZDogUmVxdWVzdFJlY29yZCA9IHtcbiAgICAgICAgICBpZDogZGV0YWlscy5yZXF1ZXN0SWQsXG4gICAgICAgICAgdXJsOiBkZXRhaWxzLnVybCxcbiAgICAgICAgICBtZXRob2Q6IGRldGFpbHMubWV0aG9kLFxuICAgICAgICAgIHN0YXR1c0NvZGU6IGRldGFpbHMuc3RhdHVzQ29kZSxcbiAgICAgICAgICB0eXBlOiBkZXRhaWxzLnR5cGUsXG4gICAgICAgICAgdGFiSWQ6IGRldGFpbHMudGFiSWQsXG4gICAgICAgICAgc3RhcnRUaW1lOiBzdGFydCxcbiAgICAgICAgICB0aW1lU3RhbXA6IGRldGFpbHMudGltZVN0YW1wLFxuICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgIHJlcXVlc3RIZWFkZXJzOiBiYXNlLnJlcXVlc3RIZWFkZXJzIHx8IFtdLFxuICAgICAgICAgIHJlcXVlc3RCb2R5OiBiYXNlLnJlcXVlc3RCb2R5IHx8IG51bGwsXG4gICAgICAgICAgcmVxdWVzdEJvZHlUZXh0OiBiYXNlLnJlcXVlc3RCb2R5VGV4dCB8fCBudWxsLFxuICAgICAgICAgIHJlc3BvbnNlSGVhZGVyczogYmFzZS5yZXNwb25zZUhlYWRlcnMgfHwgW10sXG4gICAgICAgIH07XG5cbiAgICAgICAgYXdhaXQgYWRkUmVjb3JkKHJlY29yZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW0FQSSBEZWJ1Z2dlcl0gQ2FwdHVyZWQ6XCIsIHJlY29yZC5tZXRob2QsIHJlY29yZC51cmwsIHJlY29yZC5zdGF0dXNDb2RlKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSSBEZWJ1Z2dlcl0gQ2FwdHVyZSBlcnJvcjpcIiwgZXJyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHsgdXJsczogW1wiPGFsbF91cmxzPlwiXSB9XG4gICk7XG5cbiAgLy8gTWVzc2FnZSBoYW5kbGVyXG4gIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgX3NlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJHRVRfUkVRVUVTVFNcIikge1xuICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtcInJlcXVlc3RzXCJdKS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgcmVxdWVzdHM6IHJlcy5yZXF1ZXN0cyB8fCBbXSB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJDTEVBUl9SRVFVRVNUU1wiKSB7XG4gICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyByZXF1ZXN0czogW10gfSkudGhlbigoKSA9PiB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0VORF9SRVFVRVNUXCIpIHtcbiAgICAgIHNlbmRSZXF1ZXN0KG1lc3NhZ2UucGF5bG9hZC5jb25maWcpXG4gICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4gc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgcmVzcG9uc2UgfSkpXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIlJFUExBWV9SRVFVRVNUXCIpIHtcbiAgICAgIGNvbnN0IGNvbmZpZzogaW1wb3J0KFwiQC90eXBlc1wiKS5SZXF1ZXN0Q29uZmlnID0ge1xuICAgICAgICBtZXRob2Q6IG1lc3NhZ2UucGF5bG9hZC5tZXRob2QsXG4gICAgICAgIHVybDogbWVzc2FnZS5wYXlsb2FkLnVybCxcbiAgICAgICAgaGVhZGVyczogbWVzc2FnZS5wYXlsb2FkLmhlYWRlcnMgfHwgW10sXG4gICAgICAgIHBhcmFtczogW10sXG4gICAgICAgIGJvZHlUeXBlOiBcInJhd1wiLFxuICAgICAgICBib2R5OiB7IHJhdzogbWVzc2FnZS5wYXlsb2FkLmJvZHkgfSxcbiAgICAgICAgYXV0aDogeyB0eXBlOiBcIm5vbmVcIiB9LFxuICAgICAgfTtcbiAgICAgIHNlbmRSZXF1ZXN0KGNvbmZpZylcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCByZXNwb25zZSB9KSlcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT4gc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiVVBEQVRFX01PQ0tfU0VSVkVSU1wiKSB7XG4gICAgICBtb2NrU2VydmVycyA9IG1lc3NhZ2UucGF5bG9hZC5zZXJ2ZXJzIHx8IFtdO1xuICAgICAgY29uc29sZS5sb2coXCJbQVBJIERlYnVnZ2VyXSBVcGRhdGVkIG1vY2sgc2VydmVyczpcIiwgbW9ja1NlcnZlcnMubGVuZ3RoKTtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xufSk7XG5cbmxldCBtb2NrU2VydmVyczogaW1wb3J0KFwiQC90eXBlc1wiKS5Nb2NrU2VydmVyW10gPSBbXTtcblxuY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtcImFwaURlYnVnZ2VyX21vY2tTZXJ2ZXJzXCJdKS50aGVuKChyZXN1bHQpID0+IHtcbiAgaWYgKHJlc3VsdC5hcGlEZWJ1Z2dlcl9tb2NrU2VydmVycykge1xuICAgIG1vY2tTZXJ2ZXJzID0gcmVzdWx0LmFwaURlYnVnZ2VyX21vY2tTZXJ2ZXJzO1xuICB9XG59KTtcbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgYnJvd3NlciQxIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcblxuLy8jcmVnaW9uIHNyYy9icm93c2VyLnRzXG4vKipcbiogQ29udGFpbnMgdGhlIGBicm93c2VyYCBleHBvcnQgd2hpY2ggeW91IHNob3VsZCB1c2UgdG8gYWNjZXNzIHRoZSBleHRlbnNpb24gQVBJcyBpbiB5b3VyIHByb2plY3Q6XG4qIGBgYHRzXG4qIGltcG9ydCB7IGJyb3dzZXIgfSBmcm9tICd3eHQvYnJvd3Nlcic7XG4qXG4qIGJyb3dzZXIucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4qICAgLy8gLi4uXG4qIH0pXG4qIGBgYFxuKiBAbW9kdWxlIHd4dC9icm93c2VyXG4qL1xuY29uc3QgYnJvd3NlciA9IGJyb3dzZXIkMTtcblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBicm93c2VyIH07IiwiLy8gc3JjL2luZGV4LnRzXG52YXIgX01hdGNoUGF0dGVybiA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuKSB7XG4gICAgaWYgKG1hdGNoUGF0dGVybiA9PT0gXCI8YWxsX3VybHM+XCIpIHtcbiAgICAgIHRoaXMuaXNBbGxVcmxzID0gdHJ1ZTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gWy4uLl9NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuICAgICAgaWYgKGdyb3VwcyA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcbiAgICAgIGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3VwcztcbiAgICAgIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG4gICAgICB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuICAgICAgdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gcHJvdG9jb2wgPT09IFwiKlwiID8gW1wiaHR0cFwiLCBcImh0dHBzXCJdIDogW3Byb3RvY29sXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IGhvc3RuYW1lO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gcGF0aG5hbWU7XG4gICAgfVxuICB9XG4gIGluY2x1ZGVzKHVybCkge1xuICAgIGlmICh0aGlzLmlzQWxsVXJscylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHUgPSB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiID8gbmV3IFVSTCh1cmwpIDogdXJsIGluc3RhbmNlb2YgTG9jYXRpb24gPyBuZXcgVVJMKHVybC5ocmVmKSA6IHVybDtcbiAgICByZXR1cm4gISF0aGlzLnByb3RvY29sTWF0Y2hlcy5maW5kKChwcm90b2NvbCkgPT4ge1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cHNcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwc01hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZpbGVcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGaWxlTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZnRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRnRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwidXJuXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzVXJuTWF0Y2godSk7XG4gICAgfSk7XG4gIH1cbiAgaXNIdHRwTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIdHRwc01hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0hvc3RQYXRoTWF0Y2godXJsKSB7XG4gICAgaWYgKCF0aGlzLmhvc3RuYW1lTWF0Y2ggfHwgIXRoaXMucGF0aG5hbWVNYXRjaClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBob3N0bmFtZU1hdGNoUmVnZXhzID0gW1xuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoKSxcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaC5yZXBsYWNlKC9eXFwqXFwuLywgXCJcIikpXG4gICAgXTtcbiAgICBjb25zdCBwYXRobmFtZU1hdGNoUmVnZXggPSB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpO1xuICAgIHJldHVybiAhIWhvc3RuYW1lTWF0Y2hSZWdleHMuZmluZCgocmVnZXgpID0+IHJlZ2V4LnRlc3QodXJsLmhvc3RuYW1lKSkgJiYgcGF0aG5hbWVNYXRjaFJlZ2V4LnRlc3QodXJsLnBhdGhuYW1lKTtcbiAgfVxuICBpc0ZpbGVNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZmlsZTovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNGdHBNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZnRwOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc1Vybk1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybik7XG4gICAgY29uc3Qgc3RhcnNSZXBsYWNlZCA9IGVzY2FwZWQucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuICAgIHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuICB9XG4gIGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICB9XG59O1xudmFyIE1hdGNoUGF0dGVybiA9IF9NYXRjaFBhdHRlcm47XG5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiZmlsZVwiLCBcImZ0cFwiLCBcInVyblwiXTtcbnZhciBJbnZhbGlkTWF0Y2hQYXR0ZXJuID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybiwgcmVhc29uKSB7XG4gICAgc3VwZXIoYEludmFsaWQgbWF0Y2ggcGF0dGVybiBcIiR7bWF0Y2hQYXR0ZXJufVwiOiAke3JlYXNvbn1gKTtcbiAgfVxufTtcbmZ1bmN0aW9uIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCkge1xuICBpZiAoIU1hdGNoUGF0dGVybi5QUk9UT0NPTFMuaW5jbHVkZXMocHJvdG9jb2wpICYmIHByb3RvY29sICE9PSBcIipcIilcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBIb3N0bmFtZSBjYW5ub3QgaW5jbHVkZSBhIHBvcnRgKTtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiKlwiKSAmJiBob3N0bmFtZS5sZW5ndGggPiAxICYmICFob3N0bmFtZS5zdGFydHNXaXRoKFwiKi5cIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgSWYgdXNpbmcgYSB3aWxkY2FyZCAoKiksIGl0IG11c3QgZ28gYXQgdGhlIHN0YXJ0IG9mIHRoZSBob3N0bmFtZWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKSB7XG4gIHJldHVybjtcbn1cbmV4cG9ydCB7XG4gIEludmFsaWRNYXRjaFBhdHRlcm4sXG4gIE1hdGNoUGF0dGVyblxufTtcbiJdLCJuYW1lcyI6WyJyZXN1bHQiLCJicm93c2VyIl0sIm1hcHBpbmdzIjoiOztBQUNBLFdBQVMsaUJBQWlCLEtBQUs7QUFDOUIsUUFBSSxPQUFPLFFBQVEsT0FBTyxRQUFRLFdBQVksUUFBTyxFQUFFLE1BQU0sSUFBRztBQUNoRSxXQUFPO0FBQUEsRUFDUjtBQ0pBLFFBQUEsYUFBQSxpQkFBQSxNQUFBO0FBQ0UsWUFBQSxJQUFBLGtEQUFBO0FBRUEsVUFBQSxjQUFBO0FBQ0EsVUFBQSxjQUFB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
