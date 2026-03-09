const express = require('express');
const store = require('../services/store');
const { requireAuth } = require('./auth');

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// Get user's saved requests
router.get('/', (req, res) => {
  const requests = store.getSavedRequestsByUser(req.userId);
  res.json({ success: true, requests });
});

// Save request
router.post('/', (req, res) => {
  const { collectionId, name, request, tags, description } = req.body;
  
  if (!collectionId || !request) {
    return res.status(400).json({ error: 'collectionId and request required' });
  }
  
  const saved = store.createSavedRequest(req.userId, {
    collectionId,
    name: name || 'Untitled',
    request,
    tags: tags || [],
    description
  });
  
  res.json({ success: true, savedRequest: saved });
});

// Update saved request
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const saved = store.updateSavedRequest(id, req.body);
  
  if (!saved) {
    return res.status(404).json({ error: 'Saved request not found' });
  }
  
  res.json({ success: true, savedRequest: saved });
});

// Delete saved request
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = store.deleteSavedRequest(id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Saved request not found' });
  }
  
  res.json({ success: true });
});

module.exports = router;
