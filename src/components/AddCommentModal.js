import React, { useState } from 'react';
import { useComments } from '../context/CommentsContext';
import AudioCommentRecorder from './AudioCommentRecorder';
import './RecordingComments.css';

function formatMs(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AddCommentModal({ trackId, timeMs, currentUser, onClose }) {
  const { addComment } = useComments();
  const [tab, setTab] = useState('text');
  const [text, setText] = useState('');

  const author = {
    id: currentUser?.id || 'anon',
    name: currentUser?.username || 'Anonymous',
    avatar: currentUser?.avatar || '😎',
  };

  const handleSaveText = () => {
    if (!text.trim()) return;
    addComment({
      trackId,
      timeMs,
      type: 'text',
      text: text.trim(),
      audioUrl: null,
      audioDuration: null,
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatar,
    });
    onClose();
  };

  const handleSaveAudio = ({ audioUrl, audioDuration }) => {
    addComment({
      trackId,
      timeMs,
      type: 'audio',
      text: null,
      audioUrl,
      audioDuration,
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatar,
    });
    onClose();
  };

  const trackNames = { 1: 'Lead Guitar', 2: 'Bass Line', 3: 'Drums', 4: 'Vocals' };
  const trackLabel = trackNames[trackId] || `Track ${trackId}`;

  return (
    <div
      className="add-comment-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="add-comment-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add comment"
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 className="modal-title">Add Comment</h3>
            <span className="modal-subtitle">
              {trackLabel} · <span className="modal-time">@ {formatMs(timeMs)}</span>
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'text'}
            className={`modal-tab ${tab === 'text' ? 'active' : ''}`}
            onClick={() => setTab('text')}
          >
            📝 Text Note
          </button>
          <button
            role="tab"
            aria-selected={tab === 'audio'}
            className={`modal-tab ${tab === 'audio' ? 'active' : ''}`}
            onClick={() => setTab('audio')}
          >
            🔊 Audio Comment
          </button>
        </div>

        {tab === 'text' ? (
          <div className="modal-body">
            <textarea
              className="comment-textarea"
              placeholder="Leave a note about this position in the track…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              rows={4}
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveText();
              }}
            />
            <div className="modal-footer">
              <span className="char-count">{text.length}/500</span>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="modal-btn primary"
                  onClick={handleSaveText}
                  disabled={!text.trim()}
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <AudioCommentRecorder onSave={handleSaveAudio} onCancel={onClose} />
          </div>
        )}
      </div>
    </div>
  );
}

export default AddCommentModal;
