> **Status:** 📋 Planned — see [PROPOSALS_TRACKER.md](PROPOSALS_TRACKER.md)
> **Last updated:** Mar 28, 2026

# UX Improvements — Design Proposal

## Overview

A collection of twelve independent UX improvements that address gaps in feedback, discoverability, accessibility, and workflow efficiency across BandLab Studio. Each item is self-contained and can be shipped in any order. They have been triaged by impact vs. effort below.

---

## Priority Matrix

| # | Proposal | Effort | Impact |
|---|---|---|---|
| 1 | Export / Download Individual Track Audio | Low | High |
| 2 | Empty-State Illustrations with Action Prompts | Low | High |
| 3 | Toast / Snackbar Notification System | Low–Med | High |
| 4 | Keyboard Shortcuts for the DAW | Medium | High |
| 5 | Session Invite Link / QR Code | Medium | High |
| 6 | Pre-Recording Countdown + Click Track | Medium | High |
| 7 | Onboarding Walkthrough for First-Time Users | Medium–High | High |
| 8 | Real Waveform Visualization (Canvas) | High | High |
| 9 | Track Review Statuses | Medium | Medium |
| 10 | Drag-and-Drop Track Reordering | Medium | Medium |
| 11 | Mobile Bottom Navigation Bar | Medium | Medium |
| 12 | Project Activity Feed | High | Medium |

---

## 1 — Export / Download Individual Track Audio

### Problem
Users record audio that lives in IndexedDB with no way to extract it from the browser. There is no way to take a recorded take into an external DAW or share it with someone outside the app.

### Solution
Add a **Download** button (⬇) to each track row in the Recording DAW. Clicking it calls the existing `loadAudioBlob` helper, creates an object URL, and triggers a programmatic `<a download>` click. The original extension stored on the track (`track.audioExt`) is used for the filename.

```
Lead Guitar   ▁▂▃▅▆▇█   [M] [S] [⬇] [🗑]
```

### Files to Change

| File | What Changes |
|---|---|
| `src/components/Recording.js` | Add `handleDownload(track)` — loads blob, triggers download, revokes URL |
| `src/components/Recording.css` | Style for download button (matches existing mute/solo/delete button row) |

### Acceptance Criteria
- [ ] Track with real audio: clicking ⬇ downloads a file with the correct name and extension.
- [ ] Track with no audio (`hasAudio: false`): button is disabled / hidden.
- [ ] Downloaded file plays back correctly in a native media player.

---

## 2 — Empty-State Illustrations with Action Prompts

### Problem
Every list-based view (Sessions sidebar, Projects grid, Setlist, Band Roster, Chat) renders nothing when it contains no items. Blank space gives no guidance on what to do next.

### Solution
Detect the empty array condition in each component and replace the blank area with a centered illustration (emoji-based or lightweight SVG) plus a one-line prompt and a primary action button.

| Component | Illustration | Prompt | Action |
|---|---|---|---|
| `Sessions.js` (sidebar) | 🎵 | "No projects yet" | "New Project" |
| `Sessions.js` (grid) | 🎵 | "Nothing here yet — start a new project" | "+ New Project" |
| `Setlist.js` | 🎶 | "Your setlist is empty — add your first song" | "+ Add Song" |
| `BandRoster.js` | 👥 | "No band members yet" | — |
| `Chat.js` | 💬 | "No messages yet — say hello!" | — |

### Files to Change

| File | What Changes |
|---|---|
| `src/components/Sessions.js` | Empty-state branch in both list and grid views |
| `src/components/Setlist.js` | Empty-state branch in song list |
| `src/components/BandRoster.js` | Empty-state for empty roster |
| `src/components/Chat.js` | Empty-state for empty message list |
| `src/App.css` | Shared `.empty-state` utility class |

### Acceptance Criteria
- [ ] Each affected view shows the illustration + prompt when its list is empty.
- [ ] The action button (where applicable) triggers the same path as the existing primary action.
- [ ] Empty states are removed immediately when the first item is added.

---

## 3 — Toast / Snackbar Notification System

### Problem
There is no visual feedback when async operations complete — track saved, comment added, band application approved, chat message sent to socket. Users have no confirmation that their actions succeeded or failed.

### Solution
A lightweight, app-wide `ToastContext` that any component can dispatch to. Toasts appear in a fixed bottom-right stack and auto-dismiss after 4 seconds. Up to 3 toasts shown simultaneously; older ones are bumped off the top.

#### Toast variants
| Variant | Color | Use |
|---|---|---|
| `success` | `--accent-primary` (green) | Save confirmed, recording stopped |
| `error` | `--danger` (red) | API failure, permission denied |
| `info` | `--border-light` (neutral) | Session joined, member invited |
| `warning` | `--warning` (amber) | Unsaved changes, quota warning |

#### Usage (any component)
```js
const { showToast } = useToast();
showToast('Track saved!', 'success');
showToast('Failed to connect to server', 'error');
```

### Files to Change / Create

| File | What Changes |
|---|---|
| `src/context/ToastContext.js` | **New** — context, provider, `useToast` hook, auto-dismiss logic |
| `src/components/Toast.js` | **New** — renders the fixed toast stack |
| `src/components/Toast.css` | **New** — styles, slide-in/out animation |
| `src/App.js` | Wrap app in `<ToastProvider>`, render `<Toast />` |
| `src/components/Recording.js` | Dispatch toasts on save/delete/error |
| `src/components/Chat.js` | Dispatch toast on send error |
| `src/components/BandApplications.js` | Dispatch toast on approve/reject |

### Acceptance Criteria
- [ ] Success toast appears and auto-dismisses after 4 s when a track is saved.
- [ ] Error toast appears when an API call fails.
- [ ] Multiple simultaneous toasts stack correctly and dismiss independently.
- [ ] Toasts are keyboard-accessible and can be dismissed early with a close button.

---

## 4 — Keyboard Shortcuts for the DAW

### Problem
Musicians expect a recording application to be operable without reaching for the mouse. There are currently no keyboard shortcuts.

### Solution
Attach `keydown` listeners via a `useEffect` scoped to the Studio tab (only active when the `Recording` component is mounted). A `useCallback`-stabilised handler inspects `e.key` and dispatches the appropriate action.

#### Shortcut Map

| Key | Action | Notes |
|---|---|---|
| `Space` | Play / Pause | `e.preventDefault()` to avoid page scroll |
| `R` | Start / Stop recording | Ignored if no mic permission yet |
| `M` | Mute / Unmute selected track | No-op if no track selected |
| `S` | Solo / Unsolo selected track | No-op if no track selected |
| `Delete` / `Backspace` | Delete selected track | Requires confirmation modal |
| `Escape` | Deselect track / close modals | |
| `Ctrl/Cmd + Z` | Undo last track delete | Restores track from a one-deep undo buffer |
| `↑` / `↓` | Move track selection up / down | |

A non-intrusive **Shortcuts** (`?`) button in the DAW toolbar opens a reference modal listing all shortcuts.

### Files to Change

| File | What Changes |
|---|---|
| `src/components/Recording.js` | `useEffect` keydown listener, undo buffer ref, shortcut reference modal state |
| `src/components/Recording.css` | Styles for the shortcut reference modal and `?` button |

### Acceptance Criteria
- [ ] `Space` toggles playback; page does not scroll.
- [ ] `R` starts/stops recording when microphone permission is already granted.
- [ ] `Delete` on a selected track shows confirmation; confirmed deletion also works with keyboard (`Enter`).
- [ ] `Ctrl/Cmd + Z` restores the last deleted track.
- [ ] Shortcuts are inactive when focus is in a text input (e.g., track name modal).

---

## 5 — Session Invite Link / QR Code

### Problem
Inviting a collaborator currently requires verbally sharing a session ID string. There is no shareable link and no in-app join flow.

### Solution
Each session card and the active session header gain a **Share** button (🔗). Clicking it:
1. Constructs a URL of the form `?join=SESSION_ID` using `window.location`.
2. Copies the URL to the clipboard via `navigator.clipboard.writeText`.
3. Opens a modal showing the URL, a one-click **Copy** button, and a QR code rendered inline with the `qrcode` npm package (7 kB minified).

The app reads the `?join=` query param on load. If present and the user is authenticated, it automatically sets the active session to match that session ID (no backend call required — session resolution against the in-memory/localStorage list happens client-side).

### New Dependency
```
npm install qrcode
```
Use the `QRCode.toCanvas(canvas, url)` API; no React wrapper library needed.

### Files to Change / Create

| File | What Changes |
|---|---|
| `src/components/Sessions.js` | Share button in session cards |
| `src/components/Recording.js` | Share button in the active session header |
| `src/components/ShareModal.js` | **New** — QR canvas, URL display, copy button |
| `src/components/ShareModal.css` | **New** — modal styles |
| `src/App.js` | Read `?join=` param on mount; set initial active session accordingly |

### Security Notes
- The join link is informational only. No backend token is embedded; full authentication is still required.
- The session ID is alphanumeric and poses no injection risk when used as a URL parameter.

### Acceptance Criteria
- [ ] Clicking Share copies a valid URL to the clipboard and shows the QR code modal.
- [ ] Opening the copied URL in a new tab and logging in lands the user on the correct session.
- [ ] QR code is scannable and resolves to the correct URL.
- [ ] Modal is dismissible via `Escape` and a close button.

---

## 6 — Pre-Recording Countdown + Click Track

### Problem
Musicians have no preparation time between pressing Record and having the recording actually start. A sudden start causes wasted takes and cut-off openings.

### Solution
When the user presses Record, instead of immediately starting the `MediaRecorder`, show an animated full-screen overlay with a 3-2-1 countdown (1 second per step). The `MediaRecorder` starts after the countdown finishes.

An optional **Click Track** setting (toggle in the session controls) plays a synthesised metronome tick during the countdown and the recording itself at the session's BPM. The click track is generated via the Web Audio API (`AudioContext` + `OscillatorNode`) and is routed to speaker output only — it is explicitly **not** mixed into the `MediaRecorder` stream, so it does not appear in recorded audio.

#### Click Track defaults
| Parameter | Default | Configurable |
|---|---|---|
| BPM | 120 | Yes — per session |
| Accent on beat 1 | 880 Hz / 60 ms | No |
| Other beats | 660 Hz / 40 ms | No |
| Volume | 0.6 (gain node) | Toggle only |

### Files to Change

| File | What Changes |
|---|---|
| `src/components/Recording.js` | Countdown state (`countdownValue`: 3/2/1/null), `startMetronome` / `stopMetronome` helpers, delay `MediaRecorder.start()` until countdown ends, BPM field on session |
| `src/components/Recording.css` | Full-screen countdown overlay, animated number transition |

### Acceptance Criteria
- [ ] Pressing Record shows 3 → 2 → 1 overlay; `MediaRecorder` starts only after countdown.
- [ ] Pressing Record again during the countdown cancels the countdown and does not start recording.
- [ ] With click track enabled: audible ticks play during countdown and recording; recorded file contains no ticks.
- [ ] BPM can be changed without stopping a running click track (change takes effect on next beat).

---

## 7 — Onboarding Walkthrough for First-Time Users

### Problem
New users (non-demo sign-ups) land in the app with no guidance. The tab layout and DAW controls are not self-evident to non-musicians.

### Solution
After a successful **Sign Up** (not Login, not Demo), set a `hasCompletedOnboarding: false` flag on the user object. On first app load for this user, render a 5-step tooltip-based tour that highlights key UI regions. Dismiss states and completion are stored in `localStorage` (key: `bandlab-onboarding-v1`).

#### Tour Steps

| Step | Anchor | Text |
|---|---|---|
| 1 | Tab bar | "Use these tabs to switch between Studio, Projects, Band, and Chat." |
| 2 | Sessions sidebar | "Your projects live here. Click one to open it in the Studio." |
| 3 | Record button | "Hit Record to capture audio from your microphone." |
| 4 | Band tab | "Invite your bandmates here — search open bands or create your own." |
| 5 | Setlist tab | "Add songs to your setlist and attach reference recordings." |

Each tooltip has **Back**, **Next** / **Done**, and a **Skip tour** link. The tour can be replayed from a "?" help menu in the nav bar.

### Files to Change / Create

| File | What Changes |
|---|---|
| `src/components/OnboardingTour.js` | **New** — step state machine, tooltip positioning via `getBoundingClientRect`, overlay backdrop |
| `src/components/OnboardingTour.css` | **New** — tooltip styles, spotlight cutout |
| `src/App.js` | Check `hasCompletedOnboarding`; render `<OnboardingTour>` when active; wire up "Replay tour" from nav |
| `src/components/Login.js` | Set `hasCompletedOnboarding: false` on the user object created during Sign Up |

### Acceptance Criteria
- [ ] Tour auto-starts for new Sign Up users only (not Login, not Demo).
- [ ] Each step scrolls the anchor element into view and positions the tooltip correctly.
- [ ] "Skip tour" dismisses immediately and sets the flag to `true`.
- [ ] Completing all 5 steps sets the flag to `true` and does not re-show the tour on next login.
- [ ] "Replay tour" in the nav bar resets the flag and re-shows the tour.

---

## 8 — Real Waveform Visualization (Canvas)

### Problem
Track waveforms are currently static ASCII strings (`▁▂▃▅▆▇█▇▆▅▃▂▁`). They carry no information about the actual recorded audio and are identical across all seed tracks.

### Solution
Replace ASCII waveforms with `<canvas>` renders. Two code paths:

1. **Real audio** (`track.hasAudio === true`): On track load, call `loadAudioBlob(track.id)`, decode the blob via `AudioContext.decodeAudioData`, downsample the PCM buffer to ~200 samples, and draw a bar-chart waveform onto a `<canvas>`. Cache the rendered result so it is not re-decoded on every render.

2. **Seed / no audio**: Generate a deterministic pseudorandom bar-chart keyed on `track.id`, so each seed track has a visually distinct waveform.

The canvas is 100% width of the track row waveform cell and 40 px tall, matching the existing row height. Active playhead position is overlaid as a vertical line that moves with `playheadPosition` state.

### Files to Change / Create

| File | What Changes |
|---|---|
| `src/components/WaveformCanvas.js` | **New** — memoised canvas component; accepts `track`, `playheadPosition`, `accentColor` |
| `src/components/Recording.js` | Replace `<span className="waveform">` with `<WaveformCanvas>` |
| `src/components/Recording.css` | Remove ASCII waveform font-size rules; add canvas sizing |

### Acceptance Criteria
- [ ] All seed tracks display distinct, deterministic bar-chart waveforms.
- [ ] After recording, the new track's waveform reflects its actual PCM amplitude envelope.
- [ ] The playhead line moves horizontally across the waveform during playback.
- [ ] Re-renders during volume/mute changes do not re-decode the audio buffer.

---

## 9 — Track Review Statuses

### Problem
The track `status` field is always `'recorded'` after capture. There is no workflow to communicate whether a take is good, needs review, or needs to be re-done — forcing bands to use external tools (chat, text) for this coordination.

### Solution
Extend the track status vocabulary and show a colour-coded chip on each track row. Band Lead (or any member with edit rights) can cycle status from the track's context menu.

#### Status Values

| Value | Chip color | Label | Who can set |
|---|---|---|---|
| `recorded` | `--text-muted` grey | Recorded | Auto-set after capture |
| `needs-review` | `--warning` amber | Needs Review | Any member |
| `approved` | `--accent-primary` green | Approved ✓ | Band Lead only |
| `needs-re-record` | `--danger` red | Re-Record | Band Lead only |

The status is persisted alongside the track object in `localStorage` / Supabase.

### Files to Change

| File | What Changes |
|---|---|
| `src/components/Recording.js` | Status chip render, context-menu status picker, `handleSetStatus(trackId, status)` handler |
| `src/components/Recording.css` | `.status-chip` variants per status value |
| `server/models/Track.js` | Add `status` field enum to Mongoose schema (for future Supabase migration) |

### Acceptance Criteria
- [ ] Each track row shows its current status chip.
- [ ] Any member can set a track to `needs-review`.
- [ ] Only the Band Lead role can set `approved` or `needs-re-record`; other users see those options disabled.
- [ ] Status persists across page refreshes.

---

## 10 — Drag-and-Drop Track Reordering

### Problem
The order in which tracks appear in the DAW is fixed at creation time. Producers commonly reorganise tracks (drums first, then bass, etc.) and there is currently no way to do this.

### Solution
Use the HTML5 native Drag-and-Drop API to make track rows reorderable. No new npm dependency is required. Each track row gets `draggable="true"` and relevant `onDragStart` / `onDragOver` / `onDrop` handlers. A `dragOverIndex` state variable drives a visual insertion indicator (a 2px accent-coloured line between rows).

Track order is stored as an explicit `order` integer field on each track object and persisted to `localStorage` / Supabase. On load, tracks are sorted by `order` ascending.

### Files to Change

| File | What Changes |
|---|---|
| `src/components/Recording.js` | Drag handlers, `dragOverIndex` state, sort tracks by `order` on render, persist order on drop |
| `src/components/Recording.css` | `.drag-handle` icon, `.drag-over` insertion indicator line |

### Acceptance Criteria
- [ ] Dragging a track row and dropping it in a new position reorders the list.
- [ ] The new order persists across page refreshes.
- [ ] A visible drag handle icon (⠿) on each row indicates draggability.
- [ ] The insertion indicator line appears between the correct rows during drag.
- [ ] Drag-and-drop does not interfere with clicking volume sliders or other controls.

---

## 11 — Mobile Bottom Navigation Bar

### Problem
On viewports narrower than ~768 px (phones), the top tab strip becomes too narrow to tap comfortably. The existing 900 px breakpoint collapses the three-panel layout but does not address the navigation affordance.

### Solution
At ≤ 768 px, hide the top tab strip and show a fixed iOS-style bottom navigation bar with four items: Studio (🎙), Projects (📁), Band (👥), Chat (💬). Each item shows an icon and a short label. The active tab is highlighted with `--accent-primary`.

The bottom nav occupies 56 px and the main content area gains `padding-bottom: 56px` to prevent content from being obscured.

### Files to Change

| File | What Changes |
|---|---|
| `src/App.js` | Conditionally render `<BottomNav>` component below the main shell |
| `src/components/BottomNav.js` | **New** — four nav items, active state, `onClick` delegates to the same `setActiveTab` prop |
| `src/components/BottomNav.css` | **New** — fixed positioning, 56 px height, item layout, active highlight |
| `src/App.css` | `@media (max-width: 768px)` rule: hide `.tab-strip`, add `padding-bottom: 56px` to main content |

### Acceptance Criteria
- [ ] On a 375 px viewport, the bottom nav is visible and the top tab strip is hidden.
- [ ] All four tabs navigate correctly.
- [ ] Active tab is visually distinct.
- [ ] Content is not obscured by the bottom bar on any tab.
- [ ] On viewports > 768 px the bottom nav is hidden and the top tabs are shown.

---

## 12 — Project Activity Feed

### Problem
Collaborators working asynchronously have no way to see what has changed in a project since they last visited. They must manually inspect every track, comment, and the chat log.

### Solution
A collapsible **Activity** panel (↓ chevron button in the session header) shows a reverse-chronological list of timestamped events. Events are generated client-side at the time of each action and stored in `localStorage` (key: `bandlab-activity-{sessionId}`) with a 100-event rolling window.

#### Event Types

| Event key | Template |
|---|---|
| `track.added` | `{user} added track "{name}"` |
| `track.deleted` | `{user} deleted track "{name}"` |
| `track.renamed` | `{user} renamed track to "{name}"` |
| `track.status` | `{user} marked "{name}" as {status}` |
| `comment.added` | `{user} added a comment on "{track}" at {timestamp}` |
| `session.created` | `{user} created this session` |
| `member.joined` | `{user} joined the band` |

When Supabase is configured, events are written to an `activity_log` table and read via realtime subscription so all collaborators see the feed update live.

### Files to Change / Create

| File | What Changes |
|---|---|
| `src/context/ActivityContext.js` | **New** — event log state, `logEvent(type, payload)` helper, localStorage persistence |
| `src/components/ActivityFeed.js` | **New** — collapsible panel, event list, relative timestamps (`"2 min ago"`) |
| `src/components/ActivityFeed.css` | **New** — panel styles |
| `src/components/Recording.js` | Call `logEvent` on track add / delete / rename / status change |
| `src/context/CommentsContext.js` | Call `logEvent` on comment add |
| `src/App.js` | Wrap app in `<ActivityProvider>`, render `<ActivityFeed>` in session header |

### Acceptance Criteria
- [ ] Adding a track creates an activity entry visible in the feed.
- [ ] Feed is sorted newest-first and shows relative timestamps.
- [ ] Feed is collapsed by default; clicking the chevron expands it.
- [ ] Feed persists across page refreshes (localStorage).
- [ ] Feed is capped at 100 entries per session; older entries are dropped.

---

## Files Summary

### New Files

| File | Purpose |
|---|---|
| `src/context/ToastContext.js` | Toast state and `useToast` hook |
| `src/components/Toast.js` | Toast stack renderer |
| `src/components/Toast.css` | Toast styles |
| `src/components/ShareModal.js` | Invite link + QR code modal |
| `src/components/ShareModal.css` | Share modal styles |
| `src/components/WaveformCanvas.js` | Canvas waveform component |
| `src/components/OnboardingTour.js` | First-time user walkthrough |
| `src/components/OnboardingTour.css` | Tour tooltip styles |
| `src/components/BottomNav.js` | Mobile bottom navigation |
| `src/components/BottomNav.css` | Mobile bottom nav styles |
| `src/context/ActivityContext.js` | Activity log state |
| `src/components/ActivityFeed.js` | Activity feed panel |
| `src/components/ActivityFeed.css` | Activity feed styles |

### Modified Files

| File | Proposals that touch it |
|---|---|
| `src/App.js` | 3, 5, 7, 11, 12 |
| `src/App.css` | 2, 11 |
| `src/components/Recording.js` | 1, 4, 6, 8, 9, 10, 12 |
| `src/components/Recording.css` | 1, 4, 6, 8, 9, 10 |
| `src/components/Sessions.js` | 2, 5 |
| `src/components/Setlist.js` | 2 |
| `src/components/BandRoster.js` | 2 |
| `src/components/Chat.js` | 2, 3 |
| `src/components/BandApplications.js` | 3 |
| `src/components/Login.js` | 7 |
| `src/context/CommentsContext.js` | 12 |
| `server/models/Track.js` | 9 |
