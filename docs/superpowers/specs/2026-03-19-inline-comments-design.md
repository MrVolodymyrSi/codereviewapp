# Inline Code Review Comments — Design Spec

## Goal

Replace the bottom comment panel with GitHub-style inline comments that appear as view zones directly between code lines in the Monaco editor. Comments are server-persisted to Supabase and shown in the session summary.

## Interaction Flow

1. **Add** — hovering the Monaco gutter shows a `+` icon on each line. Clicking a gutter line opens an inline form zone (textarea + Save/Cancel) inserted below that line.
2. **Save** — submitting the form replaces the form zone with a read-only comment zone. The comment is saved to Supabase immediately.
3. **Edit** — clicking Edit inside a comment zone replaces it with a pre-filled editable form (yellow tint). Saving calls update on the server.
4. **Delete** — clicking Delete removes the zone and deletes from the server.
5. **Summary** — after the session ends, comments appear in the summary grouped by file, sorted by line number.

## Data Model

### Supabase migration

```sql
ALTER TABLE sessions ADD COLUMN comments JSONB NOT NULL DEFAULT '[]';
```

`createSessionRow` does not need to include `comments` in its INSERT — the DB default covers it.

### Comment type (`src/types/comment.ts`)

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

### Session type (`src/types/session.ts`)

Add one field:

```ts
export interface SessionRow {
  // ... existing fields ...
  comments: Comment[] | null
}
```

Typing as `Comment[] | null` (rather than non-optional `Comment[]`) is correct: rows created before the migration will have `null` at runtime despite the DB default. The `?? []` guards used in `SessionSummaryView` and `summary-markdown.ts` are intentional for this reason.

## Architecture

### Files changed

| File | Change |
|------|--------|
| `src/types/comment.ts` | Add `file`, `updatedAt` fields |
| `src/types/session.ts` | Add `comments: Comment[]` |
| `src/composables/useComments.ts` | Add `updateComment`, module-level `setOnPersist` / `hydrateComments` / `getAllComments`; drop localStorage |
| `src/components/MonacoEditor.vue` | Convert `editor`/`monacoInstance` to `ref`s; `defineExpose`; emit `gutterClick` |
| `src/components/CodePane.vue` | Own all view zone logic; remove bottom panel and `+ Comment` button |
| `src/composables/useSessionPersistence.ts` | Add `saveComments` / `flushComments` |
| `src/views/InterviewerView.vue` | Wire comments persistence on mount; flush in `confirmEnd`; clear in `onUnmounted` |
| `src/views/SessionSummaryView.vue` | Add "Review Comments" section |
| `src/utils/summary-markdown.ts` | Append comments block to generated markdown |

---

### `useComments.ts`

Module-level store `ref<Record<string, Comment[]>>({})` keyed by `challengeId:framework:filename` — same compound key format as today.

**Per-instance exports** (returned from `useComments(key: ComputedRef<string>)`):
- `comments` — computed array for the current key
- `addComment(line, text)` — creates comment; derives `file` as `key.value.split(':')[2]`; uses immutable-spread to replace `store.value`: `store.value = { ...store.value, [key.value]: [...(store.value[key.value] ?? []), { id: crypto.randomUUID(), file, line, text, timestamp: Date.now() }] }`; calls `_onPersist?.(getAllComments())`
- `updateComment(id, text)` — finds comment by id in the current key's array; replaces the entry via immutable-spread (same pattern as `addComment`); sets `text` and `updatedAt: Date.now()`; calls `_onPersist?.(getAllComments())`
- `removeComment(id)` — filters it out of the current key's array via immutable-spread; calls `_onPersist?.(getAllComments())`

> **Reactivity note:** All three mutations must replace `store.value` using the immutable-spread pattern (`store.value = { ...store.value, [key]: newArray }`). In-place `push()` or direct array mutation will not trigger the `comments` computed ref to update.

**Module-level named exports** (imported directly by `InterviewerView`, NOT returned from the composable call):

```ts
export function hydrateComments(
  comments: Comment[],
  challengeId: string,
  framework: string,
): void
```
Groups the flat array into the store by constructing the compound key `${challengeId}:${framework}:${c.file}` for each comment. Called once in `InterviewerView.onMounted` — never at any other time. Replaces the entire store.

```ts
export function getAllComments(): Comment[]
```
Returns `Object.values(store.value).flat()`.

```ts
export function setOnPersist(cb: ((comments: Comment[]) => void) | null): void
```
Sets the module-level `_onPersist` variable. Every mutation (`addComment`, `updateComment`, `removeComment`) calls `_onPersist?.(getAllComments())`.

In `InterviewerView`, import these three directly:
```ts
import { hydrateComments, getAllComments, setOnPersist as setCommentsOnPersist } from '../composables/useComments'
```

`useComments(key)` is still called only in `CodePane` to get the per-file reactive `comments` array and mutation functions.

---

### `MonacoEditor.vue`

Convert `editor` and `monacoInstance` from plain `let` to `ref`s so `defineExpose` tracks them reactively, and update **every** existing usage to `.value`:

```ts
const editor = ref<any>(null)
const monacoInstance = ref<any>(null)

onMounted(async () => {
  monacoInstance.value = await loader.init()
  editor.value = monacoInstance.value.editor.create(container.value!, { /* same options as before — preserve value: props.code, language, theme, fontSize, fontFamily, fontLigatures, minimap, scrollBeyondLastLine, automaticLayout, padding */ })
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
```

Note: `GUTTER_GUTTER` is not a valid Monaco `MouseTargetType`. Use `GUTTER_LINE_NUMBERS`, `GUTTER_GLYPH_MARGIN`, `GUTTER_LINE_DECORATIONS`.

Add `gutterClick` to emits:
```ts
const emit = defineEmits<{ change: [string]; gutterClick: [number] }>()
```

---

### `CodePane.vue` — view zone logic

`CodePane` holds `const editorRef = ref()` pointing to `<MonacoEditor ref="editorRef" @gutterClick="onGutterClick" />`. Accessor:

```ts
function getEditor() { return editorRef.value?.editor?.value ?? null }
```

`editorRef.value?.editor` is the `Ref<any>` exposed by `MonacoEditor`; `.value` unwraps it. Vue tracks this chain reactively inside a watch getter.

**State:**
```ts
const pendingLine = ref<number | null>(null)
const editingId   = ref<string | null>(null)
const zoneIds     = new Map<string, string>()  // commentId → Monaco zoneId
let   pendingZoneId: string | null = null
```

**`syncViewZones()`:**
```ts
function syncViewZones() {
  const ed = getEditor()
  if (!ed) return
  ed.changeViewZones(accessor => {
    zoneIds.forEach(id => accessor.removeZone(id))
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
```

Note: `heightInPx: 90` is a fixed value. `scrollHeight` is always 0 for detached DOM nodes so dynamic measurement is not used.

**`buildFormNode(line)`** — plain DOM `div`. Textarea + Save/Cancel. Save: `addComment(line, textarea.value); pendingLine.value = null`. Cancel: `pendingLine.value = null`.

**`buildCommentNode(comment, isEditing)`** — plain DOM `div`. If `isEditing`: pre-filled textarea (yellow background), Save calls `updateComment(comment.id, textarea.value); editingId.value = null`, Cancel sets `editingId.value = null`. If read-only: comment text + Edit button (`editingId.value = comment.id`) + Delete button (`removeComment(comment.id)`).

**Watchers:**
```ts
watch([comments, pendingLine, editingId], syncViewZones)
// Fires once when Monaco finishes its async init; Vue tracks the .value chain reactively
watch(() => editorRef.value?.editor?.value, (ed) => { if (ed) syncViewZones() })
// Reset transient UI state when the active file changes (commentKey changes)
watch(commentKey, () => { pendingLine.value = null; editingId.value = null })
```

`commentKey` is the `ComputedRef<string>` passed to `useComments`. Resetting on key change ensures a form zone left open on file A does not appear in file B's editor.

**Gutter handler:**
```ts
function onGutterClick(line: number) {
  pendingLine.value = line
  editingId.value = null
}
```

**Removed from `CodePane`:** `.comment-panel`, `.comment-form-row`, `+ Comment` button, `commentLineInput`, `draftText`, `commentInputRef`, `submitComment`, `cancelComment`, `commentsByLine`, `sortedCommentLines`.

---

### `useSessionPersistence.ts`

New module-level state:
```ts
let commentsDebounceTimer: ReturnType<typeof setTimeout> | null = null
let commentsLatestValue: Comment[] = []
let commentsRetryGen = 0
```

```ts
async function doWriteComments(comments: Comment[], gen: number): Promise<void> {
  const sid = activeSessionId
  if (!sid) return
  for (let attempt = 0; attempt < 3; attempt++) {
    if (commentsRetryGen !== gen) return
    const { error } = await supabase.from('sessions').update({ comments }).eq('id', sid)
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
  const { error } = await supabase.from('sessions').update({ comments: commentsLatestValue }).eq('id', sid)
  if (error && commentsRetryGen === gen) return { ok: false, error: new Error(error.message) }
  return { ok: true }
}
```

In `loadSession`, after existing initialisations:
```ts
commentsLatestValue = (data as SessionRow).comments ?? []
```

Add `saveComments` and `flushComments` to the object returned by `useSessionPersistence()` alongside the existing `saveNotes`, `flushNotes`, etc.

---

### `InterviewerView.vue`

```ts
import { hydrateComments, getAllComments, setOnPersist as setCommentsOnPersist } from '../composables/useComments'
const { saveComments, flushComments, ... } = useSessionPersistence()
```

In `onMounted`, after successful `loadSession` — these calls belong in the **in-progress session branch** (i.e. after the `ended_at` early-return guard that redirects to summary), in the same block as `setNotesOnPersist(saveNotes)`. `hydrateComments` is called exactly once here and nowhere else:
```ts
hydrateComments(result.data.comments ?? [], result.data.challenge_id, result.data.framework)
setCommentsOnPersist(saveComments)
// Do NOT call saveComments here — commentsLatestValue was already set by loadSession
```

In `confirmEnd` — sync latest state then flush all three together:
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

In `onUnmounted`:
```ts
setCommentsOnPersist(null)
```

---

### `SessionSummaryView.vue`

```ts
const sortedComments = computed(() =>
  [...(props.session.comments ?? [])].sort((a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line
  )
)
```

New section after bug list:
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

Style `.comment-row`, `.file-chip`, `.line-chip`, `.comment-text` to match the existing summary card style.

---

### `summary-markdown.ts`

Append a comments block after the existing `## Notes` section:

```ts
const commentLines = (session.comments ?? [])
  .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  .map(c => `- \`${c.file}\` L${c.line}: ${c.text}`)
  .join('\n')
```

In the returned array, append these two entries after `session.notes || '_No notes recorded._'`, separated by a blank line (consistent with the existing `''` separator before `## Notes`):

```ts
// ... existing entries ...
'## Notes',
session.notes || '_No notes recorded._',
'',                                        // blank separator
'## Review Comments',
commentLines || '_No comments recorded._',
```

Example output:
```md
## Review Comments
- `App.vue` L12: This variable is unused.
- `App.vue` L34: Consider extracting this to a helper.
```

---

## Out of Scope

- Comments are not shown to the candidate (interviewer-only).
- No comment threading or reactions.
- No line range selection (single line only).
- Candidate view never loads or displays comments.
