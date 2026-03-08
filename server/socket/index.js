import ChatMessage from '../models/ChatMessage.js';
import Comment from '../models/Comment.js';

export default function initSocket(io) {
  io.on('connection', (socket) => {
    // Join a named session room for scoped chat
    socket.on('join-session', (sessionId) => {
      socket.join(sessionId);
    });

    // ── Chat ──────────────────────────────────────────────────────────────────
    socket.on('chat-message', async ({ sessionId, authorId, authorName, authorAvatar, text }) => {
      try {
        const doc = await ChatMessage.create({ sessionId, authorId, authorName, authorAvatar, text });
        const msg = {
          id: doc._id.toString(),
          user: doc.authorName,
          text: doc.text,
          time: new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: doc.authorAvatar,
          type: 'message',
        };
        io.to(sessionId).emit('chat-message', msg);
      } catch { /* ignore */ }
    });

    // ── Comments ──────────────────────────────────────────────────────────────
    socket.on('comment-add', async (comment) => {
      try {
        const doc = await Comment.findOneAndUpdate(
          { clientId: comment.id },
          {
            clientId: comment.id,
            trackClientId: comment.trackId,
            timeMs: comment.timeMs,
            type: comment.type || 'text',
            text: comment.text || '',
            audioPath: comment.audioPath || null,
            audioDuration: comment.audioDuration || null,
            authorId: comment.authorId,
            authorName: comment.authorName,
            authorAvatar: comment.authorAvatar || '🎵',
          },
          { upsert: true, new: true }
        );
        io.emit('comment-add', {
          id: doc.clientId,
          trackId: doc.trackClientId,
          timeMs: doc.timeMs,
          type: doc.type,
          text: doc.text,
          audioPath: doc.audioPath,
          audioDuration: doc.audioDuration,
          authorId: doc.authorId,
          authorName: doc.authorName,
          authorAvatar: doc.authorAvatar,
          createdAt: doc.createdAt,
        });
      } catch { /* ignore */ }
    });

    socket.on('comment-remove', async (id) => {
      try {
        await Comment.findOneAndDelete({ clientId: id });
        io.emit('comment-remove', id);
      } catch { /* ignore */ }
    });
  });
}
