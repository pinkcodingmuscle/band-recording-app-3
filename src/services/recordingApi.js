const TAKES_STORAGE_KEY = 'recording_takes_api_v1';

const readAllTakes = () => {
  try {
    const raw = localStorage.getItem(TAKES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeAllTakes = (takesBySession) => {
  localStorage.setItem(TAKES_STORAGE_KEY, JSON.stringify(takesBySession));
};

const getSessionTakes = (sessionId) => {
  const all = readAllTakes();
  return Array.isArray(all[sessionId]) ? all[sessionId] : [];
};

const saveSessionTakes = (sessionId, takes) => {
  const all = readAllTakes();
  all[sessionId] = takes;
  writeAllTakes(all);
};

const delay = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));

const initTake = async ({ sessionId, trackId, userId, positionMs, sampleRate }) => {
  await delay();

  const takeId = `take-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nextTake = {
    takeId,
    sessionId,
    trackId,
    userId,
    positionMs: positionMs || 0,
    sampleRate: sampleRate || 48000,
    chunkCount: 0,
    chunkBytes: 0,
    durationMs: 0,
    status: 'recording',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    storageUri: ''
  };

  const takes = getSessionTakes(sessionId);
  saveSessionTakes(sessionId, [...takes, nextTake]);

  return nextTake;
};

const uploadTakeChunk = async ({ sessionId, takeId, chunkBlob }) => {
  await delay(40);

  const takes = getSessionTakes(sessionId);
  const next = takes.map(take => {
    if (take.takeId !== takeId) {
      return take;
    }

    const chunkBytes = (chunkBlob && chunkBlob.size) || 0;
    return {
      ...take,
      chunkCount: (take.chunkCount || 0) + 1,
      chunkBytes: (take.chunkBytes || 0) + chunkBytes,
      updatedAt: new Date().toISOString()
    };
  });

  saveSessionTakes(sessionId, next);

  return next.find(take => take.takeId === takeId) || null;
};

const commitTake = async ({ sessionId, takeId, durationMs, startOffsetMs }) => {
  await delay();

  const takes = getSessionTakes(sessionId);
  const next = takes.map(take => {
    if (take.takeId !== takeId) {
      return take;
    }

    return {
      ...take,
      durationMs: durationMs || 0,
      startOffsetMs: startOffsetMs || 0,
      status: 'committed',
      storageUri: `local://sessions/${sessionId}/takes/${takeId}.webm`,
      updatedAt: new Date().toISOString()
    };
  });

  saveSessionTakes(sessionId, next);

  return next.find(take => take.takeId === takeId) || null;
};

const listTakes = async ({ sessionId }) => {
  await delay(20);
  return getSessionTakes(sessionId);
};

export const recordingApi = {
  initTake,
  uploadTakeChunk,
  commitTake,
  listTakes
};
