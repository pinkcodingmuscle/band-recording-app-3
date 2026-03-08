import express from 'express';
import verifyJWT from '../middleware/auth.js';
import Comment from '../models/Comment.js';

const router = express.Router();

function commentView(c) {
  return {
    id: c.clientId,
    trackId: c.trackClientId,
    timeMs: c.timeMs,
    type: c.type,
    text: c.text,
    audioPath: c.audioPath,
    audioDuration: c.audioDuration,
    authorId: c.authorId,
    authorName: c.authorName,
    authorAvatar: c.authorAvatar,
    createdAt: c.createdAt,
  };
}

// GET /api/comments — all comments (band-shared)
router.get('/', verifyJWT, async (req, res) => {
  try {
    const comments = await Comment.find({}).sort({ createdAt: 1 }).lean();
    res.json(comments.map(commentView));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comments
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { id, trackId, timeMs, type, text, audioPath, audioDuration, authorName, authorAvatar } = req.body;
    const doc = await Comment.create({
      clientId: id,
      trackClientId: trackId,
      timeMs,
      type: type || 'text',
      text: text || '',
      audioPath: audioPath || null,
      audioDuration: audioDuration || null,
      authorId: req.user.userId,
      authorName: authorName || 'Unknown',
      authorAvatar: authorAvatar || '🎵',
    });
    res.status(201).json(commentView(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:id
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const doc = await Comment.findOne({ clientId: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    // Only the author may delete
    if (doc.authorId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
    await doc.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
