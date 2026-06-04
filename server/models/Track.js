import mongoose from 'mongoose';

/**
 * clientId — the Date.now()-based numeric ID generated on the client.
 * audioFileId — the GridFS ObjectId string; null when no audio is attached.
 */
const TrackSchema = new mongoose.Schema(
  {
    clientId: { type: Number, required: true },
    userId: { type: String, required: true },
    sessionId: { type: String, default: null },
    name: { type: String, default: '' },
    duration: { type: String, default: null },
    waveform: { type: String, default: null },
    status: { type: String, default: 'recorded' },
    volume: { type: Number, default: 75 },
    muted: { type: Boolean, default: false },
    solo: { type: Boolean, default: false },
    hasAudio: { type: Boolean, default: false },
    audioFileId: { type: String, default: null },
    audioExt: { type: String, default: null },
  },
  { timestamps: true }
);

TrackSchema.index({ clientId: 1, userId: 1 }, { unique: true });
TrackSchema.index({ sessionId: 1 });

export default mongoose.model('Track', TrackSchema);
