import React, { useState } from 'react';
import { useBand } from '../context/BandContext';
import './BandSetup.css';
import './BandBrowse.css';

function BandBrowse({ onBack, onApplied }) {
  const { allBands, applyToBand } = useBand();
  const [search, setSearch] = useState('');
  const [selectedBand, setSelectedBand] = useState(null);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getOpenPositions = (band) => band.positions.filter(p => !p.filledBy);
  const isFull = (band) => getOpenPositions(band).length === 0;

  const getBandStatus = (band) => {
    const open = getOpenPositions(band).length;
    const total = band.positions.length;
    const pending = band.applications.filter(a => a.status === 'pending').length;
    if (open === 0) return { label: 'Full', cls: 'full' };
    if (pending > 0) return { label: `${open}/${total} Open · Reviewing`, cls: 'reviewing' };
    return { label: `${open}/${total} Open`, cls: 'open' };
  };

  const visibleBands = allBands.filter(band =>
    band.name.toLowerCase().includes(search.toLowerCase()) ||
    band.genre.toLowerCase().includes(search.toLowerCase())
  );

  const handleApply = (e) => {
    e.preventDefault();
    setError('');
    if (!selectedPositionId) return setError('Please select a position.');
    if (!message.trim()) return setError('Please include a short message to the Band Lead.');
    applyToBand(selectedBand.id, selectedPositionId, message.trim());
    onApplied();
  };

  // ── Band detail / apply view ─────────────────────────────────────────────
  if (selectedBand) {
    const openPositions = getOpenPositions(selectedBand);
    return (
      <div className="band-browse-container">
        <div className="band-setup-background">
          <div className="setup-pattern" />
        </div>
        <div className="band-detail-card">
          <button
            className="back-btn"
            onClick={() => {
              setSelectedBand(null);
              setSelectedPositionId('');
              setMessage('');
              setError('');
            }}
          >
            ← Back to list
          </button>

          <div className="detail-header">
            <div>
              <h2 className="detail-name">{selectedBand.name}</h2>
              <span className="detail-genre">{selectedBand.genre}</span>
            </div>
          </div>
          {selectedBand.description && (
            <p className="detail-desc">{selectedBand.description}</p>
          )}

          <div className="browse-section">
            <div className="browse-section-title">Roster</div>
            <div className="browse-roster-list">
              {selectedBand.positions.map(p => (
                <div key={p.id} className={`browse-roster-slot ${p.filledBy ? 'filled' : 'open'}`}>
                  <span className="slot-emoji">{p.emoji}</span>
                  <span className="slot-title">{p.title}</span>
                  {p.filledBy ? (
                    <span className="slot-filled-by">
                      <span className="slot-avatar">{p.filledByAvatar}</span>
                      {p.filledByName}
                      <span className="slot-badge slot-badge-filled">Filled</span>
                    </span>
                  ) : (
                    <span className="slot-badge slot-badge-open">Open</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {openPositions.length > 0 ? (
            <form className="apply-form" onSubmit={handleApply}>
              <div className="browse-section-title">Apply to Join</div>
              <div className="form-group">
                <label>Position *</label>
                <div className="apply-positions">
                  {openPositions.map(p => (
                    <label
                      key={p.id}
                      className={`position-radio ${selectedPositionId === p.id ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="applyPos"
                        value={p.id}
                        checked={selectedPositionId === p.id}
                        onChange={() => { setSelectedPositionId(p.id); setError(''); }}
                      />
                      <span>{p.emoji} {p.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Message to Band Lead *</label>
                <textarea
                  className="create-input create-textarea"
                  placeholder="Tell them about your experience and why you'd be a great fit…"
                  value={message}
                  onChange={e => { setMessage(e.target.value); setError(''); }}
                  rows={3}
                  maxLength={300}
                />
              </div>
              {error && <div className="create-error">{error}</div>}
              <button type="submit" className="create-submit-btn">
                📝 Submit Application
              </button>
            </form>
          ) : (
            <div className="band-full-notice">
              🎵 This band is full — no open positions available.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Band list view ───────────────────────────────────────────────────────
  return (
    <div className="band-browse-container">
      <div className="band-setup-background">
        <div className="setup-pattern" />
      </div>
      <div className="band-browse-card">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="browse-header">
          <h2>Join a Band</h2>
          <p>Find open bands and apply for a position.</p>
        </div>
        <input
          type="text"
          className="create-input browse-search"
          placeholder="🔍 Search by name or genre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {visibleBands.length === 0 ? (
          <div className="no-bands">
            <p>No bands found{search ? ` matching "${search}"` : '. Ask someone to create one!'}.</p>
          </div>
        ) : (
          <div className="bands-list">
            {visibleBands.map(band => {
              const status = getBandStatus(band);
              return (
                <div key={band.id} className="band-list-row">
                  <div className="band-list-info">
                    <span className="band-list-name">{band.name}</span>
                    <span className="band-list-genre">{band.genre}</span>
                  </div>
                  <div className="band-list-right">
                    <span className={`band-status-badge ${status.cls}`}>{status.label}</span>
                    {!isFull(band) && (
                      <button
                        className="view-band-btn"
                        onClick={() => setSelectedBand(band)}
                      >
                        View →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default BandBrowse;
