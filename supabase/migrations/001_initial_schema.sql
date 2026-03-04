-- BandLab Studio — initial Supabase schema
-- Run this in the Supabase SQL editor: https://app.supabase.com → SQL Editor

-- ── Tracks ────────────────────────────────────────────────────────────────────
-- Stores recording track metadata per user.
-- id is a bigint matching the app's Date.now() IDs (1-4 for seed tracks).
create table if not exists tracks (
  id         bigint primary key,
  user_id    text   not null,   -- Supabase auth user UUID
  name       text   not null,
  duration   text,
  waveform   text,
  status     text   default 'recorded',
  volume     integer default 75,
  muted      boolean default false,
  solo       boolean default false,
  has_audio  boolean default false,
  audio_path text,              -- path in Supabase Storage bucket "audio-tracks"
  audio_ext  text,              -- "webm" or "mp4"
  created_at timestamptz default now()
);

-- Index for fast per-user lookups
create index if not exists tracks_user_id_idx on tracks (user_id);

-- RLS: users can only read/write their own tracks
alter table tracks enable row level security;
create policy "own tracks only" on tracks
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- ── Comments ─────────────────────────────────────────────────────────────────
-- Track timestamp comments (text or audio).
create table if not exists comments (
  id             text    primary key,    -- app-generated "cmt-xxx" string
  track_id       bigint  not null,
  time_ms        integer not null,
  type           text    default 'text', -- 'text' | 'audio'
  text           text,
  audio_path     text,                   -- Supabase Storage path for audio comments
  audio_duration real,
  author_id      text,
  author_name    text,
  author_avatar  text,
  created_at     timestamptz default now()
);

create index if not exists comments_track_id_idx on comments (track_id);

-- RLS: anyone authenticated can read; only the author can delete
alter table comments enable row level security;
create policy "read all comments" on comments
  for select using (auth.role() = 'authenticated');
create policy "insert own comments" on comments
  for insert with check (author_id = auth.uid()::text);
create policy "delete own comments" on comments
  for delete using (author_id = auth.uid()::text);

-- ── Chat Messages ─────────────────────────────────────────────────────────────
create table if not exists chat_messages (
  id           bigserial   primary key,
  session_id   text        not null,   -- currentUser.sessionId
  author_id    text,
  author_name  text,
  author_avatar text,
  text         text        not null,
  created_at   timestamptz default now()
);

create index if not exists chat_messages_session_idx on chat_messages (session_id);

-- RLS: authenticated users can read and insert
alter table chat_messages enable row level security;
create policy "read chat" on chat_messages
  for select using (auth.role() = 'authenticated');
create policy "send chat" on chat_messages
  for insert with check (author_id = auth.uid()::text);

-- ── Setlist Items ─────────────────────────────────────────────────────────────
create table if not exists setlist_items (
  id          bigint primary key,       -- app-generated Date.now()
  user_id     text   not null,
  title       text   not null,
  bpm         integer default 120,
  key         text    default 'C major',
  order_index integer default 0,
  created_at  timestamptz default now()
);

create index if not exists setlist_user_id_idx on setlist_items (user_id);

-- RLS
alter table setlist_items enable row level security;
create policy "own setlist only" on setlist_items
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- ── Supabase Storage bucket ───────────────────────────────────────────────────
-- Create the "audio-tracks" bucket in the Supabase dashboard:
--   Storage → New bucket → name: "audio-tracks" → Private
-- Then add these storage policies in Storage → Policies:
--   INSERT: ((storage.foldername(name))[1] = 'tracks') AND (auth.role() = 'authenticated')
--   SELECT: auth.role() = 'authenticated'
--   DELETE: auth.role() = 'authenticated'

-- ── Enable Realtime on relevant tables ────────────────────────────────────────
-- In Supabase dashboard: Database → Replication → toggle on for:
--   comments, chat_messages
-- Or run:
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table chat_messages;
