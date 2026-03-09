const express = require('express');
const store = require('../services/store');
const { requireAuth } = require('./auth');

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// Push local changes to server
router.post('/push', (req, res) => {
  const { collections, savedRequests, lastSyncTime } = req.body;
  
  const results = {
    collections: { created: 0, updated: 0, failed: 0 },
    savedRequests: { created: 0, updated: 0, failed: 0 }
  };
  
  // Process collections
  if (collections) {
    collections.forEach(col => {
      try {
        const existing = store.getCollectionsByUser(req.userId).find(c => c.id === col.id);
        
        if (existing) {
          store.updateCollection(col.id, col);
          results.collections.updated++;
        } else {
          store.createCollection(req.userId, col);
          results.collections.created++;
        }
      } catch (e) {
        results.collections.failed++;
      }
    });
  }
  
  // Process saved requests
  if (savedRequests) {
    savedRequests.forEach(req => {
      try {
        const existing = store.getSavedRequestsByUser(req.userId).find(r => r.id === req.id);
        
        if (existing) {
          store.updateSavedRequest(req.id, req);
          results.savedRequests.updated++;
        } else {
          store.createSavedRequest(req.userId, req);
          results.savedRequests.created++;
        }
      } catch (e) {
        results.savedRequests.failed++;
      }
    });
  }
  
  res.json({
    success: true,
    results,
    syncTime: Date.now()
  });
});

// Pull changes from server
router.get('/pull', (req, res) => {
  const { lastSyncTime } = req.query;
  
  const collections = store.getCollectionsByUser(req.userId);
  const savedRequests = store.getSavedRequestsByUser(req.userId);
  
  res.json({
    success: true,
    collections,
    savedRequests,
    syncTime: Date.now()
  });
});

module.exports = router;
