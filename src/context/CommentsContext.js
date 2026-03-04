import React, { createContext, useContext, useState, useCallback } from 'react';

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
    audioDuration: null,
    authorId: 'demo1',
    authorName: 'Alex Chen',
    authorAvatar: '🎸',
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
];

export function CommentsProvider({ children }) {
  const [comments, setComments] = useState(SEED_COMMENTS);
  const [showComments, setShowComments] = useState(true);
  const [autoplayComments, setAutoplayComments] = useState(false);

  const addComment = useCallback((comment) => {
    setComments(prev => [
      ...prev,
      { ...comment, id: genId(), createdAt: new Date().toISOString() },
    ]);
  }, []);

  const removeComment = useCallback((id) => {
    setComments(prev => prev.filter(c => c.id !== id));
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
