# MongoDB Migration Proposal — Replacing Supabase

**Date:** March 6, 2026
**App:** BandLab Studio

---

## Why MongoDB requires a different architecture

Supabase allowed the React frontend to call the database directly via the SDK.
MongoDB Atlas **does not** — credentials must never be in the browser.
This migration adds a **Node.js/Express API server** between the client and database.

```
BEFORE (Supabase):
  React  →  supabase-js SDK  →  Supabase (Postgres + Auth + Storage + Realtime)

AFTER (MongoDB):
  React  →  fetch / socket.io-client  →  Express API  →  MongoDB Atlas (+ GridFS)
```

---

## Replacement Map

| Supabase feature | MongoDB replacement |
|---|---|
| Supabase Auth | Express + `bcryptjs` + `jsonwebtoken` |
| Postgres tables | MongoDB Atlas collections (Mongoose) |
| Supabase Storage (audio blobs) | MongoDB **GridFS** (built-in, no extra service) |
| Supabase Realtime (chat, comments) | **Socket.io** on the Express server |
| Row-Level Security (RLS) | Express `verifyJWT` middleware |
| `src/lib/supabase.js` | `src/lib/api.js` (fetch + socket.io-client) |

---

## New File Structure

```
band-recording-app-3/
├── src/                         ← React client (unchanged structure)
│   ├── lib/
│   │   └── api.js               ← NEW: replaces supabase.js
│   ├── db/
│   │   └── audioDB.js           ← UPDATED: calls /api/audio instead of Supabase Storage
│   ├── components/
│   │   ├── Login.js             ← UPDATED: apiLogin / apiSignup
│   │   ├── Recording.js         ← UPDATED: apiGetTracks / apiUpsertTracks / apiDeleteTrack
│   │   ├── Chat.js              ← UPDATED: socket.io instead of Supabase Realtime
│   │   └── Setlist.js           ← UPDATED: apiGetSetlist / apiUpsertSetlistItem etc.
│   └── context/
│       └── CommentsContext.js   ← UPDATED: socket.io instead of Supabase Realtime
│
├── server/                      ← NEW: Express + Mongoose API server
│   ├── package.json
│   ├── .env.example
│   ├── index.js                 ← Express entry + Socket.io
│   ├── db.js                    ← Mongoose connect + GridFS bucket
│   ├── middleware/
│   │   └── auth.js              ← verifyJWT middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Track.js
│   │   ├── Comment.js
│   │   ├── ChatMessage.js
│   │   └── SetlistItem.js
│   ├── routes/
│   │   ├── auth.js              ← POST /api/auth/signup|login, GET /api/auth/me
│   │   ├── tracks.js            ← GET/POST/DELETE /api/tracks
│   │   ├── audio.js             ← POST/GET/DELETE /api/audio (GridFS)
│   │   ├── comments.js          ← GET/POST/DELETE /api/comments
│   │   ├── chat.js              ← GET /api/chat/:sessionId
│   │   └── setlist.js           ← GET/POST/PUT/DELETE /api/setlist
│   └── socket/
│       └── index.js             ← Socket.io event handlers
│
├── .env                         ← UPDATED: VITE_API_URL instead of VITE_SUPABASE_*
└── package.json                 ← UPDATED: socket.io-client added
```

---

## MongoDB Collections (Mongoose Schemas)

### users
```
email (unique), passwordHash, displayName, avatar
```

### tracks
```
clientId (Number, the Date.now() ID), userId (String),
name, duration, waveform, status, volume, muted, solo,
hasAudio (Boolean), audioFileId (String, GridFS ObjectId), audioExt
```

### comments
```
clientId (String, "cmt-xxx"), trackClientId (Number),
timeMs, type ("text"|"audio"), text, audioPath, audioDuration,
authorId, authorName, authorAvatar
```

### chatmessages
```
sessionId, authorId, authorName, authorAvatar, text
```

### setlistitems
```
clientId (Number), userId, title, bpm, key, orderIndex, recording (Mixed)
```

---

## API Contract

### Auth
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | /api/auth/signup | — | `{ email, password, displayName, avatar }` | `{ token, user }` |
| POST | /api/auth/login | — | `{ email, password }` | `{ token, user }` |
| GET | /api/auth/me | JWT | — | `{ user }` |

### Tracks
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | /api/tracks | JWT | — | `[track]` |
| POST | /api/tracks/upsert | JWT | `{ tracks: [track] }` | `{ ok }` |
| DELETE | /api/tracks/:clientId | JWT | — | `{ ok }` |

### Audio (GridFS)
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | /api/audio/upload/:trackId | JWT | multipart `audio` field | `{ audioPath: gridfsId }` |
| GET | /api/audio/:fileId | — | — | audio stream |
| DELETE | /api/audio/:fileId | JWT | — | `{ ok }` |

> `GET /api/audio/:fileId` is unauthenticated so `<audio src>` tags work natively in the browser.

### Comments
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | /api/comments | JWT | — | `[comment]` |
| POST | /api/comments | JWT | comment object | saved comment |
| DELETE | /api/comments/:id | JWT | — | `{ ok }` |

### Chat
| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/chat/:sessionId | JWT | `[message]` |

Sending messages happens via **Socket.io** only (not REST).

### Setlist
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | /api/setlist | JWT | — | `[item]` |
| POST | /api/setlist | JWT | setlist item | saved item |
| PUT | /api/setlist/reorder | JWT | `{ items }` | `{ ok }` |
| PUT | /api/setlist/:id | JWT | partial update | updated item |
| DELETE | /api/setlist/:id | JWT | — | `{ ok }` |

---

## Socket.io Events

### Client → Server
| Event | Payload |
|---|---|
| `join-session` | `sessionId: string` |
| `chat-message` | `{ sessionId, authorId, authorName, authorAvatar, text }` |
| `comment-add` | comment object |
| `comment-remove` | `id: string` |

### Server → Client
| Event | Payload |
|---|---|
| `chat-message` | formatted message object |
| `comment-add` | comment object |
| `comment-remove` | `id: string` |

---

## Authentication Flow

JWT stored in `localStorage` (token string only—no user data).

```
1. POST /api/auth/login → server returns { token, user }
2. Client stores token: localStorage.setItem('jwt', token)
3. Every API request: Authorization: Bearer <token>
4. On page refresh: GET /api/auth/me with stored token → restore session
5. Logout: delete token from localStorage
```

---

## Audio Storage (GridFS)

Audio blobs recorded in the browser are uploaded via `POST /api/audio/upload/:trackId`.
The server writes them to MongoDB GridFS and returns the `fileId`.
The client stores `fileId` as `audioPath` on the track.
Playback URL: `GET /api/audio/:fileId` — direct stream, no auth required (for `<audio src>`).

GridFS stores large binary files split into 255KB chunks within MongoDB — no separate S3 bucket or storage service needed.

---

## Fallback Behaviour

When `VITE_API_URL` is not set (local dev without server), the app falls back to:
- **Auth**: local demo user (no email/password required)
- **Tracks**: `localStorage` (`bandlab-tracks-v1`)
- **Audio**: IndexedDB (`bandlab-audio`)
- **Comments**: in-memory seed data
- **Chat**: in-memory messages
- **Setlist**: in-memory default songs

---

## Environment Variables

### Client (`/.env`)
```
VITE_API_URL=http://localhost:4000
```

### Server (`/server/.env`)
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/bandlab
JWT_SECRET=<strong-random-secret-min-32-chars>
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

---

## Setup Steps

1. Create a MongoDB Atlas cluster and get the connection string
2. `cd server && npm install && cp .env.example .env` (fill in MONGO_URI + JWT_SECRET)
3. `npm run dev:server` (starts Express on port 4000)
4. Set `VITE_API_URL=http://localhost:4000` in root `.env`
5. `npm start` (starts Vite dev server)
