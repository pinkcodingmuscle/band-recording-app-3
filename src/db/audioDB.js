import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

// ── Supabase Storage ──────────────────────────────────────────────────────────
const BUCKET = 'audio-tracks';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save an audio blob.
 *   Supabase: uploads to Storage and returns the storage path (string).
 *   IndexedDB fallback: returns undefined.
 */
export async function saveAudioBlob(id, blob) {
  if (isSupabaseConfigured) {
    const path = `tracks/${id}.webm`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: blob.type || 'audio/webm' });
    if (error) throw error;
    return path;
  }
  await saveAudioBlobLocal(id, blob);
  return undefined;
}

/**
 * Load audio as a usable URL.
 *   Supabase: returns a 1-hour signed URL (string).
 *   IndexedDB fallback: returns a blob: URL (string).
 *   Either way the caller can use the string directly as <audio src>.
 */
export async function loadAudioBlob(id, audioPath) {
  if (isSupabaseConfigured && audioPath) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(audioPath, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }
  // IndexedDB fallback
  const blob = await loadAudioBlobLocal(id);
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * Delete an audio blob.
 *   Supabase: removes from Storage.
 *   IndexedDB fallback: removes from IndexedDB.
 */
export async function deleteAudioBlob(id, audioPath) {
  if (isSupabaseConfigured && audioPath) {
    await supabase.storage.from(BUCKET).remove([audioPath]);
    return;
  }
  await deleteAudioBlobLocal(id);
}
