/**
 * Background Service Worker
 * 
 * Handles:
 * - API proxy requests from content scripts
 * - Extension lifecycle events
 * - Message routing
 */

import { 
  createMessageRouter, 
  isBackgroundMessage,
  setupLifecycle 
} from "@dracon/wxt-shared/background";
import { apiClient } from "@/utils/api";
import { authStore, defaultAuthStore } from "@/utils/store";

// Create message router with API client
const router = createMessageRouter({
  apiClient,
  handlers: {
    // Add custom message handlers here
    // 'customAction': async (msg, sender) => { ... },
  },
});

export default defineBackground(() => {
  console.log("[Background] Service worker started");

  // Handle messages from content scripts and popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isBackgroundMessage(message)) return;

    router(message, sender)
      .then((response) => {
        if (response !== undefined) {
          sendResponse(response);
        }
      })
      .catch((err) => {
        console.error("[Background] Message error:", err);
        sendResponse({ error: err.message });
      });

    return true; // Async response
  });

  // Setup lifecycle callbacks
  setupLifecycle({
    onInstall: async () => {
      console.log("[Background] Extension installed");
      
      // Initialize auth store
      try {
        await authStore.setValue(defaultAuthStore);
      } catch (error) {
        console.error("[Background] Failed to initialize auth store:", error);
      }

      // Open welcome page or onboarding
      // browser.tabs.create({ url: browser.runtime.getURL("welcome.html") });
    },
    onUpdate: () => {
      console.log("[Background] Extension updated");
    },
  });
});
