import React, { useState, useRef, useEffect } from 'react';
import CommentPopover from './CommentPopover';
import './RecordingComments.css';

function formatMs(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function CommentMarker({ cluster, position }) {
  const [isOpen, setIsOpen] = useState(false);
  const markerRef = useRef(null);

  const hasAudio = cluster.comments.some((c) => c.type === 'audio');
  const isCluster = cluster.comments.length > 1;

  const toggle = (e) => {
    e.stopPropagation();
    setIsOpen((v) => !v);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((v) => !v);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close when clicking outside the marker + popover
  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e) => {
      if (markerRef.current && !markerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  const firstComment = cluster.comments[0];
  const tooltipText = isCluster
    ? `${cluster.comments.length} comments at ${formatMs(firstComment.timeMs)}`
    : firstComment.type === 'audio'
    ? `▶ Audio comment by ${firstComment.authorName} @ ${formatMs(firstComment.timeMs)}`
    : firstComment.text.length > 80
    ? firstComment.text.slice(0, 80) + '…'
    : firstComment.text;

  return (
    <div
      ref={markerRef}
      className={`comment-marker ${hasAudio ? 'audio' : 'text'} ${isCluster ? 'cluster' : ''} ${isOpen ? 'open' : ''}`}
      style={{ left: `${position}%` }}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      aria-expanded={isOpen}
      aria-label={`${isCluster ? cluster.comments.length + ' comments' : 'Comment'} at ${formatMs(firstComment.timeMs)}`}
      onClick={toggle}
      onKeyDown={handleKeyDown}
    >
      <div className="marker-stem" />
      <div className="marker-pin">
        {isCluster ? (
          <span className="cluster-count">{cluster.comments.length}</span>
        ) : hasAudio ? (
          '🔊'
        ) : (
          '📝'
        )}
      </div>

      {!isOpen && <div className="marker-tooltip">{tooltipText}</div>}

      {isOpen && (
        <CommentPopover
          comments={cluster.comments}
          position={position}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default CommentMarker;
