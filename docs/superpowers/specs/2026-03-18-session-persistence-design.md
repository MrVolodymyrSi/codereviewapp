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
| `challenge_id` | `text` | set at creation from current challenge default |
| `framework` | `text` | set at creation from current framework default |
| `notes` | `text` | interviewer markdown notes (running log, not reset on challenge switch) |
| `bugs_checked` | `text[]` | array of checked bug IDs |
| `total_bugs` | `integer` | bug count for the selected challenge + framework |
| `started_at` | `timestamptz` | set on session creation |
| `ended_at` | `timestamptz` | null while in progress; set on end |
| `expires_at` | `timestamptz` | generated column: `started_at + interval '30 days'` |

### Access control

RLS is disabled on the `sessions` table. The nanoid session ID (8 characters of URL-safe entropy, ~47 bits) is the access gate — possession of the ID is treated as authorisation. The team has explicitly accepted the guessing risk with no additional mitigations: the pg_cron cleanup keeps the live-row count small, session IDs are not published anywhere, and this is an internal tool. The Supabase anon key is exposed in the JS bundle as a `VITE_SUPABASE_ANON_KEY` environment variable, which is the standard Vite pattern for public runtime config. The team accepts this exposure model given the internal-tool context.

### Auto-save behaviour

Notes and bug checklist changes are written to Supabase with a 1-second debounce. `challenge_id`, `framework`, and `total_bugs` are updated immediately when the interviewer switches challenge or framework.

**Debounced save failure:** If a debounced `saveNotes` or `saveBugsChecked` call fails, a subtle "⚠ Save failed" indicator appears in the interviewer header. The save is retried on the next debounce tick (up to 3 attempts). localStorage remains populated throughout the session as a secondary fallback.

**`saveChallengeMeta` failure:** If the immediate `saveChallengeMeta` call fails, the same "⚠ Save failed" indicator appears. The update is retried up to 3 times with 500ms delay. The challenge/framework switch is not blocked — the UI proceeds immediately and the retry happens in the background.

**Flush before end:** When the interviewer confirms "End Interview", all pending debounced saves (`saveNotes`, `saveBugsChecked`) are flushed and awaited before `endSession()` is called. This guarantees the final state is written before `ended_at` is set.

### Row expiry

`expires_at` is a Postgres generated column defined as `generated always as (started_at + interval '30 days') stored` — no frontend computation needed, no risk of it being null.

A Supabase pg_cron job runs daily at 02:00 UTC and deletes rows where `expires_at < now()`. Setup SQL:

```sql
-- Create the table with generated expires_at
create table sessions (
  id text primary key,
  candidate_name text not null,
  challenge_id text not null,
  framework text not null,
  notes text default '',
  bugs_checked text[] default '{}',
  total_bugs integer not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  expires_at timestamptz generated always as (started_at + interval '30 days') stored
);

-- Disable RLS (internal tool, nanoid is the access gate)
alter table sessions disable row level security;

-- Daily cleanup job
select cron.schedule(
  'delete-expired-sessions',
  '0 2 * * *',
  $$ delete from sessions where expires_at < now() $$
);
```

---

## Architecture

### Modified: `src/config.ts`

Add `SUPABASE_ANON_KEY` exported from `import.meta.env.VITE_SUPABASE_ANON_KEY`. The existing `SUPABASE_URL` pattern should be updated to the same `VITE_` env variable approach for consistency.

### New: `src/lib/supabase.ts`

Supabase JS client singleton, initialised with `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `src/config.ts`.

### New: `src/composables/useSessionPersistence.ts`

Handles all Supabase read/write for session data.

**`createSessionRow(params)`** — inserts the full row at session creation. `params` includes: `id`, `candidateName`, `challengeId`, `framework`, `totalBugs`, `startedAt`. `totalBugs` is derived from `activeChallenge.value.bugs.filter(b => b.variant === activeFramework.value).length` in `useChallenge`. `expires_at` is computed by Postgres automatically. Returns `{ ok: true }` or `{ ok: false, error }`. On failure, `CreateSessionView` shows an inline error ("Could not start session — check your connection") and a Retry button. URLs are not shown until the INSERT succeeds.

**`saveNotes(notes)`** — debounced 1s, updates the `notes` column.

**`flushNotes()`** — cancels any pending debounce and immediately writes the latest notes value. Exported as a named function. Called by `InterviewerView` before `endSession`.

**`saveBugsChecked(bugIds)`** — debounced 1s, updates `bugs_checked`.

**`flushBugsChecked()`** — cancels any pending debounce and immediately writes the latest bugs value. Exported as a named function. Called by `InterviewerView` before `endSession`.

**`saveChallengeMeta(challengeId, framework, totalBugs)`** — immediate UPDATE on challenge or framework switch. On failure, surfaces "⚠ Save failed" and retries up to 3 times with 500ms delay.

**`endSession()`** — sets `ended_at = now()`. Must only be called after `flushNotes()` and `flushBugsChecked()` have resolved. Returns `{ ok: true; session: SessionRow } | { ok: false; error: Error }`. On success, re-fetches the full row and returns it — `InterviewerView` uses this re-fetched row (not local state) to populate `SessionSummaryView`. On failure, shows error in the confirmation modal and keeps the session open.

**`loadSession(id)`** — fetches the full row by ID. Returns one of three shapes:
- `{ data: SessionRow }` — success
- `{ data: null; notFound: true }` — row does not exist (expired or invalid ID)
- `{ data: null; error: Error }` — network or Supabase error

Used on mount by `InterviewerView` and `CandidateView`. Callers must handle all three cases distinctly.

### New: `src/composables/useTimer.ts`

Accepts `startedAt: Date` and derives elapsed seconds from `Date.now() - startedAt`. Updates every second via `setInterval`. Exposes `display` (formatted as `MM:SS` under one hour, `H:MM:SS` at one hour or more) and a `stop()` method. Initialised in `InterviewerView` from `session.started_at` after `loadSession` resolves — page reload correctly resumes the timer from the original start time. `InterviewerView` calls `timer.stop()` after `endSession()` resolves successfully.

### New: `src/views/SessionSummaryView.vue`

Receives a single `session` prop (the full row object from Supabase, always re-fetched after `endSession` succeeds). Rendered by `InterviewerView` — it never fetches data independently. The interviewer URL (`?role=interviewer&sid=XXX`) doubles as the permanent summary URL: when `InterviewerView` loads and detects `ended_at` is set, it renders `SessionSummaryView`. No separate `/summary` route is needed.

Displays:
- Candidate name, challenge title, framework, date, duration (derived from `ended_at - started_at`, formatted with the same `H:MM:SS` / `MM:SS` logic as `useTimer`)
- Bug score with progress bar
- Full bug list with checked/unchecked state, descriptions, severity
- Rendered markdown notes
- "Copy summary" button → copies markdown to clipboard

**Bug metadata resolution:** `bugs_checked` contains only bug IDs. Bug descriptions and severity are resolved by importing the static challenge definitions from `src/data` and matching by ID. This means historical summaries will silently break if a bug's ID or description is changed in the source data. This is an accepted tradeoff for an internal tool — bug definitions are treated as stable once in use.

### Modified: `src/views/CreateSessionView.vue`

Add a required `candidateName` text input. "Create Session" is disabled until the field is non-empty. On click: call `createSessionRow` with the current challenge/framework defaults from `useChallenge`. Show a loading state during the INSERT. On failure show inline error + Retry. On success show the two session URLs as before.

### Modified: `src/views/InterviewerView.vue`

`sid` is read from `useSession().sessionId` (the existing composable that parses `?sid=` from the URL) and passed as an argument to `loadSession`.

On mount:
1. Call `loadSession(sid)`.
2. `{ data: SessionRow }` with `ended_at` set → render `SessionSummaryView(session)`.
3. `{ data: SessionRow }` in progress → render interview UI, start `useTimer(session.started_at)`.
4. `{ notFound: true }` → show error screen: "Session not found. This link may be invalid or the session may have expired."
5. `{ error: Error }` → show error screen: "Could not connect to session. Please check your connection and refresh."

During the session: challenge and framework changes call `saveChallengeMeta` immediately.

On "End Interview" confirmed:
1. If the last `saveChallengeMeta` call failed all 3 retries (tracked by a `metaSyncFailed` reactive flag in the composable), show a warning in the confirmation modal: "Challenge metadata could not be saved. The summary may show incorrect challenge info. Continue?" The interviewer can still proceed.
2. Flush pending saves: `await flushNotes(); await flushBugsChecked()`
3. Call `endSession()`
4. On failure: show error in modal, session stays open
5. On success: call `timer.stop()`; render `SessionSummaryView(result.session)` using the re-fetched row

### Modified: `src/views/CandidateView.vue`

`sid` is read from `useSession().sessionId` and passed to `loadSession`.

On mount: call `loadSession(sid)`.
- `{ data }` with `ended_at` set → show "Session ended" immediately
- `{ notFound }` → show "This session link is invalid or has expired."
- `{ error }` → show "Could not connect — please refresh."

Polling begins only after the initial `loadSession` call resolves with an in-progress session (`{ data }` with `ended_at = null`). Poll every 10 seconds. When `ended_at` becomes non-null, stop polling and replace the editor with: *"This session has ended. Thank you for your time."*

**Polling error handling:** track consecutive errors. After 5 consecutive `{ error }` results, stop polling and show a non-blocking banner: "Connection lost — your session may still be active." A `{ notFound }` result during polling is treated as session ended.

### Modified: `src/components/AppHeader.vue`

Interviewer-only additions (only rendered when `isInterviewer` is true):
- Timer display (`useTimer.display`) in the centre of the header
- "End Interview" button on the right, styled with `var(--danger)` background
- Confirmation modal: *"End the interview? This will close the session for the candidate too."* with Cancel and Confirm buttons

### Modified: `useBugChecklist` and `useNotes`

Both composables already write to localStorage and must continue to do so. Each composable accepts an optional `onPersist?: (value: ...) => void` callback. When provided, it is called after every localStorage write — `InterviewerView` injects the Supabase save functions here. `CandidateView` does not inject a callback, so no Supabase writes happen on the candidate side.

The `onPersist` callback is only wired after `InterviewerView` mounts and `loadSession` resolves with an in-progress session. Any localStorage writes that occur before this point (which cannot happen given the routing model — `useNotes` and `useBugChecklist` are only active inside `InterviewerView`) are not a concern. This is explicitly accepted.

---

## Component & Data Flow

```
CreateSessionView
  → user enters candidate name (required)
  → createSessionRow(id, name, challengeId, framework, totalBugs, startedAt)
    → on failure: show inline error + retry, do not show URLs
    → on success: show interviewer + candidate URLs

InterviewerView (mount)
  → loadSession(sid)
    → { notFound }: "Session not found" error screen
    → { error }:    "Could not connect" error screen
    → { data }, ended_at set:  render SessionSummaryView(session)
    → { data }, in progress:   render interview UI
      → useTimer(session.started_at)
      → AppHeader: timer display + End Interview button
      → challenge/framework switch → saveChallengeMeta() [immediate, retry ×3]
      → notes change   → saveNotes()      [debounced 1s, retry ×3]
      → checklist change → saveBugsChecked() [debounced 1s, retry ×3]
      → any save failure → "⚠ Save failed" in header
  → "End Interview" confirmed
    → flushNotes() + flushBugsChecked()   [await both]
    → endSession()
      → on failure: error in modal, session stays open
      → on success: render SessionSummaryView(result.session)  [re-fetched row]

CandidateView
  → loadSession(sid) on mount → handle all 3 return shapes
  → poll loadSession every 10s
  → { data } ended_at set → "Session ended" screen
  → 5 consecutive { error } → "Connection lost" banner, stop polling

SessionSummaryView (read-only, props-only)
  → renders score, bugs (matched from static data by ID), notes, metadata
  → duration = ended_at - started_at, formatted H:MM:SS or MM:SS
  → "Copy summary" → clipboard markdown
```

---

## Summary View Copy Format

Duration is formatted as `H:MM:SS` for sessions ≥ 1 hour, otherwise `MM:SS`.

```markdown
# Interview — {candidate_name}
Date: {date} · Duration: {H:MM:SS or MM:SS}
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

1. Add `VITE_SUPABASE_ANON_KEY` env variable; update `src/config.ts` to export both keys from `import.meta.env`
2. Create `sessions` table in Supabase with generated `expires_at`; disable RLS; set up pg_cron expiry job
3. Create `src/lib/supabase.ts` (client singleton)
4. Create `src/composables/useSessionPersistence.ts` (all Supabase ops including flush methods)
5. Create `src/composables/useTimer.ts`
6. Add `onPersist` callback to `useNotes` (localStorage behaviour unchanged; callback is optional)
7. Add `onPersist` callback to `useBugChecklist` (localStorage behaviour unchanged; callback is optional)
8. Update `src/views/CreateSessionView.vue` (candidate name field + `createSessionRow` on submit)
9. Update `src/components/AppHeader.vue` (timer display + End Interview button + confirmation modal)
10. Create `src/views/SessionSummaryView.vue` (read-only; resolves bug metadata from static data)
11. Update `src/views/InterviewerView.vue` (loadSession on mount; wire `onPersist` callbacks; flush + end flow; render `SessionSummaryView`)
12. Update `src/views/CandidateView.vue` (loadSession on mount + polling + session-ended screen)
