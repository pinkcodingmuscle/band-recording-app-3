import React, { useState, useEffect } from 'react';
import { useBand } from '../context/BandContext';
import BandCreate from './BandCreate';
import BandBrowse from './BandBrowse';
import './BandSetup.css';

function BandSetup({ currentUser }) {
  const { userPendingApp, refreshBands, withdrawApplication } = useBand();
  const [view, setView] = useState(() => (userPendingApp ? 'pending' : 'choose'));

  useEffect(() => {
    if (userPendingApp && view !== 'pending') setView('pending');
  }, [userPendingApp]);

  if (view === 'create') {
    return <BandCreate onBack={() => setView('choose')} />;
  }

  if (view === 'browse') {
    return (
      <BandBrowse
        onBack={() => setView('choose')}
        onApplied={() => setView('pending')}
      />
    );
  }

  if (view === 'pending') {
    return (
      <div className="band-setup-container">
        <div className="band-setup-background">
          <div className="setup-pattern" />
        </div>
        <div className="band-setup-card pending-card">
          <div className="pending-header">
            <span className="pending-icon">⏳</span>
            <h2>Application Submitted</h2>
            <p>
              You've applied to join <strong>{userPendingApp?.bandName}</strong>
            </p>
          </div>
          <div className="pending-detail">
            <span className="pending-position-label">Position applied for:</span>
            <span className="pending-position">
              {userPendingApp?.positionEmoji} {userPendingApp?.positionTitle}
            </span>
          </div>
          <p className="pending-hint">
            Waiting for the Band Lead to review your application. Ask them to log in
            and check the Band tab.
          </p>
          <div className="pending-actions">
            <button className="setup-btn primary" onClick={refreshBands}>
              🔄 Check Status
            </button>
            <button
              className="setup-btn danger"
              onClick={() => {
                withdrawApplication(userPendingApp.bandId, userPendingApp.id);
                setView('choose');
              }}
            >
              Withdraw Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 'choose' view — default
  return (
    <div className="band-setup-container">
      <div className="band-setup-background">
        <div className="setup-pattern" />
      </div>
      <div className="band-setup-card choose-card">
        <div className="setup-header">
          <h1 className="setup-logo">🎵 BandLab Studio</h1>
          <h2 className="setup-title">Welcome, {currentUser?.username}!</h2>
          <p className="setup-subtitle">
            To get started, join an existing band or form your own.
          </p>
        </div>
        <div className="setup-choices">
          <button className="choice-card" onClick={() => setView('create')}>
            <span className="choice-icon">🎸</span>
            <span className="choice-title">Create a Band</span>
            <span className="choice-desc">
              Start fresh. You'll become the Band Lead and define the roster.
            </span>
          </button>
          <button className="choice-card" onClick={() => setView('browse')}>
            <span className="choice-icon">🔍</span>
            <span className="choice-title">Join a Band</span>
            <span className="choice-desc">
              Browse open bands and apply for an available position.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BandSetup;
