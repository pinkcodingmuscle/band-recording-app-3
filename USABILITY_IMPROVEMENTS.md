# Usability Improvements Proposal

## Overview
Six targeted improvements to address usability gaps discovered during deployment review. Each item includes the problem, proposed fix, and affected files.

---

## 1. Persist Sessions — Wire "New Project" Button

**Problem:** Sessions in `App.js` are hardcoded and regenerated on every login. The `+` / "New Project" buttons in `Sessions.js` do nothing. Users lose context every time they reload.

**Fix:**
- On mount, fetch sessions from `GET /api/tracks` (grouped by session) or add a dedicated `GET /api/sessions` route
- Wire the `+` button to open a name prompt and call `POST /api/sessions`
- Store the created session in state and persist to MongoDB

**Files:** `src/App.js`, `src/components/Sessions.js`, `server/routes/` (new sessions route)

---

## 2. Remove Dead "+" Button on Dashboard Gigs

**Problem:** `Dashboard.js` has a `+` button on "Upcoming Gigs" that does nothing. Hardcoded gig dates (May/June 2026) are already in the past. Users may click it expecting to add a gig.

**Fix:**
- Remove the non-functional `+` button
- Replace hardcoded gig dates with a message linking to the Band Calendar tab when no gigs exist
- The `BandCalendar` component already exists — link to it

**Files:** `src/components/Dashboard.js`, `src/components/Dashboard.css`

---

## 3. Network Error Feedback

**Problem:** When the Railway backend is unreachable, login fails with a generic "Something went wrong" message. Users have no way to know if it's a credentials issue or a server issue.

**Fix:**
- Detect `TypeError: Failed to fetch` / `NetworkError` specifically in `Login.js`
- Show a distinct message: "Unable to reach the server. Please check your connection or try again shortly."
- Distinguish this from auth errors (wrong password, etc.)

**Files:** `src/components/Login.js`, `src/lib/api.js`

---

## 4. Avatar Picker on Signup

**Problem:** Signup in `Login.js` assigns a random emoji avatar. Users have no control over their identity in the app.

**Fix:**
- During signup, show the 10 available avatars (`😎 🎸 🎤 🎹 🥁 🎵 🎼 🎧 🎺 🎷`) as a clickable grid
- Highlight the currently selected avatar
- Default to a random one (existing behavior) but allow the user to change it

**Files:** `src/components/Login.js`, `src/components/Login.css`

---

## 5. "Stay Signed In" Transparency

**Problem:** The JWT token lasts 7 days but there is no UI indication of this. Users don't know if they'll need to log in again next visit.

**Fix:**
- Add a small note below the login form: "You'll stay signed in for 7 days"
- No checkbox needed — this is already the default behavior, just make it visible

**Files:** `src/components/Login.js`, `src/components/Login.css`

---

## 6. Mobile Sidebar Default State

**Problem:** `showSidebar` is initialized to `true` regardless of screen size. On screens narrower than 768px this causes the sidebar to overlap the main content on first load. `windowWidth` is already tracked in state but not used to determine the initial sidebar visibility.

**Fix:**
- Initialize `showSidebar` as `() => window.innerWidth > 768`
- No other changes needed — the toggle and resize listener already work correctly

**Files:** `src/App.js`

---

## Implementation Order

| # | Item | Effort | Impact |
|---|---|---|---|
| 6 | Mobile sidebar default | Low | High |
| 3 | Network error feedback | Low | High |
| 5 | Stay signed in note | Low | Medium |
| 4 | Avatar picker | Medium | Medium |
| 2 | Remove dead dashboard button | Low | Medium |
| 1 | Persist sessions | High | High |
