import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String, default: '🎵' },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('ChatMessage', ChatMessageSchema);
