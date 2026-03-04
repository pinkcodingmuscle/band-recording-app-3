import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Setlist.css';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { saveAudioBlob, loadAudioBlob, deleteAudioBlob } from '../db/audioDB';

const KEYS = ['C major','D major','E major','F major','G major','A major','B major',
               'C minor','D minor','E minor','F minor','G minor','A minor','B minor'];

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function extractYouTubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  // Already a bare ID
  if (YOUTUBE_ID_RE.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      // shorts: /shorts/ID
      const parts = url.pathname.split('/');
      const idx = parts.indexOf('shorts');
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch { /* not a URL */ }
  return null;
}

const TRACKS_KEY = 'bandlab-tracks-v1';

function getBandTracks() {
  try {
    const raw = localStorage.getItem(TRACKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const DEFAULT_SONGS = [
  { id: 1, title: 'Higher Ground',   bpm: 105, key: 'E minor', recording: null },
  { id: 2, title: 'Electric Feel',   bpm: 100, key: 'B major', recording: null },
  { id: 3, title: 'Midnight City',   bpm: 105, key: 'A major', recording: null },
  { id: 4, title: 'Little Dark Age', bpm: 115, key: 'A minor', recording: null },
  { id: 5, title: 'Everlong',        bpm: 158, key: 'D major', recording: null },
  { id: 6, title: 'Silk Chiffon',    bpm: 118, key: 'G major', recording: null },
];

// ─── Mini-player for band/file types ─────────────────────────────────────────
function AudioMiniPlayer({ src, label, onClose }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  };

  const seek = (delta) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.min(Math.max(a.currentTime + delta, 0), a.duration || 0);
  };

  return (
    <div className="sl-miniplayer" onClick={e => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={e => setCurrent(e.target.currentTime)}
        onDurationChange={e => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
      />
      <span className="sl-mp-label">🎙 {label}</span>
      <button className="sl-mp-btn" onClick={() => seek(-10)} title="−10s">◀◀</button>
      <button className="sl-mp-btn sl-mp-play" onClick={togglePlay}>
        {playing ? '⏸' : '▶'}
      </button>
      <button className="sl-mp-btn" onClick={() => seek(10)} title="+10s">▶▶</button>
      <span className="sl-mp-time">{fmt(current)}</span>
      <input
        className="sl-mp-scrubber"
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={current}
        onChange={e => {
          if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
          setCurrent(Number(e.target.value));
        }}
      />
      <span className="sl-mp-time">{fmt(duration)}</span>
      <button className="sl-mp-close" onClick={onClose} title="Close">✕</button>
    </div>
  );
}

// ─── Mini-player for YouTube ──────────────────────────────────────────────────
function YouTubeMiniPlayer({ videoId, onClose }) {
  return (
    <div className="sl-yt-player" onClick={e => e.stopPropagation()}>
      <div className="sl-yt-iframe-wrap">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          frameBorder="0"
        />
      </div>
      <div className="sl-yt-footer">
        <button className="sl-mp-close" onClick={onClose}>✕ Close</button>
      </div>
    </div>
  );
}

// ─── Attach-recording panel ────────────────────────────────────────────────────
function AttachRecordingPanel({ song, onAttach, onRemove }) {
  const [tab, setTab] = useState('band');
  const [bandTracks] = useState(() => getBandTracks());
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [ytError, setYtError] = useState('');
  const [ytFetching, setYtFetching] = useState(false);
  const [fileInfo, setFileInfo] = useState(null); // { name, blobKey, objectUrl }

  const fetchYtTitle = async () => {
    const id = extractYouTubeId(ytUrl);
    if (!id) { setYtError('Invalid YouTube URL or ID'); return; }
    setYtError('');
    setYtFetching(true);
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(id)}&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        setYtTitle(data.title || '');
      }
    } catch { /* leave title as-is */ }
    setYtFetching(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobKey = `setlist-file-${Date.now()}`;
    try {
      await saveAudioBlob(blobKey, file);
      const objectUrl = URL.createObjectURL(file);
      setFileInfo({ name: file.name, blobKey, objectUrl });
    } catch { /* ignore */ }
  };

  const attach = async () => {
    if (tab === 'band') {
      const track = bandTracks.find(t => String(t.id) === String(selectedTrackId));
      if (!track) return;
      onAttach({ type: 'band', trackId: track.id, trackName: track.name });
    } else if (tab === 'file') {
      if (!fileInfo) return;
      onAttach({ type: 'file', blobKey: fileInfo.blobKey, name: fileInfo.name, objectUrl: fileInfo.objectUrl });
    } else {
      const id = extractYouTubeId(ytUrl);
      if (!id) { setYtError('Invalid YouTube URL or ID'); return; }
      onAttach({ type: 'youtube', videoId: id, title: ytTitle || ytUrl });
    }
  };

  return (
    <div className="sl-attach-panel" onClick={e => e.stopPropagation()}>
      <div className="sl-attach-header">
        <span className="sl-attach-title">🎵 Recording</span>
        {song.recording && (
          <button className="sl-attach-remove" onClick={onRemove}>Remove recording</button>
        )}
      </div>

      {song.recording && (
        <div className="sl-attach-current">
          {song.recording.type === 'band' && <span>🎙 {song.recording.trackName}</span>}
          {song.recording.type === 'file' && <span>📁 {song.recording.name}</span>}
          {song.recording.type === 'youtube' && <span>▶ {song.recording.title}</span>}
        </div>
      )}

      <div className="sl-tab-bar">
        {['band','file','youtube'].map(t => (
          <button
            key={t}
            className={`sl-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'band' ? '🎙 Band' : t === 'file' ? '📁 Upload' : '▶ YouTube'}
          </button>
        ))}
      </div>

      <div className="sl-tab-body">
        {tab === 'band' && (
          <div className="sl-tab-content">
            {bandTracks.length === 0
              ? <p className="sl-hint">No band recordings yet. Record tracks in the Recording tab first.</p>
              : (
                <select
                  className="setlist-select sl-full-width"
                  value={selectedTrackId}
                  onChange={e => setSelectedTrackId(e.target.value)}
                >
                  <option value="">— choose a track —</option>
                  {bandTracks.map(t => (
                    <option key={t.id} value={t.id} disabled={!t.hasAudio}>
                      {t.name} {t.duration ? `(${t.duration})` : ''}{!t.hasAudio ? ' — no audio' : ''}
                    </option>
                  ))}
                </select>
              )
            }
          </div>
        )}

        {tab === 'file' && (
          <div className="sl-tab-content">
            <label className="sl-file-label">
              Choose audio / video file
              <input
                type="file"
                accept="audio/*,video/mp4"
                className="sl-file-input"
                onChange={handleFileChange}
              />
            </label>
            {fileInfo && (
              <span className="sl-hint">✓ {fileInfo.name}</span>
            )}
          </div>
        )}

        {tab === 'youtube' && (
          <div className="sl-tab-content">
            <div className="sl-yt-row">
              <input
                className="setlist-input"
                placeholder="YouTube URL or video ID"
                value={ytUrl}
                onChange={e => { setYtUrl(e.target.value); setYtError(''); }}
              />
              <button className="sl-yt-fetch-btn" onClick={fetchYtTitle} disabled={ytFetching || !ytUrl.trim()}>
                {ytFetching ? '…' : 'Fetch title'}
              </button>
            </div>
            {ytError && <p className="sl-error">{ytError}</p>}
            <input
              className="setlist-input"
              placeholder="Title (auto-filled or enter manually)"
              value={ytTitle}
              onChange={e => setYtTitle(e.target.value)}
            />
          </div>
        )}
      </div>

      <button className="setlist-confirm-btn sl-attach-btn" onClick={attach}>
        Attach
      </button>
    </div>
  );
}

function Setlist({ currentUser }) {
  const [songs, setSongs] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [editBuf, setEditBuf] = useState({});
  const [dragId, setDragId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', bpm: 120, key: 'C major' });
  // { songId } — which song's mini-player is open
  const [playerOpenId, setPlayerOpenId] = useState(null);
  // { [songId]: objectUrl } for file-type blobs rehydrated from IndexedDB
  const [blobUrls, setBlobUrls] = useState({});

  // ── Load setlist from Supabase or fall back to defaults ──
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser?.id) {
      setSongs(DEFAULT_SONGS);
      return;
    }

    supabase
      .from('setlist_items')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('order_index')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setSongs(data.map(s => ({ id: s.id, title: s.title, bpm: s.bpm, key: s.key })));
        } else {
          setSongs(DEFAULT_SONGS);
          // Seed Supabase with default songs on first visit
          supabase.from('setlist_items').insert(
            DEFAULT_SONGS.map((s, i) => ({ id: s.id, user_id: currentUser.id, title: s.title, bpm: s.bpm, key: s.key, order_index: i }))
          ).then(() => {});
        }
      });
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const s = songs.find(s => s.id === id);
      setEditBuf({ title: s.title, bpm: s.bpm, key: s.key });
    }
  };

  const saveEdit = async (id) => {
    const updated = songs.map(s => s.id === id ? { ...s, ...editBuf, bpm: Number(editBuf.bpm) } : s);
    setSongs(updated);
    setExpandedId(null);
    if (isSupabaseConfigured) {
      const song = updated.find(s => s.id === id);
      await supabase.from('setlist_items').update({ title: song.title, bpm: song.bpm, key: song.key }).eq('id', id);
    }
  };

  const deleteSong = async (id) => {
    setSongs(songs.filter(s => s.id !== id));
    if (isSupabaseConfigured) {
      await supabase.from('setlist_items').delete().eq('id', id);
    }
  };

  const addSong = async () => {
    if (!newSong.title.trim()) return;
    const song = { ...newSong, id: Date.now(), bpm: Number(newSong.bpm) };
    setSongs(prev => [...prev, song]);
    setNewSong({ title: '', bpm: 120, key: 'C major' });
    setAddOpen(false);
    if (isSupabaseConfigured && currentUser?.id) {
      await supabase.from('setlist_items').insert({
        id: song.id,
        user_id: currentUser.id,
        title: song.title,
        bpm: song.bpm,
        key: song.key,
        order_index: songs.length,
      });
    }
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
  const onDragEnd = async () => {
    setDragId(null);
    if (isSupabaseConfigured) {
      await Promise.all(songs.map((s, idx) =>
        supabase.from('setlist_items').update({ order_index: idx }).eq('id', s.id)
      ));
    }
  };

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
