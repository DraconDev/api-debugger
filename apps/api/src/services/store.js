/* In-memory data store - replace with real database later */
const users = new Map();
const collections = new Map();
const savedRequests = new Map();
const userTokens = new Map();

function createUser(id, email, passwordHash) {
  const user = {
    id,
    email,
    passwordHash,
    createdAt: Date.now()
  };
  users.set(id, user);
  return user;
}

function getUser(id) {
  return users.get(id);
}

function getUserByEmail(email) {
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
  return null;
}

function createCollection(userId, collection) {
  const id = `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const col = {
    id,
    userId,
    ...collection,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  collections.set(id, col);
  return col;
}

function getCollectionsByUser(userId) {
  return Array.from(collections.values()).filter(c => c.userId === userId);
}

function updateCollection(id, updates) {
  const col = collections.get(id);
  if (!col) return null;
  const updated = {
    ...col,
    ...updates,
    updatedAt: Date.now()
  };
  collections.set(id, updated);
  return updated;
}

function deleteCollection(id) {
  // Delete all saved requests in this collection
  for (const [reqId, req] of savedRequests.entries()) {
    if (req.collectionId === id) {
      savedRequests.delete(reqId);
    }
  }
  return collections.delete(id);
}

function createSavedRequest(userId, request) {
  const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const saved = {
    id,
    userId,
    ...request,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  savedRequests.set(id, saved);
  return saved;
}

function getSavedRequestsByUser(userId) {
  return Array.from(savedRequests.values()).filter(r => r.userId === userId);
}

function updateSavedRequest(id, updates) {
  const req = savedRequests.get(id);
  if (!req) return null;
  const updated = {
    ...req,
    ...updates,
    updatedAt: Date.now()
  };
  savedRequests.set(id, updated);
  return updated;
}

function deleteSavedRequest(id) {
  return savedRequests.delete(id);
}

module.exports = {
  createUser,
  getUser,
  getUserByEmail,
  createCollection,
  getCollectionsByUser,
  updateCollection,
  deleteCollection,
  createSavedRequest,
  getSavedRequestsByUser,
  updateSavedRequest,
  deleteSavedRequest
};
