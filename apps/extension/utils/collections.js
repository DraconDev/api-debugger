/* Collections management - save and organize requests */

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// === Collection Operations ===

async function getAllCollections() {
  const res = await chrome.storage.local.get(['collections']);
  return res.collections || [];
}

async function getCollection(id) {
  const collections = await getAllCollections();
  return collections.find(c => c.id === id) || null;
}

async function createCollection(name, description = '') {
  const collections = await getAllCollections();
  const newCollection = {
    id: generateId(),
    name,
    description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    requestCount: 0
  };
  collections.push(newCollection);
  await chrome.storage.local.set({ collections });
  return newCollection;
}

async function updateCollection(id, updates) {
  const collections = await getAllCollections();
  const index = collections.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  collections[index] = {
    ...collections[index],
    ...updates,
    updatedAt: Date.now()
  };
  
  await chrome.storage.local.set({ collections });
  return collections[index];
}

async function deleteCollection(id) {
  const collections = await getAllCollections();
  const filtered = collections.filter(c => c.id !== id);
  await chrome.storage.local.set({ collections: filtered });
  
  // Also delete all saved requests in this collection
  const savedRequests = await getAllSavedRequests();
  const remaining = savedRequests.filter(r => r.collectionId !== id);
  await chrome.storage.local.set({ savedRequests: remaining });
  
  return true;
}

// === Saved Request Operations ===

async function getAllSavedRequests() {
  const res = await chrome.storage.local.get(['savedRequests']);
  return res.savedRequests || [];
}

async function getSavedRequest(id) {
  const requests = await getAllSavedRequests();
  return requests.find(r => r.id === id) || null;
}

async function getRequestsByCollection(collectionId) {
  const requests = await getAllSavedRequests();
  return requests.filter(r => r.collectionId === collectionId);
}

async function saveRequestToCollection(collectionId, request, name = '', tags = [], description = '') {
  const collections = await getAllCollections();
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) return null;
  
  const savedRequests = await getAllSavedRequests();
  const savedRequest = {
    id: generateId(),
    collectionId,
    name: name || `${request.method} ${new URL(request.url).pathname}`,
    description,
    request: {
      method: request.method,
      url: request.url,
      requestHeaders: request.requestHeaders,
      requestBody: request.requestBody,
      requestBodyText: request.requestBodyText
    },
    tags,
    createdAt: Date.now()
  };
  
  savedRequests.push(savedRequest);
  await chrome.storage.local.set({ savedRequests });
  
  // Update collection request count
  const updatedCollection = await updateCollection(collectionId, {
    requestCount: (collection.requestCount || 0) + 1
  });
  
  return savedRequest;
}

async function updateSavedRequest(id, updates) {
  const savedRequests = await getAllSavedRequests();
  const index = savedRequests.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  savedRequests[index] = {
    ...savedRequests[index],
    ...updates
  };
  
  await chrome.storage.local.set({ savedRequests: savedRequests });
  return savedRequests[index];
}

async function deleteSavedRequest(id) {
  const savedRequests = await getAllSavedRequests();
  const request = savedRequests.find(r => r.id === id);
  if (!request) return false;
  
  const filtered = savedRequests.filter(r => r.id !== id);
  await chrome.storage.local.set({ savedRequests: filtered });
  
  // Update collection request count
  const collections = await getAllCollections();
  const collection = collections.find(c => c.id === request.collectionId);
  if (collection) {
    await updateCollection(collection.id, {
      requestCount: Math.max(0, (collection.requestCount || 1) - 1)
    });
  }
  
  return true;
}

async function searchSavedRequests(query) {
  const requests = await getAllSavedRequests();
  const lowerQuery = query.toLowerCase();
  
  return requests.filter(r => {
    return r.name.toLowerCase().includes(lowerQuery) ||
           r.request.url.toLowerCase().includes(lowerQuery) ||
           r.tags.some(t => t.toLowerCase().includes(lowerQuery));
  });
}

// Expose globally
window.collectionsHelpers = {
  getAllCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  getAllSavedRequests,
  getSavedRequest,
  getRequestsByCollection,
  saveRequestToCollection,
  updateSavedRequest,
  deleteSavedRequest,
  searchSavedRequests
};
