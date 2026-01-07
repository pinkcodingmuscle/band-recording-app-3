# Microphone Recording & Playback Feature Proposal

## Overview
This proposal outlines the implementation of real microphone recording and playback functionality for the band recording app, allowing users to select tracks, record audio using their local microphone, and play back recordings.

---

## Key Features

### 1. Track Selection
- Users can select any track to arm it for recording
- Visual indicators show which track is armed and ready
- Only one track can be armed at a time to prevent conflicts

### 2. Microphone Access
- Request browser microphone permissions via MediaRecorder API
- Show permission status in UI
- Handle permission denial gracefully

### 3. Live Recording
- Real-time audio capture with visual feedback
- Display recording timer and waveform levels
- Record button changes state during recording
- Stop recording saves audio to track

### 4. Audio Storage
- Store recordings as Blob/ArrayBuffer in memory
- Optional: Use IndexedDB for persistent storage
- Associate audio data with specific tracks

### 5. Playback System
- Play individual tracks independently
- Play all tracks simultaneously (mix)
- Sync playback across multiple tracks
- Individual track mute/solo controls

### 6. Waveform Visualization
- Display actual audio waveform data
- Generate waveform from recorded audio
- Show real-time level meters during recording

---

## Technical Approach

### APIs & Technologies

#### MediaRecorder API
- For capturing microphone audio
- Handles audio encoding (WebM, MP4, etc.)
- Provides audio chunks in real-time

#### Web Audio API
- For audio processing and playback
- Audio effects and filtering
- Real-time audio analysis

#### AudioContext
- Audio graph management
- Sample rate conversion
- Audio scheduling and timing

#### Blob Storage
- Store recordings in memory
- Convert to ArrayBuffer for processing
- Optional IndexedDB for persistence

---

## Implementation Details

### Phase 1: Microphone Access

```javascript
// Request microphone permission on component mount
useEffect(() => {
  requestMicrophoneAccess();
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
  }
};
```

### Phase 2: Track Arming

```javascript
const armTrackForRecording = (trackId) => {
  // Only one track can be armed at a time
  setArmedTrackId(trackId);
  
  // Update track state to show it's armed
  setTracks(tracks.map(track => 
    track.id === trackId 
      ? { ...track, armed: true } 
      : { ...track, armed: false }
  ));
};
```

### Phase 3: Recording Flow

```javascript
const startRecording = () => {
  if (!armedTrackId || !mediaStream) {
    alert('Please arm a track and ensure microphone access');
    return;
  }

  // Create MediaRecorder instance
  const recorder = new MediaRecorder(mediaStream);
  const chunks = [];

  recorder.ondataavailable = (event) => {
    chunks.push(event.data);
  };

  recorder.onstop = async () => {
    // Create blob from recorded chunks
    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
    
    // Store blob with track
    saveRecordingToTrack(armedTrackId, audioBlob);
    
    // Generate waveform
    const waveform = await generateWaveformFromBlob(audioBlob);
    updateTrackWaveform(armedTrackId, waveform);
  };

  recorder.start(100); // Collect data every 100ms
  setMediaRecorder(recorder);
  setIsRecording(true);
};

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    setIsRecording(false);
  }
};
```

### Phase 4: Playback System

```javascript
const playTrack = async (trackId) => {
  const track = tracks.find(t => t.id === trackId);
  if (!track || !track.audioBlob) return;

  // Create audio context if not exists
  if (!audioContext) {
    setAudioContext(new AudioContext());
  }

  // Convert blob to array buffer
  const arrayBuffer = await track.audioBlob.arrayBuffer();
  
  // Decode audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Create source node
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  
  // Connect to gain node for volume control
  const gainNode = audioContext.createGain();
  gainNode.gain.value = track.volume / 100;
  
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Play
  source.start(0);
  
  // Store source for stopping
  setActiveAudioSources(prev => ({
    ...prev,
    [trackId]: source
  }));
};

const playAllTracks = async () => {
  const startTime = audioContext.currentTime;
  
  // Play all non-muted tracks simultaneously
  tracks.forEach(track => {
    if (!track.muted && track.audioBlob) {
      playTrackAtTime(track.id, startTime);
    }
  });
};
```

### Phase 5: Waveform Generation

```javascript
const generateWaveformFromBlob = async (audioBlob) => {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
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
  
  // Normalize to 0-8 range for display characters
  const max = Math.max(...waveformData);
  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  return waveformData
    .map(val => chars[Math.floor((val / max) * (chars.length - 1))])
    .join('');
};
```

---

## State Management

### New State Variables

```javascript
const [mediaStream, setMediaStream] = useState(null);
const [mediaRecorder, setMediaRecorder] = useState(null);
const [microphoneStatus, setMicrophoneStatus] = useState('unknown');
const [armedTrackId, setArmedTrackId] = useState(null);
const [audioContext, setAudioContext] = useState(null);
const [activeAudioSources, setActiveAudioSources] = useState({});
```

### Updated Track Data Structure

```javascript
{
  id: 1,
  name: 'Lead Guitar',
  duration: '3:45',
  waveform: '▁▂▃▅▆▇█▇▆▅▃▂▁',
  status: 'recorded',
  volume: 75,
  muted: false,
  solo: false,
  armed: false,        // NEW: Track armed for recording
  audioBlob: null,     // NEW: Recorded audio data
  audioBuffer: null,   // NEW: Decoded audio buffer
  comments: 2
}
```

---

## UI/UX Enhancements

### Track Controls
- **Arm Button**: Red/gray indicator to arm track for recording
- **Recording Indicator**: Pulsing red dot when track is recording
- **Microphone Icon**: Shows microphone permission status
- **Play Button**: Per-track playback control

### Recording Modal
- Large timer display
- Real-time audio level meter
- Waveform preview
- Stop recording button

### Transport Bar
- Master record button (records to armed track)
- Master play button (plays all tracks)
- Master stop button
- Playhead syncs with audio playback

---

## Additional Features (Future)

### Audio Effects
- Reverb
- Echo/Delay
- EQ (equalizer)
- Compression
- Pitch correction

### Export Options
- Export individual tracks as WAV/MP3
- Export mixed-down audio (all tracks)
- Download recordings

### Advanced Recording
- Punch in/out recording
- Loop recording
- Metronome/click track
- Count-in before recording

### Collaboration
- Share recordings with other users
- Real-time collaborative recording
- Cloud storage for projects

---

## Browser Compatibility

### Supported Browsers
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with some codec limitations)
- Mobile browsers: Limited (check iOS Safari restrictions)

### Fallback Strategy
- Detect unsupported browsers
- Show helpful error messages
- Provide alternative recording methods

---

## Performance Considerations

### Memory Management
- Limit number of simultaneous recordings
- Clear unused audio buffers
- Implement track archiving for large projects

### Audio Quality
- Default: 44.1kHz sample rate
- Bitrate: 128kbps (configurable)
- Format: WebM (most compatible)

### Optimization
- Lazy load audio buffers
- Use Web Workers for waveform processing
- Implement audio streaming for long recordings

---

## Security & Privacy

### Microphone Permissions
- Request only when needed
- Clear explanation of why permission is needed
- Respect user's denial

### Data Storage
- Audio stored locally (not sent to server by default)
- Optional cloud backup with encryption
- Clear data retention policy

---

## Testing Strategy

### Unit Tests
- MediaRecorder initialization
- Audio blob creation
- Waveform generation
- Playback synchronization

### Integration Tests
- Full recording workflow
- Multi-track playback
- Permission handling

### Browser Testing
- Test on all major browsers
- Test on mobile devices
- Test permission flows

---

## Implementation Timeline

### Week 1: Foundation
- Set up MediaRecorder API
- Implement microphone access
- Basic recording functionality

### Week 2: Playback
- Implement Web Audio API
- Single track playback
- Multi-track synchronization

### Week 3: UI/UX
- Track arming interface
- Recording indicators
- Waveform visualization

### Week 4: Polish
- Bug fixes
- Performance optimization
- Browser compatibility testing

---

## Success Metrics

- Users can successfully record audio in 95%+ of sessions
- Playback is synchronized within 50ms across tracks
- Recording latency < 100ms
- No memory leaks during extended sessions
- Works on all major browsers

---

## Conclusion

This implementation will transform the app from a visual DAW mockup into a fully functional recording tool, enabling real music collaboration and recording workflows.
