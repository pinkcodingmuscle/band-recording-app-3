import React from 'react';
import './Users.css';

function Users({ users, viewMode = 'list' }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'online': return '#10b981';
      case 'away': return '#f59e0b';
      case 'offline': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (viewMode === 'detailed') {
    return (
      <div className="users-detailed-container">
        <div className="users-detailed-header">
          <h2>👥 Band Members</h2>
          <button className="invite-btn" title="Invite band member">+ Invite Member</button>
        </div>
        <div className="users-grid">
          {users.map(user => (
            <div key={user.id} className="user-detailed-card">
              <div className="user-card-header">
                <div className="user-avatar-large">
                  {user.avatar}
                  <span 
                    className="status-indicator-large" 
                    style={{ backgroundColor: getStatusColor(user.status) }}
                  ></span>
                </div>
                <span className={`user-status-badge ${user.status}`}>{user.status}</span>
              </div>
              <div className="user-card-body">
                <h3>{user.displayName || user.name}</h3>
                <p className="user-role-detailed">{user.role}</p>
                
                <div className="user-stats">
                  <div className="stat-item">
                    <span className="stat-value">{user.tracks}</span>
                    <span className="stat-label">Tracks</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{user.collaborations}</span>
                    <span className="stat-label">Collabs</span>
                  </div>
                </div>

                <div className="user-actions">
                  <button className="user-action-btn" title={`Message ${user.displayName || user.name}`}>💬 Message</button>
                  <button className="user-action-btn" title={`Invite ${user.displayName || user.name} to session`}>🎵 Invite</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <h2 className="section-title">👥 Band</h2>
        <button className="invite-btn-small" title="Invite">+</button>
      </div>
      <div className="users-list">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-avatar">
              {user.avatar}
              <span 
                className="status-indicator" 
                style={{ backgroundColor: getStatusColor(user.status) }}
              ></span>
            </div>
            <div className="user-info">
              <h4>{user.displayName || user.name}</h4>
              <p className="user-role">{user.role}</p>
              <div className="user-mini-stats">
                <span title="Tracks">🎵 {user.tracks}</span>
                <span title="Collaborations">🤝 {user.collaborations}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Users;
