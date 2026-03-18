# Design: Session Persistence & Interview Wrap-up

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Internal interview tool — MVP → handoff-ready product

---

## Context

CodeReview is an internal 1-1 interview tool. An engineer from the hiring team runs a code review exercise with a candidate over a call. Currently all session state lives in localStorage and is lost when the tab closes. There is no end-of-interview moment and no persisted record.

This spec covers the changes needed to make the tool handoff-ready: session persistence, candidate naming, a live timer, an explicit end-of-interview flow, and a read-only summary view.

---

## Goals

- Session data (notes, bug checklist, metadata) saved to Supabase for 30 days
- Interviewer can name the candidate before generating session URLs
- Live timer visible to the interviewer throughout the session
- Explicit "End Interview" action that closes the session and transitions to a summary view
- Summary view shows score, checked bugs, notes, and duration — accessible via the interviewer URL for 30 days
- "Copy summary" exports a clean markdown block for sharing with the hiring team
- Candidate sees a "Session ended" message when the interviewer ends the session
- No authentication required — URL-based access model unchanged

## Non-goals

- Session history dashboard or list view
- Candidate-facing score or results
- Real-time sync of code edits between interviewer and candidate
- Challenge authoring UI

---

## Data Model

### Supabase table: `sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | `text` (PK) | nanoid session ID, set at creation |
| `candidate_name` | `text` | entered on session creation screen |
| `challenge_id` | `text` | e.g. `video-feed` |
| `framework` | `text` | `vue` / `react` / `vanilla` |
| `notes` | `text` | interviewer markdown notes |
| `bugs_checked` | `text[]` | array of checked bug IDs |
| `total_bugs` | `integer` | bug count for the selected challenge + framework |
| `started_at` | `timestamptz` | set on session creation |
| `ended_at` | `timestamptz` | null while in progress; set on end |
| `expires_at` | `timestamptz` | `started_at + 30 days`; used for cleanup |

### Access control

Supabase Row Level Security with a single policy: operations on a row are allowed when the request provides the matching `id`. The Supabase anon key is used from the frontend — acceptable for an internal tool where session IDs are the only access gate.

### Auto-save behaviour

Notes and bug checklist changes are written to Supabase with a 1-second debounce. `challenge_id`, `framework`, and `total_bugs` are updated immediately when the interviewer switches challenge or framework during the session.

---

## Architecture

### New: `src/composables/useSessionPersistence.ts`

Handles all Supabase read/write for session data:
- `createSessionRow(id, candidateName)` — inserts the row on session creation
- `saveNotes(notes)` — debounced 1s
- `saveBugsChecked(bugIds)` — debounced 1s
- `saveChallengeMeta(challengeId, framework, totalBugs)` — immediate
- `endSession()` — sets `ended_at = now()`
- `loadSession(id)` — fetches the row; used by summary view and to detect ended sessions on page load

### New: `src/composables/useTimer.ts`

Module-level reactive timer. Starts when a session row is created. Exposes `elapsed` (seconds) and a formatted `display` string (MM:SS). Stops when `endSession()` is called.

### New: `src/views/SessionSummaryView.vue`

Read-only view rendered when `session.ended_at` is non-null. Receives session data as props from `InterviewerView`. Displays:
- Candidate name, challenge, framework, date, duration
- Bug score with progress bar
- Checked/unchecked bug list with descriptions and severity
- Rendered markdown notes
- "Copy summary" button

### Modified: `src/views/CreateSessionView.vue`

Add a required candidate name input field. Session URLs are not generated until the name is provided. On "Create Session", call `createSessionRow` before showing the URLs.

### Modified: `src/views/InterviewerView.vue`

- On mount: call `loadSession`. If `ended_at` is set, render `SessionSummaryView` immediately (handles page reload after session ended).
- While active: render existing interview UI.
- Pass session data to `SessionSummaryView` when transitioning.

### Modified: `src/views/CandidateView.vue`

Poll `session.ended_at` every 10 seconds (or use Supabase Realtime). When ended, replace the editor with a simple "This session has ended. Thank you." screen.

### Modified: `src/components/AppHeader.vue`

Interviewer-only additions:
- Live timer display (MM:SS) in the header
- "End Interview" button (right side, red accent)
- Confirmation modal before ending: *"This will close the session. Continue?"*

### New: `src/lib/supabase.ts`

Supabase JS client singleton, initialised with `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `src/config.ts`.

### Modified: `src/config.ts`

Add `SUPABASE_ANON_KEY` export alongside the existing `SUPABASE_URL`.

---

## Component & Data Flow

```
CreateSessionView
  → user enters candidate name
  → createSessionRow(id, name)         [Supabase INSERT]
  → show interviewer + candidate URLs

InterviewerView (active session)
  → useTimer                           [starts on mount]
  → AppHeader: timer + End Interview button
  → NotesPanel changes → saveNotes()   [debounced Supabase UPDATE]
  → BugChecklist changes → saveBugsChecked() [debounced Supabase UPDATE]
  → challenge/framework change → saveChallengeMeta() [immediate UPDATE]
  → "End Interview" confirmed → endSession() [sets ended_at]
  → renders SessionSummaryView

CandidateView
  → polls loadSession every 10s
  → if ended_at is set → shows "Session ended" screen

SessionSummaryView (read-only)
  → loads from Supabase on mount if not passed as props
  → renders score, bugs, notes, metadata
  → "Copy summary" → clipboard markdown
```

---

## Summary View Copy Format

```markdown
# Interview — {candidate_name}
Date: {date} · Duration: {MM:SS}
Challenge: {challenge title} ({framework})

## Bugs: {checked}/{total}
- [x] {bug description} ({SEVERITY})
- [ ] {bug description} ({SEVERITY})
...

## Notes
{notes content}
```

---

## Implementation Sequence

1. Add `SUPABASE_ANON_KEY` to `src/config.ts`
2. Create `src/lib/supabase.ts` (client singleton)
3. Create `sessions` table in Supabase with RLS policy
4. Create `src/composables/useSessionPersistence.ts`
5. Create `src/composables/useTimer.ts`
6. Update `src/views/CreateSessionView.vue` (candidate name field)
7. Update `src/components/AppHeader.vue` (timer + end button + modal)
8. Create `src/views/SessionSummaryView.vue`
9. Update `src/views/InterviewerView.vue` (wire persistence, summary transition)
10. Update `src/views/CandidateView.vue` (session-ended screen)
11. Wire `useBugChecklist` and `useNotes` changes to trigger persistence saves
