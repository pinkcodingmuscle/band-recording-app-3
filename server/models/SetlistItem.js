import mongoose from 'mongoose';

/**
 * clientId — Date.now()-based numeric ID from the client.
 * recording — arbitrary mixed object for attached audio/YouTube metadata.
 */
const SetlistItemSchema = new mongoose.Schema(
  {
    clientId: { type: Number, required: true },
    userId: { type: String, required: true },
    title: { type: String, default: '' },
    bpm: { type: String, default: '' },
    key: { type: String, default: '' },
    orderIndex: { type: Number, default: 0 },
    recording: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

SetlistItemSchema.index({ clientId: 1, userId: 1 }, { unique: true });

export default mongoose.model('SetlistItem', SetlistItemSchema);
