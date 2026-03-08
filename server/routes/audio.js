import express from 'express';
import multer, { memoryStorage } from 'multer';
import mongoose from 'mongoose';
import { getGFS } from '../db.js';
import verifyJWT from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: new memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// POST /api/audio/upload/:trackId — multipart upload → GridFS
router.post('/upload/:trackId', verifyJWT, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
  try {
    const { buffer, mimetype, originalname } = req.file;
    const gfs = getGFS();
    const uploadStream = gfs.openUploadStream(originalname || `track-${req.params.trackId}.webm`, {
      contentType: mimetype || 'audio/webm',
      metadata: { trackId: req.params.trackId, userId: req.user.userId },
    });
    uploadStream.end(buffer);
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });
    res.json({ audioPath: uploadStream.id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audio/:fileId — stream audio (no auth; safe as public URL with opaque GridFS ObjectId)
router.get('/:fileId', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const gfs = getGFS();
    const files = await gfs.find({ _id: fileId }).toArray();
    if (!files.length) return res.status(404).json({ error: 'Audio file not found' });
    res.set('Content-Type', files[0].contentType || 'audio/webm');
    res.set('Accept-Ranges', 'bytes');
    const downloadStream = gfs.openDownloadStream(fileId);
    downloadStream.on('error', () => res.status(404).end());
    downloadStream.pipe(res);
  } catch {
    res.status(400).json({ error: 'Invalid file ID' });
  }
});

// DELETE /api/audio/:fileId
router.delete('/:fileId', verifyJWT, async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    await getGFS().delete(fileId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
