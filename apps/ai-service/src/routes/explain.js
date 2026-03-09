const express = require('express');
const router = express.Router();
const { sanitizeRequest } = require('../services/sanitize');
const { callAI } = require('../services/ai');

router.post('/explain', async (req, res) => {
  try {
    const { request, diagnostics } = req.body;
    
    if (!request) {
      return res.status(400).json({ error: 'Request data is required' });
    }
    
    // Sanitize sensitive data
    const sanitizedData = sanitizeRequest({
      ...request,
      diagnostics: diagnostics || []
    });
    
    // Get AI explanation
    const explanation = await callAI(sanitizedData);
    
    res.json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error('AI explanation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate explanation'
    });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-service' });
});

module.exports = router;
