# Inline Monaco View Zone Comments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom comment panel with GitHub-style inline comments that appear as Monaco view zones between code lines, persisted to Supabase and shown in the session summary.

**Architecture:** `useComments` gains module-level `hydrateComments`/`getAllComments`/`setOnPersist` exports so `InterviewerView` can wire server persistence without prop-threading; `CodePane` owns view zone rendering using Monaco's `changeViewZones` API with plain DOM nodes that close over Vue refs; `useSessionPersistence` gets a debounced `saveComments`/`flushComments` pair mirroring the existing notes/bugs pattern.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Monaco Editor via `@monaco-editor/loader`, Supabase (Postgres JSONB column), Vitest for unit tests.

---

## File Map

| File | What changes |
|------|-------------|
| `src/types/comment.ts` | Add `file: string` and `updatedAt?: number` fields |
| `src/types/session.ts` | Add `comments: Comment[] \| null` |
| `src/composables/useComments.ts` | Full rewrite: drop localStorage, add `updateComment`, add 3 module-level exports |
| `src/components/MonacoEditor.vue` | Convert `let editor/monacoInstance` → `ref`s; add `gutterClick` emit and gutter mouse handler; `defineExpose` |
| `src/composables/useSessionPersistence.ts` | Add `doWriteComments`/`saveComments`/`flushComments` inside the composable function; init `commentsLatestValue` in `loadSession`; expose both in return |
| `src/components/CodePane.vue` | Remove old comment panel; add `editorRef`, view zone state, `syncViewZones`, `buildFormNode`, `buildCommentNode`, watchers, `onGutterClick` |
| `src/views/InterviewerView.vue` | Import 3 module-level functions from `useComments`; add `saveComments`/`flushComments`; hydrate on mount; flush on end; cleanup on unmount |
| `src/views/SessionSummaryView.vue` | Add `sortedComments` computed; add "Review Comments" section with styles |
| `src/utils/summary-markdown.ts` | Append `## Review Comments` block to the returned markdown array |
| `tests/summary-markdown.test.ts` | Add tests for the new comments block |

---

## Task 1: Run Supabase Migration

**Files:**
- No code files — SQL run directly in Supabase dashboard

- [ ] **Step 1: Open the Supabase SQL editor**

  Go to your project's Supabase dashboard → SQL Editor → New query.

- [ ] **Step 2: Run the migration**

  ```sql
  ALTER TABLE sessions ADD COLUMN comments JSONB NOT NULL DEFAULT '[]';
  ```

  Expected: "Success. No rows returned."

- [ ] **Step 3: Verify**

  ```sql
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'sessions' AND column_name = 'comments';
  ```

  Expected: one row showing `jsonb`, default `'[]'::jsonb`.

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/comment.ts`
- Modify: `src/types/session.ts`

- [ ] **Step 1: Update `comment.ts`**

  Replace the entire file content:

  ```ts
  export interface Comment {
    id: string
    file: string       // filename only, e.g. "App.vue"
    line: number
    text: string
    timestamp: number
    updatedAt?: number
  }
  ```

- [ ] **Step 2: Update `session.ts`**

  Add one field at the end of `SessionRow`:

  ```ts
  export interface SessionRow {
    id: string
    candidate_name: string
    challenge_id: string
    framework: string
    notes: string
    bugs_checked: string[]
    total_bugs: number
    started_at: string
    ended_at: string | null
    expires_at: string
    comments: Comment[] | null
  }
  ```

  Also add the import at the top:

  ```ts
  import type { Comment } from './comment'
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview
  npx tsc --noEmit
  ```

  Expected: no errors (some "file not used" warnings are OK, errors are not).

- [ ] **Step 4: Commit**

  ```bash
  git add src/types/comment.ts src/types/session.ts
  git commit -m "feat: add Comment.file/updatedAt and SessionRow.comments fields"
  ```

---

## Task 3: Rewrite `useComments.ts`

**Files:**
- Modify: `src/composables/useComments.ts`
- Test: `tests/useComments.test.ts` (new)

The existing composable uses localStorage for persistence and lacks `updateComment` and the module-level functions. This task replaces it entirely.

- [ ] **Step 1: Write the failing tests first**

  Create `tests/useComments.test.ts`:

  ```ts
  import { describe, it, expect, beforeEach } from 'vitest'
  import { computed, ref } from 'vue'

  // Re-import fresh module per test via dynamic import to reset module state
  // Instead, we test the exported functions after each manual reset.
  // useComments is a Vue composable — we test the module-level exports directly.

  describe('useComments module-level functions', () => {
    // We need to import and then reset state between tests.
    // The simplest approach: import once, use hydrateComments to reset store state.

    it('hydrateComments groups comments by compound key', async () => {
      const { hydrateComments, getAllComments } = await import('../src/composables/useComments')
      hydrateComments(
        [
          { id: '1', file: 'App.vue', line: 3, text: 'hello', timestamp: 1000 },
          { id: '2', file: 'App.vue', line: 7, text: 'world', timestamp: 2000 },
          { id: '3', file: 'Child.vue', line: 1, text: 'test', timestamp: 3000 },
        ],
        'list-render',
        'vue',
      )
      const all = getAllComments()
      expect(all).toHaveLength(3)
      expect(all.map((c) => c.id).sort()).toEqual(['1', '2', '3'])
    })

    it('getAllComments returns flat array of all comments', async () => {
      const { hydrateComments, getAllComments } = await import('../src/composables/useComments')
      hydrateComments(
        [
          { id: 'a', file: 'App.vue', line: 1, text: 'A', timestamp: 100 },
          { id: 'b', file: 'Other.vue', line: 2, text: 'B', timestamp: 200 },
        ],
        'fetch-race',
        'react',
      )
      const all = getAllComments()
      expect(all).toHaveLength(2)
    })

    it('hydrateComments replaces the entire store', async () => {
      const { hydrateComments, getAllComments } = await import('../src/composables/useComments')
      hydrateComments(
        [{ id: 'x', file: 'App.vue', line: 5, text: 'old', timestamp: 1 }],
        'challenge-a',
        'vue',
      )
      hydrateComments(
        [{ id: 'y', file: 'App.vue', line: 5, text: 'new', timestamp: 2 }],
        'challenge-b',
        'react',
      )
      const all = getAllComments()
      // After second hydration the old entry is gone
      expect(all.every((c) => c.id !== 'x')).toBe(true)
      expect(all.some((c) => c.id === 'y')).toBe(true)
    })

    it('setOnPersist callback fires on addComment', async () => {
      const { useComments, hydrateComments, setOnPersist } = await import('../src/composables/useComments')
      hydrateComments([], 'test', 'vue')
      const calls: any[][] = []
      setOnPersist((comments) => calls.push(comments))
      const key = computed(() => 'test:vue:App.vue')
      const { addComment } = useComments(key)
      addComment(3, 'note')
      expect(calls).toHaveLength(1)
      expect(calls[0][0].text).toBe('note')
      setOnPersist(null) // cleanup
    })
  })
  ```

- [ ] **Step 2: Run to verify tests fail**

  ```bash
  npx vitest run tests/useComments.test.ts
  ```

  Expected: FAIL — `hydrateComments is not a function` (or similar, because the old module doesn't export it).

- [ ] **Step 3: Replace `src/composables/useComments.ts` with the new implementation**

  ```ts
  import { ref, computed } from 'vue'
  import type { ComputedRef } from 'vue'
  import type { Comment } from '../types/comment'

  // Module-level store keyed by "challengeId:framework:filename"
  const store = ref<Record<string, Comment[]>>({})

  // Module-level persist callback — set by InterviewerView, null otherwise
  let _onPersist: ((comments: Comment[]) => void) | null = null

  // ── Module-level named exports ────────────────────────────────────────────

  export function hydrateComments(
    comments: Comment[],
    challengeId: string,
    framework: string,
  ): void {
    const grouped: Record<string, Comment[]> = {}
    for (const c of comments) {
      const key = `${challengeId}:${framework}:${c.file}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(c)
    }
    store.value = grouped
  }

  export function getAllComments(): Comment[] {
    return Object.values(store.value).flat()
  }

  export function setOnPersist(cb: ((comments: Comment[]) => void) | null): void {
    _onPersist = cb
  }

  // ── Per-instance composable ───────────────────────────────────────────────

  export function useComments(key: ComputedRef<string>) {
    const comments = computed<Comment[]>(() => store.value[key.value] ?? [])

    function addComment(line: number, text: string) {
      const file = key.value.split(':')[2]
      store.value = {
        ...store.value,
        [key.value]: [
          ...(store.value[key.value] ?? []),
          { id: crypto.randomUUID(), file, line, text, timestamp: Date.now() },
        ],
      }
      _onPersist?.(getAllComments())
    }

    function updateComment(id: string, text: string) {
      const entry = store.value[key.value] ?? []
      store.value = {
        ...store.value,
        [key.value]: entry.map((c) =>
          c.id === id ? { ...c, text, updatedAt: Date.now() } : c,
        ),
      }
      _onPersist?.(getAllComments())
    }

    function removeComment(id: string) {
      store.value = {
        ...store.value,
        [key.value]: (store.value[key.value] ?? []).filter((c) => c.id !== id),
      }
      _onPersist?.(getAllComments())
    }

    return { comments, addComment, updateComment, removeComment }
  }
  ```

- [ ] **Step 4: Run the tests and verify they pass**

  ```bash
  npx vitest run tests/useComments.test.ts
  ```

  Expected: all 4 tests PASS.

- [ ] **Step 5: Run the full test suite to make sure nothing regressed**

  ```bash
  npx vitest run
  ```

  Expected: all existing tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/composables/useComments.ts tests/useComments.test.ts
  git commit -m "feat: rewrite useComments — add updateComment, hydrateComments, getAllComments, setOnPersist; drop localStorage"
  ```

---

## Task 4: Update `MonacoEditor.vue` — Refs + Gutter Click

**Files:**
- Modify: `src/components/MonacoEditor.vue`

The editor and monaco instance are currently plain `let` variables. They need to become `ref`s so `defineExpose` makes them reactive and `CodePane` can watch their initialization. A gutter mouse handler is added to emit `gutterClick` events.

- [ ] **Step 1: Replace the full `<script setup>` block**

  Replace lines 1–48 of `src/components/MonacoEditor.vue` with:

  ```ts
  <script setup lang="ts">
  import loader from '@monaco-editor/loader'
  import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

  const props = defineProps<{ code: string; language: string; theme?: 'vs-dark' | 'vs' }>()
  const emit = defineEmits<{ change: [string]; gutterClick: [number] }>()

  const container = ref<HTMLDivElement | null>(null)
  const editor = ref<any>(null)
  const monacoInstance = ref<any>(null)

  const langMap: Record<string, string> = {
    vue: 'html', tsx: 'javascript', html: 'html', javascript: 'javascript',
  }

  onMounted(async () => {
    monacoInstance.value = await loader.init()
    editor.value = monacoInstance.value.editor.create(container.value!, {
      value: props.code,
      language: langMap[props.language] ?? props.language,
      theme: props.theme ?? 'vs-dark',
      fontSize: 13,
      fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 8 },
    })
    editor.value.onDidChangeModelContent(() => emit('change', editor.value.getValue()))
    editor.value.onMouseDown((e: any) => {
      const { MouseTargetType } = monacoInstance.value.editor
      if (
        e.target.type === MouseTargetType.GUTTER_LINE_NUMBERS ||
        e.target.type === MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === MouseTargetType.GUTTER_LINE_DECORATIONS
      ) {
        const line = e.target.position?.lineNumber ?? null
        if (line) emit('gutterClick', line)
      }
    })
  })

  watch(() => props.code, (val) => {
    if (editor.value && editor.value.getValue() !== val) editor.value.setValue(val)
  })

  watch(() => props.language, (lang) => {
    if (editor.value && monacoInstance.value)
      monacoInstance.value.editor.setModelLanguage(editor.value.getModel(), langMap[lang] ?? lang)
  })

  watch(() => props.theme, (t) => {
    if (monacoInstance.value) monacoInstance.value.editor.setTheme(t ?? 'vs-dark')
  })

  onBeforeUnmount(() => editor.value?.dispose())

  defineExpose({ editor, monacoInstance })
  </script>

  <template><div ref="container" style="width:100%;height:100%" /></template>
  ```

- [ ] **Step 2: Run the dev server and verify Monaco still loads**

  ```bash
  npm run dev
  ```

  Open `http://localhost:5173`, start an interview session, verify the editor loads, code is editable, Run button works, and the editor theme toggle still works.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/MonacoEditor.vue
  git commit -m "feat: convert MonacoEditor editor/monacoInstance to refs; add gutterClick emit"
  ```

---

## Task 5: Update `useSessionPersistence.ts` — Comments Persistence

**Files:**
- Modify: `src/composables/useSessionPersistence.ts`

Add the debounced save/flush pair for comments, mirroring the existing notes pattern exactly.

- [ ] **Step 1: Add the `Comment` import and module-level state**

  At the top of `src/composables/useSessionPersistence.ts`, add alongside the existing imports:

  ```ts
  import type { Comment } from '../types/comment'
  ```

  After `let bugsRetryGen = 0` (line 29), add:

  ```ts
  // --- comments debounce state ---
  let commentsDebounceTimer: ReturnType<typeof setTimeout> | null = null
  let commentsLatestValue: Comment[] = []
  let commentsRetryGen = 0
  ```

- [ ] **Step 2: Add the three functions inside `useSessionPersistence()` after `flushBugsChecked`**

  After the closing brace of `flushBugsChecked` (around line 159), add:

  ```ts
  // ── saveComments (debounced 1s) ──────────────────────────────────────────
  async function doWriteComments(comments: Comment[], gen: number): Promise<void> {
    const sid = activeSessionId
    if (!sid) return
    for (let attempt = 0; attempt < 3; attempt++) {
      if (commentsRetryGen !== gen) return
      const { error } = await supabase
        .from('sessions')
        .update({ comments })
        .eq('id', sid)
      if (!error) { saveFailed.value = false; return }
      if (attempt < 2) await wait(1000)
    }
    if (commentsRetryGen === gen) saveFailed.value = true
  }

  function saveComments(comments: Comment[]): void {
    commentsLatestValue = comments
    if (commentsDebounceTimer) clearTimeout(commentsDebounceTimer)
    commentsDebounceTimer = setTimeout(() => {
      commentsDebounceTimer = null
      const gen = ++commentsRetryGen
      doWriteComments(comments, gen)
    }, 1000)
  }

  async function flushComments(): Promise<SaveResult> {
    if (commentsDebounceTimer) { clearTimeout(commentsDebounceTimer); commentsDebounceTimer = null }
    const gen = ++commentsRetryGen
    const sid = activeSessionId
    if (!sid) return { ok: true }
    const { error } = await supabase
      .from('sessions')
      .update({ comments: commentsLatestValue })
      .eq('id', sid)
    if (error && commentsRetryGen === gen) return { ok: false, error: new Error(error.message) }
    return { ok: true }
  }
  ```

- [ ] **Step 3: Initialize `commentsLatestValue` inside `loadSession`**

  In `loadSession`, after the line `bugsLatestValue = (data as SessionRow).bugs_checked`, add:

  ```ts
  commentsLatestValue = (data as SessionRow).comments ?? []
  ```

- [ ] **Step 4: Add `saveComments` and `flushComments` to the return object**

  In the `return { ... }` at the bottom of `useSessionPersistence()`, add both:

  ```ts
  return {
    createSessionRow,
    loadSession,
    saveNotes,
    flushNotes,
    saveBugsChecked,
    flushBugsChecked,
    saveComments,
    flushComments,
    saveChallengeMeta,
    endSession,
    saveFailed,
    metaSyncFailed,
  }
  ```

- [ ] **Step 5: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no new errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/composables/useSessionPersistence.ts
  git commit -m "feat: add saveComments/flushComments to useSessionPersistence"
  ```

---

## Task 6: Rewrite `CodePane.vue` — View Zone Logic

**Files:**
- Modify: `src/components/CodePane.vue`

This is the largest change. The bottom panel is removed entirely and replaced with Monaco view zones that render inline between code lines.

**Key concepts for this task:**
- `editor.changeViewZones(accessor => {...})` — the only way to add/remove view zones; runs synchronously inside a Monaco layout pass
- `accessor.addZone({ afterLineNumber, heightInPx, domNode })` — returns a string zone ID
- DOM nodes passed to Monaco are "detached" — their event handlers close over Vue refs directly (not Vue templates). This is intentional.
- `editorRef.value?.editor` is the `Ref<any>` exposed by `MonacoEditor` via `defineExpose`; `.value` unwraps it to get the Monaco editor instance
- `heightInPx: 90` is fixed because detached DOM nodes always report `scrollHeight === 0`

- [ ] **Step 1: Update the `<script setup>` block**

  Replace the entire `<script setup>` section (lines 1–83) with:

  ```ts
  <script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useChallenge } from '../composables/useChallenge'
  import { useComments } from '../composables/useComments'
  import MonacoEditor from './MonacoEditor.vue'
  import type { ChallengeFile } from '../types/challenge'

  const props = defineProps<{
    files: ChallengeFile[]
    activeFileIndex: number
  }>()

  const emit = defineEmits<{
    selectFile: [index: number]
  }>()

  const { activeChallengeId, activeFramework, getActiveCode, setActiveCode, isDirty, commitAndRun } = useChallenge()

  const EDITOR_THEME_KEY = 'codereview:editor-theme'
  const editorTheme = ref<'vs-dark' | 'vs'>(
    (localStorage.getItem(EDITOR_THEME_KEY) as 'vs-dark' | 'vs') ?? 'vs-dark'
  )
  function toggleEditorTheme() {
    editorTheme.value = editorTheme.value === 'vs-dark' ? 'vs' : 'vs-dark'
    localStorage.setItem(EDITOR_THEME_KEY, editorTheme.value)
  }

  const activeFile = computed(() => {
    const idx = Math.min(props.activeFileIndex, props.files.length - 1)
    return props.files[idx]
  })

  const commentKey = computed(
    () => `${activeChallengeId.value}:${activeFramework.value}:${activeFile.value?.name ?? ''}`
  )

  const { comments, addComment, updateComment, removeComment } = useComments(commentKey)

  // ── View zone state ──────────────────────────────────────────────────────
  const editorRef = ref<InstanceType<typeof MonacoEditor> | null>(null)
  const pendingLine = ref<number | null>(null)
  const editingId   = ref<string | null>(null)
  const zoneIds     = new Map<string, string>()  // commentId → Monaco zoneId
  let   pendingZoneId: string | null = null

  function getEditor() { return editorRef.value?.editor?.value ?? null }

  // ── View zone builders (plain DOM nodes that close over Vue refs) ─────────

  function buildFormNode(line: number): HTMLDivElement {
    const div = document.createElement('div')
    div.style.cssText = 'padding:8px 10px 8px 48px;background:#f0f6ff;border-top:2px solid #0969da;border-bottom:1px solid #c7d7f0;font-family:system-ui,sans-serif;box-sizing:border-box;'

    const ta = document.createElement('textarea')
    ta.placeholder = 'Leave a review comment…'
    ta.style.cssText = 'width:100%;box-sizing:border-box;background:#fff;border:1px solid #0969da;border-radius:6px;font-size:12px;font-family:system-ui,sans-serif;padding:5px 8px;resize:none;height:44px;outline:none;display:block;'
    div.appendChild(ta)

    const row = document.createElement('div')
    row.style.cssText = 'display:flex;gap:6px;margin-top:5px;'

    const save = document.createElement('button')
    save.textContent = 'Add comment'
    save.style.cssText = 'background:#0969da;color:#fff;border:none;border-radius:5px;padding:3px 10px;font-size:11px;font-weight:600;font-family:system-ui;cursor:pointer;'
    save.addEventListener('click', () => {
      const text = ta.value.trim()
      if (text) addComment(line, text)
      pendingLine.value = null
    })

    const cancel = document.createElement('button')
    cancel.textContent = 'Cancel'
    cancel.style.cssText = 'background:transparent;color:#57606a;border:1px solid #d0d7de;border-radius:5px;padding:3px 10px;font-size:11px;font-family:system-ui;cursor:pointer;'
    cancel.addEventListener('click', () => { pendingLine.value = null })

    row.appendChild(save)
    row.appendChild(cancel)
    div.appendChild(row)
    return div
  }

  function buildCommentNode(comment: { id: string; line: number; text: string }, isEditing: boolean): HTMLDivElement {
    const div = document.createElement('div')

    if (isEditing) {
      div.style.cssText = 'padding:8px 10px 8px 48px;background:#fffbdd;border-top:2px solid #d4a000;border-bottom:1px solid #e3c87a;font-family:system-ui,sans-serif;box-sizing:border-box;'

      const ta = document.createElement('textarea')
      ta.value = comment.text
      ta.style.cssText = 'width:100%;box-sizing:border-box;background:#fff;border:1px solid #d4a000;border-radius:6px;font-size:12px;font-family:system-ui,sans-serif;padding:5px 8px;resize:none;height:44px;outline:none;display:block;'
      div.appendChild(ta)

      const row = document.createElement('div')
      row.style.cssText = 'display:flex;gap:6px;margin-top:5px;'

      const save = document.createElement('button')
      save.textContent = 'Save changes'
      save.style.cssText = 'background:#9a6700;color:#fff;border:none;border-radius:5px;padding:3px 10px;font-size:11px;font-weight:600;font-family:system-ui;cursor:pointer;'
      save.addEventListener('click', () => {
        const text = ta.value.trim()
        if (text) updateComment(comment.id, text)
        editingId.value = null
      })

      const cancel = document.createElement('button')
      cancel.textContent = 'Cancel'
      cancel.style.cssText = 'background:transparent;color:#57606a;border:1px solid #d0d7de;border-radius:5px;padding:3px 10px;font-size:11px;font-family:system-ui;cursor:pointer;'
      cancel.addEventListener('click', () => { editingId.value = null })

      row.appendChild(save)
      row.appendChild(cancel)
      div.appendChild(row)
    } else {
      div.style.cssText = 'padding:6px 8px 6px 48px;background:#f6f8fa;border-top:2px solid #0969da;border-bottom:1px solid #eaeef2;font-family:system-ui,sans-serif;display:flex;align-items:flex-start;gap:8px;box-sizing:border-box;'

      const avatar = document.createElement('div')
      avatar.textContent = 'R'
      avatar.style.cssText = 'width:20px;height:20px;border-radius:4px;background:#0969da;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;'

      const content = document.createElement('div')
      content.style.cssText = 'flex:1;min-width:0;'

      const meta = document.createElement('div')
      meta.textContent = `Reviewer · line ${comment.line}`
      meta.style.cssText = 'font-size:10px;color:#8c959f;margin-bottom:2px;'

      const text = document.createElement('div')
      text.textContent = comment.text
      text.style.cssText = 'font-size:12px;color:#24292f;line-height:1.5;'

      const btns = document.createElement('div')
      btns.style.cssText = 'display:flex;gap:8px;margin-top:4px;'

      const editBtn = document.createElement('button')
      editBtn.textContent = 'Edit'
      editBtn.style.cssText = 'font-size:10px;color:#57606a;background:none;border:none;cursor:pointer;padding:0;font-family:system-ui;'
      editBtn.addEventListener('click', () => { editingId.value = comment.id })

      const delBtn = document.createElement('button')
      delBtn.textContent = 'Delete'
      delBtn.style.cssText = 'font-size:10px;color:#cf222e;background:none;border:none;cursor:pointer;padding:0;font-family:system-ui;'
      delBtn.addEventListener('click', () => removeComment(comment.id))

      btns.appendChild(editBtn)
      btns.appendChild(delBtn)
      content.appendChild(meta)
      content.appendChild(text)
      content.appendChild(btns)
      div.appendChild(avatar)
      div.appendChild(content)
    }

    return div
  }

  // ── Sync all view zones from current state ────────────────────────────────

  function syncViewZones() {
    const ed = getEditor()
    if (!ed) return
    ed.changeViewZones((accessor: any) => {
      zoneIds.forEach((id) => accessor.removeZone(id))
      zoneIds.clear()
      if (pendingZoneId) { accessor.removeZone(pendingZoneId); pendingZoneId = null }

      for (const comment of comments.value) {
        const dom = buildCommentNode(comment, editingId.value === comment.id)
        const id = accessor.addZone({ afterLineNumber: comment.line, heightInPx: 90, domNode: dom })
        zoneIds.set(comment.id, id)
      }

      if (pendingLine.value !== null) {
        const dom = buildFormNode(pendingLine.value)
        pendingZoneId = accessor.addZone({ afterLineNumber: pendingLine.value, heightInPx: 90, domNode: dom })
      }
    })
  }

  // ── Watchers ──────────────────────────────────────────────────────────────

  watch([comments, pendingLine, editingId], syncViewZones)
  // Fires once when Monaco finishes async init; .value chain is reactive inside watch getter
  watch(() => editorRef.value?.editor?.value, (ed) => { if (ed) syncViewZones() })
  // Reset transient UI state on file tab change
  watch(commentKey, () => { pendingLine.value = null; editingId.value = null })

  // ── Gutter click handler (emitted from MonacoEditor) ─────────────────────

  function onGutterClick(line: number) {
    pendingLine.value = line
    editingId.value = null
  }

  const editorCode = computed(() => getActiveCode())
  </script>
  ```

- [ ] **Step 2: Update the `<template>` block**

  Replace the entire `<template>` (lines 85–174) with:

  ```html
  <template>
    <div class="code-pane">
      <div class="pane-header">
        <div class="file-tabs">
          <button
            v-for="(file, i) in files"
            :key="file.name"
            class="file-tab"
            :class="{ active: i === activeFileIndex }"
            @click="emit('selectFile', i)"
          >
            <span class="file-dot" />
            {{ file.name }}
          </button>
        </div>
        <div class="pane-actions">
          <button
            class="editor-theme-btn"
            :title="editorTheme === 'vs-dark' ? 'Switch to light editor' : 'Switch to dark editor'"
            @click="toggleEditorTheme"
          >{{ editorTheme === 'vs-dark' ? '🌙' : '☀️' }}</button>
          <button class="run-btn" @click="commitAndRun()">
            <span v-if="isDirty" class="dirty-dot" />
            &#9654; Run
          </button>
        </div>
      </div>

      <div class="editor-area">
        <MonacoEditor
          v-if="activeFile"
          ref="editorRef"
          :code="editorCode"
          :language="activeFile.language"
          :theme="editorTheme"
          @change="setActiveCode"
          @gutterClick="onGutterClick"
        />
      </div>
    </div>
  </template>
  ```

- [ ] **Step 3: Update the `<style scoped>` block**

  Remove all CSS rules that only applied to the deleted comment panel and form. Keep the rules that still apply. Replace the entire `<style scoped>` section with:

  ```css
  <style scoped>
  .code-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg);
  }

  .pane-header {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    background: var(--bg-header);
    flex-shrink: 0;
    min-height: 38px;
  }

  .file-tabs {
    display: flex;
    align-items: stretch;
    overflow-x: auto;
  }

  .file-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 16px;
    font-family: var(--font-ui);
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
  }

  .file-tab:hover { color: var(--text); }

  .file-tab.active {
    color: var(--text);
    border-bottom-color: var(--accent);
  }

  .file-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-faint);
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .file-tab.active .file-dot { background: var(--accent); }

  .pane-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
  }

  .run-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 13px;
    background: var(--accent);
    border: none;
    border-radius: 6px;
    color: #fff;
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .run-btn:hover { opacity: 0.85; }

  .dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .editor-theme-btn {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.85rem;
    height: 28px;
    width: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: border-color 0.15s;
  }

  .editor-theme-btn:hover { border-color: var(--text-faint); }

  .editor-area {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  </style>
  ```

- [ ] **Step 4: Verify the app runs**

  ```bash
  npm run dev
  ```

  Open an interview session. Verify:
  - The old bottom comment panel is gone
  - The "+ Comment" button is gone
  - Clicking the Monaco gutter (the line number area) opens an inline form zone below that line
  - Typing in the textarea and clicking "Add comment" adds a read-only view zone
  - The Edit button replaces the zone with a yellow-tinted edit form
  - The Delete button removes the zone

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/CodePane.vue
  git commit -m "feat: replace bottom comment panel with Monaco view zone inline comments"
  ```

---

## Task 7: Wire Comments Persistence in `InterviewerView.vue`

**Files:**
- Modify: `src/views/InterviewerView.vue`

- [ ] **Step 1: Add the three module-level imports from `useComments`**

  After the existing imports block (line 18), add:

  ```ts
  import { hydrateComments, getAllComments, setOnPersist as setCommentsOnPersist } from '../composables/useComments'
  ```

- [ ] **Step 2: Add `saveComments` and `flushComments` to the `useSessionPersistence` destructure**

  Change the destructure at lines 27–37 to include both:

  ```ts
  const {
    loadSession,
    saveNotes,
    flushNotes,
    saveBugsChecked,
    flushBugsChecked,
    saveComments,
    flushComments,
    saveChallengeMeta,
    endSession,
    saveFailed,
    metaSyncFailed,
  } = useSessionPersistence()
  ```

- [ ] **Step 3: Add hydration and persistence wiring in `onMounted` (in-progress branch)**

  In `onMounted`, after `setBugsOnPersist(saveBugsChecked)` (line 82), add:

  ```ts
  hydrateComments(result.data.comments ?? [], result.data.challenge_id, result.data.framework)
  setCommentsOnPersist(saveComments)
  // Do NOT call saveComments here — commentsLatestValue was already set by loadSession
  ```

- [ ] **Step 4: Update `confirmEnd` to flush comments**

  Replace lines 114–121 of `confirmEnd` with:

  ```ts
  saveNotes(notes.value)
  saveComments(getAllComments())
  const [r1, r2, r3] = await Promise.all([flushNotes(), flushBugsChecked(), flushComments()])
  if (!r1.ok || !r2.ok || !r3.ok) {
    modalError.value = 'Could not save — check your connection.'
    endingInProgress.value = false
    return
  }
  ```

- [ ] **Step 5: Add cleanup in `onUnmounted`**

  In `onUnmounted` (around line 142), add `setCommentsOnPersist(null)` alongside the other cleanups:

  ```ts
  onUnmounted(() => {
    timerInstance?.stop()
    setNotesOnPersist(null)
    setBugsOnPersist(null)
    setCommentsOnPersist(null)
  })
  ```

- [ ] **Step 6: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 7: Manual end-to-end test**

  1. Start a new interview session
  2. Add two inline comments in the editor via gutter click
  3. Click "End Interview" → confirm
  4. Verify no save error appears
  5. Check Supabase: `SELECT comments FROM sessions ORDER BY started_at DESC LIMIT 1;` — should show a JSON array with your 2 comments

- [ ] **Step 8: Commit**

  ```bash
  git add src/views/InterviewerView.vue
  git commit -m "feat: wire comments persistence in InterviewerView — hydrate on mount, flush on end"
  ```

---

## Task 8: Add "Review Comments" Section to `SessionSummaryView.vue`

**Files:**
- Modify: `src/views/SessionSummaryView.vue`

- [ ] **Step 1: Add the `sortedComments` computed in `<script setup>`**

  First, add the import at the top of the script alongside the existing `SessionRow` import:

  ```ts
  import type { Comment } from '../types/comment'
  ```

  Then, after the `renderedNotes` computed (around line 38), add:

  ```ts
  const sortedComments = computed<Comment[]>(() =>
    [...(props.session.comments ?? [])].sort((a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line
    )
  )
  ```

- [ ] **Step 2: Add the "Review Comments" section in the template**

  After the closing `</div>` of `.notes-section` (after line 111, before `.actions-row`), insert:

  ```html
  <div class="comments-section">
    <div class="section-label">Review Comments</div>
    <div v-if="sortedComments.length === 0" class="comments-empty">No comments recorded.</div>
    <div v-else class="comment-list">
      <div v-for="c in sortedComments" :key="c.id" class="comment-row">
        <span class="file-chip">{{ c.file }}</span>
        <span class="line-chip">L{{ c.line }}</span>
        <span class="comment-text">{{ c.text }}</span>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 3: Add styles for the new section**

  After the `.notes-empty` rule in `<style scoped>`, add:

  ```css
  .comments-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .comment-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .comment-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
  }

  .file-chip {
    font-size: 0.68rem;
    font-weight: 600;
    background: var(--bg-elevated);
    color: var(--text-faint);
    border-radius: 3px;
    padding: 1px 5px;
    flex-shrink: 0;
    font-family: var(--font-mono);
    margin-top: 1px;
  }

  .line-chip {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-dim);
    border-radius: 3px;
    padding: 1px 5px;
    flex-shrink: 0;
    font-family: var(--font-mono);
    margin-top: 1px;
  }

  .comment-text {
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.5;
    flex: 1;
  }

  .comments-empty {
    font-size: 0.8rem;
    color: var(--text-faint);
    font-style: italic;
  }
  ```

- [ ] **Step 4: Verify in browser**

  Load a finished session. Verify:
  - "Review Comments" section appears below Notes
  - If no comments: "No comments recorded." in italic
  - If comments present: each row shows file chip, line chip, comment text
  - Comments are sorted by file name, then line number

- [ ] **Step 5: Commit**

  ```bash
  git add src/views/SessionSummaryView.vue
  git commit -m "feat: add Review Comments section to session summary"
  ```

---

## Task 9: Update `summary-markdown.ts` and Its Tests

**Files:**
- Modify: `src/utils/summary-markdown.ts`
- Modify: `tests/summary-markdown.test.ts`

- [ ] **Step 1: Write the failing tests first**

  Add a `Comment` import at the top of `tests/summary-markdown.test.ts`:

  ```ts
  import type { Comment } from '../src/types/comment'
  ```

  Add these tests after the existing `describe` block:

  ```ts
  describe('generateSummaryMarkdown — comments block', () => {
    const sessionWithComments: SessionRow = {
      ...session,
      comments: [
        { id: 'c1', file: 'App.vue', line: 12, text: 'This variable is unused.', timestamp: 1000 },
        { id: 'c2', file: 'App.vue', line: 34, text: 'Consider extracting this to a helper.', timestamp: 2000 },
        { id: 'c3', file: 'Child.vue', line: 2, text: 'Missing key prop.', timestamp: 3000 },
      ],
    }

    it('includes a ## Review Comments heading', () => {
      const md = generateSummaryMarkdown(sessionWithComments, 'User Profile Fetcher', bugs)
      expect(md).toContain('## Review Comments')
    })

    it('lists comments sorted by file then line', () => {
      const md = generateSummaryMarkdown(sessionWithComments, 'User Profile Fetcher', bugs)
      const idx12 = md.indexOf('L12')
      const idx34 = md.indexOf('L34')
      const idxChild = md.indexOf('Child.vue')
      expect(idx12).toBeLessThan(idx34)
      expect(idx34).toBeLessThan(idxChild)
    })

    it('formats comment lines as `file` Lline: text', () => {
      const md = generateSummaryMarkdown(sessionWithComments, 'User Profile Fetcher', bugs)
      expect(md).toContain('- `App.vue` L12: This variable is unused.')
      expect(md).toContain('- `Child.vue` L2: Missing key prop.')
    })

    it('uses placeholder when there are no comments', () => {
      const md = generateSummaryMarkdown(
        { ...session, comments: [] },
        'User Profile Fetcher',
        bugs,
      )
      expect(md).toContain('_No comments recorded._')
    })

    it('uses placeholder when comments field is null', () => {
      const md = generateSummaryMarkdown(
        { ...session, comments: null },
        'User Profile Fetcher',
        bugs,
      )
      expect(md).toContain('_No comments recorded._')
    })

    it('Review Comments section appears after Notes section', () => {
      const md = generateSummaryMarkdown(sessionWithComments, 'User Profile Fetcher', bugs)
      const notesIdx = md.indexOf('## Notes')
      const commentsIdx = md.indexOf('## Review Comments')
      expect(notesIdx).toBeLessThan(commentsIdx)
    })
  })
  ```

  Also add `comments: null` to the existing `session` fixture (since `SessionRow` now requires it):

  ```ts
  const session: SessionRow = {
    id: 'abc12345',
    candidate_name: 'Alice Chen',
    challenge_id: 'fetch-race',
    framework: 'react',
    notes: 'Good understanding of hooks.',
    bugs_checked: ['fr-2'],
    total_bugs: 2,
    started_at: '2026-03-18T10:00:00.000Z',
    ended_at: '2026-03-18T10:45:30.000Z',
    expires_at: '2026-04-17T10:00:00.000Z',
    comments: null,    // ← add this
  }
  ```

- [ ] **Step 2: Run to verify the new tests fail**

  ```bash
  npx vitest run tests/summary-markdown.test.ts
  ```

  Expected: the 6 new tests FAIL (no `## Review Comments` in output yet), existing tests PASS.

- [ ] **Step 3: Update `src/utils/summary-markdown.ts`**

  Replace the return statement:

  ```ts
  const commentLines = (session.comments ?? [])
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
    .map((c) => `- \`${c.file}\` L${c.line}: ${c.text}`)
    .join('\n')

  return [
    `# Interview — ${session.candidate_name}`,
    `Date: ${date} · Duration: ${duration}`,
    `Challenge: ${challengeTitle} (${session.framework})`,
    '',
    `## Bugs: ${checkedCount}/${session.total_bugs}`,
    bugLines,
    '',
    '## Notes',
    session.notes || '_No notes recorded._',
    '',
    '## Review Comments',
    commentLines || '_No comments recorded._',
  ].join('\n')
  ```

  Also add the `Comment` import at the top if it's not already imported (it's accessible via `SessionRow` which already imports it, but the local type reference in `session.comments` needs it resolved):

  The function signature stays the same — `session: SessionRow` already carries the comments field.

- [ ] **Step 4: Run all tests**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass including the 6 new comment tests.

- [ ] **Step 5: Commit**

  ```bash
  git add src/utils/summary-markdown.ts tests/summary-markdown.test.ts
  git commit -m "feat: add ## Review Comments block to summary markdown; update tests"
  ```

---

## Final Verification

- [ ] **Run full test suite**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass.

- [ ] **Full end-to-end manual test**

  1. Start a new interview session
  2. In the code editor, click a line number in the gutter → inline form appears below that line
  3. Type a comment and click "Add comment" → form is replaced by a read-only zone with "Reviewer · line N"
  4. Click "Edit" → yellow edit form appears; change the text; click "Save changes" → zone updates
  5. Add a second comment on a different line in a different file tab
  6. Verify each tab shows only its own comments; switching tabs resets any open form
  7. Reload the page and reopen the same session → comments are hydrated from Supabase (persistent)
  8. Click "End Interview" → summary shows "Review Comments" section sorted by file + line
  9. Click "Copy summary" → markdown includes `## Review Comments` block

- [ ] **Final commit if any cleanup needed**

  ```bash
  git add -p   # stage only intentional changes
  git commit -m "chore: final cleanup for inline comments feature"
  ```
