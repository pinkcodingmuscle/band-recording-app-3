# Login Experience Improvements

## Problem

Previously, any user who logged in without a confirmed band position was immediately blocked by a full-screen `BandSetup` gate — even if they had already submitted a pending application to join a band. They could not access any part of the app (Calendar, Dashboard, Setlist, etc.) until a Band Lead approved them.

This created a poor UX for two scenarios:
1. A user with a **pending application** was stuck on an "Application Submitted" waiting screen with nothing else to do.
2. A brand-new user was forced to create or join a band before they could explore any of the app's features.

---

## Solution: Lite Mode Access + Contextual Band Status Banner

The hard band gate was removed. Users now land directly in the full app shell after login, with a **sticky status banner** and **per-tab locking** for band-dependent features.

### Files Changed

| File | Change |
|------|--------|
| `src/App.js` | Removed band gate; added status banner; added locked-tab states for Studio and Chat; BandSetup rendered inline in Band tab |
| `src/components/BandSetup.js` | Added `inline` prop to support rendering inside the app shell tab |
| `src/App.css` | Added `.band-status-banner` and `.tab-locked` styles |
| `src/components/BandSetup.css` | Added `.band-setup-inline` styles |

---

## Behavior by User State

### User with no band and no pending application
- Lands on the **Dashboard** (fully accessible)
- A **purple sticky banner** appears below the nav bar:
  > 🎸 You're not in a band yet. Join or create one to unlock all features. **[Find a Band →]**
- **Calendar** and **Setlist** tabs are fully accessible
- **Band tab** shows the full Create / Browse band onboarding UI inline
- **Studio** and **Chat** tabs show a friendly locked state with a CTA button

### User with a pending application
- Same full app access as above
- The sticky banner shows application status instead:
  > ⏳ Your application to **Band Name** (🎸 Lead Guitar) is pending approval. **[🔄 Check Status]** **[Withdraw]**
- Banner dismiss (✕) button lets users hide it temporarily; it reappears if their band status changes

### User confirmed in a band
- No banner shown
- All tabs fully unlocked — behavior identical to before

---

## Tab Access Matrix

| Tab | No Band | Pending App | In a Band |
|-----|---------|-------------|-----------|
| Home (Dashboard) | ✅ Full | ✅ Full | ✅ Full |
| Calendar | ✅ Full | ✅ Full | ✅ Full |
| Setlist | ✅ Full | ✅ Full | ✅ Full |
| Studio | 🔒 Locked CTA | 🔒 Locked CTA | ✅ Full |
| Projects | ✅ Full | ✅ Full | ✅ Full |
| Band | 🎸 Onboarding UI | ⏳ Pending UI | ✅ Roster |
| Chat | 🔒 Locked CTA | 🔒 Locked CTA | ✅ Full |
