> **Status:** ✅ Implemented — see [PROPOSALS_TRACKER.md](PROPOSALS_TRACKER.md)
> **Last updated:** Mar 4, 2026

# BandLab Studio — Design Specification

## 1. Overview

**BandLab Studio** is a browser-based collaborative music recording application built with React 18 and Vite. It enables band members to manage recording sessions, track multi-channel audio, communicate in real time, and coordinate with other collaborators.

**Tagline:** Collaborate. Create. Record.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18.2 |
| Build tool | Vite 7 |
| Styles | Plain CSS with CSS custom properties (design tokens) |
| State | React `useState` / `useEffect` (local, no external store) |
| Persistence | `localStorage` (theme preference, current user) |
| Auth | Simulated client-side only (no backend) |

---

## 3. Application Architecture

```
App (root)
├── Login              — unauthenticated gate
└── (authenticated shell)
    ├── Top Navigation Bar
    ├── Left Sidebar      — Sessions list OR Users list (context-aware)
    ├── Main Content      — Recording / Projects grid / Band grid / Chat
    └── Right Sidebar     — Compact Chat (Studio tab only)
```

### Tab → Content Mapping

| Tab | Sidebar | Main content | Right panel |
|---|---|---|---|
| Studio (🎙️) | Sessions list | Recording DAW | Compact Chat |
| Projects (📁) | Sessions list | Projects grid | — |
| Band (👥) | Users list | Users detailed grid | — |
| Chat (💬) | — | Full-screen Chat | — |

---

## 4. Color System & Theming

The app supports **dark** (default) and **light** themes, toggled from the nav bar and persisted in `localStorage`. Both themes share the same CSS custom properties defined on `:root[data-theme]`.

### Dark Theme

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#1a1a1a` | Page background |
| `--bg-secondary` | `#252525` | Sidebars, cards |
| `--bg-tertiary` | `#2a2a2a` | Nav bar, inputs |
| `--bg-hover` | `#323232` | Hover states |
| `--border-color` | `#3a3a3a` | Dividers, card borders |
| `--border-light` | `#4a4a4a` | Subtle borders |
| `--text-primary` | `#e5e5e5` | Body text, headings |
| `--text-secondary` | `#999` | Secondary labels |
| `--text-muted` | `#666` | Placeholder, meta |

### Light Theme

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#f5f5f5` | Page background |
| `--bg-secondary` | `#ffffff` | Sidebars, cards |
| `--bg-tertiary` | `#f0f0f0` | Nav bar |
| `--bg-hover` | `#e8e8e8` | Hover states |
| `--border-color` | `#d1d5db` | Dividers |
| `--text-primary` | `#1e293b` | Body text |
| `--text-secondary` | `#64748b` | Secondary labels |
| `--text-muted` | `#94a3b8` | Placeholder |

### Semantic / Accent Colors (shared across themes)

| Token | Value | Usage |
|---|---|---|
| `--accent-primary` | `#10b981` | Active states, badges, links, session IDs |
| `--accent-hover` | `#059669` | Accent hover |
| `--accent-bg` | `rgba(16,185,129,0.2)` | Accent fill / background tints |
| `--danger` | `#ef4444` | Destructive actions, recording indicator |
| `--danger-hover` | `#dc2626` | Danger hover |
| `--warning` | `#f59e0b` | Away status, BPM/tempo controls |

---

## 5. Typography

- **Font family:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`
- **Monospace** (session IDs, track names inline): `'Courier New', monospace`
- **Anti-aliasing:** `-webkit-font-smoothing: antialiased`

### Type Scale

| Use | Size | Weight |
|---|---|---|
| App logo / H1 | `1.3rem` | 600 |
| Section titles | `1.1rem` | 600 |
| Nav tabs | `0.95rem` | 500 |
| Body / labels | `0.9rem` | 400 |
| Session ID badge | `0.85rem` | 600 (monospace) |
| Meta / muted | `0.75–0.8rem` | 400–500 |
| Notification badge | `0.65rem` | 700 |

---

## 6. Layout & Spacing

### Global Shell

- **Top nav height:** `60px`, sticky (`z-index: 100`), `border-bottom: 1px solid var(--border-color)`
- **Left sidebar width:** `280px` (desktop), `240px` (≤ 1200 px), full-width column (≤ 900 px)
- **Right sidebar width:** `320px` (desktop), `280px` (≤ 1200 px), full-width column (≤ 900 px)
- **Main content:** `flex: 1`, fills remaining horizontal space
- **Scrollbar styling:** 8 px wide, custom thumb color using `--border-color`

### Breakpoints

| Breakpoint | Behaviour |
|---|---|
| ≤ 1200 px | Sidebars narrow (240 / 280 px) |
| ≤ 900 px | Three-panel layout collapses to vertical stacking; sidebars become full-width |

---

## 7. Component Specifications

### 7.1 Login

**File:** [src/components/Login.js](src/components/Login.js)

**Purpose:** Unauthenticated entry gate. Shown when no `currentUser` is in state.

**Layout:** Full-viewport centered card with decorative background pattern.

**Elements:**
- Logo: `🎵 BandLab Studio` with tagline `Collaborate. Create. Record.`
- Username input
- Password input (min 6 chars enforced client-side)
- Error message banner (inline)
- Primary CTA: **Log In** / **Sign Up** (toggling label)
- Divider: `or`
- Secondary CTA: **Continue as Demo User** (auto-generates credentials)
- Footer link to toggle between Log In ↔ Sign Up modes

**Auth model (simulated):**
- On submit, generates a `sessionId` (`sess` + 5-digit random number)
- Assigns a random emoji avatar from: `😎 🎸 🎤 🎹 🥁 🎵 🎼 🎧 🎺 🎷`
- Creates a user object: `{ username, avatar, id, sessionId, displayName }`
- `displayName` format: `{username}-{sessionId}`
- Persisted to `localStorage` under key `currentUser`

---

### 7.2 Top Navigation Bar

**File:** [src/App.js](src/App.js)

**Three zones:**

**Left:**
- Hamburger menu toggle (shows/hides left sidebar)
- App logo: `🎵 BandLab Studio`
- Session badge showing current `sessionId` in accent-colored monospace

**Center:**
- Tab buttons: **Studio** (🎙️) | **Projects** (📁) | **Band** (👥) | **Chat** (💬)
- Active tab: accent color text + `--bg-hover` fill

**Right:**
- Theme toggle (☀️ / 🌙)
- Notification bell (🔔) with animated red badge showing unread count
- Settings gear (⚙️)
- User profile chip: username + `sessionId`
- Logout button (🚪): turns danger red on hover

---

### 7.3 Sessions / Projects

**File:** [src/components/Sessions.js](src/components/Sessions.js)

**Two view modes:**

**List mode** (sidebar):
- Section header `📁 Projects` + `+` new session button
- Each card shows: name, status dot (● active / ✓ completed), date, track count, collaborator count, duration
- Active card highlighted with accent border/background

**Grid mode** (Projects tab main content):
- Header: `📁 Your Projects` + `+ New Project` button
- Cards with: ASCII waveform thumbnail (`▁▂▃▅▆▇█▇▆▅▃▂▁`), name, `sessionId`, track count, collaborator count, date, status badge

**Session data model:**
```
{ id, name, date, tracks, status, collaborators, duration, sessionId }
```
`status` values: `active` | `completed`

---

### 7.4 Recording DAW

**File:** [src/components/Recording.js](src/components/Recording.js)

**Purpose:** Core multitrack recording interface modelled on a Digital Audio Workstation (DAW).

**Sub-regions:**

**Transport Bar:**
- Stop (⏹), Play/Pause (▶/⏸), Record (⏺) buttons
- Live time display: `current / 4:00`
- BPM input (default 120, range 40–200)
- Zoom control: `−` `{zoom}%` `+` (range 25–200%, steps of 25)

**Timeline Header:**
- `Tracks` column label
- Ruler with markers at 0:00, 1:00, 2:00, 3:00, 4:00
- Moving playhead line (position driven by `playheadPosition` state 0–100%)

**Track rows** (default 4 tracks: Lead Guitar, Bass Line, Drums, Vocals):

Each track row has a **controls panel** and a **waveform region**:

| Control | Description |
|---|---|
| Track name | Editable inline text input |
| Comment badge | Count + 💬 click to add comments via `prompt()` |
| **M** button | Toggle mute (active = highlighted) |
| **S** button | Toggle solo (active = highlighted) |
| 💬 button | Add comment |
| Volume slider | `0–100`, updates per-track |
| Delete (🗑) | Removes track |

**Track data model:**
```
{ id, name, duration, waveform, status, volume, muted, solo, comments }
```

**Recording flow:**
1. Click record → `prompt()` for track name → timer starts
2. Clock stop → new track appended with recorded duration + generated waveform

---

### 7.5 Chat

**File:** [src/components/Chat.js](src/components/Chat.js)

**Two render modes:**
- `compact={true}` — right sidebar (Studio tab), smaller height
- `fullScreen={true}` — full main content area (Chat tab)

**Header:**
- Title `💬 Chat` (or `Band Chat` in full-screen) with unread badge
- Online member count
- 🧪 test button (simulates an incoming message from a random online member)
- 🔔/🔕 notification toggle (requests `Notification` browser permission)
- 📞 call button (full-screen only)

**Messages:**
- System/notification messages: icon + text + time, centered, distinct style
- User messages: avatar emoji + username + timestamp + message text
- Own messages: right-aligned with distinct background
- Full-screen only: 👍 and 💬 reaction buttons per message

**Mention system:**
- Typing `@` in the input triggers a popup listing online members
- Clicking a member inserts `@{name}` into the compose field

**Notification system:**
- Uses Web Notifications API (`Notification.requestPermission()`)
- Plays a short 800Hz sine-wave beep via Web Audio API on new incoming messages
- Browser notification fires when `document.hidden` is true

**Message data model:**
```
{ id, user, text, time, avatar, type }
```
`type` values: `message` | `notification`

---

### 7.6 Users / Band Members

**File:** [src/components/Users.js](src/components/Users.js)

**Two view modes:**

**List mode** (sidebar):
- Header `👥 Band` + `+` invite button
- Each row: large emoji avatar with status dot, display name, role, mini stats (tracks + collaborations)

**Detailed grid mode** (Band tab main content):
- Header `👥 Band Members` + `+ Invite Member`
- Cards: large avatar + status dot, status badge, display name, role, tracks stat, collabs stat, **Message** and **Invite** action buttons

**Status colours:**
| Status | Colour |
|---|---|
| online | `#10b981` (accent green) |
| away | `#f59e0b` (warning amber) |
| offline | `#6b7280` (neutral grey) |

**User data model:**
```
{ id, name, role, status, avatar, tracks, collaborations, sessionId, displayName }
```
Default roles: Lead Guitarist, Vocalist, Drummer, Bassist, Keyboardist, Saxophonist, Producer

---

## 8. State Management

All state lives in React component state (no Redux / Zustand / Context API).

| State | Location | Persistence |
|---|---|---|
| `currentUser` | `App` | `localStorage` |
| `theme` | `App` | `localStorage` |
| `sessions` | `App` | In-memory (regenerated on login) |
| `users` | `App` | In-memory (regenerated on login) |
| `activeSession` | `App` | In-memory |
| `activeTab` | `App` | In-memory |
| `showSidebar` | `App` | In-memory |
| `notificationCount` | `App` | In-memory |
| `tracks` | `Recording` | In-memory |
| `isRecording` | `App` (passed as prop) | In-memory |
| `messages` | `Chat` | In-memory |

---

## 9. Interactive Patterns

| Pattern | Implementation |
|---|---|
| Theme toggle | Toggles `data-theme` attribute on `:root`; CSS custom properties re-cascade |
| Sidebar toggle | `showSidebar` boolean removes `<aside>` from DOM |
| Tab navigation | `activeTab` string controls conditional rendering |
| Notification badge | `bounceIn` keyframe animation on mount |
| Recording timer | `setInterval` counting seconds, formatted as `m:ss` |
| Playhead | `setInterval` incrementing `playheadPosition` 0–100 at 0.5/100ms |
| Session ID generation | `'sess' + Math.floor(10000 + Math.random() * 90000)` |
| Demo data | Randomised on each login; seeded from `currentUser` |

---

## 10. Animations & Transitions

| Element | Animation |
|---|---|
| Theme switch | `transition: background-color 0.3s ease, color 0.3s ease` on all major containers |
| Notification badge | `bounceIn` — scale 0 → 1.2 → 1 over 0.3s |
| Hover states | `background 0.2s` on buttons and nav items |
| Logout button hover | `transform: translateY(-2px)` + danger background |

---

## 11. Accessibility Notes

- Form inputs have explicit `<label>` / `htmlFor` associations
- Buttons have `title` attributes for screen-reader context
- `autoComplete` attributes set on login inputs
- Status indicators use both colour and text (badge) to convey state (not colour alone)
- No `aria-*` attributes currently implemented — area for improvement

---

## 12. Known Limitations / Future Work

1. **No backend** — authentication, sessions, and messages are all ephemeral client-side state
2. ~~**No real audio**~~ ✅ **Implemented** — main track recording now uses `MediaRecorder` API to capture real microphone audio; the resulting blob is stored per-track. Falls back gracefully to timer-only mode if microphone access is denied.
3. **No real-time collaboration** — chat simulation only; no WebSocket or WebRTC
4. ~~**No file I/O**~~ ✅ **Implemented** — every track recorded with microphone access gains a ⬇ download button that saves the audio as a `.webm` / `.mp4` file. Blob URLs are revoked on track deletion to prevent memory leaks.
5. ~~**Prompt-based dialogs**~~ ✅ **Implemented** — track naming on record uses a proper modal dialog (`trackNameModal` state) instead of `window.prompt()`. Track comments already used `AddCommentModal`.
6. **No routing** — all views controlled by `activeTab` string state; deep-linking not supported
7. **Test coverage** — no unit or integration tests present
