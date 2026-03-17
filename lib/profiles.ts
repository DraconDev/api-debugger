/**
 * Profile system - each profile is a self-contained workspace
 *
 * A profile bundles: collections, saved requests, environments, and AI settings.
 * Switching profiles swaps the entire workspace. Demo is a built-in profile.
 */

import type { Collection, SavedRequest, Environment } from "@/types";
import { createDemoCollections } from "@/lib/demoProfile";

export interface Profile {
  id: string;
  name: string;
  description?: string;
  icon: string;
  isBuiltIn: boolean; // true for demo - can be reset but not deleted
  createdAt: number;
  updatedAt: number;
}

export interface ProfileData {
  collections: Collection[];
  savedRequests: SavedRequest[];
  environments: Environment[];
  aiSettings?: {
    apiKey: string;
    model: string;
    fallbacks: string[];
  };
}

const PROFILES_KEY = "apiDebugger_profiles";
const ACTIVE_PROFILE_KEY = "apiDebugger_activeProfile";

export const DEMO_PROFILE_ID = "profile-demo";

/**
 * Get all profiles. If none exist, creates default profiles automatically.
 */
export async function getProfiles(): Promise<Profile[]> {
  try {
    const result = await chrome.storage.sync.get(PROFILES_KEY);
    const profiles: Profile[] = result[PROFILES_KEY] || [];

    // If no profiles exist, create defaults inline
    if (profiles.length === 0) {
      console.log("[Profiles] Creating default profiles...");
      const defaultProfiles = createDefaultProfiles();
      try {
        await chrome.storage.sync.set({ [PROFILES_KEY]: defaultProfiles });
      } catch (e) {
        console.warn("[Profiles] Failed to save to storage:", e);
      }
      return defaultProfiles;
    }

    return profiles;
  } catch (e) {
    console.error("[Profiles] Storage read failed:", e);
    return createDefaultProfiles();
  }
}

/**
 * Create the default profile (pre-loaded with demo data)
 */
function createDefaultProfiles(): Profile[] {
  const now = Date.now();
  return [
    {
      id: "profile-default",
      name: "My Workspace",
      description: "Empty - start fresh",
      icon: "🏠",
      isBuiltIn: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_PROFILE_ID,
      name: "Demo Examples",
      description: "21 requests to explore",
      icon: "🎯",
      isBuiltIn: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Get the active profile ID
 */
export async function getActiveProfileId(): Promise<string> {
  const result = await chrome.storage.sync.get(ACTIVE_PROFILE_KEY);
  return result[ACTIVE_PROFILE_KEY] || DEMO_PROFILE_ID;
}

/**
 * Set the active profile
 */
export async function setActiveProfileId(id: string): Promise<void> {
  await chrome.storage.sync.set({ [ACTIVE_PROFILE_KEY]: id });
}

/**
 * Save profiles list
 */
export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await chrome.storage.sync.set({ [PROFILES_KEY]: profiles });
}

/**
 * Get data for a specific profile.
 * Default profile auto-creates demo data on first access.
 */
export async function getProfileData(profileId: string): Promise<ProfileData> {
  const key = `apiDebugger_pd_${profileId}`;
  const result = await chrome.storage.sync.get(key);
  const data = result[key] as ProfileData | undefined;

  if (data) return data;

  // Auto-populate default profile with demo data on first access
  if (profileId === "profile-default") {
    console.log("[Profiles] Loading demo data into workspace...");
    const demo = createDemoCollections();
    const demoData: ProfileData = {
      collections: demo.collections,
      savedRequests: demo.requests,
      environments: demo.environments,
    };
    try {
      await chrome.storage.sync.set({ [key]: demoData });
    } catch (e) {
      console.warn("[Profiles] Failed to save demo data:", e);
    }
    return demoData;
  }

  return { collections: [], savedRequests: [], environments: [] };
}

/**
 * Save data for a specific profile
 */
export async function saveProfileData(
  profileId: string,
  data: ProfileData,
): Promise<void> {
  const key = `apiDebugger_pd_${profileId}`;
  await chrome.storage.sync.set({ [key]: data });
}

/**
 * Create a new empty profile
 */
export async function createProfile(
  name: string,
  description?: string,
): Promise<Profile> {
  const profile: Profile = {
    id: `profile-${Date.now()}`,
    name,
    description,
    icon: "📋",
    isBuiltIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const profiles = await getProfiles();
  profiles.push(profile);
  await saveProfiles(profiles);
  await saveProfileData(profile.id, {
    collections: [],
    savedRequests: [],
    environments: [],
  });

  return profile;
}

/**
 * Delete a profile (cannot delete built-in profiles)
 */
export async function deleteProfile(profileId: string): Promise<void> {
  const profiles = await getProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile || profile.isBuiltIn) return;

  const filtered = profiles.filter((p) => p.id !== profileId);
  await saveProfiles(filtered);

  // Clean up profile data
  const key = `apiDebugger_pd_${profileId}`;
  await chrome.storage.sync.remove(key);

  // If we deleted the active profile, switch to demo
  const activeId = await getActiveProfileId();
  if (activeId === profileId) {
    await setActiveProfileId(DEMO_PROFILE_ID);
  }
}

/**
 * Update a profile's metadata
 */
export async function updateProfile(
  profileId: string,
  updates: Partial<Pick<Profile, "name" | "description" | "icon">>,
): Promise<void> {
  const profiles = await getProfiles();
  const idx = profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return;

  profiles[idx] = { ...profiles[idx], ...updates, updatedAt: Date.now() };
  await saveProfiles(profiles);
}

/**
 * Initialize profiles - handles migration of old data.
 * Profile creation is now handled by getProfiles() automatically.
 */
export async function initializeProfiles(): Promise<void> {
  // getProfiles() creates default profiles if none exist
  const profiles = await getProfiles();
  console.log("[Profiles] Profiles:", profiles.length);

  // Migrate old flat storage data if it exists
  const existing = await chrome.storage.sync.get([
    "apiDebugger_collections",
    "apiDebugger_savedRequests",
  ]);
  const hasOldData = (existing.apiDebugger_collections || []).length > 0;

  if (hasOldData) {
    console.log("[Profiles] Migrating old data...");
    await saveProfileData("profile-default", {
      collections: existing.apiDebugger_collections || [],
      savedRequests: existing.apiDebugger_savedRequests || [],
      environments: [],
    });
    await setActiveProfileId("profile-default");
    // Clean up old keys
    await chrome.storage.sync.remove([
      "apiDebugger_collections",
      "apiDebugger_savedRequests",
    ]);
    return;
  }

  // Set default profile as active if no active profile set
  const activeId = await getActiveProfileId().catch(() => "");
  if (!activeId || !profiles.some((p) => p.id === activeId)) {
    await setActiveProfileId("profile-default");
  }
}

/**
 * Reset a built-in profile to its default data
 */
export async function resetProfile(profileId: string): Promise<void> {
  const profiles = await getProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile || !profile.isBuiltIn) return;

  if (profileId === DEMO_PROFILE_ID) {
    const demo = createDemoCollections();
    await saveProfileData(DEMO_PROFILE_ID, {
      collections: demo.collections,
      savedRequests: demo.requests,
      environments: demo.environments,
    });
  }
}

/**
 * Duplicate a profile (copies all data)
 */
export async function duplicateProfile(
  profileId: string,
  newName?: string,
): Promise<Profile> {
  const sourceData = await getProfileData(profileId);
  const profiles = await getProfiles();
  const source = profiles.find((p) => p.id === profileId);

  const newProfile: Profile = {
    id: `profile-${Date.now()}`,
    name: newName || `${source?.name || "Profile"} (copy)`,
    description: source?.description,
    icon: source?.icon || "📋",
    isBuiltIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  profiles.push(newProfile);
  await saveProfiles(profiles);
  await saveProfileData(newProfile.id, { ...sourceData });

  return newProfile;
}
