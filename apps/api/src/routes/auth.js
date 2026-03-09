const express = require('express');
const jwt = require('jsonwebtoken');
const store = require('../services/store');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Simple password hashing (replace with bcrypt in production)
function hashPassword(password) {
  // In production, use bcrypt
  return Buffer.from(password).toString('base64');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Middleware to require auth
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.userId = payload.userId;
  next();
}

// Register
router.post('/register', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  if (store.getUserByEmail(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  
  const id = `user_${Date.now()}`;
  const user = store.createUser(id, email, hashPassword(password));
  
  const token = generateToken(user.id);
  
  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email }
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = store.getUserByEmail(email);
  
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateToken(user.id);
  
  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email }
  });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  const user = store.getUser(req.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    success: true,
    user: { id: user.id, email: user.email }
  });
});

// Logout (client-side token deletion)
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = { router, requireAuth };
