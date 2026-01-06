import React, { useState, useEffect, useRef } from 'react';
import './Recording.css';

function Recording({ isRecording, setIsRecording, activeSession }) {
  const [recordingTime, setRecordingTime] = useState(0);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [tracks, setTracks] = useState([
    { id: 1, name: 'Lead Guitar', duration: '3:45', waveform: '▁▂▃▅▆▇█▇▆▅▃▂▁', status: 'recorded', volume: 75, muted: false, solo: false, comments: 2 },
    { id: 2, name: 'Bass Line', duration: '3:42', waveform: '▂▃▄▅▃▂▁▂▃▄▃▂', status: 'recorded', volume: 80, muted: false, solo: false, comments: 1 },
    { id: 3, name: 'Drums', duration: '3:48', waveform: '█▇▆▅▆▇█▆▅▄▃▂', status: 'recorded', volume: 70, muted: false, solo: false, comments: 3 },
    { id: 4, name: 'Vocals', duration: '3:40', waveform: '▃▄▅▆▅▄▃▂▃▄▅▄', status: 'recorded', volume: 85, muted: false, solo: false, comments: 0 }
  ]);
  const [currentTrackName, setCurrentTrackName] = useState('');
  const intervalRef = useRef(null);
  const playIntervalRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (recordingTime > 0 && currentTrackName) {
        const newTrack = {
          id: tracks.length + 1,
          name: currentTrackName,
          duration: formatTime(recordingTime),
          waveform: '▁▂▃▄▅▆▇█▇▆▅▄▃▂▁',
          status: 'recorded',
          volume: 75,
          muted: false,
          solo: false,
          comments: 0
        };
        setTracks([...tracks, newTrack]);
        setRecordingTime(0);
        setCurrentTrackName('');
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    const trackName = prompt('Enter track name:');
    if (trackName) {
      setCurrentTrackName(trackName);
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setPlayheadPosition(0);
  };

  const toggleMute = (id) => {
    setTracks(tracks.map(track => 
      track.id === id ? { ...track, muted: !track.muted } : track
    ));
  };

  const toggleSolo = (id) => {
    setTracks(tracks.map(track => 
      track.id === id ? { ...track, solo: !track.solo } : track
    ));
  };

  const updateVolume = (id, volume) => {
    setTracks(tracks.map(track => 
      track.id === id ? { ...track, volume: parseInt(volume) } : track
    ));
  };

  const deleteTrack = (id) => {
    setTracks(tracks.filter(track => track.id !== id));
  };

  const addComment = (trackId) => {
    const comment = prompt('Add a comment on this track:');
    if (comment) {
      setTracks(tracks.map(track => 
        track.id === trackId ? { ...track, comments: track.comments + 1 } : track
      ));
    }
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
                    <span className="track-icon">🎵</span>
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
                  {track.comments > 0 && (
                    <span className="comment-badge" onClick={() => addComment(track.id)}>
                      💬 {track.comments}
                    </span>
                  )}
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
                    onClick={(e) => { e.stopPropagation(); addComment(track.id); }}
                    title="Add Comment"
                  >
                    💬
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

                <button 
                  className="delete-track-btn"
                  onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}
                  title="Delete Track"
                >
                  🗑️
                </button>
              </div>

              <div className="track-timeline" style={{ width: `${zoom}%` }}>
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

      {isRecording && (
        <div className="recording-overlay">
          <div className="recording-modal">
            <div className="recording-pulse-indicator"></div>
            <h3>Recording: {currentTrackName}</h3>
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
