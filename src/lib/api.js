/**
 * src/lib/api.js
 * REST + Socket.io client for the Express/MongoDB backend.
 * Mirrors the isSupabaseConfigured pattern: when VITE_API_URL is not set,
 * isApiConfigured is false and all components fall back to local storage.
 */
import { io } from 'socket.io-client';

export const BASE = import.meta.env.VITE_API_URL || '';
export const isApiConfigured = !!import.meta.env.VITE_API_URL;

// ── Auth token helpers ────────────────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem('jwt');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('jwt', token);
  } else {
    localStorage.removeItem('jwt');
  }
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Socket.io singleton ───────────────────────────────────────────────────────
let _socket = null;

export function getSocket() {
  if (!isApiConfigured) return null;
  if (!_socket) {
    _socket = io(BASE, { autoConnect: true, auth: { token: getToken() } });
  }
  return _socket;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function apiSignup(email, password, displayName, avatar) {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName, avatar }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  setToken(data.token);
  return data.user;
}

export async function apiLogin(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  setToken(data.token);
  return data.user;
}

export function apiLogout() {
  setToken(null);
}

export async function apiMe() {
  const res = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export async function apiGetSessions() {
  const res = await fetch(`${BASE}/api/sessions`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function apiCreateSession(name) {
  const res = await fetch(`${BASE}/api/sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create session');
  return data;
}

// ── Tracks ────────────────────────────────────────────────────────────────────
export async function apiGetTracks() {
  const res = await fetch(`${BASE}/api/tracks`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function apiUpsertTracks(tracks) {
  const res = await fetch(`${BASE}/api/tracks/upsert`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ tracks }),
  });
  if (!res.ok) return;
  return res.json();
}

export async function apiDeleteTrack(id) {
  await fetch(`${BASE}/api/tracks/${id}`, { method: 'DELETE', headers: authHeaders() });
}

// ── Audio ─────────────────────────────────────────────────────────────────────
/**
 * Upload a Blob to GridFS. Returns the opaque audioPath (GridFS ObjectId string).
 */
export async function apiUploadAudio(trackId, blob) {
  const form = new FormData();
  form.append('audio', blob, `track-${trackId}.webm`);
  const token = getToken();
  const res = await fetch(`${BASE}/api/audio/upload/${trackId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error('Audio upload failed');
  const data = await res.json();
  return data.audioPath;
}

/**
 * audioPath is now a full Supabase public URL — return it as-is.
 * The browser uses it directly as <audio src>; no Express proxy needed.
 */
export function apiGetAudioUrl(audioPath) {
  return audioPath;
}

export async function apiDeleteAudio(audioPath) {
  // Extract the storage path from the full Supabase URL.
  // e.g. "https://xxx.supabase.co/storage/v1/object/public/audio/userId/trackId.webm"
  //   → storagePath: "userId/trackId.webm"
  const url = new URL(audioPath);
  const storagePath = url.pathname.split('/object/public/audio/')[1];
  await fetch(`${BASE}/api/audio`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ storagePath }),
  });
}

// ── Comments ──────────────────────────────────────────────────────────────────
export async function apiGetComments() {
  const res = await fetch(`${BASE}/api/comments`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function apiAddComment(comment) {
  const res = await fetch(`${BASE}/api/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(comment),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function apiDeleteComment(id) {
  await fetch(`${BASE}/api/comments/${id}`, { method: 'DELETE', headers: authHeaders() });
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export async function apiGetChatHistory(sessionId) {
  const res = await fetch(`${BASE}/api/chat/${encodeURIComponent(sessionId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

// ── Setlist ───────────────────────────────────────────────────────────────────
export async function apiGetSetlist() {
  const res = await fetch(`${BASE}/api/setlist`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function apiUpsertSetlistItem(item) {
  const res = await fetch(`${BASE}/api/setlist`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(item),
  });
  if (!res.ok) return;
  return res.json();
}

export async function apiUpdateSetlistItem(id, updates) {
  const res = await fetch(`${BASE}/api/setlist/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) return;
  return res.json();
}

export async function apiDeleteSetlistItem(id) {
  await fetch(`${BASE}/api/setlist/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export async function apiReorderSetlist(items) {
  const res = await fetch(`${BASE}/api/setlist/reorder`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ items }),
  });
  if (!res.ok) return;
  return res.json();
}
