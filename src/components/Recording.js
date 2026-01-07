import React, { useState, useEffect, useRef } from 'react';
import './Recording.css';

function Recording({ isRecording, setIsRecording, activeSession }) {
  const [recordingTime, setRecordingTime] = useState(0);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [tracks, setTracks] = useState([
    { id: 1, name: 'Lead Guitar', duration: '3:45', waveform: '▁▂▃▅▆▇█▇▆▅▃▂▁', status: 'recorded', volume: 75, muted: false, solo: false, comments: 2, armed: false, audioBlob: null, isPlayingTrack: false },
    { id: 2, name: 'Bass Line', duration: '3:42', waveform: '▂▃▄▅▃▂▁▂▃▄▃▂', status: 'recorded', volume: 80, muted: false, solo: false, comments: 1, armed: false, audioBlob: null, isPlayingTrack: false },
    { id: 3, name: 'Drums', duration: '3:48', waveform: '█▇▆▅▆▇█▆▅▄▃▂', status: 'recorded', volume: 70, muted: false, solo: false, comments: 3, armed: false, audioBlob: null, isPlayingTrack: false },
    { id: 4, name: 'Vocals', duration: '3:40', waveform: '▃▄▅▆▅▄▃▂▃▄▅▄', status: 'recorded', volume: 85, muted: false, solo: false, comments: 0, armed: false, audioBlob: null, isPlayingTrack: false }
  ]);
  const [currentTrackName, setCurrentTrackName] = useState('');
  const intervalRef = useRef(null);
  const playIntervalRef = useRef(null);
  
  // New state for audio recording and playback
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [microphoneStatus, setMicrophoneStatus] = useState('unknown');
  const [armedTrackId, setArmedTrackId] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const audioSourcesRef = useRef({});

  // Request microphone access on mount
  useEffect(() => {
    requestMicrophoneAccess();
    
    return () => {
      // Cleanup: stop media stream on unmount
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      // Stop all audio sources
      Object.values(audioSourcesRef.current).forEach(source => {
        if (source && source.stop) {
          try {
            source.stop();
          } catch (e) {
            // Already stopped
          }
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      setMediaStream(stream);
      setMicrophoneStatus('granted');
    } catch (error) {
      console.error('Microphone access denied:', error);
      setMicrophoneStatus('denied');
      alert('Microphone access is required for recording. Please allow microphone access in your browser settings.');
    }
  };

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Arm track for recording
  const armTrackForRecording = (trackId) => {
    if (isRecording) {
      alert('Stop recording before arming a different track');
      return;
    }
    
    setArmedTrackId(trackId);
    setTracks(tracks.map(track => 
      track.id === trackId 
        ? { ...track, armed: true } 
        : { ...track, armed: false }
    ));
  };

  const handleStartRecording = () => {
    if (!armedTrackId) {
      alert('Please arm a track first by clicking the ARM button');
      return;
    }
    
    if (microphoneStatus !== 'granted') {
      alert('Microphone access is required. Please allow microphone access.');
      requestMicrophoneAccess();
      return;
    }
    
    if (!mediaStream) {
      alert('No microphone stream available');
      return;
    }
    
    try {
      // Create MediaRecorder instance
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        // Create blob from recorded chunks
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        // Save to armed track
        const armedTrack = tracks.find(t => t.id === armedTrackId);
        if (armedTrack) {
          setCurrentTrackName(armedTrack.name);
          
          // Generate waveform from the recorded audio
          const waveform = await generateWaveformFromBlob(audioBlob);
          
          // Update track with recording
          setTracks(tracks.map(track => 
            track.id === armedTrackId 
              ? { 
                  ...track, 
                  audioBlob: audioBlob,
                  waveform: waveform,
                  duration: formatTime(recordingTime),
                  status: 'recorded'
                } 
              : track
          ));
        }
        
        setMediaRecorder(null);
      };
      
      recorder.start(100); // Collect data every 100ms
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Play individual track
  const playTrack = async (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || !track.audioBlob) {
      alert('No recording available for this track');
      return;
    }

    // Stop if already playing
    if (audioSourcesRef.current[trackId]) {
      try {
        audioSourcesRef.current[trackId].stop();
        delete audioSourcesRef.current[trackId];
        setTracks(tracks.map(t => 
          t.id === trackId ? { ...t, isPlayingTrack: false } : t
        ));
        return;
      } catch (e) {
        // Already stopped
      }
    }

    try {
      // Create audio context if not exists
      let context = audioContext;
      if (!context) {
        context = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(context);
      }

      // Convert blob to array buffer
      const arrayBuffer = await track.audioBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      
      // Create source node
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create gain node for volume control
      const gainNode = context.createGain();
      gainNode.gain.value = track.volume / 100;
      
      source.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Handle playback end
      source.onended = () => {
        delete audioSourcesRef.current[trackId];
        setTracks(tracks.map(t => 
          t.id === trackId ? { ...t, isPlayingTrack: false } : t
        ));
      };
      
      // Play
      source.start(0);
      
      // Store source for stopping
      audioSourcesRef.current[trackId] = source;
      setTracks(tracks.map(t => 
        t.id === trackId ? { ...t, isPlayingTrack: true } : t
      ));
      
    } catch (error) {
      console.error('Error playing track:', error);
      alert('Failed to play track. Please try again.');
    }
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setPlayheadPosition(0);
    
    // Stop all playing tracks
    Object.values(audioSourcesRef.current).forEach(source => {
      if (source && source.stop) {
        try {
          source.stop();
        } catch (e) {
          // Already stopped
        }
      }
    });
    audioSourcesRef.current = {};
    setTracks(tracks.map(t => ({ ...t, isPlayingTrack: false })));
  };

  // Generate waveform from audio blob
  const generateWaveformFromBlob = async (audioBlob) => {
    try {
      // Create audio context if not exists
      let context = audioContext;
      if (!context) {
        context = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(context);
      }
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      
      const rawData = audioBuffer.getChannelData(0);
      const samples = 100; // Number of waveform bars
      const blockSize = Math.floor(rawData.length / samples);
      const waveformData = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j]);
        }
        waveformData.push(sum / blockSize);
      }
      
      // Normalize to 0-7 range for display characters
      const max = Math.max(...waveformData) || 1;
      const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      
      return waveformData
        .map(val => chars[Math.floor((val / max) * (chars.length - 1))])
        .join('');
    } catch (error) {
      console.error('Error generating waveform:', error);
      return '▁▂▃▄▅▆▇█▇▆▅▄▃▂▁'; // Default waveform
    }
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
            disabled={!armedTrackId && !isRecording}
          >
            ⏺
          </button>
        </div>

        <div className="time-display">
          <span className="time-current">{isRecording ? formatTime(recordingTime) : formatTime(Math.floor(playheadPosition * 2.4))}</span>
          <span className="time-separator">/</span>
          <span className="time-total">4:00</span>
        </div>

        <div className="transport-right">
          <div className="mic-status">
            <span className={`mic-indicator ${microphoneStatus}`}>
              🎤 {microphoneStatus === 'granted' ? 'Ready' : microphoneStatus === 'denied' ? 'Denied' : 'Requesting...'}
            </span>
          </div>
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
              className={`daw-track ${selectedTrack === track.id ? 'selected' : ''} ${track.muted ? 'muted' : ''} ${track.armed ? 'armed' : ''}`}
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
                  {track.armed && (
                    <span className="armed-badge" title="Armed for recording">
                      🔴 ARMED
                    </span>
                  )}
                  {track.comments > 0 && (
                    <span className="comment-badge" onClick={() => addComment(track.id)}>
                      💬 {track.comments}
                    </span>
                  )}
                </div>

                <div className="track-buttons">
                  <button 
                    className={`track-toggle arm-btn ${track.armed ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); armTrackForRecording(track.id); }}
                    title="Arm for Recording"
                    disabled={isRecording}
                  >
                    ARM
                  </button>
                  <button 
                    className={`track-toggle play-btn ${track.isPlayingTrack ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); playTrack(track.id); }}
                    title={track.isPlayingTrack ? "Stop" : "Play Track"}
                    disabled={!track.audioBlob}
                  >
                    {track.isPlayingTrack ? '⏸' : '▶'}
                  </button>
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
          <button className="add-track-btn" onClick={() => {
            const trackName = prompt('Enter new track name:');
            if (trackName) {
              const newTrack = {
                id: tracks.length + 1,
                name: trackName,
                duration: '0:00',
                waveform: '▁▂▃▄▅▆▇█',
                status: 'empty',
                volume: 75,
                muted: false,
                solo: false,
                comments: 0,
                armed: false,
                audioBlob: null,
                isPlayingTrack: false
              };
              setTracks([...tracks, newTrack]);
            }
          }}>
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

      {isRecording && armedTrackId && (
        <div className="recording-overlay">
          <div className="recording-modal">
            <div className="recording-pulse-indicator"></div>
            <h3>Recording: {tracks.find(t => t.id === armedTrackId)?.name}</h3>
            <div className="recording-time-large">{formatTime(recordingTime)}</div>
            <div className="recording-status">🎤 Recording in progress...</div>
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
