import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: process.env.NODE_ENV === "development" 
      ? "__MSG_extNameDev__" 
      : "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    version: "1.0.0",
    permissions: ["storage", "activeTab"],
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
    background: {
      service_worker: "background.ts",
      type: "module",
    },
    web_accessible_resources: [
      {
        resources: ["auth-callback.html"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
