# Session Access & Onboarding — Design Specification

**Feature:** Flexible session participation, solo band support, and a post-login Home Hub  
**App:** BandLab Studio  
**Tech:** React 18 + Vite · localStorage (client-side only, no backend)  
**Depends on:** `BAND_MANAGEMENT.md`

---

## 1. Overview

This spec extends the band management system to support:

1. **Solo bands** — a band can have exactly 1 member (the creator).
2. **Home Hub** — post-login landing screen with three onboarding paths, replacing the hard band gate.
3. **Public session board** — any logged-in user can browse open sessions and request to join.
4. **Session invitations** — session hosts can invite any user by username, regardless of band membership.
5. **Session participant roles** — guests and invitees get scoped permissions inside the studio.

---

## 2. Post-Login Navigation (Updated)

```
Login
  │
  ├── Has a confirmed band position?          → Main app (band + studio)
  │
  ├── Has a pending session invitation?       → Notification banner + accept/decline prompt
  │
  ├── Has a pending band application?         → "Awaiting Approval" screen (existing)
  │
  └── None of the above?                      → Home Hub
```

The Home Hub replaces the existing hard gate that forces new users to join a band before seeing anything else.

---

## 3. Home Hub

The first screen shown to users who have no band membership, no pending application, and no active session invitation.

```
┌── Welcome, Alex! ──────────────────────────────────────────┐
│                                                            │
│  What would you like to do?                               │
│                                                            │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  🎵 Browse      │  │ 🎸 Create    │  │ 🔍 Join a    │  │
│  │  Sessions       │  │  a Band      │  │    Band      │  │
│  │                 │  │              │  │              │  │
│  │  See open       │  │  Solo or     │  │  Apply for   │  │
│  │  sessions and   │  │  build your  │  │  a position  │  │
│  │  request access │  │  own roster  │  │  in a band   │  │
│  └─────────────────┘  └──────────────┘  └──────────────┘  │
│                                                            │
│  Already in a band?  [ Go to Studio → ]                   │
└────────────────────────────────────────────────────────────┘
```

### Hub Paths

| Path | Leads to | Notes |
|---|---|---|
| Browse Sessions | `SessionBoard` | Shows public/open sessions; user can request to join |
| Create a Band | `BandCreate` | Solo quick-create added; existing multi-role form unchanged |
| Join a Band | `BandBrowse` | Existing flow from `BAND_MANAGEMENT.md` |
| Go to Studio | Main app | Only shown when user already has a confirmed band position |

---

## 4. Solo Band Support

A band with **one member** is fully valid. When a user creates a solo band:

- They define exactly one position (their own).
- No other positions are required.
- The studio is immediately accessible — no waiting for approvals.
- The band can optionally be left "open to collaborators" to accept future applications.

### Band Status Badge (Updated)

| State | Badge |
|---|---|
| 1/1 filled, no open positions | 🟢 Solo — Ready to record |
| 1 member + open positions | 🔵 Open to collaborators |
| Multi-role, all filled | 🟢 Full — Ready to record! |
| Multi-role, reviewing apps | 🟡 Reviewing N application(s) |
| Multi-role, open slots | 🔴 N position(s) available |

### BandCreate Change

A **"Just me (solo)"** quick-create chip appears at the top of the positions section:

```
Roster Positions:
  [⚡ Just me (solo)]  [🎤 Lead Vocals]  [🎸 Lead Guitar]  …
```

Selecting "Just me (solo)" collapses the instrument grid, and the only required step is picking the user's own single position.

---

## 5. Session Board

A new **Sessions** tab visible to all logged-in users (including those without a band membership).

### Session List View

```
┌── Open Sessions ────────────────────────────────────────────┐
│  Search: [______________]   Filter: [All Genres ▼]          │
│                                                             │
│  The Static Waves · Jam Session       Rock  · 3 attending  │
│  "Working on bridge for 'Midnight City'"                    │
│  Host: @AlexChen 👑  Open: Bass, Backing Vocals             │
│                              [🔔 Request to Join]           │
│  ─────────────────────────────────────────────────────────  │
│  Pixel Groove · Studio A               EDM  · 1 attending  │
│  "Laying down the bassline"                                 │
│  Host: @LisaPark  No open slots (guest pass only)          │
│                              [🔔 Request to Join]           │
└─────────────────────────────────────────────────────────────┘
```

### Session Access Types

| Type | Description | Position Required |
|---|---|---|
| **Open slot** | User applies for a specific unfilled position in the session | Yes |
| **Guest pass** | User requests a listen/comment-only seat | No |

Sessions are only shown on the board when the host has explicitly set `openToGuests: true`.

---

## 6. Session Invitation System

Session hosts can invite any registered user by username, from within the Studio tab's right panel.

### Host Invite Panel

```
┌── Invite to Session ──────────────────────────┐
│  Username: [ ___________________ ]  [Invite]  │
│  Role:     [ Guest ▼ ]                        │
│            Options: Guest · Co-host ·          │
│                     [position from roster]     │
│                                               │
│  Pending invites:                             │
│  📧 emmaW  → Bass              (pending)      │
│  📧 tom99  → Guest             (accepted)     │
└───────────────────────────────────────────────┘
```

Invited users see a **notification banner** when they next log in. They can accept or decline. An accepted invite immediately grants session access regardless of band membership.

### Invite Roles

| Role | Set By |
|---|---|
| `guest` | Default; listen-only |
| `co-host` | Trusted collaborator; same as member permissions |
| position (e.g. `bass`) | Fills a specific open roster slot |

---

## 7. Session Join Request Flow

```
User clicks "Request to Join" on the Session Board
        │
        ▼
  Join request stored (localStorage)
  Host notified: badge appears on Studio tab
        │
        ├── Host Accepts → User added to session as participant
        │                  User receives notification
        │                  Studio tab unlocks for that user
        │
        └── Host Rejects → User notified
                           User may try another session
```

---

## 8. Session Participant Roles & Permissions

| Permission | Band Member | Session Invitee (position) | Guest (no position) |
|---|---|---|---|
| Record tracks | ✅ | ✅ | ❌ |
| Chat | ✅ | ✅ | ✅ |
| Leave audio/text comments | ✅ | ✅ | ✅ |
| Edit setlist | ✅ | ❌ | ❌ |
| Invite others | ❌ (host only) | ❌ | ❌ |
| Approve join requests | ❌ (host only) | ❌ | ❌ |

---

## 9. Updated Data Models

### Session Object (extended)

```js
{
  id: "session_123",
  name: "Jam Session",
  bandId: "band_456",         // owning band (or null for unaffiliated host)
  hostId: "user_abc",
  openToGuests: true,         // whether session appears on public board
  description: "Working on bridge section",
  genre: "Rock",
  createdAt: 1700000000000,

  participants: [
    {
      userId:     "user_abc",
      role:       "host",         // "host" | "member" | "invitee" | "guest"
      positionId: "guitar_lead",  // null for guests
      status:     "active",       // "active" | "left"
    },
    {
      userId:     "user_xyz",
      role:       "member",
      positionId: "vocals_lead",
      status:     "active",
    },
    {
      userId:     "user_qqq",
      role:       "guest",
      positionId: null,
      status:     "active",
    },
  ],

  joinRequests: [
    {
      id:            "req_001",
      userId:        "user_new",
      userName:      "Tom Martinez",
      userAvatar:    "🎹",
      requestedRole: "guest",     // "guest" | positionId
      message:       "Huge fan of the band!",
      status:        "pending",   // "pending" | "accepted" | "rejected"
      requestedAt:   1700000001000,
    }
  ],

  invites: [
    {
      id:          "inv_001",
      toUserId:    "user_def",    // null = open invite by username not yet claimed
      toUserName:  "emmaW",
      role:        "invitee",
      positionId:  "bass",
      status:      "pending",     // "pending" | "accepted" | "declined"
      sentAt:      1700000002000,
    }
  ]
}
```

### User Object (extended)

```js
{
  id:          "user_abc",
  username:    "AlexChen",
  avatar:      "🎸",
  sessionId:   "sess12345",
  displayName: "AlexChen-sess12345",

  // derived at runtime — not stored directly
  // bandId:     found via BandContext (position.filledBy === user.id)
  // sessionParticipation: found via SessionContext
}
```

---

## 10. Component Architecture (Updated)

```
App
├── Login                               — auth gate
└── BandProvider
    └── SessionProvider                 — NEW: wraps everything inside auth
        └── AuthRouter                  — decides which screen to show
            │
            ├── [pending invite]         → InviteNotification         NEW
            ├── [pending band app]       → BandSetup (pending view)   existing
            ├── [no band, no invite]     → HomeHub                    NEW / replaces gate
            │   ├── SessionBoard         → browse sessions            NEW
            │   ├── BandCreate           → create band (solo allowed) updated
            │   └── BandBrowse           → join band                  existing
            └── [has band]               → AppShell                   existing
                ├── Top Nav (badges updated)
                ├── Sessions tab         — public board + host's sessions
                ├── Band tab
                │   ├── Sidebar: BandApplications (owner)
                │   └── Main:    BandRoster
                └── Studio tab
                    ├── Right panel: SessionInvite     NEW
                    └── Right panel: JoinRequests      NEW (host only)
```

---

## 11. Implementation Files

### New Files

| File | Purpose |
|---|---|
| `src/context/SessionContext.js` | All session state: sessions, join requests, invites, participant management |
| `src/components/HomeHub.js` | Post-login landing for users without a band |
| `src/components/HomeHub.css` | Home Hub styles |
| `src/components/SessionBoard.js` | Public session listing + request-to-join form |
| `src/components/SessionBoard.css` | Session board styles |
| `src/components/SessionInvite.js` | Host panel: invite by username, manage pending invites |
| `src/components/SessionInvite.css` | Invite panel styles |
| `src/components/JoinRequests.js` | Host-side approve/reject join requests panel |
| `src/components/JoinRequests.css` | Join requests panel styles |
| `src/components/InviteNotification.js` | Full-screen prompt shown to users with a pending invite |
| `src/components/InviteNotification.css` | Invite notification styles |

### Modified Files

| File | Change |
|---|---|
| `src/context/BandContext.js` | Remove min-member check; allow solo bands |
| `src/components/BandCreate.js` | Add "Just me (solo)" quick-create chip |
| `src/components/BandSetup.js` | Replace as thin wrapper; routing moved to `AuthRouter` |
| `src/App.js` | Wrap with `SessionProvider`; add `AuthRouter` logic |
| `src/components/Sessions.js` | Show join-request badge count for session hosts |
| `src/components/Recording.js` | Gate track recording on participant role |

---

## 12. Phase Plan

### Phase 1 — Solo + Home Hub (lower effort, high value)
- Allow solo band creation
- Implement `HomeHub` with three paths
- Update `AuthRouter` logic in `App.js`

### Phase 2 — Session Board + Join Requests
- `SessionContext` with join request operations
- `SessionBoard` browse + request-to-join flow
- `JoinRequests` host approval panel
- Join requests badge on Studio/Sessions tab

### Phase 3 — Invitation System
- `SessionInvite` host invite-by-username panel
- `InviteNotification` post-login prompt
- Participant role enforcement in `Recording.js`
