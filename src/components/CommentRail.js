import React, { useCallback } from 'react';
import { useComments } from '../context/CommentsContext';
import CommentMarker from './CommentMarker';
import './RecordingComments.css';

const TOTAL_DURATION_MS = 240000; // 4:00

// Group markers within 2% of each other into clusters
function buildClusters(comments) {
  const sorted = [...comments].sort((a, b) => a.timeMs - b.timeMs);
  const clusters = [];
  sorted.forEach((comment) => {
    const pct = (comment.timeMs / TOTAL_DURATION_MS) * 100;
    const existing = clusters.find((c) => Math.abs(c.pct - pct) < 2);
    if (existing) {
      existing.comments.push(comment);
    } else {
      clusters.push({ pct, comments: [comment] });
    }
  });
  return clusters;
}

function CommentRail({ trackId, onAddComment }) {
  const { getCommentsForTrack, showComments } = useComments();
  const comments = getCommentsForTrack(trackId);

  const handleRailClick = useCallback(
    (e) => {
      // Only fire when rail itself is clicked, not a child marker
      if (e.currentTarget !== e.target) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const timeMs = Math.round(Math.max(0, Math.min(1, pct)) * TOTAL_DURATION_MS);
      onAddComment(trackId, timeMs);
    },
    [trackId, onAddComment],
  );

  if (!showComments) {
    return <div className="comment-rail comment-rail-hidden" aria-hidden="true" />;
  }

  const clusters = buildClusters(comments);

  return (
    <div
      className="comment-rail"
      onClick={handleRailClick}
      title="Click anywhere on the rail to add a comment"
      role="region"
      aria-label={`Comment markers for track ${trackId}`}
    >
      {clusters.map((cluster, i) => (
        <CommentMarker
          key={i}
          cluster={cluster}
          position={cluster.pct}
        />
      ))}
    </div>
  );
}

export default CommentRail;
