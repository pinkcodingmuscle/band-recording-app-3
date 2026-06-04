import express from 'express';
import verifyJWT from '../middleware/auth.js';
import Session from '../models/Session.js';

const router = express.Router();

function sessionView(s, requestingUserId) {
  const members = s.members || [];
  const allParticipants = new Set([s.userId, ...members]);
  return {
    id: s._id.toString(),
    name: s.name,
    date: s.createdAt.toISOString().split('T')[0],
    status: 'active',
    tracks: 0,
    collaborators: allParticipants.size,
    duration: '0:00',
    sessionId: s._id.toString(),
    isOwner: requestingUserId ? s.userId === requestingUserId : false,
    members,
  };
}

// GET /api/sessions — returns sessions owned by or joined by the current user
router.get('/', verifyJWT, async (req, res) => {
  try {
    const uid = req.user.userId;
    const sessions = await Session.find({
      $or: [{ userId: uid }, { members: uid }],
    }).sort({ createdAt: -1 }).lean();
    res.json(sessions.map(s => sessionView({ ...s, createdAt: new Date(s.createdAt) }, uid)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions — body: { name }
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const session = await Session.create({ name: name.trim(), userId: req.user.userId, members: [] });
    res.status(201).json(sessionView(session, req.user.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/join — join an existing session by its ID
router.post('/:id/join', verifyJWT, async (req, res) => {
  try {
    const uid = req.user.userId;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId === uid) {
      // Owner rejoining — just return the session
      return res.json(sessionView(session, uid));
    }
    if (!session.members.includes(uid)) {
      session.members.push(uid);
      await session.save();
    }
    res.json(sessionView(session, uid));
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Session not found' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
