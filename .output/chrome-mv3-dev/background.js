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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9OyIsImV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZFwiKTtcblxuICAvLyBDb25zdGFudHNcbiAgY29uc3QgTUFYX0hJU1RPUlkgPSAyMDA7XG4gIGNvbnN0IHRleHREZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKFwidXRmLThcIik7XG5cbiAgLy8gVHlwZXNcbiAgaW50ZXJmYWNlIFJlcXVlc3RSZWNvcmQge1xuICAgIGlkOiBzdHJpbmc7XG4gICAgdXJsOiBzdHJpbmc7XG4gICAgbWV0aG9kOiBzdHJpbmc7XG4gICAgc3RhdHVzQ29kZTogbnVtYmVyO1xuICAgIHR5cGU/OiBzdHJpbmc7XG4gICAgdGFiSWQ6IG51bWJlcjtcbiAgICBzdGFydFRpbWU6IG51bWJlcjtcbiAgICB0aW1lU3RhbXA6IG51bWJlcjtcbiAgICBkdXJhdGlvbjogbnVtYmVyO1xuICAgIHJlcXVlc3RIZWFkZXJzOiBjaHJvbWUud2ViUmVxdWVzdC5IdHRwSGVhZGVyW107XG4gICAgcmVxdWVzdEJvZHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbDtcbiAgICByZXF1ZXN0Qm9keVRleHQ6IHN0cmluZyB8IG51bGw7XG4gICAgcmVzcG9uc2VIZWFkZXJzOiBjaHJvbWUud2ViUmVxdWVzdC5IdHRwSGVhZGVyW107XG4gIH1cblxuICBpbnRlcmZhY2UgUGFydGlhbFJlcXVlc3Qge1xuICAgIHN0YXJ0VGltZT86IG51bWJlcjtcbiAgICByZXF1ZXN0Qm9keT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIHJlcXVlc3RCb2R5VGV4dD86IHN0cmluZyB8IG51bGw7XG4gICAgcmVxdWVzdEhlYWRlcnM/OiBjaHJvbWUud2ViUmVxdWVzdC5IdHRwSGVhZGVyW107XG4gICAgcmVzcG9uc2VIZWFkZXJzPzogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xuICB9XG5cbiAgaW50ZXJmYWNlIFJlcGxheVBheWxvYWQge1xuICAgIG1ldGhvZDogc3RyaW5nO1xuICAgIHVybDogc3RyaW5nO1xuICAgIGhlYWRlcnM6IEFycmF5PHsgbmFtZTogc3RyaW5nOyB2YWx1ZTogc3RyaW5nIH0+O1xuICAgIGJvZHk/OiBzdHJpbmc7XG4gIH1cblxuICBpbnRlcmZhY2UgUmVwbGF5UmVzcG9uc2Uge1xuICAgIHN1Y2Nlc3M6IGJvb2xlYW47XG4gICAgc3RhdHVzOiBudW1iZXI7XG4gICAgc3RhdHVzVGV4dDogc3RyaW5nO1xuICAgIGhlYWRlcnM6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+O1xuICAgIGJvZHlQcmV2aWV3OiBzdHJpbmc7XG4gICAgZHVyYXRpb246IG51bWJlcjtcbiAgfVxuXG4gIC8vIFN0YXRlXG4gIGNvbnN0IHBhcnRpYWwgPSBuZXcgTWFwPHN0cmluZywgUGFydGlhbFJlcXVlc3Q+KCk7XG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uc1xuICBmdW5jdGlvbiBzZXJpYWxpemVSZXF1ZXN0Qm9keShkZXRhaWxzOiBjaHJvbWUud2ViUmVxdWVzdC5XZWJSZXF1ZXN0Qm9keURldGFpbHMpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBib2R5ID0gZGV0YWlscy5yZXF1ZXN0Qm9keTtcbiAgICBpZiAoIWJvZHkpIHJldHVybiBudWxsO1xuXG4gICAgaWYgKGJvZHkucmF3ICYmIGJvZHkucmF3Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGJvZHkucmF3XG4gICAgICAgIC5tYXAoKGNodW5rKSA9PiB7XG4gICAgICAgICAgaWYgKGNodW5rPy5ieXRlcykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRleHREZWNvZGVyLmRlY29kZShjaHVuay5ieXRlcyk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIlwiKTtcbiAgICB9XG5cbiAgICBpZiAoYm9keS5mb3JtRGF0YSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKGJvZHkuZm9ybURhdGEpXG4gICAgICAgIC5tYXAoKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IEFycmF5LmlzQXJyYXkodmFsdWUpID8gdmFsdWUgOiBbdmFsdWVdO1xuICAgICAgICAgIHJldHVybiBgJHtrZXl9PSR7dmFsdWVzLmpvaW4oXCIsXCIpfWA7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKFwiJlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGFkZFJlY29yZChyZWNvcmQ6IFJlcXVlc3RSZWNvcmQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wicmVxdWVzdHNcIl0pO1xuICAgIGNvbnN0IGxpc3QgPSAocmVzdWx0LnJlcXVlc3RzIGFzIFJlcXVlc3RSZWNvcmRbXSkgfHwgW107XG5cbiAgICBsaXN0LnVuc2hpZnQocmVjb3JkKTtcbiAgICBpZiAobGlzdC5sZW5ndGggPiBNQVhfSElTVE9SWSkgbGlzdC5sZW5ndGggPSBNQVhfSElTVE9SWTtcblxuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHJlcXVlc3RzOiBsaXN0IH0pO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVwbGF5KHBheWxvYWQ6IFJlcGxheVBheWxvYWQpOiBQcm9taXNlPFJlcGxheVJlc3BvbnNlPiB7XG4gICAgY29uc3Qgc3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBwYXlsb2FkLmhlYWRlcnM/LmZvckVhY2goKGgpID0+IHtcbiAgICAgIGhlYWRlcnNbaC5uYW1lXSA9IGgudmFsdWU7XG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHBheWxvYWQudXJsLCB7XG4gICAgICBtZXRob2Q6IHBheWxvYWQubWV0aG9kLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IHBheWxvYWQuYm9keSB8fCB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCBkdXJhdGlvbiA9IHBlcmZvcm1hbmNlLm5vdygpIC0gc3RhcnQ7XG4gICAgY29uc3QgdGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICBjb25zdCBwcmV2aWV3ID0gdGV4dC5zbGljZSgwLCAyMDQ4KTtcblxuICAgIGNvbnN0IGhlYWRlclBhaXJzOiBbc3RyaW5nLCBzdHJpbmddW10gPSBbXTtcbiAgICByZXNwb25zZS5oZWFkZXJzLmZvckVhY2goKHYsIGspID0+IGhlYWRlclBhaXJzLnB1c2goW2ssIHZdKSk7XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHJlc3BvbnNlLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBoZWFkZXJQYWlycyxcbiAgICAgIGJvZHlQcmV2aWV3OiBwcmV2aWV3LFxuICAgICAgZHVyYXRpb24sXG4gICAgfTtcbiAgfVxuXG4gIC8vIFJlcXVlc3QgbGlmZWN5Y2xlIGhvb2tzXG4gIGNocm9tZS53ZWJSZXF1ZXN0Lm9uQmVmb3JlUmVxdWVzdC5hZGRMaXN0ZW5lcihcbiAgKGRldGFpbHMpID0+IHtcbiAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwge1xuICAgICAgc3RhcnRUaW1lOiBkZXRhaWxzLnRpbWVTdGFtcCxcbiAgICAgIHJlcXVlc3RCb2R5OiBkZXRhaWxzLnJlcXVlc3RCb2R5Py5mb3JtRGF0YSB8fCB1bmRlZmluZWQsXG4gICAgICByZXF1ZXN0Qm9keVRleHQ6IHNlcmlhbGl6ZVJlcXVlc3RCb2R5KGRldGFpbHMgYXMgY2hyb21lLndlYlJlcXVlc3QuV2ViUmVxdWVzdEJvZHlEZXRhaWxzKSxcbiAgICB9KTtcbiAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXF1ZXN0Qm9keVwiXVxuICApO1xuXG4gIGNocm9tZS53ZWJSZXF1ZXN0Lm9uQmVmb3JlU2VuZEhlYWRlcnMuYWRkTGlzdGVuZXIoXG4gICAgKGRldGFpbHMpID0+IHtcbiAgICAgIGNvbnN0IHAgPSBwYXJ0aWFsLmdldChkZXRhaWxzLnJlcXVlc3RJZCkgfHwge307XG4gICAgICBwLnJlcXVlc3RIZWFkZXJzID0gZGV0YWlscy5yZXF1ZXN0SGVhZGVycztcbiAgICAgIHBhcnRpYWwuc2V0KGRldGFpbHMucmVxdWVzdElkLCBwKTtcbiAgICB9LFxuICAgIHsgdXJsczogW1wiPGFsbF91cmxzPlwiXSB9LFxuICAgIFtcInJlcXVlc3RIZWFkZXJzXCJdXG4gICk7XG5cbiAgY2hyb21lLndlYlJlcXVlc3Qub25IZWFkZXJzUmVjZWl2ZWQuYWRkTGlzdGVuZXIoXG4gICAgKGRldGFpbHMpID0+IHtcbiAgICAgIGNvbnN0IHAgPSBwYXJ0aWFsLmdldChkZXRhaWxzLnJlcXVlc3RJZCkgfHwge307XG4gICAgICBwLnJlc3BvbnNlSGVhZGVycyA9IGRldGFpbHMucmVzcG9uc2VIZWFkZXJzO1xuICAgICAgcGFydGlhbC5zZXQoZGV0YWlscy5yZXF1ZXN0SWQsIHApO1xuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH0sXG4gICAgW1wicmVzcG9uc2VIZWFkZXJzXCJdXG4gICk7XG5cbiAgY2hyb21lLndlYlJlcXVlc3Qub25Db21wbGV0ZWQuYWRkTGlzdGVuZXIoXG4gICAgYXN5bmMgKGRldGFpbHMpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJhc2UgPSBwYXJ0aWFsLmdldChkZXRhaWxzLnJlcXVlc3RJZCkgfHwge307XG4gICAgICAgIHBhcnRpYWwuZGVsZXRlKGRldGFpbHMucmVxdWVzdElkKTtcblxuICAgICAgICBjb25zdCBzdGFydCA9IGJhc2Uuc3RhcnRUaW1lIHx8IGRldGFpbHMudGltZVN0YW1wO1xuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHR5cGVvZiBiYXNlLnN0YXJ0VGltZSA9PT0gXCJudW1iZXJcIlxuICAgICAgICAgID8gZGV0YWlscy50aW1lU3RhbXAgLSBiYXNlLnN0YXJ0VGltZVxuICAgICAgICAgIDogMDtcblxuICAgICAgICBjb25zdCByZWNvcmQ6IFJlcXVlc3RSZWNvcmQgPSB7XG4gICAgICAgICAgaWQ6IGRldGFpbHMucmVxdWVzdElkLFxuICAgICAgICAgIHVybDogZGV0YWlscy51cmwsXG4gICAgICAgICAgbWV0aG9kOiBkZXRhaWxzLm1ldGhvZCxcbiAgICAgICAgICBzdGF0dXNDb2RlOiBkZXRhaWxzLnN0YXR1c0NvZGUsXG4gICAgICAgICAgdHlwZTogZGV0YWlscy50eXBlLFxuICAgICAgICAgIHRhYklkOiBkZXRhaWxzLnRhYklkLFxuICAgICAgICAgIHN0YXJ0VGltZTogc3RhcnQsXG4gICAgICAgICAgdGltZVN0YW1wOiBkZXRhaWxzLnRpbWVTdGFtcCxcbiAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICByZXF1ZXN0SGVhZGVyczogYmFzZS5yZXF1ZXN0SGVhZGVycyB8fCBbXSxcbiAgICAgICAgICByZXF1ZXN0Qm9keTogYmFzZS5yZXF1ZXN0Qm9keSB8fCBudWxsLFxuICAgICAgICAgIHJlcXVlc3RCb2R5VGV4dDogYmFzZS5yZXF1ZXN0Qm9keVRleHQgfHwgbnVsbCxcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnM6IGJhc2UucmVzcG9uc2VIZWFkZXJzIHx8IFtdLFxuICAgICAgICB9O1xuXG4gICAgICAgIGF3YWl0IGFkZFJlY29yZChyZWNvcmQpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIENhcHR1cmVkOlwiLCByZWNvcmQubWV0aG9kLCByZWNvcmQudXJsLCByZWNvcmQuc3RhdHVzQ29kZSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEkgRGVidWdnZXJdIENhcHR1cmUgZXJyb3I6XCIsIGVycik7XG4gICAgICB9XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfVxuICApO1xuXG4gIC8vIE1lc3NhZ2UgaGFuZGxlclxuICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIF9zZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiR0VUX1JFUVVFU1RTXCIpIHtcbiAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbXCJyZXF1ZXN0c1wiXSkudGhlbigocmVzKSA9PiB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHJlcXVlc3RzOiByZXMucmVxdWVzdHMgfHwgW10gfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiQ0xFQVJfUkVRVUVTVFNcIikge1xuICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgcmVxdWVzdHM6IFtdIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIlJFUExBWV9SRVFVRVNUXCIpIHtcbiAgICAgIGhhbmRsZVJlcGxheShtZXNzYWdlLnBheWxvYWQpLnRoZW4oc2VuZFJlc3BvbnNlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59KTtcbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgYnJvd3NlciQxIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcblxuLy8jcmVnaW9uIHNyYy9icm93c2VyLnRzXG4vKipcbiogQ29udGFpbnMgdGhlIGBicm93c2VyYCBleHBvcnQgd2hpY2ggeW91IHNob3VsZCB1c2UgdG8gYWNjZXNzIHRoZSBleHRlbnNpb24gQVBJcyBpbiB5b3VyIHByb2plY3Q6XG4qIGBgYHRzXG4qIGltcG9ydCB7IGJyb3dzZXIgfSBmcm9tICd3eHQvYnJvd3Nlcic7XG4qXG4qIGJyb3dzZXIucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4qICAgLy8gLi4uXG4qIH0pXG4qIGBgYFxuKiBAbW9kdWxlIHd4dC9icm93c2VyXG4qL1xuY29uc3QgYnJvd3NlciA9IGJyb3dzZXIkMTtcblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBicm93c2VyIH07IiwiLy8gc3JjL2luZGV4LnRzXG52YXIgX01hdGNoUGF0dGVybiA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuKSB7XG4gICAgaWYgKG1hdGNoUGF0dGVybiA9PT0gXCI8YWxsX3VybHM+XCIpIHtcbiAgICAgIHRoaXMuaXNBbGxVcmxzID0gdHJ1ZTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gWy4uLl9NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuICAgICAgaWYgKGdyb3VwcyA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcbiAgICAgIGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3VwcztcbiAgICAgIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG4gICAgICB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuICAgICAgdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gcHJvdG9jb2wgPT09IFwiKlwiID8gW1wiaHR0cFwiLCBcImh0dHBzXCJdIDogW3Byb3RvY29sXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IGhvc3RuYW1lO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gcGF0aG5hbWU7XG4gICAgfVxuICB9XG4gIGluY2x1ZGVzKHVybCkge1xuICAgIGlmICh0aGlzLmlzQWxsVXJscylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHUgPSB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiID8gbmV3IFVSTCh1cmwpIDogdXJsIGluc3RhbmNlb2YgTG9jYXRpb24gPyBuZXcgVVJMKHVybC5ocmVmKSA6IHVybDtcbiAgICByZXR1cm4gISF0aGlzLnByb3RvY29sTWF0Y2hlcy5maW5kKChwcm90b2NvbCkgPT4ge1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cHNcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwc01hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZpbGVcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGaWxlTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZnRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRnRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwidXJuXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzVXJuTWF0Y2godSk7XG4gICAgfSk7XG4gIH1cbiAgaXNIdHRwTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIdHRwc01hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0hvc3RQYXRoTWF0Y2godXJsKSB7XG4gICAgaWYgKCF0aGlzLmhvc3RuYW1lTWF0Y2ggfHwgIXRoaXMucGF0aG5hbWVNYXRjaClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBob3N0bmFtZU1hdGNoUmVnZXhzID0gW1xuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoKSxcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaC5yZXBsYWNlKC9eXFwqXFwuLywgXCJcIikpXG4gICAgXTtcbiAgICBjb25zdCBwYXRobmFtZU1hdGNoUmVnZXggPSB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpO1xuICAgIHJldHVybiAhIWhvc3RuYW1lTWF0Y2hSZWdleHMuZmluZCgocmVnZXgpID0+IHJlZ2V4LnRlc3QodXJsLmhvc3RuYW1lKSkgJiYgcGF0aG5hbWVNYXRjaFJlZ2V4LnRlc3QodXJsLnBhdGhuYW1lKTtcbiAgfVxuICBpc0ZpbGVNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZmlsZTovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNGdHBNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZnRwOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc1Vybk1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybik7XG4gICAgY29uc3Qgc3RhcnNSZXBsYWNlZCA9IGVzY2FwZWQucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuICAgIHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuICB9XG4gIGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICB9XG59O1xudmFyIE1hdGNoUGF0dGVybiA9IF9NYXRjaFBhdHRlcm47XG5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiZmlsZVwiLCBcImZ0cFwiLCBcInVyblwiXTtcbnZhciBJbnZhbGlkTWF0Y2hQYXR0ZXJuID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybiwgcmVhc29uKSB7XG4gICAgc3VwZXIoYEludmFsaWQgbWF0Y2ggcGF0dGVybiBcIiR7bWF0Y2hQYXR0ZXJufVwiOiAke3JlYXNvbn1gKTtcbiAgfVxufTtcbmZ1bmN0aW9uIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCkge1xuICBpZiAoIU1hdGNoUGF0dGVybi5QUk9UT0NPTFMuaW5jbHVkZXMocHJvdG9jb2wpICYmIHByb3RvY29sICE9PSBcIipcIilcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBIb3N0bmFtZSBjYW5ub3QgaW5jbHVkZSBhIHBvcnRgKTtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiKlwiKSAmJiBob3N0bmFtZS5sZW5ndGggPiAxICYmICFob3N0bmFtZS5zdGFydHNXaXRoKFwiKi5cIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgSWYgdXNpbmcgYSB3aWxkY2FyZCAoKiksIGl0IG11c3QgZ28gYXQgdGhlIHN0YXJ0IG9mIHRoZSBob3N0bmFtZWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKSB7XG4gIHJldHVybjtcbn1cbmV4cG9ydCB7XG4gIEludmFsaWRNYXRjaFBhdHRlcm4sXG4gIE1hdGNoUGF0dGVyblxufTtcbiJdLCJuYW1lcyI6WyJyZXN1bHQiLCJicm93c2VyIl0sIm1hcHBpbmdzIjoiOztBQUNBLFdBQVMsaUJBQWlCLEtBQUs7QUFDOUIsUUFBSSxPQUFPLFFBQVEsT0FBTyxRQUFRLFdBQVksUUFBTyxFQUFFLE1BQU0sSUFBRztBQUNoRSxXQUFPO0FBQUEsRUFDUjtBQ0pBLFFBQUEsYUFBQSxpQkFBQSxNQUFBO0FBQ0UsWUFBQSxJQUFBLGtEQUFBO0FBR0EsVUFBQSxjQUFBO0FBQ0EsVUFBQSxjQUFBLElBQUEsWUFBQSxPQUFBO0FBNENBLFVBQUEsVUFBQSxvQkFBQSxJQUFBO0FBR0EsYUFBQSxxQkFBQSxTQUFBO0FBQ0UsWUFBQSxPQUFBLFFBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxRQUFBO0FBRUEsVUFBQSxLQUFBLE9BQUEsS0FBQSxJQUFBLFFBQUE7QUFDRSxlQUFBLEtBQUEsSUFBQSxJQUFBLENBQUEsVUFBQTtBQUVJLGNBQUEsT0FBQSxPQUFBO0FBQ0UsZ0JBQUE7QUFDRSxxQkFBQSxZQUFBLE9BQUEsTUFBQSxLQUFBO0FBQUEsWUFBcUMsUUFBQTtBQUVyQyxxQkFBQTtBQUFBLFlBQU87QUFBQSxVQUNUO0FBRUYsaUJBQUE7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
