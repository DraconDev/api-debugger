const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const collectionsRoutes = require('./routes/collections');
const savedRequestsRoutes = require('./routes/saved-requests');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 4321;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes.router);
app.use('/api/collections', collectionsRoutes);
app.use('/api/saved-requests', savedRequestsRoutes);
app.use('/api/sync', syncRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API Debugger Backend running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Auth: POST http://localhost:${PORT}/api/auth/register`);
});
