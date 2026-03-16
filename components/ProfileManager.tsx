import { useState, useEffect } from "react";
import {
  getProfiles,
  getActiveProfileId,
  setActiveProfileId,
  createProfile,
  deleteProfile,
  duplicateProfile,
  resetProfile,
  type Profile,
} from "@/lib/profiles";

export function ProfileManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const [p, a] = await Promise.all([getProfiles(), getActiveProfileId()]);
      setProfiles(p);
      setActiveId(a);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitch = async (id: string) => {
    await setActiveProfileId(id);
    setActiveId(id);
    // Reload the page to apply the new profile
    window.location.reload();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProfile(newName.trim());
    setNewName("");
    setShowCreate(false);
    await loadProfiles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this profile? This cannot be undone.")) return;
    await deleteProfile(id);
    await loadProfiles();
  };

  const handleReset = async (id: string) => {
    if (!confirm("Reset this profile to its default data?")) return;
    await resetProfile(id);
    if (id === activeId) {
      window.location.reload();
    } else {
      await loadProfiles();
    }
  };

  const handleDuplicate = async (id: string) => {
    await duplicateProfile(id);
    await loadProfiles();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Profiles</h3>
        <p className="text-xs text-muted-foreground">
          Each profile is a separate workspace with its own collections,
          environments, and AI settings.
        </p>
      </div>

      <div className="space-y-2">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`p-3 rounded-lg border transition-colors ${
              profile.id === activeId
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-accent/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg flex-shrink-0">{profile.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {profile.name}
                  </span>
                  {profile.id === activeId && (
                    <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                  {profile.isBuiltIn && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      Built-in
                    </span>
                  )}
                </div>
                {profile.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {profile.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 mt-2">
              {profile.id !== activeId && (
                <button
                  onClick={() => handleSwitch(profile.id)}
                  className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Switch
                </button>
              )}
              <button
                onClick={() => handleDuplicate(profile.id)}
                className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
              >
                Duplicate
              </button>
              {profile.isBuiltIn && (
                <button
                  onClick={() => handleReset(profile.id)}
                  className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                >
                  Reset
                </button>
              )}
              {!profile.isBuiltIn && (
                <button
                  onClick={() => handleDelete(profile.id)}
                  className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded ml-auto"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create new profile */}
      {showCreate ? (
        <div className="p-3 rounded-lg border border-border bg-card">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Profile name..."
            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg mb-2"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewName("");
              }}
              className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          + New Profile
        </button>
      )}

      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Switching profiles reloads the page. Your current work is auto-saved
          to the active profile.
        </p>
      </div>
    </div>
  );
}
