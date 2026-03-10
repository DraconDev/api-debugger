import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: process.env.NODE_ENV === "development"
      ? "API Debugger (Dev)"
      : "API Debugger",
    description: "Browser-first API debugging tool - capture, inspect, replay, and debug API requests",
    version: "0.1.0",
    permissions: [
      "webRequest",
      "webRequestAuthProvider",
      "storage",
      "activeTab",
      "tabs"
    ],
    host_permissions: ["<all_urls>"],
    icons: {
      "16": "icon/16.png",
      "32": "icon/32.png",
      "48": "icon/48.png",
      "96": "icon/96.png",
      "128": "icon/128.png",
    },
    action: {
      default_popup: "popup.html",
      default_icon: {
        "16": "icon/16.png",
        "32": "icon/32.png",
        "48": "icon/48.png",
        "128": "icon/128.png",
      },
    },
    web_accessible_resources: [
      {
        resources: ["injected.js"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
