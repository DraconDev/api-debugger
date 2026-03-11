/**
 * API Client Setup for Dracon Extension
 *
 * Uses createStarterExtension() to bundle config, API, auth, storage,
 * and starter-friendly hooks.
 */

import { createStarterExtension } from "@dracon/wxt-shared/starter";

export const ext = createStarterExtension({
  appName: "APIDebugger",
  appId: "api-debugger",
});

export const {
  config,
  apiClient,
  authFlow,
  authStore,
  getAuthState,
  isAuthenticated,
  openLogin,
  openDashboard,
  logout,
  getUser,
  subscribe,
} = ext;

export type { DraconConfig, Environment } from "@dracon/wxt-shared";
