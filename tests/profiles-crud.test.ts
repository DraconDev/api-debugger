import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getProfiles,
  getActiveProfileId,
  setActiveProfileId,
  saveProfiles,
  saveProfileData,
  getProfileData,
  createProfile,
  deleteProfile,
  updateProfile,
  duplicateProfile,
  resetProfile,
  initializeProfiles,
  DEMO_PROFILE_ID,
  type Profile,
  type ProfileData,
} from "@/lib/profiles";

// Mock chrome.storage.sync
const storage: Record<string, unknown> = {};

const mockStorageSync = {
  get: vi.fn((key?: string | string[]) => {
    if (!key) return Promise.resolve({});
    if (Array.isArray(key)) {
      const result: Record<string, unknown> = {};
      for (const k of key) {
        if (storage[k] !== undefined) result[k] = storage[k];
      }
      return Promise.resolve(result);
    }
    return Promise.resolve({ [key]: storage[key] });
  }),
  set: vi.fn((items: Record<string, unknown>) => {
    Object.assign(storage, items);
    return Promise.resolve();
  }),
  remove: vi.fn((keys: string | string[]) => {
    if (Array.isArray(keys)) {
      for (const key of keys) delete storage[key];
    } else {
      delete storage[keys];
    }
    return Promise.resolve();
  }),
};

vi.stubGlobal("chrome", {
  storage: {
    sync: mockStorageSync,
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
});

describe("Profile System: CRUD Operations", () => {
  beforeEach(() => {
    // Clear storage before each test
    Object.keys(storage).forEach((key) => delete storage[key]);
    mockStorageSync.get.mockClear();
    mockStorageSync.set.mockClear();
    mockStorageSync.remove.mockClear();
  });

  describe("getProfiles", () => {
    it("returns empty array when no profiles exist and creates defaults", async () => {
      const profiles = await getProfiles();

      // Should create default profiles when none exist
      expect(Array.isArray(profiles)).toBe(true);
      // Should have called set to save the default profiles
      expect(mockStorageSync.set).toHaveBeenCalled();
    });

    it("returns existing profiles from storage", async () => {
      const existingProfiles: Profile[] = [
        {
          id: "profile-custom",
          name: "My Profile",
          icon: "📦",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      storage["apiDebugger_profiles"] = existingProfiles;

      const profiles = await getProfiles();

      expect(profiles).toEqual(existingProfiles);
    });

    it("returns default profiles on storage error", async () => {
      mockStorageSync.get.mockRejectedValueOnce(new Error("Storage error"));

      const profiles = await getProfiles();

      // Should fall back to default profiles
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
    });
  });

  describe("getActiveProfileId", () => {
    it("returns DEMO_PROFILE_ID when no active profile set", async () => {
      const id = await getActiveProfileId();
      expect(id).toBe(DEMO_PROFILE_ID);
    });

    it("returns stored active profile id", async () => {
      storage["apiDebugger_activeProfile"] = "profile-custom";

      const id = await getActiveProfileId();

      expect(id).toBe("profile-custom");
    });
  });

  describe("setActiveProfileId", () => {
    it("saves active profile id to storage", async () => {
      await setActiveProfileId("profile-test");

      expect(mockStorageSync.set).toHaveBeenCalledWith({
        apiDebugger_activeProfile: "profile-test",
      });
    });
  });

  describe("saveProfiles", () => {
    it("saves profiles array to storage", async () => {
      const profiles: Profile[] = [
        {
          id: "profile-1",
          name: "Profile 1",
          icon: "📁",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await saveProfiles(profiles);

      expect(mockStorageSync.set).toHaveBeenCalledWith({
        apiDebugger_profiles: profiles,
      });
    });
  });

  describe("getProfileData", () => {
    it("returns empty data for non-existent profile", async () => {
      const data = await getProfileData("profile-nonexistent");

      expect(data.collections).toEqual([]);
      expect(data.savedRequests).toEqual([]);
      expect(data.environments).toEqual([]);
    });

    it("returns stored data for existing profile", async () => {
      const storedData: ProfileData = {
        collections: [
          {
            id: "col1",
            name: "Test",
            createdAt: 0,
            updatedAt: 0,
            requestCount: 0,
          },
        ],
        savedRequests: [],
        environments: [],
      };
      storage["apiDebugger_pd_profile-custom"] = storedData;

      const data = await getProfileData("profile-custom");

      expect(data).toEqual(storedData);
    });

    it("auto-populates demo data for DEMO_PROFILE_ID", async () => {
      // Ensure no existing data
      delete storage["apiDebugger_pd_" + DEMO_PROFILE_ID];

      const data = await getProfileData(DEMO_PROFILE_ID);

      // Should have demo collections and requests
      expect(data.collections.length).toBeGreaterThan(0);
      expect(data.savedRequests.length).toBeGreaterThan(0);
      expect(data.environments.length).toBeGreaterThan(0);
    });
  });

  describe("saveProfileData", () => {
    it("saves profile data with correct key format", async () => {
      const data: ProfileData = {
        collections: [],
        savedRequests: [],
        environments: [],
      };

      await saveProfileData("profile-test", data);

      expect(mockStorageSync.set).toHaveBeenCalledWith({
        "apiDebugger_pd_profile-test": data,
      });
    });
  });

  describe("createProfile", () => {
    it("creates new profile with correct structure", async () => {
      const profile = await createProfile("New Profile", "A test profile");

      expect(profile.id).toMatch(/^profile-\d+$/);
      expect(profile.name).toBe("New Profile");
      expect(profile.description).toBe("A test profile");
      expect(profile.icon).toBe("📋");
      expect(profile.isBuiltIn).toBe(false);
      expect(profile.createdAt).toBeDefined();
      expect(profile.updatedAt).toBeDefined();
    });

    it("adds new profile to profiles list", async () => {
      // Set up existing profiles
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-existing",
          name: "Existing",
          icon: "📁",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await createProfile("New Profile");

      const setCall = mockStorageSync.set.mock.calls.find((call) =>
        Array.isArray(call[0]?.apiDebugger_profiles),
      );
      expect(setCall).toBeDefined();
      const savedProfiles = setCall[0]["apiDebugger_profiles"];
      expect(savedProfiles.length).toBe(2);
      expect(savedProfiles.some((p: Profile) => p.name === "New Profile")).toBe(
        true,
      );
    });

    it("initializes empty data for new profile", async () => {
      await createProfile("Empty Profile");

      const setCall = mockStorageSync.set.mock.calls.find(
        (call) => call[0] && "apiDebugger_pd_" in call[0],
      );
      expect(setCall).toBeDefined();
    });

    it("generates unique ID for each profile", async () => {
      const p1 = await createProfile("Profile 1");
      const p2 = await createProfile("Profile 2");

      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe("deleteProfile", () => {
    it("cannot delete built-in profile", async () => {
      storage["apiDebugger_profiles"] = [
        {
          id: DEMO_PROFILE_ID,
          name: "Demo",
          icon: "🎯",
          isBuiltIn: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await deleteProfile(DEMO_PROFILE_ID);

      // Should not have called remove
      expect(mockStorageSync.remove).not.toHaveBeenCalled();
    });

    it("removes profile from list", async () => {
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-to-delete",
          name: "To Delete",
          icon: "🗑️",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "profile-to-keep",
          name: "To Keep",
          icon: "📁",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await deleteProfile("profile-to-delete");

      const setCall = mockStorageSync.set.mock.find(
        (call) => call[0]?.apiDebugger_profiles,
      );
      const remaining = setCall[0]["apiDebugger_profiles"];
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe("profile-to-keep");
    });

    it("removes profile data from storage", async () => {
      storage["apiDebugger_pd_profile-custom"] = {
        collections: [],
        savedRequests: [],
        environments: [],
      };

      await deleteProfile("profile-custom");

      expect(mockStorageSync.remove).toHaveBeenCalledWith(
        "apiDebugger_pd_profile-custom",
      );
    });

    it("switches to demo if deleting active profile", async () => {
      storage["apiDebugger_activeProfile"] = "profile-custom";
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-custom",
          name: "Custom",
          icon: "📦",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await deleteProfile("profile-custom");

      const setCall = mockStorageSync.set.mock.find(
        (call) => call[0]?.apiDebugger_activeProfile !== undefined,
      );
      expect(setCall[0].apiDebugger_activeProfile).toBe(DEMO_PROFILE_ID);
    });

    it("does nothing for non-existent profile", async () => {
      await deleteProfile("profile-nonexistent");

      expect(mockStorageSync.remove).not.toHaveBeenCalled();
    });
  });

  describe("updateProfile", () => {
    it("updates profile metadata", async () => {
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-test",
          name: "Old Name",
          icon: "📁",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await updateProfile("profile-test", {
        name: "New Name",
        description: "Updated description",
      });

      const setCall = mockStorageSync.set.mock.find(
        (call) => call[0]?.apiDebugger_profiles,
      );
      const updated = setCall[0]["apiDebugger_profiles"][0];
      expect(updated.name).toBe("New Name");
      expect(updated.description).toBe("Updated description");
    });

    it("updates only specified fields", async () => {
      const originalTime = Date.now();
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-test",
          name: "Original Name",
          description: "Original desc",
          icon: "📁",
          isBuiltIn: false,
          createdAt: originalTime,
          updatedAt: originalTime,
        },
      ];

      await updateProfile("profile-test", { name: "New Name" });

      const setCall = mockStorageSync.set.mock.find(
        (call) => call[0]?.apiDebugger_profiles,
      );
      const updated = setCall[0]["apiDebugger_profiles"][0];
      expect(updated.name).toBe("New Name");
      expect(updated.description).toBe("Original desc"); // unchanged
      expect(updated.icon).toBe("📁"); // unchanged
    });

    it("does nothing for non-existent profile", async () => {
      await updateProfile("profile-nonexistent", { name: "New Name" });

      expect(mockStorageSync.set).not.toHaveBeenCalled();
    });
  });

  describe("duplicateProfile", () => {
    it("creates copy with new ID and name", async () => {
      storage["apiDebugger_pd_profile-source"] = {
        collections: [
          {
            id: "col1",
            name: "Col",
            createdAt: 0,
            updatedAt: 0,
            requestCount: 1,
          },
        ],
        savedRequests: [],
        environments: [],
      };
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-source",
          name: "Source",
          icon: "📂",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const copy = await duplicateProfile("profile-source", "Copy of Source");

      expect(copy.id).toMatch(/^profile-\d+$/);
      expect(copy.name).toBe("Copy of Source");
      expect(copy.id).not.toBe("profile-source");
    });

    it("copies all profile data", async () => {
      storage["apiDebugger_pd_profile-source"] = {
        collections: [
          {
            id: "col1",
            name: "Test Col",
            createdAt: 0,
            updatedAt: 0,
            requestCount: 5,
          },
        ],
        savedRequests: [
          {
            id: "req1",
            collectionId: "col1",
            name: "Request",
            request: {} as any,
            tags: [],
            createdAt: 0,
          },
        ],
        environments: [
          {
            id: "env1",
            name: "Test Env",
            isActive: false,
            variables: [],
            createdAt: 0,
            updatedAt: 0,
          },
        ],
      };
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-source",
          name: "Source",
          icon: "📂",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await duplicateProfile("profile-source");

      const dataCall = mockStorageSync.set.mock.find(
        (call) =>
          call[0] &&
          Object.keys(call[0]).some((k) =>
            k.startsWith("apiDebugger_pd_profile-"),
          ),
      );
      expect(dataCall).toBeDefined();
    });

    it("uses default copy name if not specified", async () => {
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-source",
          name: "Original",
          icon: "📂",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      storage["apiDebugger_pd_profile-source"] = {
        collections: [],
        savedRequests: [],
        environments: [],
      };

      const copy = await duplicateProfile("profile-source");

      expect(copy.name).toBe("Original (copy)");
    });

    it("adds duplicated profile to list", async () => {
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-source",
          name: "Source",
          icon: "📂",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      storage["apiDebugger_pd_profile-source"] = {
        collections: [],
        savedRequests: [],
        environments: [],
      };

      await duplicateProfile("profile-source");

      const profilesCall = mockStorageSync.set.mock.find(
        (call) => call[0]?.apiDebugger_profiles,
      );
      expect(profilesCall[0].apiDebugger_profiles.length).toBe(2);
    });
  });

  describe("resetProfile", () => {
    it("resets demo profile to default data", async () => {
      storage["apiDebugger_profiles"] = [
        {
          id: DEMO_PROFILE_ID,
          name: "Demo",
          icon: "🎯",
          isBuiltIn: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      // Set wrong data
      storage["apiDebugger_pd_" + DEMO_PROFILE_ID] = {
        collections: [],
        savedRequests: [],
        environments: [],
      };

      await resetProfile(DEMO_PROFILE_ID);

      // Should have restored demo data
      const setCall = mockStorageSync.set.mock.find(
        (call) => call[0]?.["apiDebugger_pd_" + DEMO_PROFILE_ID],
      );
      expect(setCall).toBeDefined();
      const data = setCall[0]["apiDebugger_pd_" + DEMO_PROFILE_ID];
      expect(data.collections.length).toBeGreaterThan(0);
    });

    it("does nothing for non-built-in profiles", async () => {
      storage["apiDebugger_profiles"] = [
        {
          id: "profile-custom",
          name: "Custom",
          icon: "📦",
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await resetProfile("profile-custom");

      expect(mockStorageSync.set).not.toHaveBeenCalled();
    });
  });

  describe("initializeProfiles", () => {
    it("creates default profiles if none exist", async () => {
      await initializeProfiles();

      expect(mockStorageSync.set).toHaveBeenCalled();
    });

    it("migrates old flat storage data", async () => {
      storage["apiDebugger_collections"] = [
        {
          id: "col1",
          name: "Old",
          createdAt: 0,
          updatedAt: 0,
          requestCount: 1,
        },
      ];
      storage["apiDebugger_savedRequests"] = [];

      await initializeProfiles();

      // Should have migrated to profile data
      expect(mockStorageSync.set).toHaveBeenCalled();
    });

    it("cleans up old storage keys after migration", async () => {
      storage["apiDebugger_collections"] = [
        {
          id: "col1",
          name: "Old",
          createdAt: 0,
          updatedAt: 0,
          requestCount: 1,
        },
      ];
      storage["apiDebugger_savedRequests"] = [];

      await initializeProfiles();

      // Should have removed old keys
      expect(mockStorageSync.remove).toHaveBeenCalledWith([
        "apiDebugger_collections",
        "apiDebugger_savedRequests",
      ]);
    });

    it("sets default profile as active if no active profile", async () => {
      await initializeProfiles();

      const activeCall = mockStorageSync.set.mock.find(
        (call) => call[0]?.apiDebugger_activeProfile !== undefined,
      );
      expect(activeCall[0].apiDebugger_activeProfile).toBe("profile-default");
    });
  });
});

describe("Profile System: DEMO_PROFILE_ID Constant", () => {
  it("is exported and has correct value", () => {
    expect(DEMO_PROFILE_ID).toBe("profile-demo");
  });
});
