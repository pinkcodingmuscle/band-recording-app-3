import express from 'express';
import verifyJWT from '../middleware/auth.js';
import Feedback from '../models/Feedback.js';

const router = express.Router();

const VALID_CATEGORIES = new Set(['bug_report', 'feature_request', 'general', 'praise', 'challenge']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const VALID_STATUSES = new Set(['new', 'reviewed', 'planned', 'resolved', 'wont_fix']);

const MAX_DESCRIPTION_LENGTH = Number(process.env.FEEDBACK_MAX_DESCRIPTION_LENGTH || 2000);
const MAX_SCREENSHOT_SIZE_KB = Number(process.env.FEEDBACK_MAX_SCREENSHOT_SIZE_KB || 500);

function isAdmin(req) {
  return req.user?.isAdmin === true;
}

function parsePaging(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawLimit = Number.parseInt(query.limit, 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit };
}

function normalizeScreenshot(screenshot) {
  if (typeof screenshot !== 'string' || screenshot.length === 0) return null;
  const commaIdx = screenshot.indexOf(',');
  if (commaIdx < 0) return null;
  const b64 = screenshot.slice(commaIdx + 1);
  try {
    const byteLength = Buffer.from(b64, 'base64').length;
    if (byteLength > MAX_SCREENSHOT_SIZE_KB * 1024) return null;
    return screenshot;
  } catch {
    return null;
  }
}

// POST /api/feedback
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { category, rating, currentArea, description, priority, screenshot } = req.body || {};

    if (!VALID_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'category is required' });
    }

    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'rating must be 1–5' });
    }

    const safePriority = VALID_PRIORITIES.has(priority) ? priority : 'medium';
    const safeDescription = typeof description === 'string'
      ? description.slice(0, MAX_DESCRIPTION_LENGTH)
      : '';

    const created = await Feedback.create({
      userId: req.user.userId,
      category,
      rating: rating === undefined ? undefined : rating,
      currentArea: typeof currentArea === 'string' ? currentArea.slice(0, 120) : '',
      description: safeDescription,
      priority: safePriority,
      screenshot: normalizeScreenshot(screenshot),
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/mine
router.get('/mine', verifyJWT, async (req, res) => {
  try {
    const { page, limit } = parsePaging(req.query);
    const query = { userId: req.user.userId };

    if (req.query.status && VALID_STATUSES.has(req.query.status)) {
      query.status = req.query.status;
    }

    const [total, feedback] = await Promise.all([
      Feedback.countDocuments(query),
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      feedback,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback (admin)
router.get('/', verifyJWT, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

    const { page, limit } = parsePaging(req.query);
    const query = {};

    if (req.query.status && VALID_STATUSES.has(req.query.status)) {
      query.status = req.query.status;
    }
    if (req.query.category && VALID_CATEGORIES.has(req.query.category)) {
      query.category = req.query.category;
    }

    const [total, feedback] = await Promise.all([
      Feedback.countDocuments(query),
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      feedback,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/feedback/:id/status (admin)
router.patch('/:id/status', verifyJWT, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

    const { status, adminNotes } = req.body || {};
    if (status !== undefined && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    if (status === undefined && adminNotes === undefined) {
      return res.status(400).json({ error: 'nothing to update' });
    }

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (adminNotes !== undefined) updates.adminNotes = String(adminNotes).slice(0, 5000);

    const updated = await Feedback.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Feedback not found' });

    res.json(updated);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Feedback not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/feedback/:id (admin)
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

    const deleted = await Feedback.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ error: 'Feedback not found' });

    res.json({ ok: true });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Feedback not found' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
