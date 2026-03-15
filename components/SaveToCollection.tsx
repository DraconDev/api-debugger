import { useState } from "react";
import type { RequestRecord, Collection } from "@/types";

interface SaveToCollectionProps {
  request: RequestRecord;
  onSave?: () => void;
}

export function SaveToCollection({ request, onSave }: SaveToCollectionProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [saved, setSaved] = useState(false);

  const loadCollections = async () => {
    try {
      const result = await chrome.storage.sync.get(["apiDebugger_collections"]);
      setCollections(result.apiDebugger_collections || []);
    } catch (err) {
      console.error("Failed to load collections:", err);
    }
  };

  useState(() => {
    loadCollections();
  });

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    const newCollection: Collection = {
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newCollectionName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      requestCount: 0,
    };

    const result = await chrome.storage.sync.get(["apiDebugger_collections"]);
    const existing = result.apiDebugger_collections || [];
    const updated = [newCollection, ...existing];

    await chrome.storage.sync.set({ apiDebugger_collections: updated });
    setCollections(updated);
    setSelectedCollectionId(newCollection.id);
    setNewCollectionName("");
    setShowNewCollection(false);
  };

  const saveRequest = async () => {
    const collectionId = selectedCollectionId;
    if (!collectionId) {
      alert("Please select or create a collection");
      return;
    }

    const savedRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      collectionId,
      name: name || `${request.method} ${new URL(request.url).pathname}`,
      request,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: Date.now(),
    };

    const result = await chrome.storage.sync.get([
      "apiDebugger_savedRequests",
      "apiDebugger_collections",
    ]);
    const existingRequests = result.apiDebugger_savedRequests || [];
    const existingCollections = result.apiDebugger_collections || [];

    // Save request
    await chrome.storage.sync.set({
      apiDebugger_savedRequests: [savedRequest, ...existingRequests],
    });

    // Update collection count
    const collectionIndex = existingCollections.findIndex(
      (c: Collection) => c.id === collectionId,
    );
    if (collectionIndex !== -1) {
      existingCollections[collectionIndex].requestCount++;
      existingCollections[collectionIndex].updatedAt = Date.now();
      await chrome.storage.sync.set({
        apiDebugger_collections: existingCollections,
      });
    }

    setSaved(true);
    onSave?.();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-3 border-t border-border">
      <h3 className="text-xs font-medium mb-2">Save to Collection</h3>

      {saved ? (
        <div className="text-xs text-success">✓ Request saved!</div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Request name (optional)"
            className="w-full px-2 py-1 text-xs bg-muted rounded-md"
          />

          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="w-full px-2 py-1 text-xs bg-muted rounded-md"
          />

          <select
            value={selectedCollectionId}
            onChange={(e) => setSelectedCollectionId(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-muted rounded-md"
          >
            <option value="">Select collection...</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {showNewCollection ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="New collection name"
                className="w-full px-2 py-1 text-xs bg-muted rounded-md"
                onKeyDown={(e) => e.key === "Enter" && createCollection()}
              />
              <div className="flex gap-2">
                <button
                  onClick={createCollection}
                  className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewCollection(false)}
                  className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCollection(true)}
              className="w-full px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
            >
              + New Collection
            </button>
          )}

          <button
            onClick={saveRequest}
            disabled={!selectedCollectionId}
            className="w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50"
          >
            Save Request
          </button>
        </div>
      )}
    </div>
  );
}
