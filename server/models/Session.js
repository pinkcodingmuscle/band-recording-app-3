import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

SessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Session', SessionSchema);
