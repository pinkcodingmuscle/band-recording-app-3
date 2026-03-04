import React, { useState } from 'react';
import { useBand } from '../context/BandContext';
import './BandRoster.css';

function BandRoster({ currentUser }) {
  const { userBand, removeMember, transferOwnership, leaveBand, disbandBand } = useBand();
  const [confirmDisband, setConfirmDisband] = useState(false);

  if (!userBand) return null;

  const isOwner = userBand.ownerId === currentUser.id;
  const filledCount = userBand.positions.filter(p => p.filledBy).length;
  const totalCount = userBand.positions.length;
  const isFull = filledCount === totalCount;
  const pendingCount = userBand.applications.filter(a => a.status === 'pending').length;

  const getStatusBadge = () => {
    if (isFull) return { label: '🟢 Band is Full — Ready to record!', cls: 'status-full' };
    if (pendingCount > 0)
      return { label: `🟡 Reviewing ${pendingCount} application${pendingCount > 1 ? 's' : ''}`, cls: 'status-reviewing' };
    return {
      label: `🔴 Open — ${totalCount - filledCount} position${totalCount - filledCount > 1 ? 's' : ''} available`,
      cls: 'status-open',
    };
  };
  const status = getStatusBadge();

  return (
    <div className="band-roster">

      <div className="roster-header">
        <div>
          <h2 className="roster-band-name">{userBand.name}</h2>
          <span className="roster-genre">{userBand.genre}</span>
        </div>
        <span className="roster-count">{filledCount}/{totalCount} members</span>
      </div>

      <div className={`band-status-banner ${status.cls}`}>{status.label}</div>

      {userBand.description && (
        <p className="roster-description">{userBand.description}</p>
      )}

      <div className="roster-section-title">Roster</div>
      <div className="roster-positions">
        {userBand.positions.map(p => (
          <div key={p.id} className={`roster-position-row ${p.filledBy ? 'filled' : 'empty'}`}>
            <span className="rp-emoji">{p.emoji}</span>
            <div className="rp-info">
              <span className="rp-title">{p.title}</span>
              {p.filledBy ? (
                <span className="rp-member">
                  <span className="rp-avatar">{p.filledByAvatar}</span>
                  {p.filledByName}
                  {p.filledBy === userBand.ownerId && (
                    <span className="owner-crown">👑 Lead</span>
                  )}
                  {p.filledBy === currentUser.id && (
                    <span className="you-tag"> (You)</span>
                  )}
                </span>
              ) : (
                <span className="rp-empty">Open position</span>
              )}
            </div>
            <div className="rp-actions">
              <span className={`rp-badge ${p.filledBy ? 'rp-badge-filled' : 'rp-badge-open'}`}>
                {p.filledBy ? 'Filled' : 'Open'}
              </span>
              {isOwner && p.filledBy && p.filledBy !== currentUser.id && (
                <div className="owner-member-actions">
                  <button
                    className="rp-action-btn danger"
                    onClick={() => removeMember(userBand.id, p.filledBy)}
                    title="Remove member from band"
                  >
                    Remove
                  </button>
                  <button
                    className="rp-action-btn"
                    onClick={() => transferOwnership(userBand.id, p.filledBy)}
                    title="Transfer Band Lead role"
                  >
                    Make Lead
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="roster-footer-actions">
        {!isOwner && (
          <button className="roster-action-btn leave" onClick={() => leaveBand(userBand.id)}>
            🚪 Leave Band
          </button>
        )}
        {isOwner && (
          confirmDisband ? (
            <div className="disband-confirm">
              <span>Are you sure? This permanently removes the band.</span>
              <button className="roster-action-btn danger" onClick={() => disbandBand(userBand.id)}>
                Yes, Disband
              </button>
              <button className="roster-action-btn" onClick={() => setConfirmDisband(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="roster-action-btn danger" onClick={() => setConfirmDisband(true)}>
              ⚠️ Disband Band
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default BandRoster;
