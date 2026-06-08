import React, { useEffect, useState } from 'react';
import './MyFeedbackPanel.css';
import { apiFeedbackMine, isApiConfigured } from '../lib/api';

const CATEGORY_META = {
  bug_report: { icon: '🐛', label: 'Bug' },
  feature_request: { icon: '✨', label: 'Feature' },
  general: { icon: '💬', label: 'General' },
  praise: { icon: '🎉', label: 'Praise' },
  challenge: { icon: '🔥', label: 'Challenge' },
};

function formatRelative(value) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function MyFeedbackPanel({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;

    async function loadMine() {
      if (!isApiConfigured) {
        if (!alive) return;
        setLoading(false);
        setError('Feedback history requires a live backend connection.');
        return;
      }

      try {
        const result = await apiFeedbackMine({ page: 1 });
        if (!alive) return;
        setItems(Array.isArray(result.feedback) ? result.feedback : []);
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Could not load feedback history.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadMine();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="feedback-panel-overlay" onClick={onClose}>
      <aside className="feedback-panel" onClick={(e) => e.stopPropagation()}>
        <header className="feedback-panel-header">
          <h2>My feedback</h2>
          <button type="button" onClick={onClose} aria-label="Close feedback history">✕</button>
        </header>

        {loading && (
          <div className="feedback-panel-loading">
            <div className="feedback-skeleton" />
            <div className="feedback-skeleton" />
            <div className="feedback-skeleton" />
          </div>
        )}

        {!loading && error && <p className="feedback-panel-error">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="feedback-panel-empty">No feedback submitted yet.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="feedback-history-list">
            {items.map((item) => {
              const meta = CATEGORY_META[item.category] || { icon: '💬', label: 'Feedback' };
              return (
                <li key={item._id || item.id} className="feedback-history-item">
                  <div className="feedback-history-top">
                    <span className="feedback-history-category">{meta.icon} {meta.label}</span>
                    <span className={`feedback-status ${item.status || 'new'}`}>{item.status || 'new'}</span>
                  </div>
                  <div className="feedback-history-meta">
                    <span className={`feedback-priority ${item.priority || 'medium'}`}>{item.priority || 'medium'}</span>
                    <span>{formatRelative(item.createdAt)}</span>
                  </div>
                  <p className="feedback-history-desc">
                    {(item.description || 'No description provided.').slice(0, 80)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}

export default MyFeedbackPanel;
