# Proposal: Time-Aligned Track Comments (Text + Audio)

## Summary
This proposal adds comments that are anchored to exact timestamps on recording tracks. Users can create either:
- Text notes, or
- Short audio/vocal comments.

Each track displays comment markers on its timeline/waveform. Selecting a marker opens the full note or audio playback UI. Comment playback can be controlled with:
- A global on/off toggle, and
- Per-track enable/disable toggles.

## Goals
- Enable contextual feedback during playback/editing.
- Support both typed and spoken comments.
- Keep comments lightweight and easy to scan.
- Integrate with the existing `Recording` experience and transport controls.

## Scope
### In Scope
- Timestamped comment creation for each track.
- Marker rail over timeline/waveform.
- Marker interactions (hover, click, keyboard focus/open).
- Text and audio comment rendering.
- Global and per-track comment playback toggles.
- Optional autoplay and main-track ducking settings.

### Out of Scope (Initial MVP)
- Advanced moderation workflows.
- Cross-session comment analytics.
- Long-form audio editing beyond simple trim/limit.

## User Experience
- A comment rail appears above each track waveform.
- Markers are positioned by timestamp and icon-coded by type:
  - Text marker
  - Audio marker
- Hover behavior:
  - Text: show short excerpt
  - Audio: show play indicator and duration
- Click/Enter/Space opens an anchored popover with:
  - Full text or inline audio player
  - Author + created time + comment time
- Global toggle (`Show Comments` / `Hide Comments`):
  - Hides markers when off
  - Disables comment playback when off
- Per-track toggle:
  - Mutes/hides comments for selected track only

## Functional Requirements
### Comment Types
- `text`: short textual note.
- `audio`: short recorded clip (recommended max 60 seconds).

### Marker Behavior
- Render marker at exact `timeMs` position on the current timeline scale.
- Handle dense markers via clustering/stacking in high-density regions.
- Support keyboard navigation and screen-reader labels.

### Playback Behavior
- If comment playback is enabled:
  - Manual mode (default): user triggers playback in popover.
  - Optional autoplay mode: trigger when playhead crosses marker.
- Optional ducking: lower main track volume while audio comment plays.
- Use existing audio context/engine to avoid sync drift and duplicate contexts.

## Data Model
```json
{
  "id": "cmt-uuid",
  "trackId": "track-uuid",
  "timeMs": 123450,
  "type": "text|audio",
  "text": "Fix the vocal take here",
  "audioUrl": "https://.../blob.webm",
  "audioBlobId": "blob-uuid",
  "durationMs": 8400,
  "authorId": "user-uuid",
  "createdAt": "2026-03-03T17:00:00.000Z"
}
```

### Settings Model
```json
{
  "commentsEnabledGlobal": true,
  "autoplayComments": false,
  "duckMainAudio": false,
  "trackCommentSettings": {
    "track-uuid-1": { "commentsEnabled": true },
    "track-uuid-2": { "commentsEnabled": false }
  }
}
```

## Storage & Persistence
### Recommended Approach
- Store comment metadata with session data.
- Store audio blobs as separate assets (object storage/local file store).
- Reference audio via `audioUrl` or `audioBlobId`.

### Local-Only Alternative
- Persist comments in local session JSON.
- Avoid base64 embedding for larger/long-lived audio clips.

## Component Architecture
- `CommentRail` — renders markers for a track.
- `CommentMarker` — individual marker with type, state, and interactions.
- `CommentPopover` — details panel (text or audio).
- `AudioCommentRecorder` — record/stop/review/save short clip.

### Integration Points
- Extend `Recording.js` with per-track `CommentRail`.
- Reuse `Recording.css`; optionally add `RecordingComments.css` for comment-specific styles.
- Keep comment state in a shared store/context so timeline, transport, and popovers stay synchronized.

## API Surface (Suggested)
- `createComment(input)`
- `updateComment(id, patch)`
- `deleteComment(id)`
- `listComments(trackId | sessionId)`
- `setGlobalCommentsEnabled(boolean)`
- `setTrackCommentsEnabled(trackId, boolean)`
- `setAutoplayComments(boolean)`
- `setDuckMainAudio(boolean)`

## Performance
- Lazy-load audio only when popover opens or playhead nears marker.
- Cluster markers when many are in a narrow time window.
- Memoize time-to-pixel calculations during playback/scrolling.

## Security & Privacy
- Enforce authorization for creating/viewing comments in protected sessions.
- Use HTTPS and signed URLs for remote audio comment access.
- Apply retention rules for audio comment assets where required.

## Accessibility
- All markers focusable by keyboard.
- `Enter`/`Space` opens marker popover.
- ARIA labels include type, timestamp, and author.
- Provide optional transcript/summary field for audio comments.

## Implementation Plan (Milestones)
### Milestone 1: Core Text Comments (MVP)
1. Define schema and local persistence.
2. Render `CommentRail` + text markers.
3. Add popover and metadata display.
4. Add global/per-track show/playback toggles.

### Milestone 2: Audio Comments
1. Add `AudioCommentRecorder` with duration cap.
2. Save/upload audio and connect metadata.
3. Add inline audio playback in popover.

### Milestone 3: Playback Enhancements & Scale
1. Add autoplay and ducking toggles.
2. Integrate with shared audio context.
3. Add marker clustering and lazy audio loading.
4. Add a11y and interaction test coverage.

## Acceptance Criteria
- Users can create timestamped text and audio comments per track.
- Track timelines display accurate markers at comment times.
- Clicking/focusing a marker opens playable/readable comment details.
- Global and per-track toggles correctly control marker visibility and comment playback.
- Keyboard-only users can discover and open markers.

## Open Decisions
- Default behavior: autoplay vs manual playback (recommend manual default).
- Audio permissions by role (all users vs specific collaborator roles).
- Final max audio length and retention policy.
