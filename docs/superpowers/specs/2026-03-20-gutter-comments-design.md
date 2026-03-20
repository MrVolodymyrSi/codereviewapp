# Gutter Comments — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Replace the current `+ Comment` header button + bottom comment panel with GitHub-style inline gutter comments. Hovering a line in the Monaco editor reveals a `+` icon in the glyph margin; clicking it opens an inline comment form below that line. Existing comments are always visible as compact inline zones with a left blue border. The reviewer cannot edit code — the editor is read-only.

---

## Visual Design

- **Style:** Compact left-border strip (not full-width GitHub PR zone)
- Each comment zone: left `3px solid #1f6feb` border, avatar, author label, line ref, comment text, delete button
- Form zone: same left border, textarea + Cancel + Add comment buttons
- Comments are always visible (not collapsed behind a gutter dot)
- A `+` glyph icon appears in the margin when hovering a line; disappears on mouse leave

---

## Architecture

### Files changed

| File | Change |
|---|---|
| `src/components/MonacoEditor.vue` | Add `readOnly` prop; emit `ready(editor, monaco)` after init |
| `src/composables/useGutterComments.ts` | **New** — all Monaco imperative gutter/zone logic |
| `src/components/CodePane.vue` | Wire `@ready`, call composable, remove button/panel |

No changes to `useComments.ts`, `Comment` type, or Supabase persistence.

---

## MonacoEditor.vue changes

Add one prop:

```ts
defineProps<{ code: string; language: string; theme?: 'vs-dark' | 'vs'; readOnly?: boolean }>()
```

Add one emit:

```ts
defineEmits<{ change: [string]; ready: [editor: any, monaco: any] }>()
```

Editor creation options:

```ts
readOnly: props.readOnly ?? false,
glyphMargin: true,        // enables glyph margin column in the gutter
lineNumbersMinChars: 3,
```

After `editor = monacoInstance.editor.create(...)`, emit:

```ts
emit('ready', editor, monacoInstance)
```

Remove `defineExpose` — nothing is exposed directly.

---

## useGutterComments composable

```ts
function useGutterComments(
  comments: ComputedRef<Comment[]>,
  pendingLine: Ref<number | null>,
  draftText: Ref<string>,
  callbacks: {
    onGutterClick: (line: number) => void
    onDelete: (id: string) => void
    onSubmit: () => void
    onCancel: () => void
  }
): {
  init: (editor: any, monaco: any) => void
  dispose: () => void
}
```

`init` is called from CodePane's `@ready` handler. All Monaco API calls live inside `init` — nothing runs before it.

### Glyph hover (Fix #4)

```ts
let hoveredLine: number | null = null

editor.onMouseMove((e) => {
  const line = e.target.position?.lineNumber ?? null
  const isGlyph = e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
  const next = isGlyph ? line : null
  if (next === hoveredLine) return          // no-op if same line
  hoveredLine = next
  updateHoverDecoration(next)               // O(1) per line-crossing
})

editor.onMouseLeave(() => {
  if (hoveredLine === null) return
  hoveredLine = null
  updateHoverDecoration(null)
})

editor.onMouseDown((e) => {
  if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return
  const line = e.target.position?.lineNumber
  if (line != null) callbacks.onGutterClick(line)
})
```

### Zone managers (Fix #3)

Two independent managers — comment zones and form zone never interfere:

**commentZoneManager**

Maintains a `Map<commentId, zoneId>`. On `watchEffect`:
1. Remove zone ids for comments that no longer exist in the array
2. Add zones for comment ids not yet in the map
3. Never touch zones that are unchanged

**formZoneManager**

Watches `pendingLine` only. When it changes:
- If `null`: remove existing form zone (if any)
- If a line number: remove old form zone, create new one at `afterLineNumber: pendingLine - 1`

Because Monaco stacks zones sharing the same `afterLineNumber`, a comment zone and form zone on the same line render naturally in document order (comment first, form below).

### Two-pass height measurement (Fix #2)

```ts
function measureAndCreateZone(domNode: HTMLElement, afterLineNumber: number): string {
  // Pass 1: measure
  domNode.style.visibility = 'hidden'
  domNode.style.position = 'absolute'
  editorContainer.appendChild(domNode)
  const height = domNode.scrollHeight
  editorContainer.removeChild(domNode)
  domNode.style.visibility = ''
  domNode.style.position = ''

  // Pass 2: insert with known height
  let zoneId: string
  editor.changeViewZones(accessor => {
    zoneId = accessor.addZone({ afterLineNumber, heightInPx: height, domNode })
  })
  return zoneId
}
```

Comment text containers are capped: `max-height: 120px; overflow-y: auto`.

### Comment zone DOM structure

```html
<div class="gc-zone gc-comment">
  <div class="gc-avatar">R</div>
  <div class="gc-body">
    <div class="gc-meta">
      <strong>Reviewer</strong>
      <span class="gc-line-ref">line N</span>
    </div>
    <p class="gc-text">…</p>
  </div>
  <button class="gc-delete" aria-label="Delete comment">×</button>
</div>
```

Delete button wired with `addEventListener('click', () => callbacks.onDelete(comment.id))`.

### Form zone DOM structure

```html
<div class="gc-zone gc-form">
  <div class="gc-avatar gc-avatar--pending">R</div>
  <div class="gc-form-inner">
    <textarea class="gc-textarea" placeholder="Leave a review comment…"></textarea>
    <div class="gc-form-actions">
      <button class="gc-btn-cancel">Cancel</button>
      <button class="gc-btn-submit">Add comment</button>
    </div>
  </div>
</div>
```

Textarea wired: `input` → sync to `draftText.value`; `keydown` Cmd/Ctrl+S → `callbacks.onSubmit()`.
Cancel → `callbacks.onCancel()`. Submit → `callbacks.onSubmit()`.

Focus textarea via `requestAnimationFrame(() => textarea.focus())` after zone insertion.

### Cleanup

`dispose()` removes all decorations, all view zones, and all Monaco event listener disposables. Called from CodePane's `onBeforeUnmount`.

---

## CodePane.vue changes

### Removed
- `+ Comment` header button
- Bottom comment panel (`<div class="comment-panel">`)
- `commentLineInput` ref and `<input type="number">` in form
- `commentsByLine`, `sortedCommentLines` computed properties
- `commentInputRef`
- `startComment()` function

### Added
- `gutterComments = useGutterComments(comments, pendingLine, draftText, { ... })`
- `onEditorReady(editor, monaco)` → calls `gutterComments.init(editor, monaco)`
- `onBeforeUnmount` → calls `gutterComments.dispose()`

### Gutter click toggle (Fix #6)
```ts
function onGutterClick(line: number) {
  if (pendingLine.value === line) {
    cancelComment()     // toggle off if same line clicked again
  } else {
    pendingLine.value = line
    draftText.value = ''
  }
}
```

If a comment already exists on that line, the form zone stacks below it — no special case needed.

### MonacoEditor usage
```html
<MonacoEditor
  :code="editorCode"
  :language="activeFile.language"
  :theme="editorTheme"
  :read-only="true"
  @ready="onEditorReady"
  @change="setActiveCode"
/>
```

---

## Styling

Zone CSS is injected once into `document.head` by the composable (a single `<style>` tag, removed on `dispose`). Tokens used match existing CSS variables: `--bg-elevated`, `--border`, `--accent`, `--text`, `--text-muted`, `--text-faint`, `--danger`, `--danger-dim`, `--font-ui`, `--font-mono`.

---

## Out of scope (first iteration)

- Editing existing comments (update flow exists in `useComments` but no UI)
- Multiple reviewers / avatars
- Comment threading / replies
- Candidate-side comment visibility
