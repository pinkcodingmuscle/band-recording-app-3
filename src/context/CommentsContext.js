import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { isApiConfigured, getSocket, apiGetComments, apiAddComment, apiDeleteComment } from '../lib/api';

function genId() {
  return 'cmt-' + Math.random().toString(36).substring(2, 11);
}

const CommentsContext = createContext(null);

const SEED_COMMENTS = [
  {
    id: genId(),
    trackId: 1,
    timeMs: 45000,
    type: 'text',
    text: 'Great riff here! Maybe add a bit more sustain?',
    audioUrl: null,
    audioPath: null,
    audioDuration: null,
    authorId: 'demo1',
    authorName: 'Alex Chen',
    authorAvatar: '🎸',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: genId(),
    trackId: 1,
    timeMs: 120000,
    type: 'text',
    text: 'This section needs a retake 🎵',
    audioUrl: null,
    audioPath: null,
    audioDuration: null,
    authorId: 'demo2',
    authorName: 'Sarah Johnson',
    authorAvatar: '🎤',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: genId(),
    trackId: 2,
    timeMs: 80000,
    type: 'text',
    text: 'Bass line is a bit off here, sync with drums',
    audioUrl: null,
    audioPath: null,
    audioDuration: null,
    authorId: 'demo3',
    authorName: 'Mike Davis',
    authorAvatar: '🥁',
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: genId(),
    trackId: 3,
    timeMs: 30000,
    type: 'text',
    text: 'Kick drum pattern change from measure 5',
    audioUrl: null,
    audioPath: null,
    audioDuration: null,
    authorId: 'demo3',
    authorName: 'Mike Davis',
    authorAvatar: '🥁',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: genId(),
    trackId: 3,
    timeMs: 180000,
    type: 'text',
    text: 'Fill sounds perfect here! 🎉',
    audioUrl: null,
    audioPath: null,
    audioDuration: null,
    authorId: 'demo1',
    authorName: 'Alex Chen',
    authorAvatar: '🎸',
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
];

function rowToComment(row) {
  // API returns camelCase; this is kept only for the SEED_COMMENTS shape compatibility
  return row;
}

export function CommentsProvider({ children, currentUser }) {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(true);
  const [autoplayComments, setAutoplayComments] = useState(false);

  // ── Load comments from API (or fall back to seed data) ──
  useEffect(() => {
    if (!isApiConfigured) {
      setComments(SEED_COMMENTS);
      return;
    }

    apiGetComments().then((data) => {
      setComments(data && data.length > 0 ? data : SEED_COMMENTS);
    });

    // Real-time via Socket.io
    const socket = getSocket();
    if (!socket) return;

    const onAdd = (comment) => {
      setComments(prev => {
        const exists = prev.find(c => c.id === comment.id);
        return exists ? prev.map(c => c.id === comment.id ? comment : c) : [...prev, comment];
      });
    };
    const onRemove = (id) => setComments(prev => prev.filter(c => c.id !== id));

    socket.on('comment-add', onAdd);
    socket.on('comment-remove', onRemove);
    return () => {
      socket.off('comment-add', onAdd);
      socket.off('comment-remove', onRemove);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addComment = useCallback(async (comment) => {
    if (isApiConfigured) {
      const tempId = genId();
      const optimistic = { ...comment, id: tempId, createdAt: new Date().toISOString() };
      setComments(prev => [...prev, optimistic]);

      const saved = await apiAddComment({
        ...comment,
        id: tempId,
        authorName: currentUser?.username ?? 'Unknown',
        authorAvatar: currentUser?.avatar ?? '🎵',
      });

      if (saved) {
        setComments(prev => prev.map(c => c.id === tempId ? saved : c));
        const socket = getSocket();
        if (socket) socket.emit('comment-add', saved);
      }
    } else {
      setComments(prev => [
        ...prev,
        { ...comment, id: genId(), createdAt: new Date().toISOString() },
      ]);
    }
  }, [currentUser]);

  const removeComment = useCallback(async (id) => {
    setComments(prev => prev.filter(c => c.id !== id));
    if (isApiConfigured) {
      await apiDeleteComment(id);
      const socket = getSocket();
      if (socket) socket.emit('comment-remove', id);
    }
  }, []);

  const toggleShowComments = useCallback(() => {
    setShowComments(prev => !prev);
  }, []);

  const toggleAutoplay = useCallback(() => {
    setAutoplayComments(prev => !prev);
  }, []);

  const getCommentsForTrack = useCallback(
    (trackId) => comments.filter(c => c.trackId === trackId),
    [comments],
  );

  return (
    <CommentsContext.Provider
      value={{
        comments,
        showComments,
        autoplayComments,
        addComment,
        removeComment,
        toggleShowComments,
        toggleAutoplay,
        getCommentsForTrack,
      }}
    >
      {children}
    </CommentsContext.Provider>
  );
}

export function useComments() {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error('useComments must be used inside CommentsProvider');
  return ctx;
}
