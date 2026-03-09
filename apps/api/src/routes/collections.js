const express = require('express');
const store = require('../services/store');
const { requireAuth } = require('./auth');

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// Get user's collections
router.get('/', (req, res) => {
  const collections = store.getCollectionsByUser(req.userId);
  res.json({ success: true, collections });
});

// Create collection
router.post('/', (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name required' });
  }
  
  const collection = store.createCollection(req.userId, { name, description });
  res.json({ success: true, collection });
});

// Update collection
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const collection = store.updateCollection(id, req.body);
  
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  
  res.json({ success: true, collection });
});

// Delete collection
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = store.deleteCollection(id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  
  res.json({ success: true });
});

module.exports = router;
