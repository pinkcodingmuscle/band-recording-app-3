import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  return {
    id: row.id,
    trackId: row.track_id,
    timeMs: row.time_ms,
    type: row.type,
    text: row.text,
    audioUrl: null,
    audioPath: row.audio_path,
    audioDuration: row.audio_duration,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    createdAt: row.created_at,
  };
}

export function CommentsProvider({ children, currentUser }) {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(true);
  const [autoplayComments, setAutoplayComments] = useState(false);

  // ── Load comments from Supabase (or fall back to seed data) ──
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setComments(SEED_COMMENTS);
      return;
    }

    supabase
      .from('comments')
      .select('*')
      .order('created_at')
      .then(({ data, error }) => {
        setComments(!error && data && data.length > 0 ? data.map(rowToComment) : SEED_COMMENTS);
      });

    // Real-time subscription
    const channel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments(prev => [...prev, rowToComment(payload.new)]);
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev => prev.map(c => c.id === payload.new.id ? rowToComment(payload.new) : c));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addComment = useCallback(async (comment) => {
    if (isSupabaseConfigured) {
      // Let the DB generate the row and rely on realtime to push back;
      // also do an optimistic local insert so the UI feels instant.
      const tempId = genId();
      const optimistic = { ...comment, id: tempId, createdAt: new Date().toISOString() };
      setComments(prev => [...prev, optimistic]);

      const { data, error } = await supabase
        .from('comments')
        .insert({
          track_id: comment.trackId,
          time_ms: comment.timeMs,
          type: comment.type,
          text: comment.text ?? null,
          audio_path: comment.audioPath ?? null,
          audio_duration: comment.audioDuration ?? null,
          author_id: currentUser?.id ?? null,
          author_name: currentUser?.username ?? 'Unknown',
          author_avatar: currentUser?.avatar ?? '🎵',
        })
        .select()
        .single();

      if (!error && data) {
        // Replace the temp optimistic entry with the real DB row
        setComments(prev => prev.map(c => c.id === tempId ? rowToComment(data) : c));
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
    if (isSupabaseConfigured) {
      await supabase.from('comments').delete().eq('id', id);
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
