var background = (function() {
  "use strict";
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
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
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries()),
      bodyPreview: preview,
      duration
    };
  }
  const definition = defineBackground(() => {
    console.log("[API Debugger] Background service worker started");
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        partial.set(details.requestId, {
          startTime: details.timeStamp,
          requestBody: details.requestBody?.formData || null,
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
      const serverUrl = "ws://localhost:3004";
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9OyIsIi8qKlxuICogQVBJIERlYnVnZ2VyIC0gQmFja2dyb3VuZCBTZXJ2aWNlIFdvcmtlclxuICpcbiAqIENhcHR1cmVzIEhUVFAgcmVxdWVzdHMgYW5kIHN0b3JlcyB0aGVtIGZvciBpbnNwZWN0aW9uXG4gKi9cblxuLy8gVHlwZXNcbmludGVyZmFjZSBSZXF1ZXN0UmVjb3JkIHtcbiAgaWQ6IHN0cmluZztcbiAgdXJsOiBzdHJpbmc7XG4gIG1ldGhvZDogc3RyaW5nO1xuICBzdGF0dXNDb2RlOiBudW1iZXI7XG4gIHR5cGU/OiBzdHJpbmc7XG4gIHRhYklkOiBudW1iZXI7XG4gIHN0YXJ0VGltZTogbnVtYmVyO1xuICB0aW1lU3RhbXA6IG51bWJlcjtcbiAgZHVyYXRpb246IG51bWJlcjtcbiAgcmVxdWVzdEhlYWRlcnM6IGNocm9tZS53ZWJSZXF1ZXN0Lkh0dHBIZWFkZXJbXTtcbiAgcmVxdWVzdEJvZHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbDtcbiAgcmVxdWVzdEJvZHlUZXh0OiBzdHJpbmcgfCBudWxsO1xuICByZXNwb25zZUhlYWRlcnM6IGNocm9tZS53ZWJSZXF1ZXN0Lkh0dHBIZWFkZXJbXTtcbn1cblxuaW50ZXJmYWNlIFBhcnRpYWxSZXF1ZXN0IHtcbiAgc3RhcnRUaW1lPzogbnVtYmVyO1xuICByZXF1ZXN0Qm9keT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICByZXF1ZXN0Qm9keVRleHQ/OiBzdHJpbmcgfCBudWxsO1xuICByZXF1ZXN0SGVhZGVycz86IGNocm9tZS53ZWJSZXF1ZXN0Lkh0dHBIZWFkZXJbXTtcbiAgcmVzcG9uc2VIZWFkZXJzPzogY2hyb21lLndlYlJlcXVlc3QuSHR0cEhlYWRlcltdO1xufVxuXG5pbnRlcmZhY2UgUmVwbGF5UGF5bG9hZCB7XG4gIG1ldGhvZDogc3RyaW5nO1xuICB1cmw6IHN0cmluZztcbiAgaGVhZGVyczogQXJyYXk8eyBuYW1lOiBzdHJpbmc7IHZhbHVlOiBzdHJpbmcgfT47XG4gIGJvZHk/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBSZXBsYXlSZXNwb25zZSB7XG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIHN0YXR1czogbnVtYmVyO1xuICBzdGF0dXNUZXh0OiBzdHJpbmc7XG4gIGhlYWRlcnM6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+O1xuICBib2R5UHJldmlldzogc3RyaW5nO1xuICBkdXJhdGlvbjogbnVtYmVyO1xufVxuXG4vLyBDb25zdGFudHNcbmNvbnN0IE1BWF9ISVNUT1JZID0gMjAwO1xuY29uc3QgdGV4dERlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKTtcblxuLy8gU3RhdGVcbmNvbnN0IHBhcnRpYWwgPSBuZXcgTWFwPHN0cmluZywgUGFydGlhbFJlcXVlc3Q+KCk7XG5cbi8vIEhlbHBlciBmdW5jdGlvbnNcbmZ1bmN0aW9uIHNlcmlhbGl6ZVJlcXVlc3RCb2R5KGRldGFpbHM6IGNocm9tZS53ZWJSZXF1ZXN0LldlYlJlcXVlc3RCb2R5RGV0YWlscyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBib2R5ID0gZGV0YWlscy5yZXF1ZXN0Qm9keTtcbiAgaWYgKCFib2R5KSByZXR1cm4gbnVsbDtcblxuICBpZiAoYm9keS5yYXcgJiYgYm9keS5yYXcubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJvZHkucmF3XG4gICAgICAubWFwKChjaHVuaykgPT4ge1xuICAgICAgICBpZiAoY2h1bms/LmJ5dGVzKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiB0ZXh0RGVjb2Rlci5kZWNvZGUoY2h1bmsuYnl0ZXMpO1xuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgfSlcbiAgICAgIC5qb2luKFwiXCIpO1xuICB9XG5cbiAgaWYgKGJvZHkuZm9ybURhdGEpIHtcbiAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoYm9keS5mb3JtRGF0YSlcbiAgICAgIC5tYXAoKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSBBcnJheS5pc0FycmF5KHZhbHVlKSA/IHZhbHVlIDogW3ZhbHVlXTtcbiAgICAgICAgcmV0dXJuIGAke2tleX09JHt2YWx1ZXMuam9pbihcIixcIil9YDtcbiAgICAgIH0pXG4gICAgICAuam9pbihcIiZcIik7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkUmVjb3JkKHJlY29yZDogUmVxdWVzdFJlY29yZCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wicmVxdWVzdHNcIl0pO1xuICBjb25zdCBsaXN0ID0gKHJlc3VsdC5yZXF1ZXN0cyBhcyBSZXF1ZXN0UmVjb3JkW10pIHx8IFtdO1xuXG4gIGxpc3QudW5zaGlmdChyZWNvcmQpO1xuICBpZiAobGlzdC5sZW5ndGggPiBNQVhfSElTVE9SWSkgbGlzdC5sZW5ndGggPSBNQVhfSElTVE9SWTtcblxuICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyByZXF1ZXN0czogbGlzdCB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVwbGF5KHBheWxvYWQ6IFJlcGxheVBheWxvYWQpOiBQcm9taXNlPFJlcGxheVJlc3BvbnNlPiB7XG4gIGNvbnN0IHN0YXJ0ID0gcGVyZm9ybWFuY2Uubm93KCk7XG5cbiAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICBwYXlsb2FkLmhlYWRlcnM/LmZvckVhY2goKGgpID0+IHtcbiAgICBoZWFkZXJzW2gubmFtZV0gPSBoLnZhbHVlO1xuICB9KTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHBheWxvYWQudXJsLCB7XG4gICAgbWV0aG9kOiBwYXlsb2FkLm1ldGhvZCxcbiAgICBoZWFkZXJzLFxuICAgIGJvZHk6IHBheWxvYWQuYm9keSB8fCB1bmRlZmluZWQsXG4gIH0pO1xuXG4gIGNvbnN0IGR1cmF0aW9uID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydDtcbiAgY29uc3QgdGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgY29uc3QgcHJldmlldyA9IHRleHQuc2xpY2UoMCwgMjA0OCk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdWNjZXNzOiB0cnVlLFxuICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgIHN0YXR1c1RleHQ6IHJlc3BvbnNlLnN0YXR1c1RleHQsXG4gICAgaGVhZGVyczogQXJyYXkuZnJvbShyZXNwb25zZS5oZWFkZXJzLmVudHJpZXMoKSksXG4gICAgYm9keVByZXZpZXc6IHByZXZpZXcsXG4gICAgZHVyYXRpb24sXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIltBUEkgRGVidWdnZXJdIEJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgc3RhcnRlZFwiKTtcblxuICAvLyBSZXF1ZXN0IGxpZmVjeWNsZSBob29rc1xuICBjaHJvbWUud2ViUmVxdWVzdC5vbkJlZm9yZVJlcXVlc3QuYWRkTGlzdGVuZXIoXG4gICAgKGRldGFpbHMpID0+IHtcbiAgICAgIHBhcnRpYWwuc2V0KGRldGFpbHMucmVxdWVzdElkLCB7XG4gICAgICAgIHN0YXJ0VGltZTogZGV0YWlscy50aW1lU3RhbXAsXG4gICAgICAgIHJlcXVlc3RCb2R5OiBkZXRhaWxzLnJlcXVlc3RCb2R5Py5mb3JtRGF0YSB8fCBudWxsLFxuICAgICAgICByZXF1ZXN0Qm9keVRleHQ6IHNlcmlhbGl6ZVJlcXVlc3RCb2R5KGRldGFpbHMgYXMgY2hyb21lLndlYlJlcXVlc3QuV2ViUmVxdWVzdEJvZHlEZXRhaWxzKSxcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH0sXG4gICAgW1wicmVxdWVzdEJvZHlcIl1cbiAgKTtcblxuICBjaHJvbWUud2ViUmVxdWVzdC5vbkJlZm9yZVNlbmRIZWFkZXJzLmFkZExpc3RlbmVyKFxuICAgIChkZXRhaWxzKSA9PiB7XG4gICAgICBjb25zdCBwID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgcC5yZXF1ZXN0SGVhZGVycyA9IGRldGFpbHMucmVxdWVzdEhlYWRlcnM7XG4gICAgICBwYXJ0aWFsLnNldChkZXRhaWxzLnJlcXVlc3RJZCwgcCk7XG4gICAgfSxcbiAgICB7IHVybHM6IFtcIjxhbGxfdXJscz5cIl0gfSxcbiAgICBbXCJyZXF1ZXN0SGVhZGVyc1wiXVxuICApO1xuXG4gIGNocm9tZS53ZWJSZXF1ZXN0Lm9uSGVhZGVyc1JlY2VpdmVkLmFkZExpc3RlbmVyKFxuICAgIChkZXRhaWxzKSA9PiB7XG4gICAgICBjb25zdCBwID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgcC5yZXNwb25zZUhlYWRlcnMgPSBkZXRhaWxzLnJlc3BvbnNlSGVhZGVycztcbiAgICAgIHBhcnRpYWwuc2V0KGRldGFpbHMucmVxdWVzdElkLCBwKTtcbiAgICB9LFxuICAgIHsgdXJsczogW1wiPGFsbF91cmxzPlwiXSB9LFxuICAgIFtcInJlc3BvbnNlSGVhZGVyc1wiXVxuICApO1xuXG4gIGNocm9tZS53ZWJSZXF1ZXN0Lm9uQ29tcGxldGVkLmFkZExpc3RlbmVyKFxuICAgIGFzeW5jIChkZXRhaWxzKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBiYXNlID0gcGFydGlhbC5nZXQoZGV0YWlscy5yZXF1ZXN0SWQpIHx8IHt9O1xuICAgICAgICBwYXJ0aWFsLmRlbGV0ZShkZXRhaWxzLnJlcXVlc3RJZCk7XG5cbiAgICAgICAgY29uc3Qgc3RhcnQgPSBiYXNlLnN0YXJ0VGltZSB8fCBkZXRhaWxzLnRpbWVTdGFtcDtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSB0eXBlb2YgYmFzZS5zdGFydFRpbWUgPT09IFwibnVtYmVyXCJcbiAgICAgICAgICA/IGRldGFpbHMudGltZVN0YW1wIC0gYmFzZS5zdGFydFRpbWVcbiAgICAgICAgICA6IDA7XG5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBSZXF1ZXN0UmVjb3JkID0ge1xuICAgICAgICAgIGlkOiBkZXRhaWxzLnJlcXVlc3RJZCxcbiAgICAgICAgICB1cmw6IGRldGFpbHMudXJsLFxuICAgICAgICAgIG1ldGhvZDogZGV0YWlscy5tZXRob2QsXG4gICAgICAgICAgc3RhdHVzQ29kZTogZGV0YWlscy5zdGF0dXNDb2RlLFxuICAgICAgICAgIHR5cGU6IGRldGFpbHMudHlwZSxcbiAgICAgICAgICB0YWJJZDogZGV0YWlscy50YWJJZCxcbiAgICAgICAgICBzdGFydFRpbWU6IHN0YXJ0LFxuICAgICAgICAgIHRpbWVTdGFtcDogZGV0YWlscy50aW1lU3RhbXAsXG4gICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgcmVxdWVzdEhlYWRlcnM6IGJhc2UucmVxdWVzdEhlYWRlcnMgfHwgW10sXG4gICAgICAgICAgcmVxdWVzdEJvZHk6IGJhc2UucmVxdWVzdEJvZHkgfHwgbnVsbCxcbiAgICAgICAgICByZXF1ZXN0Qm9keVRleHQ6IGJhc2UucmVxdWVzdEJvZHlUZXh0IHx8IG51bGwsXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzOiBiYXNlLnJlc3BvbnNlSGVhZGVycyB8fCBbXSxcbiAgICAgICAgfTtcblxuICAgICAgICBhd2FpdCBhZGRSZWNvcmQocmVjb3JkKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJbQVBJIERlYnVnZ2VyXSBDYXB0dXJlZDpcIiwgcmVjb3JkLm1ldGhvZCwgcmVjb3JkLnVybCwgcmVjb3JkLnN0YXR1c0NvZGUpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJIERlYnVnZ2VyXSBDYXB0dXJlIGVycm9yOlwiLCBlcnIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgeyB1cmxzOiBbXCI8YWxsX3VybHM+XCJdIH1cbiAgKTtcblxuICAvLyBNZXNzYWdlIGhhbmRsZXJcbiAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBfc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIkdFVF9SRVFVRVNUU1wiKSB7XG4gICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1wicmVxdWVzdHNcIl0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyByZXF1ZXN0czogcmVzLnJlcXVlc3RzIHx8IFtdIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcIkNMRUFSX1JFUVVFU1RTXCIpIHtcbiAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHJlcXVlc3RzOiBbXSB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJSRVBMQVlfUkVRVUVTVFwiKSB7XG4gICAgICBoYW5kbGVSZXBsYXkobWVzc2FnZS5wYXlsb2FkKS50aGVuKHNlbmRSZXNwb25zZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xufSk7XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIGJyb3dzZXIkMSB9IGZyb20gXCJAd3h0LWRldi9icm93c2VyXCI7XG5cbi8vI3JlZ2lvbiBzcmMvYnJvd3Nlci50c1xuLyoqXG4qIENvbnRhaW5zIHRoZSBgYnJvd3NlcmAgZXhwb3J0IHdoaWNoIHlvdSBzaG91bGQgdXNlIHRvIGFjY2VzcyB0aGUgZXh0ZW5zaW9uIEFQSXMgaW4geW91ciBwcm9qZWN0OlxuKiBgYGB0c1xuKiBpbXBvcnQgeyBicm93c2VyIH0gZnJvbSAnd3h0L2Jyb3dzZXInO1xuKlxuKiBicm93c2VyLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xuKiAgIC8vIC4uLlxuKiB9KVxuKiBgYGBcbiogQG1vZHVsZSB3eHQvYnJvd3NlclxuKi9cbmNvbnN0IGJyb3dzZXIgPSBicm93c2VyJDE7XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgYnJvd3NlciB9OyIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsicmVzdWx0IiwiYnJvd3NlciJdLCJtYXBwaW5ncyI6Ijs7QUFDQSxXQUFTLGlCQUFpQixLQUFLO0FBQzlCLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUc7QUFDaEUsV0FBTztBQUFBLEVBQ1I7QUM0Q0EsUUFBQSxjQUFBO0FBQ0EsUUFBQSxjQUFBLElBQUEsWUFBQSxPQUFBO0FBR0EsUUFBQSxVQUFBLG9CQUFBLElBQUE7QUFHQSxXQUFBLHFCQUFBLFNBQUE7QUFDRSxVQUFBLE9BQUEsUUFBQTtBQUNBLFFBQUEsQ0FBQSxLQUFBLFFBQUE7QUFFQSxRQUFBLEtBQUEsT0FBQSxLQUFBLElBQUEsUUFBQTtBQUNFLGFBQUEsS0FBQSxJQUFBLElBQUEsQ0FBQSxVQUFBO0FBRUksWUFBQSxPQUFBLE9BQUE7QUFDRSxjQUFBO0FBQ0UsbUJBQUEsWUFBQSxPQUFBLE1BQUEsS0FBQTtBQUFBLFVBQXFDLFFBQUE7QUFFckMsbUJBQUE7QUFBQSxVQUFPO0FBQUEsUUFDVDtBQUVGLGVBQUE7QUFBQSxNQUFPLENBQUEsRUFBQSxLQUFBLEVBQUE7QUFBQSxJQUVEO0FBR1osUUFBQSxLQUFBLFVBQUE7QUFDRSxhQUFBLE9BQUEsUUFBQSxLQUFBLFFBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQSxLQUFBLEtBQUEsTUFBQTtBQUVJLGNBQUEsU0FBQSxNQUFBLFFBQUEsS0FBQSxJQUFBLFFBQUEsQ0FBQSxLQUFBO0FBQ0EsZUFBQSxHQUFBLEdBQUEsSUFBQSxPQUFBLEtBQUEsR0FBQSxD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
