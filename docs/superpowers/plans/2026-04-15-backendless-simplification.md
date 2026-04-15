# Backendless Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Supabase entirely and collapse the two-role app into a single static view where the interviewee reads code and leaves localStorage-backed gutter comments.

**Architecture:** `App.vue` renders one view directly — `CodeReviewView.vue` (stripped `InterviewerView.vue`). `useComments` replaces its Supabase persist callback with direct localStorage reads/writes keyed by challenge+framework. All session, role, timer, notes, and bug-checklist code is deleted.

**Tech Stack:** Vue 3, TypeScript, Vite, Monaco Editor, Vitest — no backend dependencies.

---

## File Map

| Action | File |
|--------|------|
| Delete | `src/views/CreateSessionView.vue` |
| Delete | `src/views/CandidateView.vue` |
| Delete | `src/views/SessionSummaryView.vue` |
| Delete | `src/components/AppHeader.vue` |
| Delete | `src/components/InterviewerPanel.vue` |
| Delete | `src/components/NotesPanel.vue` |
| Delete | `src/components/BugChecklist.vue` |
| Delete | `src/composables/useSessionPersistence.ts` |
| Delete | `src/composables/useSession.ts` |
| Delete | `src/composables/useTimer.ts` |
| Delete | `src/composables/useNotes.ts` |
| Delete | `src/composables/useBugChecklist.ts` |
| Delete | `src/lib/supabase.ts` |
| Delete | `src/config.ts` |
| Delete | `src/types/session.ts` |
| Delete | `src/utils/local-session.ts` |
| Delete | `src/utils/summary-markdown.ts` |
| Delete | `src/utils/mock-api.ts` |
| Delete | `supabase/` (entire directory) |
| Delete | `tests/useTimer.test.ts` |
| Delete | `tests/summary-markdown.test.ts` |
| Delete | `tests/srcdoc-mock-api.test.ts` |
| Rewrite | `src/composables/useComments.ts` |
| Rewrite | `src/App.vue` |
| Create  | `src/views/CodeReviewView.vue` |
| Update  | `tests/useComments.test.ts` |
| Update  | `package.json` (remove unused deps) |

---

## Task 1: Delete dead source files

**Files:** everything in the "Delete" rows above except test files and `supabase/`

- [ ] **Step 1: Remove dead views**

```bash
git rm src/views/CreateSessionView.vue src/views/CandidateView.vue src/views/SessionSummaryView.vue
```

- [ ] **Step 2: Remove dead components**

```bash
git rm src/components/AppHeader.vue src/components/InterviewerPanel.vue src/components/NotesPanel.vue src/components/BugChecklist.vue
```

- [ ] **Step 3: Remove dead composables**

```bash
git rm src/composables/useSessionPersistence.ts src/composables/useSession.ts src/composables/useTimer.ts src/composables/useNotes.ts src/composables/useBugChecklist.ts
```

- [ ] **Step 4: Remove dead infrastructure**

```bash
git rm src/lib/supabase.ts src/config.ts src/types/session.ts src/utils/local-session.ts src/utils/summary-markdown.ts src/utils/mock-api.ts
```

- [ ] **Step 5: Remove supabase directory**

```bash
git rm -r supabase/
```

- [ ] **Step 6: Remove .env.local if present**

```bash
[ -f .env.local ] && git rm -f .env.local || echo "no .env.local to remove"
```

---

## Task 2: Rewrite App.vue and create CodeReviewView.vue

`App.vue` currently imports `useSession`, `CreateSessionView`, `InterviewerView`, and `CandidateView` — all deleted in Task 1. Fix both files in one step so the project is compilable again.

**Files:**
- Rewrite: `src/App.vue`
- Create: `src/views/CodeReviewView.vue`

- [ ] **Step 1: Rewrite App.vue**

Replace the entire `<script setup>` and `<template>` with the minimal routing-free version. Keep all CSS variables in `<style>` unchanged.

```vue
<script setup lang="ts">
import CodeReviewView from './views/CodeReviewView.vue'
</script>

<template>
  <div class="app">
    <CodeReviewView />
  </div>
</template>
```

The `<style>` block (all CSS custom properties and global resets) stays exactly as-is. The `<style scoped>` block also stays unchanged:

```css
.app {
  height: 100%;
}
```

- [ ] **Step 2: Create CodeReviewView.vue**

This is `InterviewerView.vue` stripped to its layout skeleton. It removes all session/timer/notes/bugs logic and renders the three-column layout directly on mount.

Create `src/views/CodeReviewView.vue`:

```vue
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import SplitLayout from '../components/SplitLayout.vue'
import WorkspacePane from '../components/WorkspacePane.vue'
import PreviewPane from '../components/PreviewPane.vue'
import ConsolePanel from '../components/ConsolePanel.vue'
import { useChallenge } from '../composables/useChallenge'
import { useIframeDoc } from '../composables/useIframeDoc'
import { useConsole } from '../composables/useConsole'
import { loadComments } from '../composables/useComments'

const { commitAndRun, activeChallengeId, activeFramework } = useChallenge()
const { srcdoc } = useIframeDoc()
useConsole()

onMounted(() => {
  loadComments(activeChallengeId.value, activeFramework.value)
  commitAndRun()
})

watch([activeChallengeId, activeFramework], ([challengeId, framework]) => {
  loadComments(challengeId, framework)
})
</script>

<template>
  <div class="code-review-view">
    <div class="main-area">
      <div class="workspace-area">
        <SplitLayout>
          <template #left>
            <WorkspacePane :read-only="true" />
          </template>
          <template #right>
            <PreviewPane :srcdoc="srcdoc" />
          </template>
        </SplitLayout>
        <ConsolePanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-review-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  color: var(--text);
}

.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.workspace-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.workspace-area :deep(.split-layout) {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/App.vue src/views/CodeReviewView.vue
git commit -m "feat: remove backend, collapse to single CodeReviewView

Deletes all Supabase infrastructure, session/role routing, timer,
notes, and bug-checklist code. App now renders CodeReviewView directly."
```

---

## Task 3: Delete dead tests

**Files:**
- Delete: `tests/useTimer.test.ts`
- Delete: `tests/summary-markdown.test.ts`
- Delete: `tests/srcdoc-mock-api.test.ts`

- [ ] **Step 1: Remove tests for deleted modules**

```bash
git rm tests/useTimer.test.ts tests/summary-markdown.test.ts tests/srcdoc-mock-api.test.ts
```

- [ ] **Step 2: Run remaining tests to confirm baseline**

```bash
npm test
```

Expected: some tests pass, `tests/useComments.test.ts` may fail because it calls `hydrateComments` which will be removed in Task 4. This is expected — note the failures and continue.

- [ ] **Step 3: Commit the deletions**

```bash
git commit -m "test: remove tests for deleted modules"
```

---

## Task 4: Update useComments tests

The current `tests/useComments.test.ts` tests `hydrateComments`, `getAllComments`, and `setOnPersist` — all of which are removed in the new design. Replace the entire file with tests for the new `loadComments`-based localStorage API.

**Files:**
- Rewrite: `tests/useComments.test.ts`

- [ ] **Step 1: Replace the test file**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'

// localStorage mock — Vitest runs in node; stub the global
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string): string | null => storage[key] ?? null,
  setItem: (key: string, value: string): void => { storage[key] = value },
  removeItem: (key: string): void => { delete storage[key] },
  clear: (): void => { Object.keys(storage).forEach((k) => delete storage[k]) },
}

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock)
  localStorageMock.clear()
})

describe('loadComments', () => {
  it('returns empty comments when localStorage has no entry', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    loadComments('video-feed', 'vue')
    const key = computed(() => 'video-feed:vue:App.vue')
    const { comments } = useComments(key)
    expect(comments.value).toEqual([])
  })

  it('loads comments from localStorage on challenge/framework change', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    const stored = [
      { id: '1', file: 'App.vue', lineStart: 3, lineEnd: 3, text: 'missing null check', timestamp: 1000 },
    ]
    localStorage.setItem('codereview:comments:video-feed:vue', JSON.stringify(stored))

    loadComments('video-feed', 'vue')

    const key = computed(() => 'video-feed:vue:App.vue')
    const { comments } = useComments(key)
    expect(comments.value).toHaveLength(1)
    expect(comments.value[0].text).toBe('missing null check')
  })

  it('resets to empty when localStorage value is corrupt JSON', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    localStorage.setItem('codereview:comments:fetch-race:react', 'not-valid-json{{')

    loadComments('fetch-race', 'react')

    const key = computed(() => 'fetch-race:react:App.tsx')
    const { comments } = useComments(key)
    expect(comments.value).toEqual([])
  })
})

describe('useComments mutations persist to localStorage', () => {
  it('addComment writes comment to localStorage', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    loadComments('fetch-race', 'vue')

    const key = computed(() => 'fetch-race:vue:App.vue')
    const { addComment, comments } = useComments(key)
    addComment(5, 5, 'side effect missing')

    expect(comments.value).toHaveLength(1)
    expect(comments.value[0].text).toBe('side effect missing')

    const raw = localStorage.getItem('codereview:comments:fetch-race:vue')
    const persisted = JSON.parse(raw!)
    expect(persisted).toHaveLength(1)
    expect(persisted[0].text).toBe('side effect missing')
  })

  it('updateComment updates text and persists to localStorage', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    loadComments('list-render', 'vue')

    const key = computed(() => 'list-render:vue:App.vue')
    const { addComment, updateComment, comments } = useComments(key)
    addComment(2, 2, 'original')

    const id = comments.value[0].id
    updateComment(id, 'updated')

    expect(comments.value[0].text).toBe('updated')
    expect(comments.value[0].updatedAt).toBeDefined()

    const raw = localStorage.getItem('codereview:comments:list-render:vue')
    const persisted = JSON.parse(raw!)
    expect(persisted[0].text).toBe('updated')
  })

  it('removeComment removes comment and persists to localStorage', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    loadComments('list-render', 'react')

    const key = computed(() => 'list-render:react:App.tsx')
    const { addComment, removeComment, comments } = useComments(key)
    addComment(10, 12, 'to remove')

    const id = comments.value[0].id
    removeComment(id)

    expect(comments.value).toHaveLength(0)

    const raw = localStorage.getItem('codereview:comments:list-render:react')
    const persisted = JSON.parse(raw!)
    expect(persisted).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — verify useComments tests fail**

```bash
npm test -- tests/useComments.test.ts
```

Expected: FAIL — `loadComments is not a function` (the old `useComments.ts` doesn't export it yet). This confirms the tests are driving the implementation.

---

## Task 5: Rewrite useComments

Replace the Supabase-callback-based implementation with a simple localStorage read/write pattern.

**Files:**
- Rewrite: `src/composables/useComments.ts`

- [ ] **Step 1: Replace useComments.ts**

```ts
import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Comment } from '../types/comment'

const store = ref<Record<string, Comment[]>>({})
let _challengeId = ''
let _framework = ''

export function loadComments(challengeId: string, framework: string): void {
  _challengeId = challengeId
  _framework = framework
  const key = `codereview:comments:${challengeId}:${framework}`
  try {
    const raw = localStorage.getItem(key)
    const flat: Comment[] = raw ? JSON.parse(raw) : []
    const grouped: Record<string, Comment[]> = {}
    for (const c of flat) {
      const storeKey = `${challengeId}:${framework}:${c.file}`
      if (!grouped[storeKey]) grouped[storeKey] = []
      grouped[storeKey].push(c)
    }
    store.value = grouped
  } catch {
    store.value = {}
  }
}

function persist(): void {
  const key = `codereview:comments:${_challengeId}:${_framework}`
  const all = Object.values(store.value).flat()
  localStorage.setItem(key, JSON.stringify(all))
}

export function useComments(key: ComputedRef<string>) {
  const comments = computed<Comment[]>(() => store.value[key.value] ?? [])

  function addComment(lineStart: number, lineEnd: number, text: string) {
    const file = key.value.split(':')[2]
    store.value = {
      ...store.value,
      [key.value]: [
        ...(store.value[key.value] ?? []),
        { id: crypto.randomUUID(), file, lineStart, lineEnd, text, timestamp: Date.now() },
      ],
    }
    persist()
  }

  function updateComment(id: string, text: string) {
    const entry = store.value[key.value] ?? []
    store.value = {
      ...store.value,
      [key.value]: entry.map((c) =>
        c.id === id ? { ...c, text, updatedAt: Date.now() } : c,
      ),
    }
    persist()
  }

  function removeComment(id: string) {
    store.value = {
      ...store.value,
      [key.value]: (store.value[key.value] ?? []).filter((c) => c.id !== id),
    }
    persist()
  }

  return { comments, addComment, updateComment, removeComment }
}
```

- [ ] **Step 2: Run useComments tests — verify they pass**

```bash
npm test -- tests/useComments.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all remaining tests pass. If `useGutterComments.test.ts` fails, check that it doesn't import from deleted modules — it should not.

- [ ] **Step 4: Commit**

```bash
git add tests/useComments.test.ts src/composables/useComments.ts
git commit -m "feat: rewrite useComments with localStorage persistence, remove Supabase callbacks"
```

---

## Task 6: Remove unused packages and verify build

`@supabase/supabase-js`, `nanoid`, and `marked` were only used by deleted code.

**Files:**
- Update: `package.json` (via npm)

- [ ] **Step 1: Confirm nanoid and marked are unused**

```bash
grep -r "nanoid" src/ --include="*.ts" --include="*.vue" -l
grep -r "marked" src/ --include="*.ts" --include="*.vue" -l
```

Expected: no output (both are unused). If either grep finds a match, do NOT remove that package — skip it in Step 2.

- [ ] **Step 2: Uninstall unused dependencies**

```bash
npm uninstall @supabase/supabase-js nanoid marked
```

Expected output includes lines like:
```
removed 11 packages
```

- [ ] **Step 3: Run TypeScript build to verify no compile errors**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors. If there are errors, they'll point to missed import references — fix them before committing.

- [ ] **Step 4: Run full test suite one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove @supabase/supabase-js, nanoid, marked — no longer used"
```

---

## Done

The app is now fully static:
- Opens directly to `CodeReviewView` — no session creation, no role detection
- Interviewee picks a challenge and framework, reads code, leaves gutter comments
- Comments persist to `localStorage` keyed by `codereview:comments:<challengeId>:<framework>`
- No backend, no environment variables, no network requests
