import express from 'express';
import verifyJWT from '../middleware/auth.js';
import Track from '../models/Track.js';

const router = express.Router();

function trackView(t) {
  return {
    id: t.clientId,
    name: t.name,
    duration: t.duration,
    waveform: t.waveform,
    status: t.status,
    volume: t.volume,
    muted: t.muted,
    solo: t.solo,
    hasAudio: t.hasAudio,
    audioPath: t.audioFileId || null,
    audioExt: t.audioExt || null,
  };
}

// GET /api/tracks
router.get('/', verifyJWT, async (req, res) => {
  try {
    const tracks = await Track.find({ userId: req.user.userId }).sort({ clientId: 1 }).lean();
    res.json(tracks.map(trackView));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tracks/upsert — body: { tracks: [...] }
router.post('/upsert', verifyJWT, async (req, res) => {
  try {
    const { tracks } = req.body;
    if (!Array.isArray(tracks)) return res.status(400).json({ error: 'tracks must be an array' });
    await Promise.all(
      tracks.map((t) =>
        Track.findOneAndUpdate(
          { clientId: t.id, userId: req.user.userId },
          {
            clientId: t.id,
            userId: req.user.userId,
            name: t.name,
            duration: t.duration ?? null,
            waveform: t.waveform ?? null,
            status: t.status ?? 'recorded',
            volume: t.volume ?? 75,
            muted: t.muted ?? false,
            solo: t.solo ?? false,
            hasAudio: t.hasAudio ?? false,
            audioFileId: t.audioPath ?? null,
            audioExt: t.audioExt ?? null,
          },
          { upsert: true, new: true }
        )
      )
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tracks/:id
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    await Track.findOneAndDelete({ clientId: Number(req.params.id), userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
