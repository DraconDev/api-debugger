import { useState, useEffect } from "react";
import type { RequestRecord, Collection } from "@/types";

interface CollectionsViewProps {
  onSelectRequest: (request: RequestRecord) => void;
}

export function CollectionsView({ onSelectRequest }: CollectionsViewProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const result = await chrome.storage.local.get(["collections"]);
      setCollections(result.collections || []);
    } catch (err) {
      console.error("Failed to load collections:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading collections...
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No collections yet. Save a request to create one.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {collections.map((collection) => (
        <div key={collection.id} className="p-3">
          <div className="font-medium text-sm">{collection.name}</div>
          <div className="text-xs text-muted-foreground">
            {collection.requestCount} requests
          </div>
        </div>
      ))}
    </div>
  );
}
