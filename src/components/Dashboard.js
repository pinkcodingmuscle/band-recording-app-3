import React, { useState, useEffect } from 'react';
import { useBand } from '../context/BandContext';
import './Dashboard.css';

function Dashboard({ currentUser, users, onNavigate }) {
  const { userBand } = useBand();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const gigs = [
    { id: 1, date: 'May 12, 2026', time: '8:00 PM', venue: 'The Velvet Underground' },
    { id: 2, date: 'May 24, 2026', time: '7:30 PM', venue: 'Lakeside Amphitheater' },
    { id: 3, date: 'Jun 5, 2026',  time: '9:00 PM', venue: 'Downtown Club' },
  ];

  const notifications = [
    { id: 1, icon: '📍', text: 'New gig added', source: 'stictar', time: '2m ago' },
    { id: 2, icon: '🎵', text: 'Track upload ready', source: 'studio', time: '18m ago' },
    { id: 3, icon: '💬', text: 'New message from Alex', source: 'chat', time: '1h ago' },
  ];

  const onlineMembers = (users || []).filter(u => u.status === 'online');

  return (
    <div className="dashboard">
      <div className="dashboard-grid">

        {/* Upcoming Gigs */}
        <div className="dash-card gigs-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Upcoming Gigs</h2>
            <button className="dash-add-btn" title="Manage in Calendar" onClick={() => onNavigate?.('calendar')}>📅</button>
          </div>
          <table className="gigs-table">
            <tbody>
              {gigs.map(g => (
                <tr key={g.id} className="gig-row">
                  <td className="gig-date">{g.date}</td>
                  <td className="gig-time">{g.time}</td>
                  <td className="gig-venue">{g.venue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Activity */}
        <div className="dash-card rehearsal-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Recent Activity</h2>
          </div>
          <div className="rehearsal-body">
            <div className="notification-pills">
              {notifications.map(n => (
                <div key={n.id} className="notif-pill">
                  <span className="notif-icon">{n.icon}</span>
                  <div className="notif-text-group">
                    <span className="notif-text">{n.text}</span>
                    <span className="notif-source">{n.source} · {n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Online Members */}
        <div className="dash-card members-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">
                {userBand ? userBand.name : 'Band Members'}
              </h2>
              {userBand && (() => {
                const filled = userBand.positions.filter(p => p.filledBy).length;
                const total = userBand.positions.length;
                const isFull = filled === total;
                return (
                  <span className={`band-mini-status ${isFull ? 'full' : 'open'}`}>
                    {isFull ? '🟢 Full' : `🔴 ${total - filled} open`}
                  </span>
                );
              })()}
            </div>
            <span className="online-count">{onlineMembers.length} online</span>
          </div>
          <div className="members-list">
            {(users || []).slice(0, 6).map(u => (
              <div key={u.id} className="member-row">
                <div className="member-avatar-wrap">
                  <span className="member-avatar">{u.avatar || u.name?.[0] || '?'}</span>
                  <span className={`member-status-dot ${u.status}`}></span>
                </div>
                <div className="member-info">
                  <span className="member-name">
                    {u.name || u.username}
                    {u.id === currentUser?.id && <span className="you-tag"> (You)</span>}
                  </span>
                  <span className="member-role">{u.role}</span>
                </div>
                <span className={`member-status-text ${u.status}`}>{u.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dash-card stats-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Quick Actions</h2>
          </div>
          <div className="quick-actions-grid">
            <button className="quick-action-btn" onClick={() => onNavigate?.('studio')}>
              <span className="qa-icon">🎙️</span>
              <span className="qa-label">Start Recording</span>
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate?.('setlist')}>
              <span className="qa-icon">🎵</span>
              <span className="qa-label">Edit Setlist</span>
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate?.('chat')}>
              <span className="qa-icon">💬</span>
              <span className="qa-label">Open Chat</span>
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate?.('calendar')}>
              <span className="qa-icon">📅</span>
              <span className="qa-label">Calendar</span>
            </button>
          </div>
          <div className="stats-grid" style={{ marginTop: '1rem' }}>
            <div className="stat-item">
              <span className="stat-value">{gigs.length}</span>
              <span className="stat-label">Upcoming Gigs</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {userBand
                  ? `${userBand.positions.filter(p => p.filledBy).length}/${userBand.positions.length}`
                  : (users || []).length}
              </span>
              <span className="stat-label">Band Members</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{onlineMembers.length}</span>
              <span className="stat-label">Online Now</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
