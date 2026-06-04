import express from 'express';
import verifyJWT from '../middleware/auth.js';
import Track from '../models/Track.js';
import Session from '../models/Session.js';

const router = express.Router();

/** Verify the requesting user owns or is a member of the given session. */
async function canAccessSession(sessionId, userId) {
  const session = await Session.findById(sessionId).lean();
  if (!session) return false;
  return session.userId === userId || (session.members || []).includes(userId);
}

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
    sessionId: t.sessionId || null,
    userId: t.userId,
  };
}

// GET /api/tracks?sessionId=xxx
// Returns all tracks for the session (any member's tracks).
// Falls back to user-scoped tracks when no sessionId is supplied.
router.get('/', verifyJWT, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { sessionId } = req.query;
    if (sessionId) {
      const allowed = await canAccessSession(sessionId, uid);
      if (!allowed) return res.status(403).json({ error: 'Access denied' });
      const tracks = await Track.find({ sessionId }).sort({ clientId: 1 }).lean();
      return res.json(tracks.map(trackView));
    }
    // Legacy fallback: user-scoped
    const tracks = await Track.find({ userId: uid }).sort({ clientId: 1 }).lean();
    res.json(tracks.map(trackView));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tracks/upsert — body: { tracks: [...], sessionId? }
router.post('/upsert', verifyJWT, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { tracks, sessionId } = req.body;
    if (!Array.isArray(tracks)) return res.status(400).json({ error: 'tracks must be an array' });

    if (sessionId) {
      const allowed = await canAccessSession(sessionId, uid);
      if (!allowed) return res.status(403).json({ error: 'Access denied' });
    }

    await Promise.all(
      tracks.map((t) =>
        Track.findOneAndUpdate(
          { clientId: t.id, userId: uid },
          {
            clientId: t.id,
            userId: uid,
            sessionId: sessionId || null,
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
