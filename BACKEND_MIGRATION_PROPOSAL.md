> **Status:** 🔄 In Progress — see [PROPOSALS_TRACKER.md](PROPOSALS_TRACKER.md)
> **Last updated:** Mar 4, 2026

# Backend Migration Proposal — Moving Off localStorage

**Date:** March 4, 2026  
**App:** BandLab Studio  
**Goal:** Replace all browser-local storage (localStorage + IndexedDB) and in-memory ephemeral state with a real persistent, collaborative backend.

---

## 1. Current Storage Inventory

| Data | Current Storage | Problem |
|---|---|---|
| `theme` | `localStorage` | UI preference — **acceptable as-is** |
| `currentUser` (identity, sessionId) | `localStorage` | No real auth; anyone can spoof |
| Track metadata (name, volume, muted, solo, hasAudio) | `localStorage` key `bandlab-tracks-v1` | Cleared with browser storage; not shared across users |
| Audio blobs (.webm recordings) | `IndexedDB` (`bandlab-audio`) | Device-only; not collaborative; lost on browser clear |
| Sessions & band members | In-memory React state (re-generated on every login) | Lost on refresh; randomized data |
| Comments | In-memory (`CommentsContext`) | Lost on refresh; not persisted |
| Chat messages | In-memory (`Chat.js`) | Lost on refresh; not persisted |
| Setlist items | In-memory (`Setlist.js`) | Lost on refresh; not persisted |

**Affected files:**
- [`src/App.js`](src/App.js) — `currentUser`, `theme`, sessions/users state
- [`src/components/Recording.js`](src/components/Recording.js) — track metadata via `localStorage`
- [`src/db/audioDB.js`](src/db/audioDB.js) — audio blobs via `IndexedDB`
- [`src/context/CommentsContext.js`](src/context/CommentsContext.js) — comments in-memory
- [`src/components/Chat.js`](src/components/Chat.js) — chat messages in-memory
- [`src/components/Setlist.js`](src/components/Setlist.js) — setlist in-memory

---

## 2. Recommended Stack: Supabase

**Supabase** (supabase.com) provides all required backend primitives on a free tier with no server to manage:

| Supabase Service | Replaces |
|---|---|
| **Supabase Auth** | Manual `localStorage.currentUser` |
| **Supabase Database** (Postgres) | localStorage track metadata, in-memory sessions/comments/chat/setlist |
| **Supabase Storage** | IndexedDB audio blobs |
| **Supabase Realtime** | Polling/manual refresh for chat and comments |

Install:
```bash
npm install @supabase/supabase-js
```

Create a shared client singleton at `src/lib/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

Add to `.env`:
```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## 3. Database Schema

Create the following tables in Supabase (SQL editor or migrations):

```sql
-- Band grouping
create table bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- User profiles (extends Supabase Auth users)
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  avatar_emoji text default '🎵',
  role text,
  band_id uuid references bands(id)
);

-- Recording sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text check (status in ('active', 'completed')) default 'active',
  owner_id uuid references profiles(id),
  band_id uuid references bands(id),
  created_at timestamptz default now()
);

-- Track metadata
create table tracks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  name text not null,
  volume integer default 75,
  muted boolean default false,
  solo boolean default false,
  has_audio boolean default false,
  audio_path text,          -- path in Supabase Storage bucket
  duration text,
  waveform text,
  created_at timestamptz default now()
);

-- Track comments
create table comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references tracks(id) on delete cascade,
  time_ms integer not null,
  type text check (type in ('text', 'audio')) default 'text',
  text text,
  audio_path text,          -- path in Supabase Storage bucket (for audio comments)
  audio_duration real,
  author_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- Chat messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  author_id uuid references profiles(id),
  text text not null,
  created_at timestamptz default now()
);

-- Setlist
create table setlist_items (
  id uuid primary key default gen_random_uuid(),
  band_id uuid references bands(id),
  song text not null,
  order_index integer not null,
  created_at timestamptz default now()
);
```

---

## 4. Migration Steps (Recommended Order)

### Step 1 — Auth (unblocks everything else)
**File:** [`src/components/Login.js`](src/components/Login.js), [`src/App.js`](src/App.js)

Replace the simulated login and `localStorage.currentUser` with Supabase Auth:

```js
// Sign up
const { data, error } = await supabase.auth.signUp({ email, password });

// Log in
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// Get current user (replaces localStorage.getItem('currentUser'))
const { data: { user } } = await supabase.auth.getUser();

// Log out
await supabase.auth.signOut();

// Subscribe to auth state changes (replaces useState currentUser init)
supabase.auth.onAuthStateChange((_event, session) => {
  setCurrentUser(session?.user ?? null);
});
```

Remove from `App.js`:
- `localStorage.getItem('currentUser')` state initializer
- `localStorage.setItem('currentUser', ...)` effect
- `localStorage.removeItem('currentUser')` call

---

### Step 2 — Sessions & Users
**File:** [`src/App.js`](src/App.js), [`src/components/Sessions.js`](src/components/Sessions.js), [`src/components/Users.js`](src/components/Users.js)

Replace the random-seeding `useEffect` blocks with database fetches:

```js
// In Sessions.js
useEffect(() => {
  supabase
    .from('sessions')
    .select('*, profiles(*)')
    .eq('band_id', currentUser.bandId)
    .then(({ data }) => setSessions(data));
}, [currentUser]);
```

---

### Step 3 — Track Metadata
**File:** [`src/components/Recording.js`](src/components/Recording.js)

Replace `loadSavedTracks()` / `localStorage.setItem(TRACKS_KEY, ...)` with DB reads/writes:

```js
// Load tracks for current session
const { data: tracks } = await supabase
  .from('tracks')
  .select('*')
  .eq('session_id', sessionId);

// Persist track changes (e.g. volume update)
await supabase
  .from('tracks')
  .update({ volume: newVolume })
  .eq('id', trackId);
```

---

### Step 4 — Audio File Storage
**File:** [`src/db/audioDB.js`](src/db/audioDB.js)

Replace IndexedDB with Supabase Storage:

```js
// Save audio (replaces saveAudioBlob)
export async function saveAudioBlob(trackId, blob) {
  const path = `tracks/${trackId}.webm`;
  await supabase.storage.from('audio-tracks').upload(path, blob, { upsert: true });
  // Also mark the track in DB
  await supabase.from('tracks').update({ has_audio: true, audio_path: path }).eq('id', trackId);
}

// Load audio (replaces loadAudioBlob — returns a signed URL instead of a blob)
export async function loadAudioUrl(trackId, audioPath) {
  const { data } = await supabase.storage
    .from('audio-tracks')
    .createSignedUrl(audioPath, 3600); // 1 hour expiry
  return data?.signedUrl ?? null;
}

// Delete audio (replaces deleteAudioBlob)
export async function deleteAudioBlob(trackId, audioPath) {
  await supabase.storage.from('audio-tracks').remove([audioPath]);
  await supabase.from('tracks').update({ has_audio: false, audio_path: null }).eq('id', trackId);
}
```

---

### Step 5 — Comments
**File:** [`src/context/CommentsContext.js`](src/context/CommentsContext.js)

Replace in-memory `useState` seed data with DB fetches and real-time subscription:

```js
// Initial load
const { data } = await supabase
  .from('comments')
  .select('*, profiles(display_name, avatar_emoji)')
  .in('track_id', trackIds);
setComments(data);

// Real-time: new comments from other collaborators
supabase
  .channel('comments')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' },
    (payload) => setComments(prev => [...prev, payload.new]))
  .subscribe();

// Add comment
const { data: newComment } = await supabase
  .from('comments')
  .insert({ track_id, time_ms, type, text, author_id })
  .select()
  .single();
```

---

### Step 6 — Chat
**File:** [`src/components/Chat.js`](src/components/Chat.js)

```js
// Load history
const { data } = await supabase
  .from('chat_messages')
  .select('*, profiles(display_name, avatar_emoji)')
  .eq('session_id', sessionId)
  .order('created_at');
setMessages(data);

// Real-time new messages
supabase
  .channel('chat')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
    (payload) => setMessages(prev => [...prev, payload.new]))
  .subscribe();

// Send message
await supabase.from('chat_messages').insert({ session_id, author_id, text });
```

---

### Step 7 — Setlist
**File:** [`src/components/Setlist.js`](src/components/Setlist.js)

```js
// Load
const { data } = await supabase
  .from('setlist_items')
  .select('*')
  .eq('band_id', bandId)
  .order('order_index');

// Add item
await supabase.from('setlist_items').insert({ band_id, song, order_index });

// Reorder (update order_index)
await supabase.from('setlist_items').update({ order_index: newIndex }).eq('id', itemId);
```

---

## 5. What Stays in localStorage

| Key | Reason |
|---|---|
| `theme` | Pure UI preference; no collaboration or security implications |

---

## 6. Row-Level Security (RLS)

Enable RLS on all tables in Supabase and add policies so users can only read/write data belonging to their band:

```sql
-- Example: users can only read sessions for their own band
alter table sessions enable row level security;
create policy "band members only" on sessions
  for select using (
    band_id = (select band_id from profiles where id = auth.uid())
  );
```

Apply equivalent policies to `tracks`, `comments`, `chat_messages`, and `setlist_items`.

---

## 7. Environment Variables

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

Add `.env` to `.gitignore`. Never commit credentials.

---

## 8. Summary

```
localStorage.currentUser        →  Supabase Auth session (JWT)
localStorage.bandlab-tracks-v1  →  Postgres: tracks table
IndexedDB bandlab-audio         →  Supabase Storage: audio-tracks bucket
In-memory sessions/users        →  Postgres: sessions + profiles tables
In-memory comments              →  Postgres: comments table + Realtime
In-memory chat                  →  Postgres: chat_messages table + Realtime
In-memory setlist               →  Postgres: setlist_items table
```
