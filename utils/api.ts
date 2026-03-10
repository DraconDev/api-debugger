/**
 * API Client Setup for Momo Integration
 * 
 * Uses createStarterExtension() to bundle config, API, auth, storage,
 * and starter-friendly hooks.
 */

import { createStarterExtension } from "@dracon/wxt-shared/starter";

export const ext = createStarterExtension({
  appName: "MyExtension",
  appId: "myextension",
});

export const {
  config,
  apiClient,
  authStore,
  getAuthState,
  isAuthenticated,
  openLogin,
  openDashboard,
  logout,
  getUser,
  subscribe,
  hooks,
} = ext;

export type { DraconConfig, Environment } from "@dracon/wxt-shared";
