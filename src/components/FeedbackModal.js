import React, { useMemo, useState } from 'react';
import './FeedbackModal.css';
import { apiFeedbackSubmit, isApiConfigured } from '../lib/api';
import { useToast } from '../context/ToastContext';

const CATEGORY_OPTIONS = [
  { value: 'bug_report', label: 'Bug', icon: '🐛' },
  { value: 'feature_request', label: 'Feature', icon: '✨' },
  { value: 'general', label: 'General', icon: '💬' },
  { value: 'praise', label: 'Praise', icon: '🎉' },
  { value: 'challenge', label: 'Challenge', icon: '🔥' },
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const MAX_DESCRIPTION = 2000;

function FeedbackModal({ activeTab, onClose, onOpenHistory }) {
  const { showToast } = useToast();
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState(0);
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const descriptionCount = useMemo(() => description.length, [description]);

  const captureScreenshot = async () => {
    setError('');
    try {
      const mod = await import('html2canvas');
      const html2canvas = mod.default || mod;
      const canvas = await html2canvas(document.body, {
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        ignoreElements: (el) => (
          el.getAttribute('role') === 'dialog' ||
          el.getAttribute('aria-label') === 'Share feedback'
        ),
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setScreenshot(dataUrl);
      showToast('Screenshot attached', 'info');
    } catch {
      showToast('Screenshot capture is unavailable', 'warning');
    }
  };

  const submitFeedback = async () => {
    if (!category) {
      setError('Please select a feedback category.');
      return;
    }
    if (!isApiConfigured) {
      setError('Feedback requires a live backend connection.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await apiFeedbackSubmit({
        category,
        rating: rating || undefined,
        currentArea: activeTab,
        description: description.slice(0, MAX_DESCRIPTION),
        priority,
        screenshot,
      });

      setSubmitted(true);
      showToast('Feedback submitted!', 'success');
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Could not submit feedback.');
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Share feedback">
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <button className="feedback-modal-close" onClick={onClose} type="button" aria-label="Close feedback form">
          ✕
        </button>

        <h2>Share feedback</h2>

        {!submitted ? (
          <>
            <div className="feedback-section">
              <h3>Category</h3>
              <div className="feedback-pill-row">
                {CATEGORY_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`feedback-pill ${category === item.value ? 'active' : ''}`}
                    onClick={() => setCategory(item.value)}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="feedback-section">
              <h3>Rating (optional)</h3>
              <div className="feedback-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`feedback-star ${rating >= n ? 'active' : ''}`}
                    onClick={() => setRating(n)}
                    aria-label={`Rate ${n} stars`}
                  >
                    ★
                  </button>
                ))}
                {rating > 0 && (
                  <button type="button" className="feedback-clear" onClick={() => setRating(0)}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="feedback-section">
              <h3>Current area</h3>
              <div className="feedback-area-label">{activeTab}</div>
            </div>

            <div className="feedback-section">
              <h3>Description</h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                rows={5}
                placeholder="Tell us what happened or what you'd like improved..."
              />
              <div className="feedback-counter">{descriptionCount}/{MAX_DESCRIPTION}</div>
            </div>

            <div className="feedback-section">
              <h3>Priority</h3>
              <div className="feedback-pill-row">
                {PRIORITY_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`feedback-pill ${priority === value ? 'active' : ''}`}
                    onClick={() => setPriority(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="feedback-section">
              <h3>Screenshot (optional)</h3>
              <div className="feedback-screenshot-row">
                <button type="button" className="feedback-secondary-btn" onClick={captureScreenshot}>
                  Capture screenshot
                </button>
                {screenshot && (
                  <button type="button" className="feedback-secondary-btn danger" onClick={() => setScreenshot(null)}>
                    Remove
                  </button>
                )}
              </div>
              {screenshot && <img className="feedback-preview" src={screenshot} alt="Feedback screenshot preview" />}
            </div>

            {error && <p className="feedback-error" role="alert">{error}</p>}

            <div className="feedback-actions">
              <button type="button" className="feedback-secondary-btn" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="feedback-primary-btn"
                onClick={submitFeedback}
                disabled={submitting || !category}
              >
                {submitting ? 'Submitting…' : 'Submit feedback'}
              </button>
            </div>
          </>
        ) : (
          <div className="feedback-success">
            <div className="feedback-success-icon">🎉</div>
            <p>Thanks! Your feedback has been submitted.</p>
            <button type="button" className="feedback-link-btn" onClick={onOpenHistory}>
              View your submissions →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;
