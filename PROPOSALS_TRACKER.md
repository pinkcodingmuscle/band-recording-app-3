# Proposals & Feature Tracker

Central index of every design document, specification, and feature proposal.
**This is the single source of truth for what has been shipped vs. what is still planned.**

Update the status column and the relevant proposal file header whenever work starts, pauses, or finishes.

---

## Status Key

| Symbol | Status | Meaning |
|---|---|---|
| ✅ | **Implemented** | Fully shipped and in the codebase |
| 🔄 | **In Progress** | Partially implemented — work has started but is not complete |
| 📋 | **Planned** | Accepted for future work but not yet started |
| ❌ | **Rejected / Shelved** | Considered but decided against; kept for reference |

---

## Master Index

| Proposal | File | Status | Last Updated |
|---|---|---|---|
| App Design Specification | [DESIGN_SPEC.md](DESIGN_SPEC.md) | ✅ Implemented | Mar 4, 2026 |
| Band Management & Membership | [BAND_MANAGEMENT.md](BAND_MANAGEMENT.md) | ✅ Implemented | Mar 4, 2026 |
| Backend Migration — Supabase | [BACKEND_MIGRATION_PROPOSAL.md](BACKEND_MIGRATION_PROPOSAL.md) | 🔄 In Progress | Mar 4, 2026 |
| Setlist Playback & Recording Attachment | [SETLIST_PLAYBACK_PROPOSAL.md](SETLIST_PLAYBACK_PROPOSAL.md) | 📋 Planned | Mar 4, 2026 |

---

## ✅ Implemented

### App Design Specification
**File:** [DESIGN_SPEC.md](DESIGN_SPEC.md)

Core visual and architectural spec for BandLab Studio. Covers the tech stack (React 18 + Vite), tab layout, color/theming system, and component hierarchy.

| Feature Area | Status |
|---|---|
| Tab layout (Studio, Projects, Band, Chat) | ✅ |
| Dark / light theme with CSS custom properties | ✅ |
| Login gate | ✅ |
| Sessions sidebar | ✅ |
| Users sidebar | ✅ |

---

### Band Management & Membership
**File:** [BAND_MANAGEMENT.md](BAND_MANAGEMENT.md)

Post-login band onboarding, role system (Band Lead / Member / Applicant), application approval workflow, and roster management.

| Feature | Status |
|---|---|
| BandSetup gate after login | ✅ |
| BandCreate — create a band with positions | ✅ |
| BandBrowse — browse open bands and apply | ✅ |
| BandApplications — Band Lead approves/rejects | ✅ |
| BandRoster — view filled & open positions | ✅ |
| Band context (`BandContext.js`) | ✅ |
| Awaiting approval screen for applicants | ✅ |

---

## 🔄 In Progress

### Backend Migration — Supabase
**File:** [BACKEND_MIGRATION_PROPOSAL.md](BACKEND_MIGRATION_PROPOSAL.md)

Replace all localStorage / IndexedDB / in-memory state with a real Supabase backend (Postgres DB + Auth + Storage + Realtime).

| Migration Step | Status | Notes |
|---|---|---|
| Supabase client (`src/lib/supabase.js`) | ✅ | Created; gracefully returns `null` when env vars are absent |
| `@supabase/supabase-js` installed | ✅ | Added to `package.json` |
| `.env` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 📋 | Needs real project credentials |
| Step 1 — Auth (replace `localStorage.currentUser`) | 📋 | `Login.js`, `App.js` |
| Step 2 — Sessions & Users (replace in-memory seed) | 📋 | `Sessions.js`, `Users.js`, `App.js` |
| Step 3 — Track metadata (replace `bandlab-tracks-v1`) | 📋 | `Recording.js` |
| Step 4 — Audio storage (replace IndexedDB) | 📋 | `audioDB.js` |
| Step 5 — Comments (replace in-memory context) | 📋 | `CommentsContext.js` |
| Step 6 — Chat (replace in-memory messages) | 📋 | `Chat.js` |
| Step 7 — Setlist (replace in-memory songs) | 📋 | `Setlist.js` |
| Row-Level Security (RLS) policies | 📋 | All tables |

---

## 📋 Planned

### Setlist Playback & Recording Attachment
**File:** [SETLIST_PLAYBACK_PROPOSAL.md](SETLIST_PLAYBACK_PROPOSAL.md)

Attach a reference recording to each song in the setlist. Sources: band track (from DAW), uploaded file, or YouTube link. Plays inline without leaving the setlist view.

| Feature | Status | Notes |
|---|---|---|
| `recording` field on song data model | 📋 | Extends current song object in `Setlist.js` |
| Play button on every setlist row | 📋 | |
| Inline mini-player — band/file audio | 📋 | Uses hidden `<audio>` + custom controls |
| Inline mini-player — YouTube embed | 📋 | `youtube-nocookie.com` iframe |
| Attach panel — 🎙 Band tab (track picker) | 📋 | Reads `bandlab-tracks-v1` from localStorage |
| Attach panel — 📁 Upload tab (file → IndexedDB) | 📋 | Uses existing `saveAudioBlob` helper |
| Attach panel — ▶ YouTube tab (URL → videoId) | 📋 | |
| Detach / replace recording | 📋 | |
| Persist songs to `bandlab-setlist-v2` in localStorage | 📋 | Replaces current in-memory-only state |

---

## ❌ Rejected / Shelved

*Nothing shelved yet.*

---

## How to Use This File

1. **Starting work on a proposal?** Change its status in the Master Index table and add the date. Mark relevant rows in the detail table as 🔄.
2. **Finished a feature within a proposal?** Check off its row (✅) in the detail table. If all rows are done, promote the whole proposal to ✅ Implemented.
3. **Adding a new proposal?** Create the proposal `.md` file, add a row to the Master Index, and copy the status-header template below into the top of the new file.
4. **Abandoning a proposal?** Move it to the ❌ section with a one-line note explaining why.

### Status Header Template (paste at top of any new proposal file)

```markdown
> **Status:** 📋 Planned — see [PROPOSALS_TRACKER.md](../PROPOSALS_TRACKER.md)
> **Last updated:** <date>
```
