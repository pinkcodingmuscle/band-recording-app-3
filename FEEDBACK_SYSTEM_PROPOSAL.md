> **Status:** ✅ Implemented — see [PROPOSALS_TRACKER.md](PROPOSALS_TRACKER.md)
> **Last updated:** Jun 8, 2026

# In-App User Feedback System — Design Proposal

## Overview

A self-hosted, zero-external-dependency feedback system that lets authenticated users submit categorized feedback (bug reports, feature requests, general notes, praise, challenges) from anywhere inside BandLab Studio. A floating button in the bottom-right corner opens a modal form with category pills, a star rating, a description field, a priority selector, and an optional screenshot capture. Submissions are persisted to MongoDB. Users can review their own submission history in a slide-in panel. Admin-only API routes allow backend management of submissions.

**Out of scope for this proposal:** mobile-specific UI, conversation threading/replies, admin dashboard tab.

---

## Architecture

```
FeedbackButton (fixed, bottom-right)
  ├── opens → FeedbackModal (full-screen backdrop)
  │             POST /api/feedback
  └── opens → MyFeedbackPanel (fixed slide-in, right)
                GET  /api/feedback/mine
```

Backend route group: `/api/feedback` (Express router, all endpoints require `verifyJWT`)

---

## Data Model

### `Feedback` — new Mongoose model (`server/models/Feedback.js`)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Auto PK |
| `userId` | String (required) | Always set server-side from JWT — never trusted from client body |
| `category` | String (required) | Enum: `bug_report` · `feature_request` · `general` · `praise` · `challenge` |
| `rating` | Number (optional) | Integer 1–5 |
| `currentArea` | String (optional) | Active tab name when submitted (e.g. `"studio"`, `"dashboard"`) |
| `description` | String (optional) | Max 2 000 chars; truncated server-side |
| `priority` | String | Enum: `low` · `medium` · `high` · default `"medium"` |
| `screenshot` | String (optional) | Base64 JPEG data URL; silently dropped server-side if > 500 KB |
| `status` | String | Enum: `new` · `reviewed` · `planned` · `resolved` · `wont_fix` · default `"new"` |
| `adminNotes` | String (optional) | Internal admin notes |
| `createdAt` | Date | `timestamps: true` |
| `updatedAt` | Date | `timestamps: true` |

**Indexes:** `{ userId, createdAt }` (user history queries), `{ category, status }` (admin filtering)

### `User` model change (`server/models/User.js`)

Add one field:

| Field | Type | Notes |
|---|---|---|
| `isAdmin` | Boolean | `default: false` — gates access to admin-only feedback routes |

### JWT payload change (`server/routes/auth.js`)

Update `makeToken(userId)` to include `isAdmin`:

```js
jwt.sign({ userId, isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' })
```

Existing tokens that lack `isAdmin` safely evaluate to `undefined` (falsy), preserving backward compatibility.

**Admin promotion** (direct MongoDB command):
```
db.users.updateOne({ email: "admin@example.com" }, { $set: { isAdmin: true } })
```

---

## API Endpoints

All routes require the `verifyJWT` middleware. Admin routes additionally check `req.user.isAdmin === true` and return `403` otherwise.

### User-facing

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/feedback` | Any authenticated user | Submit feedback. `userId` always from `req.user.userId`. |
| `GET` | `/api/feedback/mine` | Any authenticated user | Paginated list of current user's own submissions. Query params: `?page=1&limit=20&status=<value>` |

### Admin-only

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/feedback` | Admin | All submissions, paginated. Filter: `?status=&category=` |
| `PATCH` | `/api/feedback/:id/status` | Admin | Update `status` and/or `adminNotes` |
| `DELETE` | `/api/feedback/:id` | Admin | Delete a submission |

### Validation rules (`POST /api/feedback`)

| Field | Rule | Response on failure |
|---|---|---|
| `category` | Required; must be one of 5 valid enum values | `400 { error: "category is required" }` |
| `rating` | If present, must be integer 1–5 | `400 { error: "rating must be 1–5" }` |
| `priority` | Defaults to `"medium"` if absent or invalid | No error — silent default |
| `description` | Silently truncated to 2 000 chars server-side | — |
| `screenshot` | Base64 byte length checked server-side; silently set to `null` if > 500 KB | — |
| `userId` | Always set from `req.user.userId`; any client-supplied value is ignored | — |

---

## Frontend API (`src/lib/api.js`)

Two new functions added to the existing `api.js` module, following the established `fetch` + `Authorization: Bearer <jwt>` pattern:

```js
// Submit a new feedback item
export async function apiFeedbackSubmit(payload) { ... }  // POST /api/feedback

// Fetch current user's own submissions
export async function apiFeedbackMine({ page = 1, status } = {}) { ... }  // GET /api/feedback/mine
```

---

## Frontend Components

### `FeedbackButton` (`src/components/FeedbackButton.js` + `FeedbackButton.css`)

- `position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9000`
- Circular button, 48 × 48 px, background `var(--accent)`, icon 💬
- Props: `activeTab` (string), `currentUser` (object)
- Primary click → opens `FeedbackModal`
- "My submissions" link → opens `MyFeedbackPanel`
- Wired into `AppShell` in `src/App.js`, rendered just before the closing `</div>` of `.App`

### `FeedbackModal` (`src/components/FeedbackModal.js` + `FeedbackModal.css`)

Full-screen backdrop dialog, matching the existing `.session-modal-overlay` / `.session-modal` pattern.

| Field | Control | Notes |
|---|---|---|
| Category | 5 pill buttons (🐛 Bug · ✨ Feature · 💬 General · 🎉 Praise · 🔥 Challenge) | Required — submit button disabled until one is selected |
| Star rating | 1–5 clickable stars | Optional |
| Current area | Read-only text label | Auto-filled from `activeTab` prop |
| Description | `<textarea>` with live character counter | Optional; max 2 000 chars |
| Priority | 3 pill buttons (Low · Medium · High) | Required; defaults to Medium |
| Screenshot | "Capture Screenshot" button | Optional; requires `html2canvas` (see below) |

**Submit flow:**
1. Calls `apiFeedbackSubmit()` with `isApiConfigured` guard (same pattern as session/join modal)
2. **Success:** fires `useToast('Feedback submitted! 🎉', 'success')`, shows "View your submissions →" link, auto-closes after 1.8 s
3. **Error:** shows inline error message, modal stays open

**Screenshot capture:**
- Requires `npm install html2canvas --save`
- Dynamically imported (`import('html2canvas')`) — not in the initial bundle
- Renders `document.body` at `Math.min(devicePixelRatio, 2)` scale, JPEG 70% quality
- Excludes `[role="dialog"]` and `[aria-label="Share feedback"]` from capture
- Capture button renders only when `html2canvas` is available; the rest of the form is unaffected if it is not installed

### `MyFeedbackPanel` (`src/components/MyFeedbackPanel.js` + `MyFeedbackPanel.css`)

Fixed slide-in overlay from the right (380 px wide on desktop; full-width ≤ 480 px).

- Calls `apiFeedbackMine()` on open; shows a loading skeleton while fetching
- Lists submissions newest-first; each row displays:
  - Category icon + label
  - Status badge (colored pill): `new` → blue · `reviewed` → yellow · `planned` → purple · `resolved` → green · `wont_fix` → muted
  - Priority chip (low / medium / high)
  - Description preview (80 chars, clipped with ellipsis)
  - Relative timestamp (e.g. "2 days ago")
- Empty state: "No feedback submitted yet."
- Dismiss: ✕ button in header, or click on backdrop

### `ToastProvider` wire-up (`src/App.js`)

`ToastProvider` is already implemented in `src/context/ToastContext.js` but is not yet wired into the component tree. Wrap the `App` component's return with `<ToastProvider>` so that `useToast()` is accessible throughout the app (required by `FeedbackModal`).

---

## Status Lifecycle

```
[submit]  →  new
              ↓
           reviewed  →  planned  →  resolved
              ↓                  ↘
           wont_fix            wont_fix
```

Admin changes status via `PATCH /api/feedback/:id/status`.

---

## Files to Change

| File | Change |
|---|---|
| `server/models/User.js` | Add `isAdmin: { type: Boolean, default: false }` |
| `server/routes/auth.js` | Include `isAdmin` in `makeToken()`; update all `makeToken()` call sites within the file |
| `server/models/Feedback.js` | **NEW** — Mongoose model (fields, enums, indexes as above) |
| `server/routes/feedback.js` | **NEW** — Express router with 5 endpoints |
| `server/index.js` | Import feedback router; register `app.use('/api/feedback', feedbackRoutes)` |
| `src/lib/api.js` | Add `apiFeedbackSubmit()` and `apiFeedbackMine()` |
| `src/App.js` | Wrap `<ToastProvider>` around `App` return; import and render `<FeedbackButton>` in `AppShell` |
| `src/components/FeedbackButton.js` | **NEW** |
| `src/components/FeedbackButton.css` | **NEW** |
| `src/components/FeedbackModal.js` | **NEW** |
| `src/components/FeedbackModal.css` | **NEW** |
| `src/components/MyFeedbackPanel.js` | **NEW** |
| `src/components/MyFeedbackPanel.css` | **NEW** |

**`html2canvas` dependency** (screenshot feature only):
```
npm install html2canvas --save
```
The capture button is hidden gracefully if the package is not installed; no other functionality is affected.

---

## Security Notes

- `userId` is always set server-side from the verified JWT payload — any `userId` in the request body is ignored
- Admin endpoints verify `req.user.isAdmin === true` and return `403` for any other user
- `screenshot` base64 size is validated server-side (not only client-side) to prevent payload abuse
- `description` length is enforced server-side regardless of the client's submitted value
- All content is rendered via React's standard text binding — no `dangerouslySetInnerHTML`
- `html2canvas` runs entirely in the user's browser; screenshot data is only sent to the app's own `/api/feedback` endpoint with the user's own JWT

---

## Acceptance Criteria

- [ ] `POST /api/feedback` with valid JWT and category → `201` + document in MongoDB
- [ ] `POST /api/feedback` without category → `400 { error: "category is required" }`
- [ ] `POST /api/feedback` with screenshot > 500 KB → `201` but `screenshot` field is `null` in the saved document
- [ ] `GET /api/feedback/mine` → returns only the authenticated user's own submissions, newest first
- [ ] `PATCH /api/feedback/:id/status` as a non-admin user → `403`
- [ ] `FeedbackButton` is visible at bottom-right on all 7 tabs (dashboard, calendar, setlist, studio, projects, band, chat)
- [ ] Submitting feedback shows the success toast and "View your submissions →" link
- [ ] `MyFeedbackPanel` lists submissions with correct status badge colors
- [ ] `MyFeedbackPanel` shows "No feedback submitted yet." when the list is empty
- [ ] Closing `FeedbackModal` with ✕ or clicking the backdrop dismisses it without submitting
