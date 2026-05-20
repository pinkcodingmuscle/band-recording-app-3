import express from 'express';
import multer, { memoryStorage } from 'multer';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import verifyJWT from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: new memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const BUCKET = 'audio';

// Lazy-initialize so createClient runs on first request, not at import time.
// This avoids a WebSocket hang during server startup on Node < 22.
let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { realtime: { transport: ws } }
    );
  }
  return _supabase;
}

// POST /api/audio/upload/:trackId — multipart upload → Supabase Storage
router.post('/upload/:trackId', verifyJWT, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
  try {
    const { buffer, mimetype } = req.file;
    const ext = mimetype === 'audio/webm' ? 'webm' : 'mp4';
    const storagePath = `${req.user.userId}/${req.params.trackId}.${ext}`;

    const { error } = await getSupabase().storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimetype || 'audio/webm',
        upsert: true,
      });

    if (error) throw error;

    const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(storagePath);
    res.json({ audioPath: data.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/audio — body: { storagePath: "userId/trackId.webm" }
router.delete('/', verifyJWT, async (req, res) => {
  try {
    const { storagePath } = req.body;
    if (!storagePath) return res.status(400).json({ error: 'storagePath required' });
    const { error } = await getSupabase().storage.from(BUCKET).remove([storagePath]);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
