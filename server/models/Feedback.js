import mongoose from 'mongoose';

const CATEGORIES = ['bug_report', 'feature_request', 'general', 'praise', 'challenge'];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['new', 'reviewed', 'planned', 'resolved', 'wont_fix'];

const FeedbackSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    category: { type: String, enum: CATEGORIES, required: true },
    rating: { type: Number, min: 1, max: 5 },
    currentArea: { type: String },
    description: { type: String, maxlength: 2000 },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    screenshot: { type: String },
    status: { type: String, enum: STATUSES, default: 'new' },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ category: 1, status: 1 });

export default mongoose.model('Feedback', FeedbackSchema);
