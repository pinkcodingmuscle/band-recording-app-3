import React, { useState } from 'react';
import { useBand, INSTRUMENTS, GENRES } from '../context/BandContext';
import './BandSetup.css';
import './BandCreate.css';

function BandCreate({ onBack }) {
  const { createBand } = useBand();
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [ownerPositionId, setOwnerPositionId] = useState('');
  const [customPosition, setCustomPosition] = useState('');
  const [error, setError] = useState('');

  const isSelected = (id) => selectedPositions.some(p => p.id === id);

  const togglePosition = (instrument) => {
    setSelectedPositions(prev => {
      if (prev.some(p => p.id === instrument.id)) {
        if (ownerPositionId === instrument.id) setOwnerPositionId('');
        return prev.filter(p => p.id !== instrument.id);
      }
      return [...prev, { id: instrument.id, title: instrument.title, emoji: instrument.emoji }];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Band name is required.');
    if (!genre) return setError('Please select a genre.');
    if (selectedPositions.length < 1) return setError('Add at least one position to the roster.');
    if (!ownerPositionId) return setError('Select which position is yours.');

    const finalPositions = selectedPositions.map(p =>
      p.id === 'other' && customPosition.trim()
        ? { ...p, title: customPosition.trim() }
        : p
    );
    createBand({ name: name.trim(), genre, description: description.trim(), positions: finalPositions, ownerPositionId });
  };

  return (
    <div className="band-create-container">
      <div className="band-setup-background">
        <div className="setup-pattern" />
      </div>
      <div className="band-create-card">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="create-header">
          <h2>Create Your Band</h2>
          <p>Define your roster and claim your spot as Band Lead.</p>
        </div>
        <form className="create-form" onSubmit={handleSubmit}>

          <div className="form-row two-col">
            <div className="form-group">
              <label>Band Name *</label>
              <input
                type="text"
                maxLength={40}
                placeholder="e.g. The Static Waves"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                className="create-input"
              />
            </div>
            <div className="form-group">
              <label>Genre *</label>
              <select
                className="create-input"
                value={genre}
                onChange={e => { setGenre(e.target.value); setError(''); }}
              >
                <option value="">Select genre…</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description <span className="label-hint">(optional)</span></label>
            <textarea
              maxLength={200}
              placeholder="Tell potential members about your band…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="create-input create-textarea"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>
              Roster Positions *{' '}
              <span className="label-hint">select all slots your band needs</span>
            </label>
            <div className="instrument-grid">
              {INSTRUMENTS.map(inst => (
                <button
                  key={inst.id}
                  type="button"
                  className={`instrument-chip ${isSelected(inst.id) ? 'selected' : ''}`}
                  onClick={() => togglePosition(inst)}
                >
                  <span>{inst.emoji}</span>
                  <span>{inst.title}</span>
                </button>
              ))}
            </div>
            {isSelected('other') && (
              <input
                type="text"
                maxLength={30}
                placeholder="Custom position name…"
                value={customPosition}
                onChange={e => setCustomPosition(e.target.value)}
                className="create-input"
                style={{ marginTop: 10 }}
              />
            )}
          </div>

          {selectedPositions.length > 0 && (
            <div className="form-group">
              <label>Your Position *</label>
              <div className="your-position-grid">
                {selectedPositions.map(p => (
                  <label
                    key={p.id}
                    className={`position-radio ${ownerPositionId === p.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="ownerPosition"
                      value={p.id}
                      checked={ownerPositionId === p.id}
                      onChange={() => setOwnerPositionId(p.id)}
                    />
                    <span>
                      {p.emoji}{' '}
                      {p.id === 'other' && customPosition.trim() ? customPosition.trim() : p.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <div className="create-error">{error}</div>}

          <button type="submit" className="create-submit-btn">
            🎸 Create Band
          </button>
        </form>
      </div>
    </div>
  );
}

export default BandCreate;
