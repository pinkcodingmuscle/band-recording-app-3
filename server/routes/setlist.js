import express from 'express';
import verifyJWT from '../middleware/auth.js';
import SetlistItem from '../models/SetlistItem.js';

const router = express.Router();

function itemView(s) {
  return {
    id: s.clientId,
    title: s.title,
    bpm: s.bpm,
    key: s.key,
    orderIndex: s.orderIndex,
    recording: s.recording,
  };
}

// GET /api/setlist
router.get('/', verifyJWT, async (req, res) => {
  try {
    const items = await SetlistItem.find({ userId: req.user.userId }).sort({ orderIndex: 1 }).lean();
    res.json(items.map(itemView));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/setlist — upsert one item
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { id, title, bpm, key, orderIndex, recording } = req.body;
    const doc = await SetlistItem.findOneAndUpdate(
      { clientId: id, userId: req.user.userId },
      { clientId: id, userId: req.user.userId, title, bpm, key, orderIndex, recording },
      { upsert: true, new: true }
    );
    res.json(itemView(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/setlist/reorder — body: { items: [{id, ...}] } — batch re-index
router.put('/reorder', verifyJWT, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
    await Promise.all(
      items.map((item, idx) =>
        SetlistItem.findOneAndUpdate(
          { clientId: item.id, userId: req.user.userId },
          { orderIndex: idx }
        )
      )
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/setlist/:id — update one item
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    const doc = await SetlistItem.findOneAndUpdate(
      { clientId: Number(req.params.id), userId: req.user.userId },
      req.body,
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Setlist item not found' });
    res.json(itemView(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/setlist/:id
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    await SetlistItem.findOneAndDelete({ clientId: Number(req.params.id), userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
