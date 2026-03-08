import { isApiConfigured, apiUploadAudio, apiGetAudioUrl, apiDeleteAudio } from '../lib/api';

// ── IndexedDB (local fallback) ────────────────────────────────────────────────
const DB_NAME = 'bandlab-audio';
const STORE = 'tracks';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveAudioBlobLocal(id, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id, blob });
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function loadAudioBlobLocal(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(id);
    req.onsuccess = (e) => resolve(e.target.result?.blob ?? null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function deleteAudioBlobLocal(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save an audio blob.
 *   API: uploads to GridFS and returns the file ID string (audioPath).
 *   IndexedDB fallback: returns undefined.
 */
export async function saveAudioBlob(id, blob) {
  if (isApiConfigured) {
    return apiUploadAudio(id, blob); // returns GridFS file ID string
  }
  await saveAudioBlobLocal(id, blob);
  return undefined;
}

/**
 * Load audio as a usable URL.
 *   API: returns a direct streaming URL (no network request needed).
 *   IndexedDB fallback: returns a blob: URL.
 *   Either way the caller uses the string as <audio src>.
 */
export async function loadAudioBlob(id, audioPath) {
  if (isApiConfigured && audioPath) {
    return apiGetAudioUrl(audioPath); // sync string — no await needed but async for consistent API
  }
  // IndexedDB fallback
  const blob = await loadAudioBlobLocal(id);
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * Delete an audio blob.
 *   API: removes from GridFS.
 *   IndexedDB fallback: removes from IndexedDB.
 */
export async function deleteAudioBlob(id, audioPath) {
  if (isApiConfigured && audioPath) {
    await apiDeleteAudio(audioPath);
    return;
  }
  await deleteAudioBlobLocal(id);
}
