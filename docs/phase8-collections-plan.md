# Phase 8 — Collections Blueprint

## Objective
Allow users to save important requests, organize them into collections, and revisit them later.

## Data Model

```typescript
interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  requestIds: string[];
}

interface SavedRequest {
  id: string;
  collectionId: string;
  name: string;
  description?: string;
  request: RequestRecord;
  tags: string[];
  createdAt: number;
}
```

## Storage Strategy
- Use `chrome.storage.local` for collections and saved requests
- Separate keys: `collections`, `savedRequests`
- Index by ID for quick lookup

## Tasks

### 1. Create collections helper module
- `apps/extension/utils/collections.js`
- CRUD operations for collections
- CRUD operations for saved requests
- Query helpers (get by collection, search)

### 2. Add "Save to Collection" UI
- Button in detail panel
- Modal/dropdown to select or create collection
- Optional: name and tags for saved request

### 3. Create Collections Panel
- New view in popup (tab or button to switch)
- List all collections
- Expand collection to show saved requests
- Click to view saved request details

### 4. Implement collection management
- Create new collection
- Rename collection
- Delete collection (with confirmation)
- Move requests between collections

### 5. Add search/filter
- Search saved requests by name/url
- Filter by tags
- Filter by method/status

### 6. Persistence
- Auto-save on changes
- Handle storage limits
- Export/import collections

## Implementation

### Collections helper API
```javascript
// Collections
createCollection(name, description?)
updateCollection(id, updates)
deleteCollection(id)
getCollection(id)
getAllCollections()

// Saved requests
saveRequest(collectionId, request, name?, tags?, description?)
updateSavedRequest(id, updates)
deleteSavedRequest(id)
getSavedRequest(id)
getRequestsByCollection(collectionId)
searchSavedRequests(query)
```

### UI Components
1. **Save button** in detail view
2. **Collection selector** dropdown/modal
3. **Collections list** in main panel
4. **Collection detail** showing saved requests
5. **Request detail** for saved items

## Acceptance Criteria
- [ ] Users can create collections
- [ ] Users can save requests to collections
- [ ] Users can view saved requests
- [ ] Users can delete saved requests
- [ ] Collections persist across sessions
- [ ] UI is intuitive and fast

## Future Enhancements
- Cloud sync (Phase 9)
- Share collections
- Import/export collections
- Tags and categorization
- Request grouping/folders within collections
