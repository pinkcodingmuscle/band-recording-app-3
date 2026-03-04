import React, { useState } from 'react';
import './Setlist.css';

const KEYS = ['C major','D major','E major','F major','G major','A major','B major',
               'C minor','D minor','E minor','F minor','G minor','A minor','B minor'];

const DEFAULT_SONGS = [
  { id: 1, title: 'Higher Ground',   bpm: 105, key: 'E minor' },
  { id: 2, title: 'Electric Feel',   bpm: 100, key: 'B major' },
  { id: 3, title: 'Midnight City',   bpm: 105, key: 'A major' },
  { id: 4, title: 'Little Dark Age', bpm: 115, key: 'A minor' },
  { id: 5, title: 'Everlong',        bpm: 158, key: 'D major' },
  { id: 6, title: 'Silk Chiffon',    bpm: 118, key: 'G major' },
];

function Setlist() {
  const [songs, setSongs] = useState(DEFAULT_SONGS);
  const [expandedId, setExpandedId] = useState(null);
  const [editBuf, setEditBuf] = useState({});
  const [dragId, setDragId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', bpm: 120, key: 'C major' });

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const s = songs.find(s => s.id === id);
      setEditBuf({ title: s.title, bpm: s.bpm, key: s.key });
    }
  };

  const saveEdit = (id) => {
    setSongs(songs.map(s => s.id === id ? { ...s, ...editBuf, bpm: Number(editBuf.bpm) } : s));
    setExpandedId(null);
  };

  const deleteSong = (id) => setSongs(songs.filter(s => s.id !== id));

  const addSong = () => {
    if (!newSong.title.trim()) return;
    setSongs([...songs, { ...newSong, id: Date.now(), bpm: Number(newSong.bpm) }]);
    setNewSong({ title: '', bpm: 120, key: 'C major' });
    setAddOpen(false);
  };

  // drag-to-reorder
  const onDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver  = (e, id) => {
    e.preventDefault();
    if (id === dragId) return;
    const from = songs.findIndex(s => s.id === dragId);
    const to   = songs.findIndex(s => s.id === id);
    const next = [...songs];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setSongs(next);
  };
  const onDragEnd = () => setDragId(null);

  return (
    <div className="setlist-container">
      <div className="setlist-header">
        <h2 className="setlist-title">Setlist</h2>
        <button className="setlist-add-btn" onClick={() => setAddOpen(o => !o)}>
          {addOpen ? '✕ Cancel' : '+ Add Song'}
        </button>
      </div>

      {addOpen && (
        <div className="setlist-add-form">
          <input
            className="setlist-input"
            placeholder="Song title"
            value={newSong.title}
            onChange={e => setNewSong({ ...newSong, title: e.target.value })}
          />
          <input
            className="setlist-input setlist-input-sm"
            type="number"
            placeholder="BPM"
            min="40" max="300"
            value={newSong.bpm}
            onChange={e => setNewSong({ ...newSong, bpm: e.target.value })}
          />
          <select
            className="setlist-select"
            value={newSong.key}
            onChange={e => setNewSong({ ...newSong, key: e.target.value })}
          >
            {KEYS.map(k => <option key={k}>{k}</option>)}
          </select>
          <button className="setlist-confirm-btn" onClick={addSong}>Add</button>
        </div>
      )}

      <ol className="setlist-list">
        {songs.map((song, idx) => (
          <li
            key={song.id}
            className={`setlist-row ${expandedId === song.id ? 'expanded' : ''} ${dragId === song.id ? 'dragging' : ''}`}
            draggable
            onDragStart={e => onDragStart(e, song.id)}
            onDragOver={e => onDragOver(e, song.id)}
            onDragEnd={onDragEnd}
          >
            <div className="setlist-row-main" onClick={() => toggleExpand(song.id)}>
              <span className="setlist-num">{idx + 1}</span>
              <div className="setlist-song-info">
                <span className="setlist-song-title">{song.title}</span>
                <span className="setlist-song-meta">{song.bpm} BPM · {song.key}</span>
              </div>
              <span className="setlist-key-badge">{song.key}</span>
              <span className="setlist-drag-handle" title="Drag to reorder">⋮⋮</span>
            </div>

            {expandedId === song.id && (
              <div className="setlist-edit-panel" onClick={e => e.stopPropagation()}>
                <input
                  className="setlist-input"
                  value={editBuf.title || ''}
                  onChange={e => setEditBuf({ ...editBuf, title: e.target.value })}
                  placeholder="Title"
                />
                <input
                  className="setlist-input setlist-input-sm"
                  type="number"
                  min="40" max="300"
                  value={editBuf.bpm || ''}
                  onChange={e => setEditBuf({ ...editBuf, bpm: e.target.value })}
                  placeholder="BPM"
                />
                <select
                  className="setlist-select"
                  value={editBuf.key || ''}
                  onChange={e => setEditBuf({ ...editBuf, key: e.target.value })}
                >
                  {KEYS.map(k => <option key={k}>{k}</option>)}
                </select>
                <div className="setlist-edit-actions">
                  <button className="setlist-save-btn" onClick={() => saveEdit(song.id)}>Save</button>
                  <button className="setlist-delete-btn" onClick={() => deleteSong(song.id)}>Delete</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {songs.length === 0 && (
        <p className="setlist-empty">No songs yet — click + Add Song to get started.</p>
      )}
    </div>
  );
}

export default Setlist;
