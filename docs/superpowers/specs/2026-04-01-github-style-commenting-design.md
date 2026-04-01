# GitHub-style Commenting — Design Spec

**Date:** 2026-04-01
**Status:** Approved

## Overview

Redesign the gutter comment system to match GitHub PR review mechanics:
- Line number column click/drag to select a line range
- Comment form shows selected range label
- Posted comments render as bordered GitHub-style cards with a code snippet header, author line with relative timestamp, and a `···` menu for Edit and Delete
- Edit is inline (replaces body with textarea + Save/Cancel)
- Comments post immediately (no review staging)
- Plain text only (no markdown rendering)

---

## Data Model

### `src/types/comment.ts`

Replace `line: number` with a range:

```ts
export interface Comment {
  id: string
  file: string
  lineStart: number
  lineEnd: number
  text: string
  timestamp: number
  updatedAt?: number
}
```

Old comments persisted with `line` (from Supabase or localStorage) are migrated in `hydrateComments` by mapping `{ line }` → `{ lineStart: line, lineEnd: line }`.

---

## `src/composables/useComments.ts`

### Changed signatures

```ts
function addComment(lineStart: number, lineEnd: number, text: string): void
```

`updateComment(id, text)` — unchanged.

### Migration in `hydrateComments`

```ts
export function hydrateComments(comments: any[], challengeId: string, framework: string): void {
  // Normalise legacy comments that have `line` but not `lineStart`/`lineEnd`
  const normalised = comments.map(c => ({
    ...c,
    lineStart: c.lineStart ?? c.line,
    lineEnd:   c.lineEnd   ?? c.line,
  }))
  // ... existing grouping logic using normalised
}
```

---

## `src/composables/useGutterComments.ts`

### Interface changes

```ts
interface Callbacks {
  onRangeSelect: (start: number, end: number) => void   // replaces onGutterClick
  onDelete: (id: string) => void
  onSubmit: () => void
  onCancel: () => void
  onUpdate: (id: string, text: string) => void          // new — for inline edit
}

export function useGutterComments(
  comments: ComputedRef<Comment[]>,
  pendingRange: Ref<{ start: number; end: number } | null>,   // replaces pendingLine
  draftText: Ref<string>,
  callbacks: Callbacks,
  getLineContent: (line: number) => string,                   // new — reads Monaco model
)
```

`getLineContent` is passed in from CodePane so the composable can build code snippet DOM without holding a reference to the full model externally.

### Selection mechanic (line number column)

Remove all glyph margin hover/click logic. Replace with:

```ts
let dragStart: number | null = null
let isDragging = false
let lastHoveredLine: number | null = null
let rangeDecorations: string[] = []

// Hover: show blue + on line number column
disposables.push(editor.onMouseMove((e: any) => {
  const isLineNum = e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
  const line = e.target.position?.lineNumber ?? null
  lastHoveredLine = line
  hoverDecorations = editor.deltaDecorations(
    hoverDecorations,
    isLineNum && line ? [{ range: new monaco.Range(line, 1, line, 1), options: { glyphMarginClassName: 'gc-glyph-add' } }] : []
  )
}))

disposables.push(editor.onMouseLeave(() => {
  hoverDecorations = editor.deltaDecorations(hoverDecorations, [])
}))

// Mousedown: start selection
disposables.push(editor.onMouseDown((e: any) => {
  if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) return
  dragStart = e.target.position?.lineNumber ?? null
  isDragging = dragStart !== null
}))

// Mousemove: extend selection while dragging
disposables.push(editor.onMouseMove((e: any) => {
  if (!isDragging || dragStart === null) return
  const line = e.target.position?.lineNumber
  if (line == null) return
  const start = Math.min(dragStart, line)
  const end   = Math.max(dragStart, line)
  // Show range highlight decoration
  rangeDecorations = editor.deltaDecorations(rangeDecorations, [{
    range: new monaco.Range(start, 1, end, 1),
    options: { isWholeLine: true, className: 'gc-range-highlight', linesDecorationsClassName: 'gc-line-selected' }
  }])
}))

// Mouseup: finalise
window.addEventListener('mouseup', onMouseUp)
function onMouseUp(e: MouseEvent) {
  if (!isDragging || dragStart === null) return
  isDragging = false
  // Determine final line from last known hover or fall back to dragStart
  const end = lastHoveredLine ?? dragStart
  const start = Math.min(dragStart, end)
  const finalEnd = Math.max(dragStart, end)
  dragStart = null
  callbacks.onRangeSelect(start, finalEnd)
}
// Stored in disposables cleanup: window.removeEventListener('mouseup', onMouseUp)
```

`lastHoveredLine` is updated on every `onMouseMove` event regardless of dragging state.

### Form zone DOM

```html
<div class="gc-zone gc-form">
  <div class="gc-form-header">Commenting on lines N–M</div>  <!-- or "line N" if start===end -->
  <div class="gc-form-inner">
    <textarea class="gc-textarea" placeholder="Leave a comment…"></textarea>
    <div class="gc-form-actions">
      <button class="gc-btn-cancel">Cancel</button>
      <button class="gc-btn-submit">Add comment</button>
    </div>
  </div>
</div>
```

### Comment zone DOM (GitHub-style card)

```html
<div class="gc-zone gc-comment">
  <!-- Code snippet -->
  <div class="gc-snippet">
    <div class="gc-snippet-line"><span class="gc-snippet-num">N</span> line text…</div>
    <!-- one div per line in range -->
  </div>
  <!-- Author header -->
  <div class="gc-header">
    <div class="gc-avatar">R</div>
    <strong class="gc-author">Reviewer</strong>
    <span class="gc-timestamp">just now</span>
    <div class="gc-menu-btn" aria-label="Comment actions">···</div>
    <div class="gc-menu" hidden>
      <button class="gc-menu-item gc-menu-edit">Edit</button>
      <button class="gc-menu-item gc-menu-delete">Delete</button>
    </div>
  </div>
  <!-- Body (view mode) -->
  <div class="gc-body">
    <p class="gc-text">comment text</p>
  </div>
  <!-- Body (edit mode — swapped in by JS) -->
  <!-- <div class="gc-body gc-body--edit">
    <textarea class="gc-textarea">…</textarea>
    <div class="gc-form-actions">
      <button class="gc-btn-cancel">Cancel</button>
      <button class="gc-btn-save">Save</button>
    </div>
  </div> -->
</div>
```

**Edit flow:** clicking Edit replaces `.gc-body` contents with a textarea pre-filled with the current text, plus Save/Cancel buttons. Save calls `callbacks.onUpdate(id, newText)`, Cancel restores the original `<p>`.

**Relative timestamp:** computed from `comment.timestamp` at zone build time using a simple helper:

```ts
function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}
```

**`···` menu:** toggled by click on `.gc-menu-btn`. Closed on outside click via a document-level `mousedown` listener registered when the menu opens and removed when it closes.

### Styling additions

New classes added to `injectStyles()`:

| Class | Purpose |
|---|---|
| `.gc-range-highlight` | Blue-tinted background on selected line range |
| `.gc-line-selected` | Blue left border on selected line numbers |
| `.gc-snippet` | Code snippet block at top of comment card |
| `.gc-snippet-num` | Line number within snippet |
| `.gc-header` | Author + timestamp + menu row |
| `.gc-author` | Bold reviewer name |
| `.gc-timestamp` | Muted relative time |
| `.gc-menu-btn` | `···` trigger button |
| `.gc-menu` | Dropdown menu container |
| `.gc-menu-item` | Individual menu action |
| `.gc-form-header` | "Commenting on lines N–M" label above textarea |
| `.gc-btn-save` | Save button in edit mode |

Comment card outer border changes from `border-left: 3px solid` strip to a full `border: 1px solid var(--border)` rounded card, matching GitHub.

---

## `src/components/CodePane.vue`

### Changed refs

```ts
const pendingRange = ref<{ start: number; end: number } | null>(null)
```

### Changed functions

```ts
function onRangeSelect(start: number, end: number) {
  if (pendingRange.value?.start === start && pendingRange.value?.end === end) {
    cancelComment()   // toggle off same range
  } else {
    pendingRange.value = { start, end }
    draftText.value = ''
  }
}

function submitComment() {
  if (pendingRange.value !== null && draftText.value.trim()) {
    addComment(pendingRange.value.start, pendingRange.value.end, draftText.value.trim())
  }
  pendingRange.value = null
  draftText.value = ''
}

function cancelComment() {
  pendingRange.value = null
  draftText.value = ''
}
```

### `onEditorReady` update

```ts
function onEditorReady(editor: any, monaco: any) {
  editorInstance.value = editor
  gutterComments.init(editor, monaco)
}
```

### `getLineContent` passed to composable

```ts
function getLineContent(line: number): string {
  return editorInstance.value?.getModel()?.getLineContent(line) ?? ''
}
```

`editorInstance` is a new `ref<any>(null)` set in `onEditorReady`.

### File tab switch reset

```ts
watch(() => props.activeFileIndex, () => {
  pendingRange.value = null
  draftText.value = ''
})
```

### `useGutterComments` call

```ts
const gutterComments = useGutterComments(comments, pendingRange, draftText, {
  onRangeSelect,
  onDelete: removeComment,
  onSubmit: submitComment,
  onCancel: cancelComment,
  onUpdate: updateComment,
}, getLineContent)
```

---

## Out of scope

- Multiple reviewers / avatars (always shows "R" / "Reviewer")
- Comment threading / replies
- Shift-click range extension (covered by drag; can be added later)
- Markdown rendering
- Emoji reactions
