import express from 'express';
import verifyJWT from '../middleware/auth.js';
import Session from '../models/Session.js';

const router = express.Router();

function sessionView(s) {
  return {
    id: s._id.toString(),
    name: s.name,
    date: s.createdAt.toISOString().split('T')[0],
    status: 'active',
    tracks: 0,
    collaborators: 1,
    duration: '0:00',
    sessionId: s._id.toString(),
  };
}

// GET /api/sessions
router.get('/', verifyJWT, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json(sessions.map(s => sessionView({ ...s, createdAt: new Date(s.createdAt) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions — body: { name }
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const session = await Session.create({ name: name.trim(), userId: req.user.userId });
    res.status(201).json(sessionView(session));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
