(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
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
try {
  getDevServerWebSocket().addWxtEventListener("wxt:reload-page", (event) => {
    if (event.detail === location.pathname.substring(1)) location.reload();
  });
} catch (err) {
  logger.error("Failed to setup web socket connection with dev server", err);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFzaGJvYXJkLUI1WTBuX3lCLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdmlydHVhbC9yZWxvYWQtaHRtbC5tanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9pbnRlcm5hbC9sb2dnZXIudHNcbmZ1bmN0aW9uIHByaW50KG1ldGhvZCwgLi4uYXJncykge1xuXHRpZiAoaW1wb3J0Lm1ldGEuZW52Lk1PREUgPT09IFwicHJvZHVjdGlvblwiKSByZXR1cm47XG5cdGlmICh0eXBlb2YgYXJnc1swXSA9PT0gXCJzdHJpbmdcIikgbWV0aG9kKGBbd3h0XSAke2FyZ3Muc2hpZnQoKX1gLCAuLi5hcmdzKTtcblx0ZWxzZSBtZXRob2QoXCJbd3h0XVwiLCAuLi5hcmdzKTtcbn1cbi8qKlxuKiBXcmFwcGVyIGFyb3VuZCBgY29uc29sZWAgd2l0aCBhIFwiW3d4dF1cIiBwcmVmaXhcbiovXG5jb25zdCBsb2dnZXIgPSB7XG5cdGRlYnVnOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5kZWJ1ZywgLi4uYXJncyksXG5cdGxvZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUubG9nLCAuLi5hcmdzKSxcblx0d2FybjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUud2FybiwgLi4uYXJncyksXG5cdGVycm9yOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5lcnJvciwgLi4uYXJncylcbn07XG5cbi8vI2VuZHJlZ2lvblxuLy8jcmVnaW9uIHNyYy91dGlscy9pbnRlcm5hbC9kZXYtc2VydmVyLXdlYnNvY2tldC50c1xubGV0IHdzO1xuLyoqXG4qIENvbm5lY3QgdG8gdGhlIHdlYnNvY2tldCBhbmQgbGlzdGVuIGZvciBtZXNzYWdlcy5cbiovXG5mdW5jdGlvbiBnZXREZXZTZXJ2ZXJXZWJTb2NrZXQoKSB7XG5cdGlmIChpbXBvcnQubWV0YS5lbnYuQ09NTUFORCAhPT0gXCJzZXJ2ZVwiKSB0aHJvdyBFcnJvcihcIk11c3QgYmUgcnVubmluZyBXWFQgZGV2IGNvbW1hbmQgdG8gY29ubmVjdCB0byBjYWxsIGdldERldlNlcnZlcldlYlNvY2tldCgpXCIpO1xuXHRpZiAod3MgPT0gbnVsbCkge1xuXHRcdGNvbnN0IHNlcnZlclVybCA9IF9fREVWX1NFUlZFUl9PUklHSU5fXztcblx0XHRsb2dnZXIuZGVidWcoXCJDb25uZWN0aW5nIHRvIGRldiBzZXJ2ZXIgQFwiLCBzZXJ2ZXJVcmwpO1xuXHRcdHdzID0gbmV3IFdlYlNvY2tldChzZXJ2ZXJVcmwsIFwidml0ZS1obXJcIik7XG5cdFx0d3MuYWRkV3h0RXZlbnRMaXN0ZW5lciA9IHdzLmFkZEV2ZW50TGlzdGVuZXIuYmluZCh3cyk7XG5cdFx0d3Muc2VuZEN1c3RvbSA9IChldmVudCwgcGF5bG9hZCkgPT4gd3M/LnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0dHlwZTogXCJjdXN0b21cIixcblx0XHRcdGV2ZW50LFxuXHRcdFx0cGF5bG9hZFxuXHRcdH0pKTtcblx0XHR3cy5hZGRFdmVudExpc3RlbmVyKFwib3BlblwiLCAoKSA9PiB7XG5cdFx0XHRsb2dnZXIuZGVidWcoXCJDb25uZWN0ZWQgdG8gZGV2IHNlcnZlclwiKTtcblx0XHR9KTtcblx0XHR3cy5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwgKCkgPT4ge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKFwiRGlzY29ubmVjdGVkIGZyb20gZGV2IHNlcnZlclwiKTtcblx0XHR9KTtcblx0XHR3cy5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgKGV2ZW50KSA9PiB7XG5cdFx0XHRsb2dnZXIuZXJyb3IoXCJGYWlsZWQgdG8gY29ubmVjdCB0byBkZXYgc2VydmVyXCIsIGV2ZW50KTtcblx0XHR9KTtcblx0XHR3cy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCAoZSkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y29uc3QgbWVzc2FnZSA9IEpTT04ucGFyc2UoZS5kYXRhKTtcblx0XHRcdFx0aWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJjdXN0b21cIikgd3M/LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KG1lc3NhZ2UuZXZlbnQsIHsgZGV0YWlsOiBtZXNzYWdlLmRhdGEgfSkpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGxvZ2dlci5lcnJvcihcIkZhaWxlZCB0byBoYW5kbGUgbWVzc2FnZVwiLCBlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdHJldHVybiB3cztcbn1cblxuLy8jZW5kcmVnaW9uXG4vLyNyZWdpb24gc3JjL3ZpcnR1YWwvcmVsb2FkLWh0bWwudHNcbmlmIChpbXBvcnQubWV0YS5lbnYuQ09NTUFORCA9PT0gXCJzZXJ2ZVwiKSB0cnkge1xuXHRnZXREZXZTZXJ2ZXJXZWJTb2NrZXQoKS5hZGRXeHRFdmVudExpc3RlbmVyKFwid3h0OnJlbG9hZC1wYWdlXCIsIChldmVudCkgPT4ge1xuXHRcdGlmIChldmVudC5kZXRhaWwgPT09IGxvY2F0aW9uLnBhdGhuYW1lLnN1YnN0cmluZygxKSkgbG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xufSBjYXRjaCAoZXJyKSB7XG5cdGxvZ2dlci5lcnJvcihcIkZhaWxlZCB0byBzZXR1cCB3ZWIgc29ja2V0IGNvbm5lY3Rpb24gd2l0aCBkZXYgc2VydmVyXCIsIGVycik7XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgIH07Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsU0FBUyxNQUFNLFdBQVcsTUFBTTtBQUUvQixNQUFJLE9BQU8sS0FBSyxDQUFDLE1BQU0sU0FBVSxRQUFPLFNBQVMsS0FBSyxNQUFBLENBQU8sSUFBSSxHQUFHLElBQUk7QUFBQSxNQUNuRSxRQUFPLFNBQVMsR0FBRyxJQUFJO0FBQzdCO0FBSUEsTUFBTSxTQUFTO0FBQUEsRUFDZCxPQUFPLElBQUksU0FBUyxNQUFNLFFBQVEsT0FBTyxHQUFHLElBQUk7QUFBQSxFQUNoRCxLQUFLLElBQUksU0FBUyxNQUFNLFFBQVEsS0FBSyxHQUFHLElBQUk7QUFBQSxFQUM1QyxNQUFNLElBQUksU0FBUyxNQUFNLFFBQVEsTUFBTSxHQUFHLElBQUk7QUFBQSxFQUM5QyxPQUFPLElBQUksU0FBUyxNQUFNLFFBQVEsT0FBTyxHQUFHLElBQUk7QUFDakQ7QUFJQSxJQUFJO0FBSUosU0FBUyx3QkFBd0I7QUFFaEMsTUFBSSxNQUFNLE1BQU07QUFDZixVQUFNLFlBQVk7QUFDbEIsV0FBTyxNQUFNLDhCQUE4QixTQUFTO0FBQ3BELFNBQUssSUFBSSxVQUFVLFdBQVcsVUFBVTtBQUN4QyxPQUFHLHNCQUFzQixHQUFHLGlCQUFpQixLQUFLLEVBQUU7QUFDcEQsT0FBRyxhQUFhLENBQUMsT0FBTyxZQUFZLElBQUksS0FBSyxLQUFLLFVBQVU7QUFBQSxNQUMzRCxNQUFNO0FBQUEsTUFDTjtBQUFBLE1BQ0E7QUFBQSxJQUFBLENBQ0EsQ0FBQztBQUNGLE9BQUcsaUJBQWlCLFFBQVEsTUFBTTtBQUNqQyxhQUFPLE1BQU0seUJBQXlCO0FBQUEsSUFDdkMsQ0FBQztBQUNELE9BQUcsaUJBQWlCLFNBQVMsTUFBTTtBQUNsQyxhQUFPLE1BQU0sOEJBQThCO0FBQUEsSUFDNUMsQ0FBQztBQUNELE9BQUcsaUJBQWlCLFNBQVMsQ0FBQyxVQUFVO0FBQ3ZDLGFBQU8sTUFBTSxtQ0FBbUMsS0FBSztBQUFBLElBQ3RELENBQUM7QUFDRCxPQUFHLGlCQUFpQixXQUFXLENBQUMsTUFBTTtBQUNyQyxVQUFJO0FBQ0gsY0FBTSxVQUFVLEtBQUssTUFBTSxFQUFFLElBQUk7QUFDakMsWUFBSSxRQUFRLFNBQVMsU0FBVSxLQUFJLGNBQWMsSUFBSSxZQUFZLFFBQVEsT0FBTyxFQUFFLFFBQVEsUUFBUSxLQUFBLENBQU0sQ0FBQztBQUFBLE1BQzFHLFNBQVMsS0FBSztBQUNiLGVBQU8sTUFBTSw0QkFBNEIsR0FBRztBQUFBLE1BQzdDO0FBQUEsSUFDRCxDQUFDO0FBQUEsRUFDRjtBQUNBLFNBQU87QUFDUjtBQUl5QyxJQUFJO0FBQzVDLDBCQUF3QixvQkFBb0IsbUJBQW1CLENBQUMsVUFBVTtBQUN6RSxRQUFJLE1BQU0sV0FBVyxTQUFTLFNBQVMsVUFBVSxDQUFDLFlBQVksT0FBQTtBQUFBLEVBQy9ELENBQUM7QUFDRixTQUFTLEtBQUs7QUFDYixTQUFPLE1BQU0seURBQXlELEdBQUc7QUFDMUU7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdfQ==
