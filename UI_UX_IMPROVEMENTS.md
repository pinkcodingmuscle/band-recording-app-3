# UI/UX Improvements — Implementation Plan

## Overview

This document records the UI/UX issues identified in the May 2026 review and the fixes applied. Changes are scoped to `src/App.js` and `src/App.css`.

---

## Issues & Fixes

### 1. `window.prompt()` replaced with inline modals ✅
**Problem:** "New Project" and "Join Session" triggered native browser dialogs (`window.prompt` / `alert`). These block the UI thread, cannot be styled, and behave inconsistently across browsers and OS.

**Fix:** Modal state (`sessionModal`, `sessionModalInput`, `sessionModalError`, `sessionModalLoading`) drives a styled overlay dialog. Enter key submits; clicking the backdrop cancels. Errors are shown inline instead of via `alert()`.

---

### 2. Duplicate session ID removed from nav ✅
**Problem:** The raw session token (`sess12345`) was displayed in two places simultaneously — in a `session-info` chip in `nav-left` *and* in the `user-profile` widget in `nav-right`. This is an implementation detail that has no value to end users and clutters the nav.

**Fix:** Both displays removed. The `session-info` div is gone entirely; the `user-session-id` span is removed from the user profile widget. The username alone is displayed.

---

### 3. Non-functional settings button removed ✅
**Problem:** The `⚙️` button in `nav-right` had no `onClick` handler. It appeared interactive but did nothing, creating user confusion.

**Fix:** Button removed. A settings panel can be added in a future iteration when the feature is implemented.

---

### 4. Duplicate notification badges consolidated ✅
**Problem:** `pendingApplicationCount` drove a badge on both the **Band** tab (`tab-notify-dot`) and the **notification bell** (`notification-badge`), alerting the user twice to the same event with no semantic difference.

**Fix:** The Band-tab badge is removed. The notification bell retains its badge and gains an `onClick` that navigates to the Band/community tab — making the bell actionable and giving it a clear purpose. The bell's `aria-label` also announces the count to screen readers.

---

### 5. Hamburger hidden when no sidebar exists ✅
**Problem:** The `☰` menu toggle was always visible, but on tabs with no sidebar (Dashboard, Calendar, Setlist, Chat) clicking it did nothing visible. Users reasonably assumed the button was broken.

**Fix:** The toggle is conditionally rendered only when `activeTabHasSidebar` is true (Studio, Projects, or Community-while-in-a-band).

---

### 6. `bannerDismissed` persisted to `localStorage` ✅
**Problem:** The "Join a band" banner was dismissed in memory only. On every page reload the banner reappeared, even if the user had previously dismissed it.

**Fix:** `bannerDismissed` is initialised from `localStorage` and synced back on every change. It is cleared from storage when the user's band status changes (e.g. they leave a band), so the banner correctly reappears in that scenario.

---

### 7. Branded loading screen ✅
**Problem:** The auth-loading state rendered a plain inline-styled `<div>Loading…</div>` with no branding, no spinner, and inline styles inconsistent with the design system.

**Fix:** Replaced with a `.app-loading` screen showing the logo, app name, and a CSS-animated spinner, all styled via design-system variables.

---

### 8. Accessibility — `aria-label` on icon-only buttons ✅
**Problem:** Several interactive controls had no accessible name when their visible text was hidden:
- `☰` hamburger — no `aria-label`
- `🚪` logout — `title` only (not read by all screen readers)
- `✕` banner dismiss — `title` only
- `🔔` notification bell — `title` only
- Theme toggle — `title` only
- Nav tabs at ≤1100px — `.tab-label` set to `display: none`, making tabs icon-only with no accessible name

**Fix:** `aria-label` added to all of the above. Nav tabs gain a plain-text `aria-label` matching the tab name so screen readers can identify the tab regardless of viewport width.

---

## Files Changed

| File | Nature of change |
|---|---|
| `src/App.js` | Modal state/handlers, nav cleanup, accessibility, localStorage persistence, loading screen |
| `src/App.css` | `.app-loading` styles, `.session-modal-overlay` / `.session-modal` styles |

---

## Not in scope (future work)

- Replacing emoji icons with an SVG icon library (Lucide / Heroicons)
- Bottom tab bar for mobile
- Demo/preview mode for locked Studio/Chat tabs
- Settings panel implementation
- Focus-ring / `:focus-visible` audit across all components
- Dashboard live data (gigs, notifications currently hardcoded)
