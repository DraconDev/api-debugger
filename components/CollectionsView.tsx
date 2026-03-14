import { useState, useEffect, useCallback } from "react";
import type { RequestRecord, Collection, SavedRequest } from "@/types";

interface CollectionsViewProps {
  onSelectRequest?: (request: RequestRecord) => void;
}

export function CollectionsView({ onSelectRequest }: CollectionsViewProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use sync storage for cross-browser sync
      const result = await chrome.storage.sync.get([
        "apiDebugger_collections",
        "apiDebugger_savedRequests",
      ]);
      setCollections(result.apiDebugger_collections || []);
      setSavedRequests(result.apiDebugger_savedRequests || []);
    } catch (err) {
      console.error("Failed to load collections:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    const newCollection: Collection = {
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newCollectionName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      requestCount: 0,
    };

    const updatedCollections = [newCollection, ...collections];
    await chrome.storage.sync.set({
      apiDebugger_collections: updatedCollections,
    });
    setCollections(updatedCollections);
    setNewCollectionName("");
    setShowNewCollection(false);
  };

  const deleteCollection = async (collectionId: string) => {
    if (!confirm("Delete this collection?")) return;

    const updatedCollections = collections.filter((c) => c.id !== collectionId);
    const updatedRequests = savedRequests.filter(
      (r) => r.collectionId !== collectionId,
    );

    await chrome.storage.sync.set({
      apiDebugger_collections: updatedCollections,
      apiDebugger_savedRequests: updatedRequests,
    });

    setCollections(updatedCollections);
    setSavedRequests(updatedRequests);
    setSelectedCollection(null);
  };

  const getCollectionRequests = (collectionId: string) => {
    return savedRequests.filter((r) => r.collectionId === collectionId);
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading collections...
      </div>
    );
  }

  // Show collection details
  if (selectedCollection) {
    const requests = getCollectionRequests(selectedCollection.id);

    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-border">
          <button
            onClick={() => setSelectedCollection(null)}
            className="text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            ← Back to collections
          </button>
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{selectedCollection.name}</h2>
            <button
              onClick={() => deleteCollection(selectedCollection.id)}
              className="text-xs text-destructive hover:text-destructive/80"
            >
              Delete
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {requests.length} saved requests
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {requests.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No saved requests in this collection
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((saved) => (
                <button
                  key={saved.id}
                  onClick={() => onSelectRequest?.(saved.request)}
                  className="w-full p-3 text-left hover:bg-muted/50"
                >
                  <div className="font-medium text-sm">{saved.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {saved.request.method} {saved.request.url}
                  </div>
                  {saved.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {saved.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-xs bg-muted rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show collections list
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="font-medium">Collections</h2>
        <button
          onClick={() => setShowNewCollection(!showNewCollection)}
          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          + New
        </button>
      </div>

      {showNewCollection && (
        <div className="p-3 border-b bg-muted/50">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="Collection name"
            className="w-full px-2 py-1 text-sm bg-background rounded mb-2"
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
      )}

      <div className="flex-1 overflow-auto">
        {collections.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No collections yet. Create one to start saving requests.
          </div>
        ) : (
          <div className="divide-y">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => setSelectedCollection(collection)}
                className="w-full p-3 text-left hover:bg-muted/50"
              >
                <div className="font-medium text-sm">{collection.name}</div>
                <div className="text-xs text-muted-foreground">
                  {collection.requestCount} requests
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
