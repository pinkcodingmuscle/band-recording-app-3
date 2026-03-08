import express from 'express';
import verifyJWT from '../middleware/auth.js';
import ChatMessage from '../models/ChatMessage.js';

const router = express.Router();

// GET /api/chat/:sessionId — fetch history
router.get('/:sessionId', verifyJWT, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ sessionId: req.params.sessionId })
      .sort({ createdAt: 1 })
      .lean();
    res.json(
      messages.map((m) => ({
        id: m._id.toString(),
        user: m.authorName,
        text: m.text,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: m.authorAvatar,
        type: 'message',
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
