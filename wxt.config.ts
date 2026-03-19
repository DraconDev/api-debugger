import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name:
      process.env.NODE_ENV === "development"
        ? "API Debugger (Dev)"
        : "API Debugger",
    description:
      "Inspect every HTTP request your browser makes. Capture, replay, build, and debug APIs. No account. No cloud. No spying.",
    version: "0.1.0",
    default_locale: "en",
    permissions: [
      "webRequest",
      "webRequestAuthProvider",
      "storage",
      "activeTab",
      "tabs",
      "cookies",
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
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'",
    },
  },
});
