/**
 * Content Script
 * 
 * Runs on web pages. Has limitations:
 * - Cannot access chrome.storage directly
 * - Cannot make authenticated API calls directly (CORS)
 * - Must communicate with background script via messages
 */

import { isContentScript, sendToBackground } from "@dracon/wxt-shared/extension";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("[Content] Script loaded on:", window.location.href);
    console.log("[Content] Is content script:", isContentScript());

    // Example: Listen for messages from popup/background
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("[Content] Received message:", message);
      
      if (message.type === "ping") {
        sendResponse({ pong: true, url: window.location.href });
      }
      
      if (message.type === "getPageContent") {
        // Access page DOM
        const content = document.body.innerText;
        sendResponse({ content });
      }
      
      return true;
    });

    // Example: Send message to background
    // (Content scripts must proxy API calls through background)
    async function fetchUserData() {
      try {
        const user = await sendToBackground({
          type: "apiProxyRequest",
          endpoint: "/api/v1/user",
          method: "GET",
        });
        console.log("[Content] User data:", user);
        return user;
      } catch (error) {
        console.error("[Content] Failed to fetch user:", error);
      }
    }

    // Uncomment to test:
    // fetchUserData();
  },
});
