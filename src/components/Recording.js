import React, { useState, useEffect, useRef } from 'react';
import './Recording.css';

const TRACK_DURATION_SECONDS = 240;
const BASE_TIMELINE_WIDTH_PX = 1200;

const createSampleComment = (id, trackId, timeMs, text) => ({
  id,
  trackId,
  timeMs,
  type: 'text',
  text,
  audioBlob: null,
  durationMs: 0,
  authorId: 'system',
  createdAt: new Date().toISOString()
});

const COMMENTS_STORAGE_KEY = 'recording_comments_v1';
const COMMENT_GLOBAL_SETTINGS_KEY = 'recording_comment_global_settings_v1';
const TRACK_COMMENT_SETTINGS_KEY = 'recording_track_comment_settings_v1';
const AUDIO_COMMENTS_DB = 'recording_audio_comments_db';
const AUDIO_COMMENTS_STORE = 'audio_comments';
const AUDIO_COMMENTS_DB_VERSION = 1;
const PREFERRED_MIC_KEY = 'recording_preferred_mic_device_id_v1';
const COLLAB_SETTINGS_KEY = 'recording_collab_isolation_settings_v1';

const DEFAULT_COLLABORATORS = [
  { id: 'local-user', name: 'You', role: 'Recorder', isRecording: false },
  { id: 'user-2', name: 'Alex', role: 'Guitar', isRecording: false },
  { id: 'user-3', name: 'Maya', role: 'Drums', isRecording: false }
];

const DEFAULT_TRACKS = [
  { id: 1, name: 'Lead Guitar', duration: '3:45', waveform: '▁▂▃▅▆▇█▇▆▅▃▂▁', status: 'recorded', volume: 75, muted: false, solo: false, comments: 2, commentsEnabled: true, armed: false, audioBlob: null, isPlayingTrack: false },
  { id: 2, name: 'Bass Line', duration: '3:42', waveform: '▂▃▄▅▃▂▁▂▃▄▃▂', status: 'recorded', volume: 80, muted: false, solo: false, comments: 1, commentsEnabled: true, armed: false, audioBlob: null, isPlayingTrack: false },
  { id: 3, name: 'Drums', duration: '3:48', waveform: '█▇▆▅▆▇█▆▅▄▃▂', status: 'recorded', volume: 70, muted: false, solo: false, comments: 3, commentsEnabled: true, armed: false, audioBlob: null, isPlayingTrack: false },
  { id: 4, name: 'Vocals', duration: '3:40', waveform: '▃▄▅▆▅▄▃▂▃▄▅▄', status: 'recorded', volume: 85, muted: false, solo: false, comments: 0, commentsEnabled: true, armed: false, audioBlob: null, isPlayingTrack: false }
];

const DEFAULT_COMMENTS_BY_TRACK = {
  1: [
    createSampleComment('cmt-1', 1, 18000, 'Clean transition here'),
    createSampleComment('cmt-2', 1, 62000, 'Try a brighter tone in this section')
  ],
  2: [
    createSampleComment('cmt-3', 2, 41000, 'Lock bass with kick on this groove')
  ],
  3: [
    createSampleComment('cmt-4', 3, 15000, 'Great fill, keep this energy'),
    createSampleComment('cmt-5', 3, 92000, 'Tighten snare timing here'),
    createSampleComment('cmt-6', 3, 132000, 'Add a softer cymbal ending')
  ],
  4: []
};

const cloneDefaultTracks = () => DEFAULT_TRACKS.map(track => ({ ...track }));

const cloneDefaultComments = () => Object.fromEntries(
  Object.entries(DEFAULT_COMMENTS_BY_TRACK).map(([trackId, comments]) => [
    trackId,
    comments.map(comment => ({ ...comment }))
  ])
);

const safeParseJSON = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const isPhoneLikeDeviceLabel = (label = '') => {
  return /(iphone|phone|airpods|bluetooth|continuity)/i.test(label);
};

const openAudioCommentsDb = () => new Promise((resolve, reject) => {
  const request = window.indexedDB.open(AUDIO_COMMENTS_DB, AUDIO_COMMENTS_DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(AUDIO_COMMENTS_STORE)) {
      db.createObjectStore(AUDIO_COMMENTS_STORE);
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const putAudioCommentBlob = async (audioBlobId, blob) => {
  if (!audioBlobId || !blob) {
    return;
  }

  const db = await openAudioCommentsDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_COMMENTS_STORE, 'readwrite');
    transaction.objectStore(AUDIO_COMMENTS_STORE).put(blob, audioBlobId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
};

const getAudioCommentBlob = async (audioBlobId) => {
  if (!audioBlobId) {
    return null;
  }

  const db = await openAudioCommentsDb();
  const result = await new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_COMMENTS_STORE, 'readonly');
    const request = transaction.objectStore(AUDIO_COMMENTS_STORE).get(audioBlobId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
};

const deleteAudioCommentBlob = async (audioBlobId) => {
  if (!audioBlobId) {
    return;
  }

  const db = await openAudioCommentsDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_COMMENTS_STORE, 'readwrite');
    transaction.objectStore(AUDIO_COMMENTS_STORE).delete(audioBlobId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
};

function Recording({ isRecording, setIsRecording, activeSession }) {
  const [recordingTime, setRecordingTime] = useState(0);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [tracks, setTracks] = useState(() => {
    const savedTrackSettings = safeParseJSON(localStorage.getItem(TRACK_COMMENT_SETTINGS_KEY), {});
    return cloneDefaultTracks().map(track => ({
      ...track,
      commentsEnabled: savedTrackSettings[track.id] ?? track.commentsEnabled
    }));
  });
  const [currentTrackName, setCurrentTrackName] = useState('');
  const [commentsByTrack, setCommentsByTrack] = useState(() => {
    const savedComments = safeParseJSON(localStorage.getItem(COMMENTS_STORAGE_KEY), null);
    if (!savedComments) {
      return cloneDefaultComments();
    }

    const sanitized = {};
    Object.entries(savedComments).forEach(([trackId, comments]) => {
      sanitized[trackId] = Array.isArray(comments)
        ? comments
            .filter(comment => comment && typeof comment.timeMs === 'number' && (comment.type === 'text' || comment.type === 'audio'))
            .map(comment => ({
              ...comment,
              audioBlob: null,
              audioBlobId: comment.audioBlobId || null,
              durationMs: comment.durationMs || 0
            }))
        : [];
    });

    return {
      ...cloneDefaultComments(),
      ...sanitized
    };
  });
  const [commentsEnabledGlobal, setCommentsEnabledGlobal] = useState(() => {
    const settings = safeParseJSON(localStorage.getItem(COMMENT_GLOBAL_SETTINGS_KEY), null);
    return settings?.commentsEnabledGlobal ?? true;
  });
  const [autoplayComments, setAutoplayComments] = useState(() => {
    const settings = safeParseJSON(localStorage.getItem(COMMENT_GLOBAL_SETTINGS_KEY), null);
    return settings?.autoplayComments ?? false;
  });
  const [activeComment, setActiveComment] = useState(null);
  const intervalRef = useRef(null);
  const playIntervalRef = useRef(null);
  const autoplayedCommentsRef = useRef(new Set());
  
  // New state for audio recording and playback
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [microphoneStatus, setMicrophoneStatus] = useState('unknown');
  const [armedTrackId, setArmedTrackId] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const audioSourcesRef = useRef({});
  const [commentRecorder, setCommentRecorder] = useState(null);
  const [commentRecordingTrackId, setCommentRecordingTrackId] = useState(null);
  const commentRecordingMetaRef = useRef(null);
  const [playingCommentId, setPlayingCommentId] = useState(null);
  const commentAudioRef = useRef(null);
  const [preferredMicDeviceId, setPreferredMicDeviceId] = useState(() => localStorage.getItem(PREFERRED_MIC_KEY) || null);
  const [collaborators, setCollaborators] = useState(DEFAULT_COLLABORATORS);
  const [activeMonitorUserId, setActiveMonitorUserId] = useState('local-user');
  const [selectedPlaybackTrackIds, setSelectedPlaybackTrackIds] = useState(() => {
    const settings = safeParseJSON(localStorage.getItem(COLLAB_SETTINGS_KEY), null);
    return Array.isArray(settings?.selectedPlaybackTrackIds) ? settings.selectedPlaybackTrackIds : [];
  });
  const [allowLiveMicPublish, setAllowLiveMicPublish] = useState(() => {
    const settings = safeParseJSON(localStorage.getItem(COLLAB_SETTINGS_KEY), null);
    return settings?.allowLiveMicPublish ?? false;
  });

  const activeMonitorUser = collaborators.find(user => user.id === activeMonitorUserId) || collaborators[0];
  const activeMonitorIsRecording = !!activeMonitorUser?.isRecording;

  useEffect(() => {
    const serializableComments = Object.entries(commentsByTrack).reduce((result, [trackId, comments]) => {
      result[trackId] = (comments || []).map(({ audioBlob, ...persistedComment }) => persistedComment);
      return result;
    }, {});

    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(serializableComments));
  }, [commentsByTrack]);

  useEffect(() => {
    localStorage.setItem(
      COMMENT_GLOBAL_SETTINGS_KEY,
      JSON.stringify({
        commentsEnabledGlobal,
        autoplayComments
      })
    );
  }, [commentsEnabledGlobal, autoplayComments]);

  useEffect(() => {
    const settings = tracks.reduce((result, track) => {
      result[track.id] = !!track.commentsEnabled;
      return result;
    }, {});

    localStorage.setItem(TRACK_COMMENT_SETTINGS_KEY, JSON.stringify(settings));
  }, [tracks]);

  useEffect(() => {
    let cancelled = false;

    const hydrateAudioComments = async () => {
      const updates = [];
      const entries = Object.entries(commentsByTrack);

      for (const [trackId, comments] of entries) {
        for (const comment of comments || []) {
          if (comment.type === 'audio' && comment.audioBlobId && !comment.audioBlob) {
            try {
              const blob = await getAudioCommentBlob(comment.audioBlobId);
              if (blob && !cancelled) {
                updates.push({
                  trackId,
                  commentId: comment.id,
                  blob
                });
              }
            } catch (error) {
              console.error('Failed to hydrate audio comment blob:', error);
            }
          }
        }
      }

      if (!cancelled && updates.length > 0) {
        setCommentsByTrack(prev => {
          const next = { ...prev };

          updates.forEach(({ trackId, commentId, blob }) => {
            next[trackId] = (next[trackId] || []).map(comment =>
              comment.id === commentId ? { ...comment, audioBlob: blob } : comment
            );
          });

          return next;
        });
      }
    };

    hydrateAudioComments();

    return () => {
      cancelled = true;
    };
  }, [commentsByTrack]);

  // Request microphone access on mount
  useEffect(() => {
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

      if (commentAudioRef.current) {
        commentAudioRef.current.pause();
        commentAudioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (preferredMicDeviceId) {
      localStorage.setItem(PREFERRED_MIC_KEY, preferredMicDeviceId);
    }
  }, [preferredMicDeviceId]);

  useEffect(() => {
    const collaboratorTargetCount = Math.max(3, Math.min(6, activeSession?.collaborators || DEFAULT_COLLABORATORS.length));
    const seedNames = ['Alex', 'Maya', 'Jordan', 'Chris', 'Nina', 'Sam'];

    setCollaborators(prev => {
      const previousState = Object.fromEntries((prev || []).map(user => [user.id, user]));
      const next = [{
        id: 'local-user',
        name: 'You',
        role: 'Recorder',
        isRecording: !!isRecording
      }];

      for (let index = 1; index < collaboratorTargetCount; index += 1) {
        const userId = `user-${index + 1}`;
        const existing = previousState[userId];
        next.push({
          id: userId,
          name: existing?.name || seedNames[(index - 1) % seedNames.length],
          role: existing?.role || `Collaborator ${index}`,
          isRecording: existing?.isRecording || false
        });
      }

      return next;
    });
  }, [activeSession, isRecording]);

  useEffect(() => {
    setCollaborators(prev => prev.map(user => (
      user.id === 'local-user' ? { ...user, isRecording: !!isRecording } : user
    )));
  }, [isRecording]);

  useEffect(() => {
    localStorage.setItem(
      COLLAB_SETTINGS_KEY,
      JSON.stringify({
        selectedPlaybackTrackIds,
        allowLiveMicPublish
      })
    );
  }, [selectedPlaybackTrackIds, allowLiveMicPublish]);

  useEffect(() => {
    if (tracks.length === 0) {
      setSelectedPlaybackTrackIds([]);
      return;
    }

    const validTrackIds = new Set(tracks.map(track => track.id));
    setSelectedPlaybackTrackIds(prev => {
      const next = prev.filter(trackId => validTrackIds.has(trackId));
      if (next.length === prev.length) {
        return prev;
      }
      return next;
    });
  }, [tracks]);

  useEffect(() => {
    if (isRecording) {
      setAllowLiveMicPublish(false);
    }
  }, [isRecording]);

  useEffect(() => {
    if (!collaborators.some(user => user.id === activeMonitorUserId)) {
      setActiveMonitorUserId('local-user');
    }
  }, [collaborators, activeMonitorUserId]);

  const resolvePreferredMicDeviceId = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');

      if (preferredMicDeviceId && audioInputs.some(device => device.deviceId === preferredMicDeviceId)) {
        return preferredMicDeviceId;
      }

      const nonPhoneInput = audioInputs.find(device => device.label && !isPhoneLikeDeviceLabel(device.label));
      if (nonPhoneInput) {
        setPreferredMicDeviceId(nonPhoneInput.deviceId);
        return nonPhoneInput.deviceId;
      }

      return null;
    } catch {
      return preferredMicDeviceId;
    }
  };

  const requestMicrophoneAccess = async () => {
    try {
      if (mediaStream) {
        return mediaStream;
      }

      const preferredDeviceId = await resolvePreferredMicDeviceId();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const selectedDeviceId = stream.getAudioTracks()?.[0]?.getSettings?.().deviceId;
      if (selectedDeviceId) {
        setPreferredMicDeviceId(selectedDeviceId);
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const selectedDevice = audioInputs.find(device => device.deviceId === selectedDeviceId);
        const fallbackDevice = audioInputs.find(device => device.label && !isPhoneLikeDeviceLabel(device.label));

        if (selectedDevice && isPhoneLikeDeviceLabel(selectedDevice.label) && fallbackDevice && fallbackDevice.deviceId !== selectedDevice.deviceId) {
          stream.getTracks().forEach(track => track.stop());

          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: fallbackDevice.deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });

          setPreferredMicDeviceId(fallbackDevice.deviceId);
          setMediaStream(fallbackStream);
          setMicrophoneStatus('granted');
          return fallbackStream;
        }
      } catch {
        // Use initially selected stream
      }

      setMediaStream(stream);
      setMicrophoneStatus('granted');
      return stream;
    } catch (error) {
      console.error('Microphone access denied:', error);
      setMicrophoneStatus('denied');
      alert('Microphone access is required for recording. Please allow microphone access in your browser settings.');
      return null;
    }
  };

  const togglePlaybackTrackSelection = (trackId) => {
    setSelectedPlaybackTrackIds(prev => (
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    ));
  };

  const toggleCollaboratorRecording = (collaboratorId) => {
    if (collaboratorId === 'local-user') {
      return;
    }

    setCollaborators(prev => prev.map(user => (
      user.id === collaboratorId ? { ...user, isRecording: !user.isRecording } : user
    )));
  };

  const canHearLiveMic = (listenerUserId, sourceUserId) => {
    if (!allowLiveMicPublish) {
      return false;
    }

    if (listenerUserId === sourceUserId) {
      return true;
    }

    const listener = collaborators.find(user => user.id === listenerUserId);
    const source = collaborators.find(user => user.id === sourceUserId);

    if (!listener || !source) {
      return false;
    }

    if (listener.isRecording || source.isRecording) {
      return false;
    }

    return true;
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
          comments: 0,
          commentsEnabled: true
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

  const formatMsTime = (timeMs) => {
    return formatTime(Math.floor(timeMs / 1000));
  };

  const getCurrentTimelineMs = () => {
    return Math.floor((playheadPosition / 100) * TRACK_DURATION_SECONDS * 1000);
  };

  const timelineWidthPx = `${Math.max(320, Math.round((BASE_TIMELINE_WIDTH_PX * zoom) / 100))}px`;

  const createComment = (trackId, payload) => {
    const newComment = {
      id: `cmt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      trackId,
      authorId: 'current-user',
      createdAt: new Date().toISOString(),
      ...payload
    };

    setCommentsByTrack(prev => {
      const nextTrackComments = [...(prev[trackId] || []), newComment]
        .sort((a, b) => a.timeMs - b.timeMs);

      return {
        ...prev,
        [trackId]: nextTrackComments
      };
    });
  };

  const getTrackComments = (trackId) => commentsByTrack[trackId] || [];

  const getTrackCommentCount = (trackId) => getTrackComments(trackId).length;

  const addTextComment = (trackId) => {
    const text = prompt('Add a text comment:');
    if (!text || !text.trim()) {
      return;
    }

    createComment(trackId, {
      type: 'text',
      text: text.trim(),
      timeMs: getCurrentTimelineMs(),
      audioBlob: null,
      durationMs: 0
    });
  };

  const startAudioCommentRecording = async (trackId) => {
    if (isRecording) {
      alert('Stop track recording before recording a comment.');
      return;
    }

    let activeStream = mediaStream;

    if (microphoneStatus !== 'granted' || !activeStream) {
      alert('Microphone access is required for audio comments.');
      activeStream = await requestMicrophoneAccess();
      if (!activeStream) {
        return;
      }
    }

    try {
      const recorder = new MediaRecorder(activeStream, { mimeType: 'audio/webm' });
      const chunks = [];
      const startedAt = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const durationMs = Date.now() - startedAt;
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const meta = commentRecordingMetaRef.current;

        const persistAndCreateComment = async () => {
          if (meta && audioBlob.size > 0) {
            const audioBlobId = `ac-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            try {
              await putAudioCommentBlob(audioBlobId, audioBlob);
            } catch (error) {
              console.error('Failed to persist audio comment blob:', error);
            }

            createComment(meta.trackId, {
              type: 'audio',
              text: '',
              timeMs: meta.timeMs,
              audioBlob,
              audioBlobId,
              durationMs
            });
          }
        };

        persistAndCreateComment();

        setCommentRecorder(null);
        setCommentRecordingTrackId(null);
        commentRecordingMetaRef.current = null;
      };

      commentRecordingMetaRef.current = {
        trackId,
        timeMs: getCurrentTimelineMs()
      };

      recorder.start(100);
      setCommentRecorder(recorder);
      setCommentRecordingTrackId(trackId);
    } catch (error) {
      console.error('Error starting audio comment recording:', error);
      alert('Could not start audio comment recording.');
    }
  };

  const stopAudioCommentRecording = () => {
    if (commentRecorder && commentRecorder.state !== 'inactive') {
      commentRecorder.stop();
    }
  };

  const toggleTrackComments = (trackId) => {
    setTracks(tracks.map(track =>
      track.id === trackId ? { ...track, commentsEnabled: !track.commentsEnabled } : track
    ));
  };

  const getCommentByKey = (trackId, commentId) => {
    const trackComments = getTrackComments(trackId);
    return trackComments.find(comment => comment.id === commentId);
  };

  const playAudioComment = (track, comment) => {
    if (!commentsEnabledGlobal || !track.commentsEnabled) {
      return;
    }

    if (!comment || comment.type !== 'audio' || !comment.audioBlob) {
      return;
    }

    if (commentAudioRef.current) {
      commentAudioRef.current.pause();
      commentAudioRef.current = null;
    }

    const url = URL.createObjectURL(comment.audioBlob);
    const audio = new Audio(url);

    audio.onended = () => {
      URL.revokeObjectURL(url);
      setPlayingCommentId(null);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      setPlayingCommentId(null);
    };

    commentAudioRef.current = audio;
    setPlayingCommentId(comment.id);
    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      setPlayingCommentId(null);
    });
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

  const handleStartRecording = async () => {
    if (!armedTrackId) {
      alert('Please arm a track first by clicking the ARM button');
      return;
    }
    
    let activeStream = mediaStream;
    if (microphoneStatus !== 'granted' || !activeStream) {
      alert('Microphone access is required. Please allow microphone access.');
      activeStream = await requestMicrophoneAccess();
    }

    if (!activeStream) {
      alert('No microphone stream available');
      return;
    }
    
    try {
      // Create MediaRecorder instance
      const recorder = new MediaRecorder(activeStream, {
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
    if (isRecording && !selectedPlaybackTrackIds.includes(trackId)) {
      alert('Select this track in Monitor Mix before playing it during recording.');
      return;
    }

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
    autoplayedCommentsRef.current.clear();
  };

  useEffect(() => {
    if (!isPlaying) {
      autoplayedCommentsRef.current.clear();
      return;
    }

    if (!commentsEnabledGlobal || !autoplayComments) {
      return;
    }

    const currentTimeMs = getCurrentTimelineMs();

    tracks.forEach(track => {
      if (!track.commentsEnabled) {
        return;
      }

      getTrackComments(track.id)
        .filter(comment => comment.type === 'audio')
        .forEach(comment => {
          const markerKey = `${track.id}-${comment.id}`;
          if (!autoplayedCommentsRef.current.has(markerKey) && currentTimeMs >= comment.timeMs) {
            autoplayedCommentsRef.current.add(markerKey);
            playAudioComment(track, comment);
          }
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playheadPosition, isPlaying, commentsEnabledGlobal, autoplayComments, tracks, commentsByTrack]);

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
    const trackComments = commentsByTrack[id] || [];
    trackComments.forEach(comment => {
      if (comment.audioBlobId) {
        deleteAudioCommentBlob(comment.audioBlobId).catch(error => {
          console.error('Failed to delete audio comment blob:', error);
        });
      }
    });

    setTracks(tracks.filter(track => track.id !== id));
    setCommentsByTrack(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeComment?.trackId === id) {
      setActiveComment(null);
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
          <div className="collab-isolation-controls">
            <div className="collab-row">
              <label htmlFor="monitor-user-select">Monitor As</label>
              <select
                id="monitor-user-select"
                value={activeMonitorUserId}
                onChange={(e) => setActiveMonitorUserId(e.target.value)}
                title="Choose user perspective for isolation checks"
              >
                {collaborators.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="collab-row">
              <span className={`isolation-badge ${activeMonitorIsRecording ? 'locked' : 'ready'}`}>
                {activeMonitorIsRecording ? 'Isolation Locked' : 'Isolation Ready'}
              </span>
              <button
                className={`comment-toggle-btn ${allowLiveMicPublish ? 'active' : ''}`}
                onClick={() => setAllowLiveMicPublish(prev => !prev)}
                disabled={isRecording}
                title={isRecording ? 'Live mic publish is disabled while recording' : 'Toggle live mic publishing for non-record mode'}
                aria-label="Toggle live mic publishing"
              >
                {allowLiveMicPublish ? 'Mic Publish On' : 'Mic Publish Off'}
              </button>
            </div>
          </div>
          <div className="comment-global-controls">
            <button
              className={`comment-toggle-btn icon-toggle ${commentsEnabledGlobal ? 'active' : ''}`}
              onClick={() => setCommentsEnabledGlobal(prev => !prev)}
              title={commentsEnabledGlobal ? 'Hide comments' : 'Show comments'}
              aria-label={commentsEnabledGlobal ? 'Hide comments' : 'Show comments'}
            >
              {commentsEnabledGlobal ? '👁' : '🙈'}
            </button>
            <button
              className={`comment-toggle-btn ${autoplayComments ? 'active' : ''}`}
              onClick={() => setAutoplayComments(prev => !prev)}
              title={autoplayComments ? 'Turn off comment autoplay' : 'Turn on comment autoplay'}
              aria-label={autoplayComments ? 'Turn off comment autoplay' : 'Turn on comment autoplay'}
              disabled={!commentsEnabledGlobal}
            >
              {autoplayComments ? 'Autoplay On' : 'Autoplay Off'}
            </button>
          </div>
          <div className="mic-status">
            <span className={`mic-indicator ${microphoneStatus}`}>
              🎤 {microphoneStatus === 'granted' ? 'Ready' : microphoneStatus === 'denied' ? 'Denied' : 'Off'}
            </span>
          </div>
          <div className="tempo-control">
            <label>BPM</label>
            <input type="number" defaultValue="120" min="40" max="200" />
          </div>
          <div className="zoom-control">
            <button onClick={() => setZoom(Math.max(25, zoom - 25))} title="Zoom out timeline" aria-label="Zoom out timeline">−</button>
            <span>{zoom}%</span>
            <button onClick={() => setZoom(Math.min(200, zoom + 25))} title="Zoom in timeline" aria-label="Zoom in timeline">+</button>
          </div>
        </div>
      </div>

      {/* Timeline and Tracks */}
      <div className="daw-workspace">
        {/* Timeline Ruler */}
        <div className="timeline-header">
          <div className="track-controls-header">Tracks</div>
          <div className="timeline-ruler" style={{ width: timelineWidthPx }}>
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
                  {getTrackCommentCount(track.id) > 0 && (
                    <span className="comment-badge" title={`${getTrackCommentCount(track.id)} comments`}>
                      {getTrackCommentCount(track.id)}
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
                    className={`track-action ${track.commentsEnabled ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleTrackComments(track.id); }}
                    title={track.commentsEnabled ? 'Disable comments on this track' : 'Enable comments on this track'}
                  >
                    C
                  </button>
                  <button 
                    className="track-action"
                    onClick={(e) => { e.stopPropagation(); addTextComment(track.id); }}
                    title="Add text comment at current playhead"
                    disabled={!track.commentsEnabled}
                  >
                    📝
                  </button>
                  <button
                    className={`track-action ${commentRecordingTrackId === track.id ? 'recording' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (commentRecordingTrackId === track.id) {
                        stopAudioCommentRecording();
                      } else {
                        startAudioCommentRecording(track.id);
                      }
                    }}
                    title={commentRecordingTrackId === track.id ? 'Stop audio comment recording' : 'Record audio comment at current playhead'}
                    disabled={!track.commentsEnabled || (commentRecordingTrackId && commentRecordingTrackId !== track.id)}
                  >
                    {commentRecordingTrackId === track.id ? '⏹' : '🎙'}
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

              <div className="track-timeline" style={{ width: timelineWidthPx }}>
                {commentsEnabledGlobal && track.commentsEnabled && (
                  <div className="comment-rail" aria-label={`${track.name} comment markers`}>
                    {getTrackComments(track.id).map(comment => {
                      const left = `${Math.min(100, Math.max(0, (comment.timeMs / (TRACK_DURATION_SECONDS * 1000)) * 100))}%`;
                      const isActive = activeComment?.trackId === track.id && activeComment?.commentId === comment.id;
                      return (
                        <button
                          key={comment.id}
                          className={`comment-marker ${comment.type} ${isActive ? 'active' : ''}`}
                          style={{ left }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveComment({ trackId: track.id, commentId: comment.id });
                            if (comment.type === 'audio') {
                              playAudioComment(track, comment);
                            }
                          }}
                          title={comment.type === 'text' ? `${formatMsTime(comment.timeMs)} · ${comment.text.slice(0, 60)}` : `${formatMsTime(comment.timeMs)} · Audio comment`}
                          aria-label={comment.type === 'text' ? `Text comment at ${formatMsTime(comment.timeMs)}` : `Audio comment at ${formatMsTime(comment.timeMs)}`}
                        >
                          {comment.type === 'text' ? '💬' : '🎵'}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="track-region">
                  <div className="waveform-display">{track.waveform}</div>
                  <span className="region-label">{track.name}</span>
                </div>

                {activeComment?.trackId === track.id && (() => {
                  const comment = getCommentByKey(track.id, activeComment.commentId);
                  if (!comment || !commentsEnabledGlobal || !track.commentsEnabled) {
                    return null;
                  }

                  const left = `${Math.min(94, Math.max(2, (comment.timeMs / (TRACK_DURATION_SECONDS * 1000)) * 100))}%`;
                  return (
                    <div className="comment-popover" style={{ left }} onClick={(e) => e.stopPropagation()}>
                      <div className="comment-popover-header">
                        <span>{comment.type === 'text' ? 'Text Comment' : 'Audio Comment'}</span>
                        <button onClick={() => setActiveComment(null)} title="Close comment">✕</button>
                      </div>
                      <div className="comment-meta">{formatMsTime(comment.timeMs)} · {new Date(comment.createdAt).toLocaleString()}</div>
                      {comment.type === 'text' ? (
                        <p className="comment-text-body">{comment.text}</p>
                      ) : (
                        <div className="comment-audio-controls">
                          <button
                            className={`comment-play-btn ${playingCommentId === comment.id ? 'active' : ''}`}
                            onClick={() => playAudioComment(track, comment)}
                            disabled={!commentsEnabledGlobal || !track.commentsEnabled}
                          >
                            {playingCommentId === comment.id ? 'Playing...' : 'Play Audio Comment'}
                          </button>
                          <span>{formatMsTime(comment.durationMs || 0)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
        <div className="isolation-panel">
          <div className="isolation-panel-header">
            <h3>🎧 Recording Isolation</h3>
            <span>
              {isRecording
                ? 'Record mode: only your mic + selected tracks'
                : 'Idle mode: isolate checks are still enforced'}
            </span>
          </div>

          <div className="monitor-mix-list">
            {tracks.map(track => (
              <label key={`monitor-${track.id}`} className="monitor-mix-item">
                <input
                  type="checkbox"
                  checked={selectedPlaybackTrackIds.includes(track.id)}
                  onChange={() => togglePlaybackTrackSelection(track.id)}
                />
                <span>{track.name}</span>
              </label>
            ))}
          </div>

          <div className="collaborator-state-list">
            {collaborators
              .filter(user => user.id !== 'local-user')
              .map(user => (
                <button
                  key={`presence-${user.id}`}
                  className={`collaborator-pill ${user.isRecording ? 'recording' : ''}`}
                  onClick={() => toggleCollaboratorRecording(user.id)}
                  title="Toggle collaborator record state"
                >
                  {user.isRecording ? '🔴' : '⚪'} {user.name}
                </button>
              ))}
          </div>

          <div className="isolation-status-grid">
            {collaborators
              .filter(user => user.id !== activeMonitorUserId)
              .map(user => {
                const isAllowed = canHearLiveMic(activeMonitorUserId, user.id);
                return (
                  <div key={`route-${activeMonitorUserId}-${user.id}`} className="isolation-status-item">
                    <span>{activeMonitorUser?.name || 'User'} hears {user.name} mic</span>
                    <strong className={isAllowed ? 'allowed' : 'blocked'}>{isAllowed ? 'Allowed' : 'Blocked'}</strong>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="add-track-section">
          <button className="add-track-btn" title="Add a new track" onClick={() => {
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
                commentsEnabled: true,
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
          <button className="panel-tab active" title="Show instruments">🎹 Instruments</button>
          <button className="panel-tab" title="Show effects">🎛️ Effects</button>
          <button className="panel-tab" title="Show mixer">🎚️ Mixer</button>
        </div>
        
        <div className="instruments-grid">
          <button className="instrument-btn" title="Open Guitar instrument">
            <span className="instrument-icon">🎸</span>
            <span>Guitar</span>
          </button>
          <button className="instrument-btn" title="Open Piano instrument">
            <span className="instrument-icon">🎹</span>
            <span>Piano</span>
          </button>
          <button className="instrument-btn" title="Open Drums instrument">
            <span className="instrument-icon">🥁</span>
            <span>Drums</span>
          </button>
          <button className="instrument-btn" title="Open Brass instrument">
            <span className="instrument-icon">🎺</span>
            <span>Brass</span>
          </button>
          <button className="instrument-btn" title="Open Strings instrument">
            <span className="instrument-icon">🎻</span>
            <span>Strings</span>
          </button>
          <button className="instrument-btn" title="Open Microphone input tool">
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
            <button className="stop-recording-btn" title="Stop recording now" onClick={handleStopRecording}>
              Stop Recording
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recording;
