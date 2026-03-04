import React, { useState } from 'react';
import { useComments } from '../context/CommentsContext';
import './RecordingComments.css';

function formatMs(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatRelative(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(isoString).toLocaleDateString();
}

function CommentPopover({ comments, position, onClose }) {
  const { removeComment } = useComments();
  const [activeIdx, setActiveIdx] = useState(0);
  const comment = comments[activeIdx];

  // Flip the popover to the left when near the right edge
  const flipLeft = position > 70;

  return (
    <div
      className={`comment-popover ${flipLeft ? 'flip-left' : ''}`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="false"
      aria-label="Comment"
    >
      <div className="popover-header">
        {comments.length > 1 && (
          <div className="popover-nav">
            <button
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              aria-label="Previous comment"
            >
              ‹
            </button>
            <span>
              {activeIdx + 1}/{comments.length}
            </span>
            <button
              onClick={() =>
                setActiveIdx((i) => Math.min(comments.length - 1, i + 1))
              }
              disabled={activeIdx === comments.length - 1}
              aria-label="Next comment"
            >
              ›
            </button>
          </div>
        )}
        <button
          className="popover-close"
          onClick={onClose}
          aria-label="Close comment"
        >
          ✕
        </button>
      </div>

      <div className="popover-meta">
        <span className="popover-avatar">{comment.authorAvatar}</span>
        <div className="popover-author-info">
          <span className="popover-author">{comment.authorName}</span>
          <span className="popover-timestamp">
            {formatRelative(comment.createdAt)} ·{' '}
            <span className="popover-time-marker">@ {formatMs(comment.timeMs)}</span>
          </span>
        </div>
      </div>

      {comment.type === 'text' ? (
        <p className="popover-text">{comment.text}</p>
      ) : (
        <div className="popover-audio">
          <audio
            controls
            src={comment.audioUrl}
            className="audio-player"
            preload="metadata"
          >
            Your browser does not support the audio element.
          </audio>
          {comment.audioDuration > 0 && (
            <span className="audio-duration">{formatMs(comment.audioDuration)}</span>
          )}
        </div>
      )}

      <div className="popover-actions">
        <button
          className="popover-delete-btn"
          onClick={() => {
            removeComment(comment.id);
            if (comments.length === 1) {
              onClose();
            } else {
              setActiveIdx((i) => Math.max(0, i - 1));
            }
          }}
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}

export default CommentPopover;
