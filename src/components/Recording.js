import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Recording.css';
import './RecordingComments.css';
import CommentRail from './CommentRail';
import AddCommentModal from './AddCommentModal';
import { useComments } from '../context/CommentsContext';
import { saveAudioBlob, loadAudioBlob, deleteAudioBlob } from '../db/audioDB';
import { isApiConfigured, apiGetTracks, apiUpsertTracks, apiDeleteTrack } from '../lib/api';

const TRACKS_KEY = 'bandlab-tracks-v1';
const SEED_TRACKS = [
  { id: 1, name: 'Lead Guitar', duration: '3:45', waveform: '▁▂▃▅▆▇█▇▆▅▃▂▁', status: 'recorded', volume: 75, muted: false, solo: false, audioUrl: null, audioExt: null, audioPath: null, hasAudio: false },
  { id: 2, name: 'Bass Line',   duration: '3:42', waveform: '▂▃▄▅▃▂▁▂▃▄▃▂',   status: 'recorded', volume: 80, muted: false, solo: false, audioUrl: null, audioExt: null, audioPath: null, hasAudio: false },
  { id: 3, name: 'Drums',       duration: '3:48', waveform: '█▇▆▅▆▇█▆▅▄▃▂',   status: 'recorded', volume: 70, muted: false, solo: false, audioUrl: null, audioExt: null, audioPath: null, hasAudio: false },
  { id: 4, name: 'Vocals',      duration: '3:40', waveform: '▃▄▅▆▅▄▃▂▃▄▅▄',   status: 'recorded', volume: 85, muted: false, solo: false, audioUrl: null, audioExt: null, audioPath: null, hasAudio: false },
];

// API returns camelCase directly; no mapping needed
function trackFromApi(t) {
  return { ...t, audioUrl: null }; // audioUrl is ephemeral — rehydrated separately
}

function loadSavedTracks() {
  try {
    const raw = localStorage.getItem(TRACKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function Recording({ activeSession, currentUser }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [commentModal, setCommentModal] = useState(null);
  const [trackNameModal, setTrackNameModal] = useState({ open: false, value: '' });
  const { showComments, autoplayComments, toggleShowComments, toggleAutoplay, getCommentsForTrack } = useComments();
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const intervalRef = useRef(null);
  const playIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const micStreamRef = useRef(null);
  const pendingTrackNameRef = useRef('');
  const isCapturingAudioRef = useRef(false);
  const recordingTimeRef = useRef(0);
  // { [trackId]: HTMLAudioElement }
  const audioNodesRef = useRef({});

  // Only manages the seconds-counter; track creation happens in handleStopRecording
  useEffect(() => {
    if (isRecording) {
      recordingTimeRef.current = 0;
      setRecordingTime(0);
      intervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRecording]);

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setPlayheadPosition(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 100);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying]);

  // ── On mount: load track metadata from API or localStorage ──
  useEffect(() => {
    let cancelled = false;
    async function loadTracks() {
      if (isApiConfigured && currentUser?.id) {
        const data = await apiGetTracks();
        if (!cancelled) {
          if (data && data.length > 0) {
            setTracks(data.map(trackFromApi));
          } else {
            // First visit: seed API with default tracks
            await apiUpsertTracks(SEED_TRACKS);
            if (!cancelled) setTracks(SEED_TRACKS);
          }
          setTracksLoading(false);
        }
      } else {
        if (!cancelled) {
          setTracks(loadSavedTracks() ?? SEED_TRACKS);
          setTracksLoading(false);
        }
      }
    }
    loadTracks();
    return () => { cancelled = true; };
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist track metadata whenever tracks change ──
  useEffect(() => {
    if (tracksLoading) return;
    if (isApiConfigured && currentUser?.id) {
      apiUpsertTracks(tracks); // fire-and-forget
    } else {
      const toSave = tracks.map(({ audioUrl, ...rest }) => rest);
      localStorage.setItem(TRACKS_KEY, JSON.stringify(toSave));
    }
  }, [tracks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── On mount: rehydrate audio URLs for tracks that have recorded audio ──
  useEffect(() => {
    if (tracksLoading) return;
    let cancelled = false;
    async function rehydrate() {
      const toRehydrate = tracks.filter((t) => t.hasAudio);
      if (toRehydrate.length === 0) return;

      const rehydrated = new Map();
      await Promise.all(
        toRehydrate.map(async (track) => {
          try {
            // loadAudioBlob now returns a URL string (signed URL or blob: URL)
            const audioUrl = await loadAudioBlob(track.id, track.audioPath);
            if (audioUrl && !cancelled) {
              rehydrated.set(track.id, audioUrl);
            }
          } catch { /* ignore */ }
        })
      );
      if (!cancelled && rehydrated.size > 0) {
        setTracks((prev) =>
          prev.map((t) =>
            rehydrated.has(t.id) ? { ...t, audioUrl: rehydrated.get(t.id) } : t
          )
        );
      }
    }
    rehydrate();
    return () => { cancelled = true; };
  }, [tracksLoading]); // run once after tracks are loaded — eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync HTMLAudioElement nodes whenever tracks change ──
  useEffect(() => {
    tracks.forEach((track) => {
      if (!track.audioUrl) return;
      if (!audioNodesRef.current[track.id]) {
        const audio = new Audio(track.audioUrl);
        audio.preload = 'auto';
        audioNodesRef.current[track.id] = audio;
      }
      // Always sync volume
      audioNodesRef.current[track.id].volume = track.muted ? 0 : track.volume / 100;
    });
    // Remove nodes for deleted tracks
    const idSet = new Set(tracks.map((t) => String(t.id)));
    Object.keys(audioNodesRef.current).forEach((key) => {
      if (!idSet.has(key)) {
        audioNodesRef.current[key].pause();
        delete audioNodesRef.current[key];
      }
    });
  }, [tracks]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Audio helpers ──
  const stopAllAudio = useCallback(() => {
    Object.values(audioNodesRef.current).forEach((a) => { a.pause(); a.currentTime = 0; });
  }, []);

  const pauseAllAudio = useCallback(() => {
    Object.values(audioNodesRef.current).forEach((a) => a.pause());
  }, []);

  const playAudioForTracks = useCallback((trackList) => {
    const soloActive = trackList.some((t) => t.solo);
    trackList.forEach((track) => {
      const node = audioNodesRef.current[track.id];
      if (!node) return;
      const shouldPlay = soloActive ? track.solo : !track.muted;
      if (shouldPlay) {
        node.volume = track.volume / 100;
        node.play().catch(() => {/* autoplay blocked */});
      } else {
        node.pause();
      }
    });
  }, []);

  const handleStartRecording = () => {
    setTrackNameModal({ open: true, value: '' });
  };

  const confirmStartRecording = async () => {
    const name = trackNameModal.value.trim();
    setTrackNameModal({ open: false, value: '' });
    if (!name) return;
    pendingTrackNameRef.current = name;

    // Attempt real microphone capture via MediaRecorder
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        isCapturingAudioRef.current = false;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const id = Date.now();
        const n = pendingTrackNameRef.current;
        const t = recordingTimeRef.current;
        pendingTrackNameRef.current = '';
        // Persist blob — returns Supabase Storage path or undefined (IndexedDB)
        let audioPath = null;
        try { audioPath = await saveAudioBlob(id, blob) ?? null; } catch { /* ignore */ }
        const audioUrl = URL.createObjectURL(blob);
        setTracks(prev => [
          ...prev,
          {
            id,
            name: n,
            duration: formatTime(t),
            waveform: '▁▂▃▄▅▆▇█▇▆▅▄▃▂▁',
            status: 'recorded',
            volume: 75,
            muted: false,
            solo: false,
            audioUrl,
            audioExt: ext,
            audioPath,
            hasAudio: true,
          },
        ]);
        setRecordingTime(0);
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      isCapturingAudioRef.current = true;
    } catch {
      // No mic access — timer-only mode; track saved via useEffect
      mediaRecorderRef.current = null;
      isCapturingAudioRef.current = false;
    }

    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // MediaRecorder path: recorder.onstop callback will create the track
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } else {
      // Timer-only fallback: create the track now using refs (no stale closure)
      const t = recordingTimeRef.current;
      const n = pendingTrackNameRef.current;
      if (t > 0 && n) {
        setTracks(prev => [
          ...prev,
          {
            id: Date.now(),
            name: n,
            duration: formatTime(t),
            waveform: '▁▂▃▄▅▆▇█▇▆▅▄▃▂▁',
            status: 'recorded',
            volume: 75,
            muted: false,
            solo: false,
            audioUrl: null,
            audioExt: null,
            hasAudio: false,
          },
        ]);
      }
      pendingTrackNameRef.current = '';
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    setIsRecording(false);
  };

  const handlePlay = () => {
    if (isPlaying) {
      pauseAllAudio();
      setIsPlaying(false);
    } else {
      playAudioForTracks(tracks);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    stopAllAudio();
    setIsPlaying(false);
    setPlayheadPosition(0);
  };

  const toggleMute = (id) => {
    setTracks(prev => prev.map((track) => {
      if (track.id !== id) return track;
      const nowMuted = !track.muted;
      const node = audioNodesRef.current[id];
      if (node) {
        if (nowMuted) {
          node.pause();
        } else if (isPlaying) {
          node.volume = track.volume / 100;
          node.play().catch(() => {});
        }
      }
      return { ...track, muted: nowMuted };
    }));
  };

  const toggleSolo = (id) => {
    setTracks(prev => {
      const updated = prev.map(track =>
        track.id === id ? { ...track, solo: !track.solo } : track
      );
      if (isPlaying) playAudioForTracks(updated);
      return updated;
    });
  };

  const updateVolume = (id, volume) => {
    const vol = parseInt(volume);
    setTracks(tracks.map(track =>
      track.id === id ? { ...track, volume: vol } : track
    ));
    const node = audioNodesRef.current[id];
    if (node) node.volume = vol / 100;
  };

  const deleteTrack = (id) => {
    const track = tracks.find(t => t.id === id);
    if (track?.audioUrl) URL.revokeObjectURL(track.audioUrl);
    const node = audioNodesRef.current[id];
    if (node) { node.pause(); delete audioNodesRef.current[id]; }
    if (track?.hasAudio) deleteAudioBlob(id, track.audioPath).catch(() => {});
    if (isApiConfigured && currentUser?.id) {
      apiDeleteTrack(id);
    }
    setTracks(tracks.filter(track => track.id !== id));
  };

  const openCommentModal = (trackId, timeMs) => {
    setCommentModal({ trackId, timeMs });
  };

  return (
    <div className="recording-container">
      {/* Transport Controls Bar */}
      <div className="transport-bar">
        <div className="transport-controls">
          <button className="transport-btn" onClick={handleStop} title="Stop">
            ⏹
          </button>
          <button 
            className={`transport-btn play ${isPlaying ? 'playing' : ''}`} 
            onClick={handlePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button 
            className={`transport-btn record ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            title={isRecording ? 'Stop Recording' : 'Record'}
          >
            ⏺
          </button>
        </div>

        <div className="time-display">
          <span className="time-current">{formatTime(Math.floor(playheadPosition * 2.4))}</span>
          <span className="time-separator">/</span>
          <span className="time-total">4:00</span>
        </div>

        <div className="comment-controls">
          <button
            className={`comment-toggle-btn ${showComments ? 'active' : ''}`}
            onClick={toggleShowComments}
            title={showComments ? 'Hide Comments' : 'Show Comments'}
          >
            💬
          </button>
          <button
            className={`autoplay-toggle-btn ${autoplayComments ? 'active' : ''}`}
            onClick={toggleAutoplay}
            title={autoplayComments ? 'Disable autoplay comments' : 'Enable autoplay comments'}
          >
            {autoplayComments ? '🔊' : '🔇'} Autoplay
          </button>
        </div>

        <div className="transport-right">
          <div className="tempo-control">
            <label>BPM</label>
            <input type="number" defaultValue="120" min="40" max="200" />
          </div>
          <div className="zoom-control">
            <button onClick={() => setZoom(Math.max(25, zoom - 25))}>−</button>
            <span>{zoom}%</span>
            <button onClick={() => setZoom(Math.min(200, zoom + 25))}>+</button>
          </div>
        </div>
      </div>

      {/* Timeline and Tracks */}
      <div className="daw-workspace">
        {/* Timeline Ruler */}
        <div className="timeline-header">
          <div className="track-controls-header">Tracks</div>
          <div className="timeline-ruler" style={{ width: `${zoom}%` }}>
            {[0, 1, 2, 3, 4].map(min => (
              <div key={min} className="timeline-marker">
                <span>{min}:00</span>
              </div>
            ))}
            <div 
              className="playhead" 
              style={{ left: `${playheadPosition}%` }}
            ></div>
          </div>
        </div>

        {/* Track List */}
        <div className="tracks-area">
          {tracks.map(track => (
            <div 
              key={track.id} 
              className={`daw-track ${selectedTrack === track.id ? 'selected' : ''} ${track.muted ? 'muted' : ''}`}
              onClick={() => setSelectedTrack(track.id)}
            >
              <div className="track-controls-panel">
                <div className="track-header">
                  <div className="track-name-section">
                    <span className="track-icon">{track.hasAudio ? '🎙️' : '🎵'}</span>
                    <input 
                      type="text" 
                      value={track.name} 
                      onChange={(e) => {
                        setTracks(tracks.map(t => 
                          t.id === track.id ? { ...t, name: e.target.value } : t
                        ));
                      }}
                      className="track-name-input"
                    />
                  </div>
                </div>

                <div className="track-buttons">
                  <button 
                    className={`track-toggle ${track.muted ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleMute(track.id); }}
                    title="Mute"
                  >
                    M
                  </button>
                  <button 
                    className={`track-toggle ${track.solo ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleSolo(track.id); }}
                    title="Solo"
                  >
                    S
                  </button>
                  <button 
                    className="track-action"
                    onClick={(e) => { e.stopPropagation(); openCommentModal(track.id, Math.round(playheadPosition * 2400)); }}
                    title="Add Comment at playhead"
                  >
                    💬{getCommentsForTrack(track.id).length > 0 && (
                      <span className="track-comment-badge">{getCommentsForTrack(track.id).length}</span>
                    )}
                  </button>
                </div>

                <div className="volume-control">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={track.volume}
                    onChange={(e) => updateVolume(track.id, e.target.value)}
                    className="volume-slider"
                  />
                  <span className="volume-value">{track.volume}</span>
                </div>

                <div className="track-actions-row">
                  {track.audioUrl && (
                    <>
                      <audio
                        controls
                        src={track.audioUrl}
                        className="track-audio-player"
                        title={`Play ${track.name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <a
                        href={track.audioUrl}
                        download={`${track.name}.${track.audioExt || 'webm'}`}
                        className="track-download-btn"
                        title="Download recording"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Download ${track.name}`}
                      >
                        ⬇
                      </a>
                    </>
                  )}
                  <button
                    className="delete-track-btn"
                    onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}
                    title="Delete Track"
                    aria-label={`Delete ${track.name}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="track-timeline" style={{ width: `${zoom}%` }}>
                <CommentRail
                  trackId={track.id}
                  onAddComment={(tid, tms) => openCommentModal(tid, tms)}
                />
                <div className="track-region">
                  <div className="waveform-display">{track.waveform}</div>
                  <span className="region-label">{track.name}</span>
                </div>
              </div>
            </div>
          ))}

          {tracks.length === 0 && (
            <div className="empty-workspace">
              <p>🎵 No tracks yet</p>
              <p>Click the record button to start recording</p>
            </div>
          )}
        </div>

        {/* Add Track Button */}
        <div className="add-track-section">
          <button className="add-track-btn" onClick={handleStartRecording}>
            + Add Track
          </button>
        </div>
      </div>

      {/* Bottom Panel - Instruments & Effects */}
      <div className="bottom-panel">
        <div className="panel-tabs">
          <button className="panel-tab active">🎹 Instruments</button>
          <button className="panel-tab">🎛️ Effects</button>
          <button className="panel-tab">🎚️ Mixer</button>
        </div>
        
        <div className="instruments-grid">
          <button className="instrument-btn">
            <span className="instrument-icon">🎸</span>
            <span>Guitar</span>
          </button>
          <button className="instrument-btn">
            <span className="instrument-icon">🎹</span>
            <span>Piano</span>
          </button>
          <button className="instrument-btn">
            <span className="instrument-icon">🥁</span>
            <span>Drums</span>
          </button>
          <button className="instrument-btn">
            <span className="instrument-icon">🎺</span>
            <span>Brass</span>
          </button>
          <button className="instrument-btn">
            <span className="instrument-icon">🎻</span>
            <span>Strings</span>
          </button>
          <button className="instrument-btn">
            <span className="instrument-icon">🎤</span>
            <span>Mic</span>
          </button>
        </div>
      </div>

      {trackNameModal.open && (
        <div
          className="track-name-overlay"
          onClick={() => setTrackNameModal({ open: false, value: '' })}
          role="presentation"
        >
          <div
            className="track-name-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="New track name"
          >
            <h3 className="track-modal-title">🎙️ New Track</h3>
            <input
              type="text"
              className="track-name-input-modal"
              placeholder="e.g. Lead Guitar, Vocals…"
              value={trackNameModal.value}
              autoFocus
              maxLength={60}
              onChange={(e) =>
                setTrackNameModal((m) => ({ ...m, value: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmStartRecording();
                if (e.key === 'Escape')
                  setTrackNameModal({ open: false, value: '' });
              }}
            />
            <p className="track-modal-hint">
              🎤 Microphone access will be requested when recording starts.
            </p>
            <div className="track-modal-actions">
              <button
                className="modal-btn secondary"
                onClick={() => setTrackNameModal({ open: false, value: '' })}
              >
                Cancel
              </button>
              <button
                className="modal-btn primary"
                disabled={!trackNameModal.value.trim()}
                onClick={confirmStartRecording}
              >
                Start Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {commentModal && (
        <AddCommentModal
          trackId={commentModal.trackId}
          timeMs={commentModal.timeMs}
          currentUser={currentUser}
          onClose={() => setCommentModal(null)}
        />
      )}

      {isRecording && (
        <div className="recording-overlay">
          <div className="recording-modal">
            <div className="recording-pulse-indicator"></div>
            <h3>Recording: {pendingTrackNameRef.current}</h3>
            <div className="recording-time-large">{formatTime(recordingTime)}</div>
            <button className="stop-recording-btn" onClick={handleStopRecording}>
              Stop Recording
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recording;
