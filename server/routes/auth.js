import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import verifyJWT from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function userView(doc) {
  return { id: doc._id.toString(), username: doc.displayName, avatar: doc.avatar };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName, avatar } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'email, password, and displayName are required' });
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, displayName, avatar: avatar || '🎵' });
    res.status(201).json({ token: makeToken(user._id.toString()), user: userView(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: makeToken(user._id.toString()), user: userView(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: userView(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
