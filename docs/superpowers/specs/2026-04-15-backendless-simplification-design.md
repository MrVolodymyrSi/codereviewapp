# Backend-less Simplification Design

**Date:** 2026-04-15
**Status:** Approved

## Overview

Simplify the CodeReview interview tool to a fully static, backend-less app. Remove Supabase entirely. Collapse the two-role (interviewer/candidate) multi-view architecture into a single view: the interviewee reads code, leaves inline gutter comments, and watches a live demo. No session creation, no polling, no database.

The result is conceptually a GitHub-style code viewer with a live preview panel on the right.

---

## What Gets Removed

### Views (deleted)
- `src/views/CreateSessionView.vue` — session creation flow
- `src/views/CandidateView.vue` — read-only candidate view with session polling
- `src/views/SessionSummaryView.vue` — post-interview summary

### Components (deleted)
- `src/components/AppHeader.vue` — timer + "End Interview" button
- `src/components/InterviewerPanel.vue` — right sidebar wrapper
- `src/components/NotesPanel.vue` — markdown notes editor
- `src/components/BugChecklist.vue` — bug tracking UI

### Composables (deleted)
- `src/composables/useSessionPersistence.ts` — all Supabase CRUD
- `src/composables/useSession.ts` — session ID + role URL param logic
- `src/composables/useTimer.ts` — session timer
- `src/composables/useNotes.ts` — notes text + debounced persistence
- `src/composables/useBugChecklist.ts` — bug checked state

### Infrastructure (deleted)
- `src/lib/supabase.ts` — Supabase client singleton
- `src/config.ts` — Supabase URL + anon key config
- `src/types/session.ts` — SessionRow interface
- `src/utils/local-session.ts` — localStorage fallback for Supabase
- `src/utils/summary-markdown.ts` — markdown export for session summary
- `src/utils/mock-api.ts` — mock API responses
- `supabase/` — entire directory (edge functions, config, migrations)
- `@supabase/supabase-js` — removed from `package.json`
- `.env.local` — Supabase credentials (no longer needed)

---

## What Stays Untouched

- `src/components/CodePane.vue` — Monaco editor with gutter comment support
- `src/components/PreviewPane.vue` — iframe live demo rendering
- `src/components/WorkspacePane.vue` — left side file tree + editor
- `src/components/FileTree.vue` — file navigation
- `src/components/FrameworkTabs.vue` — Vue/React/Vanilla selector
- `src/components/ChallengeSelector.vue` — challenge picker
- `src/components/MonacoEditor.vue` — Monaco wrapper
- `src/components/SplitLayout.vue` — resizable split panes
- `src/composables/useGutterComments.ts` — GitHub-style gutter comment rendering
- `src/composables/useChallenge.ts` — challenge selection + code state
- `src/composables/useConsole.ts` — console output capture
- `src/composables/useIframeDoc.ts` — iframe code injection
- `src/data/` — all challenge definitions (video-feed, fetch-race, list-render)
- `src/utils/srcdoc-*.ts` — iframe HTML templates
- `src/utils/iframe-bridge.ts` — postMessage bridge for console capture
- `tests/` — existing Vitest tests (updated where needed, not rewritten)

---

## Architecture

### App.vue
Becomes ~10 lines. No view routing, no role detection, no URL param parsing. Renders `CodeReviewView` directly.

```
App.vue
└── CodeReviewView.vue  (renamed from InterviewerView.vue)
    ├── [left]   WorkspacePane  →  FileTree + CodePane
    ├── [center] (implicit, part of WorkspacePane)
    └── [right]  PreviewPane
```

### CodeReviewView.vue
`InterviewerView.vue` renamed and stripped:
- Remove imports: `useSession`, `useSessionPersistence`, `useTimer`, `useNotes`, `useBugChecklist`
- Remove template bindings for timer, end-interview button, notes panel, bug checklist
- The three-column layout (file tree + editor + preview) already exists and stays as-is

### Layout
Three columns:
1. **File tree** (left, narrow) — file navigation within the challenge
2. **Code editor + gutter comments** (center, wide) — Monaco with GitHub-style inline comment cards
3. **Live demo** (right) — iframe rendering the challenge code

---

## Data Flow

### Challenge & Framework
- `useChallenge` manages selected challenge and framework (unchanged)
- Default on load: first challenge, first framework
- Interviewee can switch challenge and framework freely using the existing selectors

### Comments (rewritten)
`useComments` replaces Supabase persistence with localStorage.

**Storage key:**
```
codereview:comments:<challengeId>:<framework>
```

**Comment shape** (unchanged from current):
```ts
interface Comment {
  id: string
  lineStart: number
  lineEnd: number
  body: string
  createdAt: string
}
```

**Persistence behavior:**
- Load comments from localStorage on challenge/framework change
- Write to localStorage on every add, edit, or delete (synchronous — no debounce needed)
- Comments are scoped per challenge+framework so switching doesn't mix them

**Error handling:**
- If localStorage value fails JSON.parse → catch, reset to `[]`, continue
- No network, no retries, no fallbacks needed

---

## Testing

Existing Vitest tests for `useGutterComments` pass untouched.

`useComments` tests updated: mock `localStorage` instead of mocking Supabase. Comment shape and CRUD interface are unchanged so test logic stays the same.

No new tests required — this is a deletion task, not a feature addition.
