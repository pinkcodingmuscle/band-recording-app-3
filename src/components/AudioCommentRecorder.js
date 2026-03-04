import React, { useState, useRef, useEffect } from 'react';
import './RecordingComments.css';

const MAX_DURATION_MS = 60000; // 60 seconds

function formatRecTime(ms) {
  const s = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}.${tenths}`;
}

function AudioCommentRecorder({ onSave, onCancel }) {
  const [status, setStatus] = useState('idle'); // idle | recording | recorded | error
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState('');

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setStatus('recorded');
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      setStatus('recording');
      setDuration(0);

      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 100;
        setDuration(elapsed);
        if (elapsed >= MAX_DURATION_MS) stopRecording();
      }, 100);
    } catch {
      setError(
        'Microphone access denied. Please allow microphone access and try again.',
      );
      setStatus('error');
    }
  };

  const stopRecording = () => {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const handleSave = () => {
    onSave({ audioUrl, audioDuration: duration });
  };

  const handleDiscard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
    setStatus('idle');
  };

  if (status === 'error') {
    return (
      <div className="audio-recorder">
        <p className="recorder-error">{error}</p>
        <button className="recorder-btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="audio-recorder">
      {status === 'idle' && (
        <>
          <p className="recorder-hint">
            Record an audio comment (max 60 s)
          </p>
          <div className="recorder-controls">
            <button className="recorder-btn record-start" onClick={startRecording}>
              ⏺ Record
            </button>
            <button className="recorder-btn secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      )}

      {status === 'recording' && (
        <>
          <div className="recorder-indicator">
            <span className="rec-dot" aria-label="Recording" />
            <span className="rec-time">{formatRecTime(duration)}</span>
            <span className="rec-max">/ {formatRecTime(MAX_DURATION_MS)}</span>
          </div>
          <progress
            className="rec-progress"
            value={duration}
            max={MAX_DURATION_MS}
          />
          <button className="recorder-btn stop" onClick={stopRecording}>
            ⏹ Stop
          </button>
        </>
      )}

      {status === 'recorded' && audioUrl && (
        <>
          <audio controls src={audioUrl} className="recorder-preview" />
          <div className="recorder-controls">
            <button className="recorder-btn save" onClick={handleSave}>
              ✓ Save
            </button>
            <button className="recorder-btn secondary" onClick={handleDiscard}>
              ↺ Re-record
            </button>
            <button className="recorder-btn secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AudioCommentRecorder;
