/**
 * Storage Setup
 * 
 * Extension-specific stores. Auth store is provided by utils/api.ts
 */

import { createSettingsStore } from "@dracon/wxt-shared/storage";
import { storage } from "wxt/utils/storage";

// Extension-specific settings
export interface MyExtensionSettings {
  theme: "light" | "dark" | "system";
  enabled: boolean;
}

export const defaultSettings: MyExtensionSettings = {
  theme: "system",
  enabled: true,
};

export const settingsStore = createSettingsStore<MyExtensionSettings>(
  "sync:settings",
  defaultSettings
);

// Example: Custom store
export interface MyDataStore {
  items: string[];
  lastSync: string;
}

export const defaultMyData: MyDataStore = {
  items: [],
  lastSync: "",
};

export const myDataStore = storage.defineItem<MyDataStore>("local:myData", {
  fallback: defaultMyData,
});
