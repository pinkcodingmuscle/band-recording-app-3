> **Status:** ✅ Implemented — see [PROPOSALS_TRACKER.md](PROPOSALS_TRACKER.md)
> **Last updated:** Mar 4, 2026

# Band Management — Design Specification

**Feature:** Post-login band onboarding, membership, roles, and approval workflow  
**App:** BandLab Studio  
**Tech:** React 18 + Vite · localStorage (client-side only, no backend)

---

## 1. Overview

After a user logs in or signs up, they are routed through a **Band Setup** screen before they can access the main studio. Every user must belong to exactly one band. The user who creates the band becomes the **Band Lead (owner)** and has elevated privileges over the roster.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Band Lead / Owner** | Created the band (or had ownership transferred). Can approve/reject applications, remove members, transfer ownership, and disband. |
| **Member** | Holds a confirmed position in the band. Can view the full roster, use all studio features, and voluntarily leave the band. |
| **Applicant** | Has submitted an application to join a band. Waiting for Band Lead approval. Has limited access (band setup screen only). |

---

## 3. Band Onboarding Flow

```
Login / Signup
      │
      ▼
[currentUser has no filled position in any band?]
      │ yes
      ▼
  BandSetup ─────────────────────────────────────
  │                                              │
  ▼                                              ▼
Create a Band                            Join Existing Band
  │                                              │
  ▼                                              ▼
BandCreate (form)                        BandBrowse (list + apply)
  │                                              │
  ▼                                              ▼
Band created, user                       Application submitted
owns a position → enters app             → "Awaiting Approval" screen
                                                 │
                                    Band Lead approves (Band tab)
                                                 │
                                    Applicant refreshes → enters app
```

---

## 4. Band Data Model

All band data is persisted to `localStorage` under the key `"bands"` as a JSON array.

```js
{
  id: "band_1234567890",          // unique string
  name: "The Static Waves",       // display name
  genre: "Rock",                  // from GENRES list
  description: "...",             // optional string (max 200 chars)
  ownerId: "user_abc",            // currentUser.id of Band Lead
  createdAt: 1700000000000,       // Unix timestamp

  positions: [
    {
      id: "guitar_lead",          // instrument ID from INSTRUMENTS list
      title: "Lead Guitar",       // display title
      emoji: "🎸",
      filledBy: "user_abc",       // user ID or null if open
      filledByName: "Alex Chen",  // display name or null
      filledByAvatar: "🎸",       // emoji avatar or null
    },
    {
      id: "drums",
      title: "Drums",
      emoji: "🥁",
      filledBy: null,             // open slot
      filledByName: null,
      filledByAvatar: null,
    }
  ],

  applications: [
    {
      id: "app_1700000001000",    // unique string
      userId: "user_xyz",
      userName: "Emma Wilson",
      userAvatar: "🎵",
      positionId: "drums",        // references a position.id
      positionTitle: "Drums",
      positionEmoji: "🥁",
      message: "5 years of experience...",
      status: "pending",          // "pending" | "accepted" | "rejected"
      appliedAt: 1700000001000,
    }
  ]
}
```

---

## 5. Band Status Logic

The band's fill status is computed from its `positions` array:

| Condition | Status | Badge |
|---|---|---|
| All positions have `filledBy` set | **Full** | 🟢 Band is Full — Ready to record! |
| ≥1 open position AND pending applications exist | **Reviewing** | 🟡 Reviewing N application(s) |
| ≥1 open position, no pending apps | **Open** | 🔴 Open — N position(s) available |

**"Full" is position-based**, not headcount-based. Each defined roster slot must be claimed.

---

## 6. Available Positions (INSTRUMENTS constant)

| ID | Title | Emoji |
|---|---|---|
| `vocals_lead` | Lead Vocals | 🎤 |
| `vocals_back` | Backing Vocals | 🎤 |
| `guitar_lead` | Lead Guitar | 🎸 |
| `guitar_rhythm` | Rhythm Guitar | 🎸 |
| `bass` | Bass Guitar | 🎵 |
| `drums` | Drums | 🥁 |
| `keys` | Keys / Piano | 🎹 |
| `sax` | Saxophone | 🎷 |
| `trumpet` | Trumpet | 🎺 |
| `violin` | Violin | 🎻 |
| `producer` | Producer | 🎧 |
| `other` | Other (custom) | 🎼 |

---

## 7. Component Architecture

```
App
├── Login                          — auth gate
└── BandProvider (context)
    └── AppShell
        ├── [!userBand] → BandSetup    — band gate
        │   ├── BandCreate             — create band form
        │   └── BandBrowse             — browse & apply
        └── [userBand] → Main App
            ├── Top Nav (band notification badge)
            ├── Dashboard (band status card)
            ├── Band Tab
            │   ├── Sidebar: BandApplications   — owner only
            │   └── Main:    BandRoster          — all members
            └── ...other tabs
```

---

## 8. BandSetup Views

| View | Shows When | Actions |
|---|---|---|
| `choose` | No band, no application | "Create a Band" / "Join a Band" buttons |
| `create` | User clicked "Create" | BandCreate form |
| `browse` | User clicked "Join" | BandBrowse list + apply flow |
| `pending` | User has active pending application | Application status, "Check Status", "Withdraw" |

---

## 9. BandCreate Form

**Step 1 — Band Info:**
- Band name (required, max 40 chars)
- Genre (required, select from GENRES list)
- Description (optional, max 200 chars)

**Step 2 — Roster Positions:**
- Multi-select instrument chips (any from INSTRUMENTS)
- At least one position required
- If "Other" selected → text input for custom name

**Step 3 — Your Position:**
- Radio select from chosen positions
- This slot is immediately filled with the creator's info

---

## 10. BandBrowse & Application Flow

1. User sees a searchable/filterable list of all bands
2. Each band shows: name, genre, status badge (Open / Reviewing / Full)
3. "Full" bands have no "View" button
4. Clicking "View" on an open band reveals:
   - Full roster with filled/open slot indicators
   - Apply form: select an open position + write a message
5. On submit → application stored, BandSetup switches to "pending" view

---

## 11. Band Lead — Applications Panel (BandApplications)

Rendered in the Band tab sidebar, **visible only to the Band Lead**.

For each pending application:
- Applicant name + avatar
- Position applied for
- Application message
- Applied date
- **✅ Accept** button → fills the position, auto-rejects any other pending apps for the same slot
- **❌ Reject** button → marks application rejected, slot stays open

A "Recent decisions" section shows the last 5 resolved applications.

---

## 12. BandRoster (Main Band Tab)

Shows the full roster for the user's band:
- Band name, genre, status badge
- Each position: emoji, title, filled-by info or "Open position"
- Owner crown 👑 shown next to Band Lead's position

**Owner-only controls** (per filled member, excluding self):
- **Remove** → clears the position (member is reverted to no-band state on next login check)
- **Make Lead** → transfers band ownership to that member

**Footer actions:**
- Members: "Leave Band" button
- Owner: "Disband Band" button (with confirmation step)

---

## 13. Dashboard Integration

The Dashboard "Band Members" card shows real roster data (populated from `userBand.positions`). When `useBand()` is used in Dashboard, the card header displays:
- Band name
- Roster fill status badge (Full / N positions open)

---

## 14. Notification Badge

The "👥 Band" nav tab shows a numeric badge equal to `pendingApplicationCount` (number of pending applications on the user's band). This is only meaningful for Band Leads.

The 🔔 notification bell in the nav right also reflects this count.

---

## 15. Security & Validation Notes

- All data is client-side only (localStorage). No authentication is enforced server-side.
- The Band Lead check (`userBand.ownerId === currentUser.id`) is client-side only.
- A user can only hold one band membership at a time (computed from filled positions).
- Applying to a band where they already have a pending application is blocked (`alreadyApplied` check).
- Accepting an application for a position auto-rejects all other pending applications for that same position.
- Input lengths are capped (band name: 40, description: 200, application message: 300).

---

## 16. Implementation Files

| File | Purpose |
|---|---|
| `src/context/BandContext.js` | State, derived values, all band operations |
| `src/components/BandSetup.js` | Post-login onboarding entry point |
| `src/components/BandSetup.css` | Shared styles + setup screen styles |
| `src/components/BandCreate.js` | Create band form |
| `src/components/BandCreate.css` | Create-specific styles |
| `src/components/BandBrowse.js` | Browse bands + apply form |
| `src/components/BandBrowse.css` | Browse-specific styles |
| `src/components/BandRoster.js` | Roster view (main Band tab) |
| `src/components/BandRoster.css` | Roster styles |
| `src/components/BandApplications.js` | Owner applications panel |
| `src/components/BandApplications.css` | Applications styles |
| `src/App.js` | BandProvider + AppShell + band gate |
| `src/components/Dashboard.js` | Band status card integration |
