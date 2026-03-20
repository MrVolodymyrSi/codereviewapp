# Gutter Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header `+ Comment` button and bottom comment panel with GitHub-style inline gutter comments — hovering a line shows a `+` icon, clicking opens an inline form, and comments are always visible as compact zones inside the Monaco editor.

**Architecture:** Monaco's `glyphMargin`, `deltaDecorations`, and `changeViewZones` APIs drive all gutter interaction. A new `useGutterComments` composable owns all Monaco imperative logic and syncs with Vue's reactive `comments` ref via `watchEffect`/`watch`. `MonacoEditor.vue` gains a `readOnly` prop and emits `ready(editor, monaco)` after init; `CodePane.vue` wires these up and removes the old button/panel.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Monaco Editor (`@monaco-editor/loader`), Vitest

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/components/MonacoEditor.vue` | Add `readOnly` prop, emit `ready` after editor created |
| Create | `src/composables/useGutterComments.ts` | All Monaco gutter/zone imperative logic |
| Create | `tests/useGutterComments.test.ts` | Unit tests for composable logic |
| Modify | `src/components/CodePane.vue` | Wire `@ready`, call composable, remove old button/panel |

---

## Task 1: Update MonacoEditor.vue — readOnly prop + ready emit

**Files:**
- Modify: `src/components/MonacoEditor.vue`

This is a small, targeted change. The editor gains one prop (`readOnly`) and one emit (`ready`), fired after `editor.create`. No test needed — it is a two-line change to a framework integration shim, verified by the CodePane integration in Task 3.

- [ ] **Step 1: Add the `readOnly` prop and `ready` emit to `MonacoEditor.vue`**

Open `src/components/MonacoEditor.vue`. Make the following changes:

Change `defineProps`:
```ts
const props = defineProps<{ code: string; language: string; theme?: 'vs-dark' | 'vs'; readOnly?: boolean }>()
```

Change `defineEmits`:
```ts
const emit = defineEmits<{ change: [string]; ready: [editor: any, monaco: any] }>()
```

In the `onMounted` block, add two options to `monacoInstance.editor.create(...)` and emit `ready` after it:
```ts
editor = monacoInstance.editor.create(container.value!, {
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
  readOnly: props.readOnly ?? false,
  glyphMargin: true,
  lineNumbersMinChars: 3,
})
emit('ready', editor, monacoInstance)
editor.onDidChangeModelContent(() => emit('change', editor.getValue()))
```

Note: `emit('ready', ...)` goes **before** `onDidChangeModelContent` registration. In read-only mode `onDidChangeModelContent` still fires for programmatic `setValue` calls (e.g., file tab switching) — this is intentional.

- [ ] **Step 2: Commit**

```bash
git add src/components/MonacoEditor.vue
git commit -m "feat: add readOnly prop and ready emit to MonacoEditor"
```

---

## Task 2: Create useGutterComments composable (TDD)

**Files:**
- Create: `src/composables/useGutterComments.ts`
- Create: `tests/useGutterComments.test.ts`

The composable encapsulates all Monaco imperative API calls. It is tested using a minimal Monaco mock. The test file uses jsdom environment (via per-file annotation) because the composable creates DOM nodes.

### Step 2a — Write the failing tests

- [ ] **Step 1: Create the test file with a Monaco mock**

Create `tests/useGutterComments.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import type { Comment } from '../src/types/comment'

// Minimal Monaco editor mock
function createMockEditor() {
  let zoneCounter = 0
  const zones = new Map<string, any>()
  const decorationSets: string[][] = []

  return {
    getContainerDomNode: () => document.createElement('div'),
    changeViewZones: vi.fn((cb: (a: any) => void) => {
      cb({
        addZone: vi.fn((zone: any) => {
          const id = `zone-${++zoneCounter}`
          zones.set(id, zone)
          return id
        }),
        removeZone: vi.fn((id: string) => zones.delete(id)),
      })
    }),
    deltaDecorations: vi.fn((_old: string[], _new: any[]) => ['dec-1']),
    onMouseMove: vi.fn(() => ({ dispose: vi.fn() })),
    onMouseLeave: vi.fn(() => ({ dispose: vi.fn() })),
    onMouseDown: vi.fn(() => ({ dispose: vi.fn() })),
    _zones: zones,
  }
}

const mockMonaco = {
  editor: {
    MouseTargetType: {
      GUTTER_GLYPH_MARGIN: 2,
    },
  },
  Range: class {
    constructor(
      public startLineNumber: number,
      public startColumn: number,
      public endLineNumber: number,
      public endColumn: number,
    ) {}
  },
}

describe('useGutterComments', () => {
  let editor: ReturnType<typeof createMockEditor>

  beforeEach(() => {
    editor = createMockEditor()
  })

  it('returns init and dispose functions', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingLine = ref<number | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingLine, draftText, {
      onGutterClick: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    })
    expect(typeof gc.init).toBe('function')
    expect(typeof gc.dispose).toBe('function')
  })

  it('init registers mouse event handlers on the editor', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingLine = ref<number | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingLine, draftText, {
      onGutterClick: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    })
    gc.init(editor, mockMonaco)
    expect(editor.onMouseMove).toHaveBeenCalledOnce()
    expect(editor.onMouseLeave).toHaveBeenCalledOnce()
    expect(editor.onMouseDown).toHaveBeenCalledOnce()
  })

  it('creates a comment zone when a comment is added after init', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const commentsArr = ref<Comment[]>([])
    const comments = computed(() => commentsArr.value)
    const pendingLine = ref<number | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingLine, draftText, {
      onGutterClick: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    })
    gc.init(editor, mockMonaco)

    commentsArr.value = [
      { id: 'c1', file: 'App.vue', line: 3, text: 'missing error handling', timestamp: 1 },
    ]
    // Allow Vue reactivity to flush
    await Promise.resolve()

    expect(editor.changeViewZones).toHaveBeenCalled()
    expect(editor._zones.size).toBe(1)
  })

  it('removes a comment zone when a comment is deleted', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const commentsArr = ref<Comment[]>([
      { id: 'c1', file: 'App.vue', line: 3, text: 'note', timestamp: 1 },
    ])
    const comments = computed(() => commentsArr.value)
    const pendingLine = ref<number | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingLine, draftText, {
      onGutterClick: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    })
    gc.init(editor, mockMonaco)
    await Promise.resolve()
    expect(editor._zones.size).toBe(1)

    commentsArr.value = []
    await Promise.resolve()
    expect(editor._zones.size).toBe(0)
  })

  it('adding a second comment adds a second zone without removing the first', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const commentsArr = ref<Comment[]>([
      { id: 'c1', file: 'App.vue', line: 3, text: 'first', timestamp: 1 },
    ])
    const comments = computed(() => commentsArr.value)
    const pendingLine = ref<number | null>(null)
    const draftText = ref('')
    const changeViewZonesSpy = editor.changeViewZones
    const gc = useGutterComments(comments, pendingLine, draftText, {
      onGutterClick: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    })
    gc.init(editor, mockMonaco)
    await Promise.resolve()
    const callCountAfterFirst = changeViewZonesSpy.mock.calls.length

    commentsArr.value = [
      { id: 'c1', file: 'App.vue', line: 3, text: 'first', timestamp: 1 },
      { id: 'c2', file: 'App.vue', line: 7, text: 'second', timestamp: 2 },
    ]
    await Promise.resolve()

    expect(editor._zones.size).toBe(2)
    // changeViewZones should have been called again for the new comment only
    expect(changeViewZonesSpy.mock.calls.length).toBeGreaterThan(callCountAfterFirst)
  })

  it('sets pendingLine to the clicked line on onGutterClick', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingLine = ref<number | null>(null)
    const draftText = ref('')
    const onGutterClick = vi.fn((line: number) => { pendingLine.value = line })
    const gc = useGutterComments(comments, pendingLine, draftText, {
      onGutterClick,
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    })
    gc.init(editor, mockMonaco)

    // Simulate gutter click by calling the onMouseDown handler
    const mouseDownHandler = editor.onMouseDown.mock.calls[0][0]
    mouseDownHandler({
      target: {
        type: mockMonaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN,
        position: { lineNumber: 5 },
      },
    })

    expect(onGutterClick).toHaveBeenCalledWith(5)
    expect(pendingLine.value).toBe(5)
  })

  it('creates a form zone when pendingLine is set', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingLine = ref<number | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingLine, draftText, {
      onGutterClick: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    })
    gc.init(editor, mockMonaco)
    await Promise.resolve()

    pendingLine.value = 4
    await Promise.resolve()

    expect(editor._zones.size).toBe(1)
  })

  it('removes the form zone when pendingLine is cleared', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingLine = ref<number | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingLine, draftText, {
      onGutterClick: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    })
    gc.init(editor, mockMonaco)

    pendingLine.value = 4
    await Promise.resolve()
    expect(editor._zones.size).toBe(1)

    pendingLine.value = null
    await Promise.resolve()
    expect(editor._zones.size).toBe(0)
  })

  it('dispose cleans up all zones and event listeners', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const commentsArr = ref<Comment[]>([
      { id: 'c1', file: 'App.vue', line: 3, text: 'note', timestamp: 1 },
    ])
    const comments = computed(() => commentsArr.value)
    const pendingLine = ref<number | null>(4)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingLine, draftText, {
      onGutterClick: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    })
    gc.init(editor, mockMonaco)
    await Promise.resolve()
    expect(editor._zones.size).toBeGreaterThan(0)

    gc.dispose()
    // After dispose, all zones removed
    expect(editor._zones.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests — expect them to fail (module not found)**

```bash
cd /path/to/codereview && npx vitest run tests/useGutterComments.test.ts
```

Expected: FAIL — `Cannot find module '../src/composables/useGutterComments'`

### Step 2b — Implement the composable

- [ ] **Step 3: Create `src/composables/useGutterComments.ts`**

```ts
import { watchEffect, watch, type ComputedRef, type Ref } from 'vue'
import type { Comment } from '../types/comment'

interface Callbacks {
  onGutterClick: (line: number) => void
  onDelete: (id: string) => void
  onSubmit: () => void
  onCancel: () => void
}

const STYLE_ID = 'gc-styles'
const MAX_ZONE_HEIGHT = 200   // px — hard cap per zone

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  // Single-instance assumption: this app renders one CodePane at a time.
  // If multiple instances become possible, replace with a ref-counted guard.
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .gc-glyph-add::before {
      content: '+';
      font-size: 12px;
      font-weight: 700;
      color: #58a6ff;
      cursor: pointer;
      line-height: 1;
    }
    .gc-zone {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 12px 6px 8px;
      background: var(--bg-elevated, #161b22);
      border-left: 3px solid #1f6feb;
      box-sizing: border-box;
      width: 100%;
    }
    .gc-avatar {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: #1f6feb;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-family: var(--font-ui, sans-serif);
    }
    .gc-avatar--pending {
      background: var(--bg-surface, #2d333b);
      color: var(--text-muted, #8b949e);
      border: 1px solid var(--border, #30363d);
    }
    .gc-body { flex: 1; min-width: 0; }
    .gc-meta {
      font-family: var(--font-ui, sans-serif);
      font-size: 11px;
      color: var(--text-muted, #8b949e);
      margin-bottom: 2px;
    }
    .gc-meta strong { color: var(--accent, #58a6ff); font-weight: 600; }
    .gc-line-ref { margin-left: 6px; font-family: var(--font-mono, monospace); }
    .gc-text {
      margin: 0;
      font-family: var(--font-ui, sans-serif);
      font-size: 12px;
      color: var(--text-muted, #c9d1d9);
      line-height: 1.45;
      max-height: 120px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .gc-delete {
      background: none;
      border: none;
      color: var(--text-faint, #666);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
      align-self: flex-start;
    }
    .gc-delete:hover { color: var(--danger, #f85149); }
    .gc-form-inner { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .gc-textarea {
      width: 100%;
      min-height: 52px;
      background: var(--bg-input, #0d1117);
      border: 1px solid var(--border, #30363d);
      border-radius: 6px;
      color: var(--text, #c9d1d9);
      font-family: var(--font-ui, sans-serif);
      font-size: 12px;
      padding: 6px 8px;
      resize: vertical;
      box-sizing: border-box;
      outline: none;
    }
    .gc-textarea:focus { border-color: var(--accent, #58a6ff); }
    .gc-form-actions { display: flex; gap: 6px; justify-content: flex-end; }
    .gc-btn-cancel {
      background: transparent;
      border: 1px solid var(--border, #30363d);
      border-radius: 6px;
      color: var(--text-muted, #8b949e);
      cursor: pointer;
      font-family: var(--font-ui, sans-serif);
      font-size: 11px;
      padding: 3px 10px;
    }
    .gc-btn-submit {
      background: var(--accent, #238636);
      border: none;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-family: var(--font-ui, sans-serif);
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
    }
  `
  document.head.appendChild(style)
}

function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove()
}

function measureAndCreateZone(
  editor: any,
  editorContainer: HTMLElement,
  domNode: HTMLElement,
  afterLineNumber: number,
): string {
  // Pass 1: append to live document so CSS (including max-height) is applied,
  // then read offsetHeight — not scrollHeight, which ignores max-height.
  domNode.style.visibility = 'hidden'
  domNode.style.position = 'absolute'
  editorContainer.appendChild(domNode)
  const height = Math.min(domNode.offsetHeight || 60, MAX_ZONE_HEIGHT)
  editorContainer.removeChild(domNode)
  domNode.style.visibility = ''
  domNode.style.position = ''

  // Pass 2: insert with known height
  let zoneId!: string
  editor.changeViewZones((accessor: any) => {
    zoneId = accessor.addZone({ afterLineNumber, heightInPx: height, domNode })
  })
  return zoneId
}

function buildCommentNode(comment: Comment, onDelete: (id: string) => void): HTMLElement {
  const zone = document.createElement('div')
  zone.className = 'gc-zone gc-comment'

  const avatar = document.createElement('div')
  avatar.className = 'gc-avatar'
  avatar.textContent = 'R'

  const body = document.createElement('div')
  body.className = 'gc-body'

  const meta = document.createElement('div')
  meta.className = 'gc-meta'
  meta.innerHTML = `<strong>Reviewer</strong><span class="gc-line-ref">line ${comment.line}</span>`

  const text = document.createElement('p')
  text.className = 'gc-text'
  text.textContent = comment.text

  const del = document.createElement('button')
  del.className = 'gc-delete'
  del.setAttribute('aria-label', 'Delete comment')
  del.textContent = '×'
  del.addEventListener('click', () => onDelete(comment.id))

  body.appendChild(meta)
  body.appendChild(text)
  zone.appendChild(avatar)
  zone.appendChild(body)
  zone.appendChild(del)
  return zone
}

function buildFormNode(
  draftText: Ref<string>,
  onSubmit: () => void,
  onCancel: () => void,
): HTMLElement {
  const zone = document.createElement('div')
  zone.className = 'gc-zone gc-form'

  const avatar = document.createElement('div')
  avatar.className = 'gc-avatar gc-avatar--pending'
  avatar.textContent = 'R'

  const inner = document.createElement('div')
  inner.className = 'gc-form-inner'

  const textarea = document.createElement('textarea')
  textarea.className = 'gc-textarea'
  textarea.placeholder = 'Leave a review comment…'
  textarea.addEventListener('input', () => { draftText.value = textarea.value })
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); onSubmit() }
  })

  const actions = document.createElement('div')
  actions.className = 'gc-form-actions'

  const cancel = document.createElement('button')
  cancel.className = 'gc-btn-cancel'
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', onCancel)

  const submit = document.createElement('button')
  submit.className = 'gc-btn-submit'
  submit.textContent = 'Add comment'
  submit.addEventListener('click', onSubmit)

  actions.appendChild(cancel)
  actions.appendChild(submit)
  inner.appendChild(textarea)
  inner.appendChild(actions)
  zone.appendChild(avatar)
  zone.appendChild(inner)

  requestAnimationFrame(() => textarea.focus())
  return zone
}

export function useGutterComments(
  comments: ComputedRef<Comment[]>,
  pendingLine: Ref<number | null>,
  draftText: Ref<string>,
  callbacks: Callbacks,
) {
  let editor: any = null
  let editorContainer: HTMLElement | null = null
  let stopCommentWatcher: (() => void) | null = null
  let stopFormWatcher: (() => void) | null = null
  const commentZoneMap = new Map<string, string>()   // commentId → zoneId
  let formZoneId: string | null = null
  let hoverDecorations: string[] = []
  const disposables: Array<{ dispose: () => void }> = []

  function removeZone(zoneId: string): void {
    editor.changeViewZones((accessor: any) => accessor.removeZone(zoneId))
  }

  function init(editorInstance: any, monaco: any): void {
    editor = editorInstance
    editorContainer = editor.getContainerDomNode()

    injectStyles()

    // ── Mouse events ──────────────────────────────────────────────────────
    let hoveredLine: number | null = null

    disposables.push(editor.onMouseMove((e: any) => {
      const line = e.target.position?.lineNumber ?? null
      const isGlyph = e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      const next = isGlyph ? line : null
      if (next === hoveredLine) return
      hoveredLine = next
      hoverDecorations = editor.deltaDecorations(
        hoverDecorations,
        next ? [{
          range: new monaco.Range(next, 1, next, 1),
          options: { glyphMarginClassName: 'gc-glyph-add' },
        }] : [],
      )
    }))

    disposables.push(editor.onMouseLeave(() => {
      if (hoveredLine === null) return
      hoveredLine = null
      hoverDecorations = editor.deltaDecorations(hoverDecorations, [])
    }))

    disposables.push(editor.onMouseDown((e: any) => {
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return
      const line = e.target.position?.lineNumber
      if (line != null) callbacks.onGutterClick(line)
    }))

    // ── Comment zone manager ──────────────────────────────────────────────
    // Read comments.value inside watchEffect to register the reactive dependency.
    stopCommentWatcher = watchEffect(() => {
      const current = comments.value
      const currentIds = new Set(current.map((c) => c.id))

      for (const [id, zoneId] of commentZoneMap) {
        if (!currentIds.has(id)) {
          removeZone(zoneId)
          commentZoneMap.delete(id)
        }
      }

      for (const comment of current) {
        if (!commentZoneMap.has(comment.id)) {
          const domNode = buildCommentNode(comment, callbacks.onDelete)
          const zoneId = measureAndCreateZone(editor, editorContainer!, domNode, comment.line - 1)
          commentZoneMap.set(comment.id, zoneId)
        }
      }
    })

    // ── Form zone manager ─────────────────────────────────────────────────
    stopFormWatcher = watch(pendingLine, (line) => {
      if (formZoneId !== null) {
        removeZone(formZoneId)
        formZoneId = null
      }
      if (line !== null) {
        const domNode = buildFormNode(draftText, callbacks.onSubmit, callbacks.onCancel)
        formZoneId = measureAndCreateZone(editor, editorContainer!, domNode, line - 1)
      }
    }, { immediate: true })
  }

  function dispose(): void {
    stopCommentWatcher?.()
    stopFormWatcher?.()

    for (const zoneId of commentZoneMap.values()) removeZone(zoneId)
    commentZoneMap.clear()

    if (formZoneId !== null) {
      removeZone(formZoneId)
      formZoneId = null
    }

    if (hoverDecorations.length) {
      editor?.deltaDecorations(hoverDecorations, [])
      hoverDecorations = []
    }

    for (const d of disposables) d.dispose()
    disposables.length = 0

    removeStyles()
    editor = null
    editorContainer = null
  }

  return { init, dispose }
}
```

- [ ] **Step 4: Run the tests — expect them to pass**

```bash
npx vitest run tests/useGutterComments.test.ts
```

Expected: All tests PASS.

If any test fails, read the error carefully. Common issues:
- Vue reactivity doesn't flush synchronously — if `watchEffect` doesn't run, add `import { nextTick } from 'vue'` and `await nextTick()` after mutations.
- `offsetHeight` returns 0 in jsdom (expected — zones will have height 0 in tests, that's fine).
- `requestAnimationFrame` is not defined in jsdom — wrap in `typeof requestAnimationFrame !== 'undefined' && requestAnimationFrame(...)`.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: All tests PASS (existing tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/composables/useGutterComments.ts tests/useGutterComments.test.ts
git commit -m "feat: add useGutterComments composable with Monaco view zones"
```

---

## Task 3: Update CodePane.vue — wire up composable, remove old UI

**Files:**
- Modify: `src/components/CodePane.vue`

No unit test needed — this is a Vue SFC integration change. Manual verification confirms the feature works end-to-end.

- [ ] **Step 1: Update the `<script setup>` in `CodePane.vue`**

Replace the entire `<script setup>` block with:

```ts
<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useChallenge } from '../composables/useChallenge'
import { useComments } from '../composables/useComments'
import { useGutterComments } from '../composables/useGutterComments'
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

const { comments, addComment, removeComment } = useComments(commentKey)

const pendingLine = ref<number | null>(null)
const draftText = ref('')

// Reset form zone when switching files
watch(() => props.activeFileIndex, () => {
  pendingLine.value = null
  draftText.value = ''
})

function onGutterClick(line: number) {
  if (pendingLine.value === line) {
    cancelComment()
  } else {
    pendingLine.value = line
    draftText.value = ''
  }
}

function submitComment() {
  if (pendingLine.value !== null && draftText.value.trim()) {
    addComment(pendingLine.value, draftText.value.trim())
  }
  pendingLine.value = null
  draftText.value = ''
}

function cancelComment() {
  pendingLine.value = null
  draftText.value = ''
}

const gutterComments = useGutterComments(comments, pendingLine, draftText, {
  onGutterClick,
  onDelete: removeComment,
  onSubmit: submitComment,
  onCancel: cancelComment,
})

function onEditorReady(editor: any, monaco: any) {
  gutterComments.init(editor, monaco)
}

onBeforeUnmount(() => gutterComments.dispose())

const editorCode = computed(() => getActiveCode())
</script>
```

- [ ] **Step 2: Update the `<template>` in `CodePane.vue`**

Replace the entire `<template>` block with:

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
        :code="editorCode"
        :language="activeFile.language"
        :theme="editorTheme"
        :read-only="true"
        @ready="onEditorReady"
        @change="setActiveCode"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 3: Remove unused CSS from `<style scoped>` in `CodePane.vue`**

Delete the following CSS rule blocks entirely (they are no longer used):

- `.comment-btn` and `.comment-btn:hover`
- `.comment-form-row`
- `.comment-avatar`
- `.form-avatar`
- `.comment-form-inner`
- `.comment-line-select`
- `.line-input`
- `.comment-textarea`, `.comment-textarea::placeholder`, `.comment-textarea:focus`
- `.comment-form-actions`
- `.shortcut-hint`
- `.btn-save`, `.btn-save:hover`
- `.btn-cancel`, `.btn-cancel:hover`
- `.comment-panel`
- `.comment-panel-header`
- `.comment-panel-body`
- `.comment-row`
- `.comment-body`
- `.comment-meta`
- `.comment-author`
- `.comment-line-ref`
- `.comment-text`
- `.remove-btn`, `.remove-btn:hover`

Keep all other rules (`.code-pane`, `.pane-header`, `.file-tabs`, `.file-tab`, `.file-dot`, `.pane-actions`, `.run-btn`, `.dirty-dot`, `.editor-theme-btn`, `.editor-area`).

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Start the dev server and verify manually**

```bash
npm run dev
```

Manual checklist:
- [ ] Hovering a line in the editor shows a `+` icon in the glyph margin
- [ ] Clicking `+` opens an inline form zone below that line
- [ ] Typing and clicking "Add comment" adds the comment as an inline zone
- [ ] The comment zone shows avatar, "Reviewer", line number, and comment text
- [ ] Clicking `×` on a comment removes it
- [ ] Clicking `+` on the same line again (while form is open) closes the form
- [ ] Switching file tabs closes any open form and shows correct comments
- [ ] Comments persist after page reload (Supabase sync unchanged)

- [ ] **Step 6: Commit**

```bash
git add src/components/CodePane.vue
git commit -m "feat: wire gutter comments into CodePane, remove old comment UI"
```
