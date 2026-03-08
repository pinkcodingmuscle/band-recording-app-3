import mongoose from 'mongoose';

/**
 * clientId — the string ID generated on the client ('cmt-xxx').
 * trackClientId — the numeric client ID of the parent track (Date.now()).
 */
const CommentSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true },
    trackClientId: { type: Number, required: true, index: true },
    timeMs: { type: Number, required: true },
    type: { type: String, enum: ['text', 'audio'], default: 'text' },
    text: { type: String, default: '' },
    audioPath: { type: String, default: null },
    audioDuration: { type: Number, default: null },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String, default: '🎵' },
  },
  { timestamps: true }
);

export default mongoose.model('Comment', CommentSchema);
