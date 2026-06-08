import React, { useState } from 'react';
import './FeedbackButton.css';
import FeedbackModal from './FeedbackModal';
import MyFeedbackPanel from './MyFeedbackPanel';

function FeedbackButton({ activeTab }) {
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <div className="feedback-fab-wrap">
        <button
          className="feedback-fab"
          type="button"
          onClick={() => setShowModal(true)}
          aria-label="Share feedback"
          title="Share feedback"
        >
          💬
        </button>
        <button
          className="feedback-history-link"
          type="button"
          onClick={() => setShowHistory(true)}
        >
          My submissions
        </button>
      </div>

      {showModal && (
        <FeedbackModal
          activeTab={activeTab}
          onClose={() => setShowModal(false)}
          onOpenHistory={() => {
            setShowModal(false);
            setShowHistory(true);
          }}
        />
      )}

      {showHistory && <MyFeedbackPanel onClose={() => setShowHistory(false)} />}
    </>
  );
}

export default FeedbackButton;
