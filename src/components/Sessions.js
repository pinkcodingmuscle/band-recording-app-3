import React from 'react';
import './Sessions.css';

function Sessions({ sessions, activeSession, onSelectSession, viewMode = 'list' }) {
  if (viewMode === 'grid') {
    return (
      <div className="projects-grid-container">
        <div className="projects-header">
          <h2>📁 Your Projects</h2>
          <button className="new-project-btn">+ New Project</button>
        </div>
        <div className="projects-grid">
          {sessions.map(session => (
            <div 
              key={session.id}
              className={`project-card ${activeSession?.id === session.id ? 'active' : ''}`}
              onClick={() => onSelectSession(session)}
            >
              <div className="project-thumbnail">
                <div className="project-waveform">▁▂▃▅▆▇█▇▆▅▃▂▁</div>
              </div>
              <div className="project-info">
                <h3>{session.name}</h3>
                <div className="session-id-display">{session.sessionId}</div>
                <div className="project-meta">
                  <span>🎵 {session.tracks} tracks</span>
                  <span>👥 {session.collaborators} members</span>
                </div>
                <div className="project-footer">
                  <span className="project-date">{session.date}</span>
                  <span className={`project-status ${session.status}`}>
                    {session.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sessions-container">
      <div className="sessions-header">
        <h2 className="section-title">📁 Projects</h2>
        <button className="new-session-btn" title="New Project">+</button>
      </div>
      <div className="sessions-list">
        {sessions.map(session => (
          <div 
            key={session.id}
            className={`session-card ${activeSession?.id === session.id ? 'active' : ''} ${session.status}`}
            onClick={() => onSelectSession(session)}
          >
            <div className="session-header">
              <h3>{session.name}</h3>
              <span className={`status-badge ${session.status}`}>
                {session.status === 'active' ? '●' : '✓'}
              </span>
            </div>
            <div className="session-details">
              <div className="session-meta">
                <span className="session-date">📆 {session.date}</span>
                <span className="session-tracks">🎵 {session.tracks}</span>
              </div>
              <div className="session-stats">
                <span className="collaborators" title="Collaborators">
                  👥 {session.collaborators}
                </span>
                <span className="duration">{session.duration}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sessions;
