> **Status:** 📋 Planned — see [PROPOSALS_TRACKER.md](PROPOSALS_TRACKER.md)
> **Last updated:** Mar 4, 2026

# Setlist Playback & Recording Attachment — Design Proposal

## Overview

Add the ability to attach a recording to each song in the setlist so band members can hear a reference recording directly from the setlist view. Recordings can be sourced from three places:

1. A track already recorded in the app's DAW (Recording tab)
2. An uploaded audio/video file (MP3, WAV, MP4, etc.)
3. A YouTube video link

---

## Data Model

Each song object gains an optional `recording` field (null when nothing is attached).

### Band recording
```json
{ "type": "band", "trackId": 1717000000, "trackName": "Lead Guitar" }
```

### Uploaded file
```json
{ "type": "file", "blobKey": "setlist-file-1717000001", "name": "higher-ground.mp3" }
```

### YouTube video
```json
{ "type": "youtube", "videoId": "dQw4w9WgXcQ", "title": "Higher Ground – RHCP (Official)" }
```

### Full example song object
```json
{
  "id": 1,
  "title": "Higher Ground",
  "bpm": 105,
  "key": "E minor",
  "recording": {
    "type": "youtube",
    "videoId": "dQw4w9WgXcQ",
    "title": "Higher Ground – RHCP (Official)"
  }
}
```

---

## Persistence Strategy

| Source | Persistence |
|---|---|
| Band recording | Only the `trackId` is saved in `localStorage` alongside the song. The audio blob already lives in IndexedDB, managed by the existing Recording component. |
| Uploaded file | Blob is saved to IndexedDB under the key `setlist-file-{id}` using the existing `saveAudioBlob` helper. The song stores only that key; the blob URL is rehydrated on component mount, matching the same pattern used in `Recording.js`. |
| YouTube | Only `{ videoId, title }` is stored in `localStorage` — no blob needed. |

Songs list continues to be persisted to `localStorage` (new key: `bandlab-setlist-v2`).

---

## UI Changes

### 1. Play Button on Every Row

A play icon (`▶`) appears at the right side of each setlist row:
- **Has recording attached** → full-colour accent button; clicking it opens the inline mini-player.
- **No recording** → muted/grey icon; clicking it jumps straight to the edit panel's attach tab.

```
┌──────────────────────────────────────────────────────────┐
│  1  Higher Ground     100 BPM · E minor   [E minor]  ▶ ⋮⋮ │
└──────────────────────────────────────────────────────────┘
```

---

### 2. Inline Mini-Player (Band / File)

Opens directly beneath the row header without entering edit mode. Uses a hidden native `<audio>` element with a custom control bar.

```
┌──────────────────────────────────────────────────────────┐
│  🎙 Lead Guitar   ◀◀   ▶   ▶▶    0:00 ────●────── 3:45  ✕ │
└──────────────────────────────────────────────────────────┘
```

Controls:
- Rewind 10 s (`◀◀`), Play/Pause (`▶`/`⏸`), Skip 10 s (`▶▶`)
- Scrubber (range input) showing elapsed / total time
- Close (`✕`) dismisses the mini-player without leaving edit mode

---

### 3. Inline Mini-Player (YouTube)

Renders a responsive `<iframe>` embed using `youtube-nocookie.com` for ad-free, privacy-respecting playback.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   [ YouTube embed iframe (youtube-nocookie.com/embed) ]  │
│                                                          │
│                                          [  Close  ]     │
└──────────────────────────────────────────────────────────┘
```

---

### 4. Attach Recording — Edit Panel (3-Tab Section)

When a setlist row is expanded, a **Recording** section is shown below the existing title / BPM / key fields with three tabs:

```
 [ 🎙 Band ]   [ 📁 Upload ]   [ ▶ YouTube ]
```

#### 🎙 Band Tab
- Dropdown lists all tracks from `localStorage` key `bandlab-tracks-v1` (same source as the Recording component).
- Tracks where `hasAudio: false` are shown but disabled (greyed out), since they have no real audio blob.
- Shows track name and duration.
- Selecting a track and clicking **Attach** saves `{ type: 'band', trackId, trackName }` to the song.

#### 📁 Upload Tab
- `<input type="file" accept="audio/*,video/mp4">` file picker.
- On selection, the file is read and the blob is stored in IndexedDB via `saveAudioBlob(blobKey, blob)`.
- The song stores only `{ type: 'file', blobKey, name }`.
- A preview `<audio>` or `<video>` element lets the user confirm the file before saving.

#### ▶ YouTube Tab
- Text input accepting any standard YouTube URL format:
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtube.com/shorts/VIDEO_ID`
- The video ID is extracted via regex and validated (11-character alphanumeric + `-_`).
- An optional **Fetch Title** button calls the YouTube oEmbed endpoint (`https://www.youtube.com/oembed?url=...&format=json`) — no API key required — to auto-fill the title field.
- Title is also manually editable.
- Clicking **Attach** saves `{ type: 'youtube', videoId, title }` to the song.

#### Remove Recording
A **Remove recording** link/button appears in the edit panel when a recording is already attached, allowing the user to detach it (and, for file uploads, also delete the blob from IndexedDB).

---

## Files to Change

| File | What Changes |
|---|---|
| `src/components/Setlist.js` | Recording attachment state, 3-tab attach UI, mini-player for band/file/YouTube, YouTube ID parser, IndexedDB rehydration on mount, `localStorage` persistence |
| `src/components/Setlist.css` | Styles for tab selector, mini-player controls, attach section, play button states |
| `src/db/audioDB.js` | **No changes needed** — `saveAudioBlob` / `loadAudioBlob` / `deleteAudioBlob` already cover the file-upload use case |

No new npm dependencies are required. All functionality uses the browser's native `<audio>`, `<iframe>`, `IndexedDB`, `fetch` (for oEmbed), and `localStorage`.

---

## Security Notes

- YouTube embeds use `youtube-nocookie.com` and include the `referrerpolicy="no-referrer"` attribute on the `<iframe>`.
- YouTube video IDs are validated with a strict regex (`/^[a-zA-Z0-9_-]{11}$/`) before being embedded, preventing URL injection.
- Uploaded files are stored as raw blobs in IndexedDB; no executable content is evaluated or injected into the DOM.
- The oEmbed fetch is read-only and does not expose any user credentials.

---

## Acceptance Criteria

- [ ] Each song row shows a play button; clicking it opens the correct mini-player type.
- [ ] Band tab: selecting a track with real audio and clicking Attach plays back the track in the mini-player.
- [ ] Upload tab: uploading an MP3/WAV/MP4 persists across page refreshes (blob rehydrated from IndexedDB).
- [ ] YouTube tab: pasting a YouTube URL, fetching the title, and clicking Attach embeds the video in the mini-player.
- [ ] Removing a recording clears the mini-player and the play button reverts to the unattached state.
- [ ] Drag-to-reorder, BPM editing, key editing, and delete continue to work as before.
