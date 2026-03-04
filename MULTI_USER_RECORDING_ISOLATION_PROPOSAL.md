# Multi-User Simultaneous Recording with Audio Isolation

## Objective
Enable multiple users to record at the same time while enforcing strict audio isolation:
- Each recording user hears only:
  - their own live microphone, and
  - existing tracks they explicitly select for playback.
- Recording users must not hear live microphones from other users.
- Other users must not hear that user’s live microphone during the recording session.

## Non-Negotiable Isolation Requirements
1. **No cross-user live mic monitoring while recording**
   - If User A is recording, User A cannot hear User B’s live mic.
   - If User A is recording, User B cannot hear User A’s live mic.
2. **Explicit playback selection only**
   - A user hears only pre-existing tracks they actively select.
   - No implicit auto-monitoring of newly armed or live inputs.
3. **Layered enforcement**
   - Enforce isolation in UI state, client audio routing, and server media policy.

## Proposed Architecture

### 1) Collaboration Layer (Signaling + Presence)
Use a signaling service (WebSocket) for:
- session join/leave,
- transport sync events (play/stop/seek),
- track arming states,
- recording status and progress,
- take commit notifications.

No live microphone audio is required in this layer.

### 2) Client Audio Engine (Web Audio API)
Each client builds a **local-only monitor graph**:
- Inputs:
  - local microphone stream,
  - selected existing track stems (downloaded or buffered).
- Outputs:
  - local device output (headphones/speakers) only.

Rules:
- Remote users’ live mic streams are never connected to local destination during record mode.
- Local mic is never routed to any remote peer in record mode.
- Playback tracks are independent gain nodes with per-track enable/level.

### 3) Recording Path
- Capture local mic to a dry stem using MediaRecorder/WebAudio capture.
- Timestamp with server-authoritative session time and local latency offset.
- Upload in chunks (or on stop) to object storage.
- Persist metadata: userId, trackId, takeId, startTime, sampleRate, duration, latency correction.

### 4) Persistence and Versioning
Store each take as immutable stem media + metadata:
- `sessionId`, `trackId`, `takeId`, `recordedBy`, `createdAt`
- `startOffsetMs`, `durationMs`, `sampleRate`, `channels`
- `storageUri`, `checksum`, `status` (recording, uploaded, committed)

New takes become available to others only after upload/commit (not live).

## Audio Routing Policy Matrix

| State | Local User Hears | Other Users Hear |
|---|---|---|
| Idle (not recording) | selected playback tracks (optional local mic monitor if enabled) | nothing from local mic unless explicitly allowed by product mode |
| Recording | local mic + explicitly selected existing tracks | never local mic |
| Playing back mix | selected stems/takes | each user hears their own selected playback set |

## Server-Side Guardrails
1. **Publish block during record mode**
   - Reject any attempt to publish a live microphone track when user state is recording.
2. **Subscription filter**
   - Strip/deny subscriptions to live user microphone channels in sessions that require isolation.
3. **Track write lock policy**
   - Prevent conflicting overwrite operations on the same target track segment.
   - Allow parallel recording on separate tracks.
4. **Audit logging**
   - Log routing policy checks and denied publish/subscribe actions.

## Client Guardrails
1. On `record_start`:
   - auto-mute all remote live mic buses,
   - build local monitor graph from only (local mic + selected stems).
2. During record:
   - prevent UI actions that could enable remote live mic monitoring,
   - show active isolation status badge.
3. On `record_stop`:
   - tear down local mic monitor path safely,
   - keep playback selection unchanged.

## Suggested API Contracts

### WebSocket Events
- `session:join`, `session:leave`
- `transport:update` (`play`, `stop`, `seek`, `positionMs`)
- `recording:start` (`userId`, `trackId`, `positionMs`)
- `recording:progress` (`takeId`, `elapsedMs`)
- `recording:stop` (`takeId`, `durationMs`)
- `take:committed` (`takeId`, `trackId`, `storageUri`, `startOffsetMs`)

### HTTP Endpoints
- `POST /sessions/:id/takes/init`
- `PUT /sessions/:id/takes/:takeId/chunk`
- `POST /sessions/:id/takes/:takeId/commit`
- `GET /sessions/:id/tracks/:trackId/takes`
- `GET /sessions/:id/mix/manifest`

## Rollout Plan

### Phase 1: Local Isolation MVP
- Implement local monitor graph with strict input selection.
- Record/upload single-user stem with metadata.
- Add UI controls for selectable playback stems.

### Phase 2: Concurrent Recording
- Add signaling for presence and parallel record state.
- Enable multi-user simultaneous recording on separate tracks.
- Ensure no live mic forwarding between users.

### Phase 3: Take Management
- Add commit/review flow.
- Show newly committed takes in timeline for all users.
- Add conflict handling for overlapping target regions.

### Phase 4: Hardening
- Add automated routing-policy tests.
- Add drift/latency verification tests.
- Add observability dashboards for policy enforcement failures.

## Test Plan (Isolation-Critical)
1. **No cross-mic leak test**
   - Two users record simultaneously; verify neither hears the other’s mic.
2. **No outbound live mic test**
   - Third user in session; verify cannot hear recording user mic.
3. **Explicit playback-only test**
   - User hears only selected stems while recording.
4. **Policy bypass test**
   - Attempt forced live publish/subscribe; server rejects and logs event.
5. **Sync alignment test**
   - Recorded takes align to shared timeline within acceptable tolerance.

## Risks and Mitigations
- **Latency drift across clients** → Use server time sync + per-take offset correction.
- **Accidental monitor leakage via UI bug** → Redundant server enforcement + client runtime assertions.
- **Upload interruptions** → Chunked uploads + resumable take commit flow.
- **Device variability** → Capture hardware sample rate metadata and normalize on ingest.

## Acceptance Criteria
- Multiple users can record simultaneously.
- While recording, each user hears only own mic + explicitly selected existing tracks.
- While recording, users do not hear other users’ live mics.
- While recording, other users do not hear recording user’s live mic.
- All recordings are saved as aligned takes with traceable metadata.
