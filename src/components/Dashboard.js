import React, { useState, useEffect } from 'react';
import { useBand } from '../context/BandContext';
import './Dashboard.css';

function Dashboard({ currentUser, users }) {
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

  const nextRehearsal = new Date(now);
  nextRehearsal.setHours(17, 0, 0, 0);
  if (nextRehearsal <= now) nextRehearsal.setDate(nextRehearsal.getDate() + 1);
  const diffMs = nextRehearsal - now;
  const diffH  = Math.floor(diffMs / 3600000);
  const diffM  = Math.floor((diffMs % 3600000) / 60000);

  const rehearsalLabel = nextRehearsal.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  }) + ' · 5:00 PM';

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
            <button className="dash-add-btn" title="Add gig">+</button>
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

        {/* Rehearsal Schedule */}
        <div className="dash-card rehearsal-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Rehearsal Schedule</h2>
            <div className="notifications-label">Notifications</div>
          </div>
          <div className="rehearsal-body">
            <div className="rehearsal-countdown-group">
              <p className="rehearsal-next-label">Next rehearsal in</p>
              <p className="rehearsal-countdown">{diffH} h {diffM}m</p>
              <p className="rehearsal-date">{rehearsalLabel}</p>
            </div>
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

        {/* Quick Stats */}
        <div className="dash-card stats-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Session Stats</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">3</span>
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
              <span className="stat-value">8</span>
              <span className="stat-label">Setlist Songs</span>
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
