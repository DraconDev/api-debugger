/**
 * Feature Flags System
 * 
 * Allows enabling/disabling features without code changes.
 * Useful for gradual rollouts and A/B testing.
 */

import { storage } from "wxt/utils/storage";

interface FeatureFlags {
  [key: string]: boolean;
}

const defaultFeatures: FeatureFlags = {
  // Core features
  "auth.enabled": true,
  "analytics.enabled": true,
  "errorReporting.enabled": true,
  
  // Experimental features (disabled by default)
  "experimental.newUI": false,
  "experimental.aiEnhancements": false,
  "experimental.betaFeatures": false,
};

const featureStore = storage.defineItem<FeatureFlags>("sync:features", {
  fallback: defaultFeatures,
});

/**
 * Check if a feature is enabled
 */
export async function isEnabled(featureKey: string): Promise<boolean> {
  try {
    const features = await featureStore.getValue();
    return features[featureKey] ?? defaultFeatures[featureKey] ?? false;
  } catch (error) {
    console.error(`[FeatureFlags] Failed to check ${featureKey}:`, error);
    return false;
  }
}

/**
 * Enable a feature
 */
export async function enable(featureKey: string): Promise<void> {
  const features = await featureStore.getValue();
  await featureStore.setValue({ ...features, [featureKey]: true });
}

/**
 * Disable a feature
 */
export async function disable(featureKey: string): Promise<void> {
  const features = await featureStore.getValue();
  await featureStore.setValue({ ...features, [featureKey]: false });
}

/**
 * Toggle a feature
 */
export async function toggle(featureKey: string): Promise<boolean> {
  const current = await isEnabled(featureKey);
  await (current ? disable(featureKey) : enable(featureKey));
  return !current;
}

/**
 * Get all feature flags
 */
export async function getAllFeatures(): Promise<FeatureFlags> {
  return featureStore.getValue();
}

/**
 * Reset to defaults
 */
export async function resetFeatures(): Promise<void> {
  await featureStore.setValue(defaultFeatures);
}

/**
 * React Hook for feature flags
 * (Usage in React components)
 */
export function createFeatureHook(featureKey: string) {
  return {
    async check(): Promise<boolean> {
      return isEnabled(featureKey);
    },
    async enable(): Promise<void> {
      return enable(featureKey);
    },
    async disable(): Promise<void> {
      return disable(featureKey);
    },
  };
}

export default {
  isEnabled,
  enable,
  disable,
  toggle,
  getAllFeatures,
  resetFeatures,
};
