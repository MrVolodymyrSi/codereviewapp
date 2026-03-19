# Inline Code Review Comments — Design Spec

## Goal

Replace the bottom comment panel with GitHub-style inline comments that appear as view zones directly between code lines in the Monaco editor. Comments are server-persisted to Supabase and shown in the session summary.

## Interaction Flow

1. **Add** — hovering the Monaco gutter shows a `+` icon on each line. Clicking a gutter line opens an inline form zone (textarea + Save/Cancel) inserted below that line.
2. **Save** — submitting the form replaces the form zone with a read-only comment zone. The comment is saved to Supabase immediately.
3. **Edit** — clicking Edit inside a comment zone replaces it with a pre-filled editable form (yellow tint to signal edit mode). Saving calls update on the server.
4. **Delete** — clicking Delete removes the zone and deletes from the server.
5. **Summary** — after the session ends, comments appear in the summary grouped by file, sorted by line number.

## Data Model

### Supabase migration

```sql
ALTER TABLE sessions ADD COLUMN comments JSONB NOT NULL DEFAULT '[]';
```

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

`file` is the filename only. The session row's existing `challenge_id` and `framework` fields provide challenge context — no need to duplicate them per comment. `SessionRow.comments` is typed as `Comment[]`.

## Architecture

### Files changed

| File | Change |
|------|--------|
| `src/types/comment.ts` | Add `file`, `updatedAt` fields |
| `src/types/session.ts` | Add `comments: Comment[]` |
| `src/composables/useComments.ts` | Add `updateComment`, `setOnPersist`; drop localStorage |
| `src/components/MonacoEditor.vue` | `defineExpose({ editor, monacoInstance })`; emit `gutterClick` |
| `src/components/CodePane.vue` | Own all view zone logic; remove bottom panel and `+ Comment` button |
| `src/composables/useSessionPersistence.ts` | Add `saveComments` / `flushComments` |
| `src/views/InterviewerView.vue` | Wire comments persistence on mount; flush in `confirmEnd` |
| `src/views/SessionSummaryView.vue` | Add "Review Comments" section |

### `useComments.ts`

Stores comments in a module-level `ref<Record<string, Comment[]>>({})` keyed by `commentKey` (the existing `challengeId:framework:filename` computed). Exposes:

- `comments` — computed array for the current key
- `addComment(line, text)` — creates comment, calls `_onPersist`
- `updateComment(id, text)` — updates text + `updatedAt`, calls `_onPersist`
- `removeComment(id)` — removes, calls `_onPersist`
- `setOnPersist(cb: ((comments: Comment[]) => void) | null)`

`_onPersist` receives the **full flat array across all keys** so `useSessionPersistence` can write the session's complete comment set to Supabase. (All comments for a session are stored in one `comments` column.)

### `MonacoEditor.vue`

Two additions:

1. **`defineExpose({ editor, monacoInstance })`** — lets `CodePane` access the Monaco instances via a template ref.
2. **Gutter click detection** — in `onMounted`, after editor creation:
   ```ts
   editor.onMouseDown((e) => {
     const { MouseTargetType } = monacoInstance.editor
     if (e.target.type === MouseTargetType.GUTTER_LINE_NUMBERS ||
         e.target.type === MouseTargetType.GUTTER_GUTTER) {
       emit('gutterClick', e.target.position?.lineNumber ?? null)
     }
   })
   ```

### `CodePane.vue` — view zone logic

`CodePane` holds a template ref `editorRef` pointing to `MonacoEditor`. It accesses `editorRef.value.editor` and `editorRef.value.monacoInstance`.

**State:**
```ts
const pendingLine = ref<number | null>(null)   // line with open add-form
const editingId   = ref<string | null>(null)   // comment being edited
const zoneIds     = new Map<string, string>()  // commentId → Monaco zoneId
let   pendingZoneId: string | null = null      // zone id for the add-form
```

**`syncViewZones()`** — called whenever `comments`, `pendingLine`, or `editingId` changes:
```ts
editor.changeViewZones(accessor => {
  // Remove all existing zones
  zoneIds.forEach(id => accessor.removeZone(id))
  zoneIds.clear()
  if (pendingZoneId) { accessor.removeZone(pendingZoneId); pendingZoneId = null }

  // Re-add comment zones
  for (const comment of comments.value) {
    const dom = buildCommentNode(comment, editingId.value === comment.id)
    const id = accessor.addZone({
      afterLineNumber: comment.line,
      heightInPx: dom.scrollHeight || 68,
      domNode: dom,
    })
    zoneIds.set(comment.id, id)
  }

  // Add pending form zone
  if (pendingLine.value !== null) {
    const dom = buildFormNode(pendingLine.value)
    pendingZoneId = accessor.addZone({
      afterLineNumber: pendingLine.value,
      heightInPx: 90,
      domNode: dom,
    })
  }
})
```

**`buildFormNode(line)`** — returns a DOM `div` with textarea and Save/Cancel buttons. Save calls `addComment(line, textarea.value)` then `pendingLine.value = null`. Cancel sets `pendingLine.value = null`.

**`buildCommentNode(comment, isEditing)`** — returns a DOM `div`. If `isEditing`, renders pre-filled textarea with Save/Cancel (yellow tint). If read-only, renders comment text with Edit and Delete buttons.

**Watchers:**
```ts
watch([comments, pendingLine, editingId], syncViewZones)
```

**Gutter click handler:**
```ts
// In template: <MonacoEditor ref="editorRef" @gutterClick="onGutterClick" ... />
function onGutterClick(line: number | null) {
  if (!line) return
  pendingLine.value = line
  editingId.value = null
}
```

**Removed from `CodePane`:** the `.comment-panel` div, `.comment-form-row` div, the `+ Comment` button, `commentLineInput`, `draftText`, `commentInputRef`, `submitComment`, `cancelComment`, `commentsByLine`, `sortedCommentLines`.

### `useSessionPersistence.ts`

Adds `saveComments` / `flushComments` following the same debounce + retry pattern as notes:

- `commentsLatestValue: Comment[]` — updated on each `saveComments` call
- `saveComments(comments)` — sets latest value, debounces 1s Supabase write
- `flushComments()` — cancels timer, writes immediately
- Supabase write: `update({ comments: commentsLatestValue }).eq('id', sid)`

### `InterviewerView.vue`

On mount (after successful session load):
```ts
const { comments, setOnPersist: setCommentsOnPersist } = useComments(activeChallengeId /* needs file key */)
```

Wait — `useComments` takes a `ComputedRef<string>` key that includes the filename. But persistence needs **all comments across all files** for the session. Two options:

**Option chosen:** expose a separate module-level `getAllComments()` from `useComments` that returns the full flat array. `_onPersist` is called with this flat array on every mutation.

`InterviewerView` wires:
```ts
setCommentsOnPersist(saveComments)
```

And in `confirmEnd`:
```ts
saveComments(getAllComments())  // sync latest before flush
const [r1, r2, r3] = await Promise.all([flushNotes(), flushBugsChecked(), flushComments()])
```

On `loadSession`, initialise `commentsLatestValue` from `data.comments ?? []` and hydrate `useComments` store so existing comments render immediately.

### `SessionSummaryView.vue`

New section after the bug list:

```html
<div class="comments-section">
  <div class="section-label">Review Comments</div>
  <div v-if="session.comments.length === 0" class="comments-empty">No comments recorded.</div>
  <div v-else class="comment-list">
    <div v-for="c in sortedComments" :key="c.id" class="comment-row">
      <span class="file-chip">{{ c.file }}</span>
      <span class="line-chip">L{{ c.line }}</span>
      <span class="comment-text">{{ c.text }}</span>
    </div>
  </div>
</div>
```

`sortedComments` computed: sort `session.comments` by `file` then `line`.

## Out of Scope

- Comments are not shown to the candidate (they live only in the interviewer's browser and on the server).
- No comment threading or reactions.
- No line range selection (single line only).
- No comment persistence for sessions loaded from a URL without re-hydrating `useComments` (candidate view never loads comments).
