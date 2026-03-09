const express = require('express');
const cors = require('cors');
const explainRoute = require('./routes/explain');

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', explainRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI service running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Explain: POST http://localhost:${PORT}/api/explain`);
});
