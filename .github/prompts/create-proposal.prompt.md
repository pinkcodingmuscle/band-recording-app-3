---
description: "Use when: creating a proposal, writing a design spec, planning a new feature, or drafting a technical design document. Generates a structured markdown design/proposal file."
name: "Create Design Proposal"
argument-hint: "Describe the feature or change you want to propose (e.g. 'add real-time collaboration to the recording page')"
agent: "agent"
---

You are a technical writer and software architect. The user wants to create a design proposal document for this project.

Based on the user's request, generate a thorough design proposal and **save it as a new `.md` file** in the root of the workspace.

## File Naming

Name the file after the proposal topic in SCREAMING_SNAKE_CASE, suffixed with `_PROPOSAL.md`.  
Examples: `REALTIME_COLLAB_PROPOSAL.md`, `AUTH_REDESIGN_PROPOSAL.md`, `SETLIST_PLAYBACK_PROPOSAL.md`

## Required Sections

The generated markdown file must include all of the following sections:

```
# [Feature / Change Title] — Design Proposal

## Overview
One paragraph summarizing what this proposal is about and why it matters.

## Problem Statement
What problem does this solve? Who is affected? Include any pain points or limitations of the current approach.

## Goals
Bullet list of specific, measurable goals this proposal aims to achieve.

## Non-Goals
Bullet list of things explicitly out of scope for this proposal.

## Proposed Solution
Describe the solution in detail. Include:
- High-level architecture or approach
- Key components or modules affected
- Data flow or state changes (if applicable)

## Technical Design
Provide specifics:
- Component changes (new files, modified files)
- API or data model changes (if any)
- UI/UX changes (if any)
- Libraries or tools to be introduced

## Alternatives Considered
List at least one alternative approach considered and why it was not chosen.

## Implementation Plan
Break the work into phases or steps with brief descriptions of each.

## Open Questions
List any unresolved questions or decisions that need input before implementation begins.

## References
Link to related files, prior proposals, or external docs.
```

## Instructions

1. Tailor every section to the user's specific request — do not leave placeholder text.
2. Reference actual files in this codebase where relevant (e.g. `src/components/Recording.js`).
3. Keep the tone professional and concise.
4. After creating the file, confirm its path to the user.
