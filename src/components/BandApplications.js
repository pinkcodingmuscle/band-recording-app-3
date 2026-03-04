import React from 'react';
import { useBand } from '../context/BandContext';
import './BandApplications.css';

function BandApplications({ currentUser }) {
  const { userBand, approveApplication, rejectApplication } = useBand();

  if (!userBand || userBand.ownerId !== currentUser.id) return null;

  const pending = userBand.applications.filter(a => a.status === 'pending');
  const resolved = userBand.applications
    .filter(a => a.status !== 'pending')
    .slice(-5)
    .reverse();

  return (
    <div className="band-applications">

      <div className="apps-header">
        <h3 className="apps-title">Applications</h3>
        {pending.length > 0 && (
          <span className="apps-badge">{pending.length}</span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="apps-empty">
          <span className="apps-empty-icon">📭</span>
          <p>No pending applications</p>
        </div>
      ) : (
        <div className="apps-list">
          {pending.map(app => (
            <div key={app.id} className="app-card">
              <div className="app-top">
                <span className="app-avatar">{app.userAvatar}</span>
                <div className="app-who">
                  <span className="app-name">{app.userName}</span>
                  <span className="app-position">
                    {app.positionEmoji} {app.positionTitle}
                  </span>
                </div>
                <span className="app-time">
                  {new Date(app.appliedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })}
                </span>
              </div>
              {app.message && (
                <p className="app-message">"{app.message}"</p>
              )}
              <div className="app-actions">
                <button
                  className="app-btn accept"
                  onClick={() => approveApplication(userBand.id, app.id)}
                >
                  ✅ Accept
                </button>
                <button
                  className="app-btn reject"
                  onClick={() => rejectApplication(userBand.id, app.id)}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="apps-resolved">
          <div className="apps-resolved-title">Recent decisions</div>
          {resolved.map(app => (
            <div key={app.id} className={`app-resolved-row`}>
              <span className="app-resolved-user">
                {app.userAvatar} {app.userName}
              </span>
              <span className="app-pos-small">{app.positionEmoji} {app.positionTitle}</span>
              <span className={`resolved-badge ${app.status}`}>
                {app.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BandApplications;
