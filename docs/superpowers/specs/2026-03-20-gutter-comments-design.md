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
- A `+` glyph icon appears in the glyph margin column when the cursor is over that column on any line; disappears on mouse leave. The glyph margin is a narrow column to the left of the line numbers — hovering anywhere else on the line does not show the icon. This is intentional: it keeps the trigger precise and avoids conflicting with Monaco's own line-number click behavior.

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
glyphMargin: true,        // enables the glyph margin column in the gutter
lineNumbersMinChars: 3,
```

After `editor = monacoInstance.editor.create(...)`, emit:

```ts
emit('ready', editor, monacoInstance)
```

The current file does not use `defineExpose`, so no removal is needed.

`@change="setActiveCode"` is kept on the template even in read-only mode. In read-only mode `onDidChangeModelContent` fires only for programmatic `setValue` calls (e.g. file tab switching) — this is correct behavior and `setActiveCode` handling it is intentional.

---

## useGutterComments composable

```ts
function useGutterComments(
  comments: ComputedRef<Comment[]>,   // pass the ref returned by useComments(commentKey) directly
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

**Important:** `comments` is the `ComputedRef<Comment[]>` returned directly by `useComments(commentKey)` in CodePane. Do not wrap it in another `computed`. The composable relies on Vue's reactivity tracking — inside the `watchEffect` body, `comments.value` must be read (not copied to a local variable outside the effect) so the effect re-runs when the array changes.

**Initial render:** Because `init` is called from `@ready` (which fires after `editor.create` completes), and `hydrateComments` may have already populated the store before `@ready` fires, the `watchEffect` inside `init` will immediately observe the correct initial `comments.value` on its first run. No special hydration path is needed.

### File tab switching

When the user switches file tabs, `commentKey` changes, and `useComments(commentKey)` returns a new computed for the new file. However, `comments` passed to `useGutterComments` is a single `ComputedRef` that already reflects `commentKey` reactively (it is defined as `computed(() => store.value[key.value] ?? [])` inside `useComments`). The `watchEffect` therefore automatically re-runs when `commentKey` changes: it will see 0 comments for the new file initially (removing all stale zones) and then any hydrated comments for the new file.

`pendingLine` is reset to `null` by CodePane when the active file changes (see CodePane changes below), which triggers `formZoneManager` to remove any open form zone.

No explicit `reset()` call or re-`init` is needed for tab switching.

### Glyph hover

```ts
let hoveredLine: number | null = null
let hoverDecorations: string[] = []   // decoration id array managed by editor.deltaDecorations

editor.onMouseMove((e) => {
  const line = e.target.position?.lineNumber ?? null
  const isGlyph = e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
  const next = isGlyph ? line : null
  if (next === hoveredLine) return          // no-op if same line — O(1) per line-crossing
  hoveredLine = next
  // Replace decoration set with the single hovered line (or clear if null)
  hoverDecorations = editor.deltaDecorations(hoverDecorations, next ? [{
    range: new monaco.Range(next, 1, next, 1),
    options: {
      glyphMarginClassName: 'gc-glyph-add',   // CSS: shows "+" icon via ::before content
      glyphMarginHoverMessage: null,
    }
  }] : [])
})

editor.onMouseLeave(() => {
  if (hoveredLine === null) return
  hoveredLine = null
  hoverDecorations = editor.deltaDecorations(hoverDecorations, [])
})

editor.onMouseDown((e) => {
  if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return
  const line = e.target.position?.lineNumber
  if (line != null) callbacks.onGutterClick(line)
})
```

The `.gc-glyph-add` class is part of the injected stylesheet (see Styling section).

### Zone managers

Two independent managers — comment zones and form zone never interfere:

**commentZoneManager**

Maintains a `Map<commentId, zoneId>`. Registered with `watchEffect` inside `init`:

```ts
watchEffect(() => {
  const current = comments.value    // read here to register reactive dependency
  const currentIds = new Set(current.map(c => c.id))

  // Remove zones for deleted comments
  for (const [id, zoneId] of commentZoneMap) {
    if (!currentIds.has(id)) {
      editor.changeViewZones(a => a.removeZone(zoneId))
      commentZoneMap.delete(id)
    }
  }

  // Add zones for new comments
  for (const comment of current) {
    if (!commentZoneMap.has(comment.id)) {
      const domNode = buildCommentNode(comment)
      const zoneId = measureAndCreateZone(domNode, comment.line - 1)
      commentZoneMap.set(comment.id, zoneId)
    }
  }
})
```

**formZoneManager**

Uses `watch(pendingLine, handler, { immediate: true })` — not `watchEffect` — since `pendingLine` is the only dependency and the two-state toggle (null vs number) maps cleanly to `watch`. When it changes:
- If `null`: remove existing form zone (if any)
- If a line number: remove old form zone, create new one at `afterLineNumber: pendingLine.value - 1`

Because Monaco stacks zones sharing the same `afterLineNumber`, a comment zone and form zone on the same line render naturally in order (comment first, form below). No special-casing needed when a comment already exists on the target line.

### Two-pass height measurement

`editorContainer` is obtained inside `init` via `editor.getContainerDomNode()` and stored as a local variable.

```ts
function measureAndCreateZone(domNode: HTMLElement, afterLineNumber: number): string {
  // Pass 1: append to live document so CSS (including max-height) is applied,
  // then read offsetHeight — not scrollHeight, which ignores max-height.
  domNode.style.visibility = 'hidden'
  domNode.style.position = 'absolute'
  editorContainer.appendChild(domNode)
  const height = domNode.offsetHeight   // respects max-height: 120px cap
  editorContainer.removeChild(domNode)
  domNode.style.visibility = ''
  domNode.style.position = ''

  // Pass 2: insert with known height
  let zoneId!: string
  editor.changeViewZones(accessor => {
    zoneId = accessor.addZone({ afterLineNumber, heightInPx: height, domNode })
  })
  return zoneId
}
```

Comment text containers are capped: `max-height: 120px; overflow-y: auto`.

### Comment zone DOM

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

Delete button wired with `addEventListener('click', () => callbacks.onDelete(comment.id))`. Calling `onDelete` triggers `removeComment` in CodePane, which mutates the store, which re-runs `commentZoneManager`'s `watchEffect`, which removes the zone. The DOM node is abandoned at that point — no manual cleanup needed since the zone is removed from the editor.

### Form zone DOM

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

- Textarea `input` event → `draftText.value = textarea.value` (keeps Vue ref in sync)
- Textarea `keydown` Cmd/Ctrl+S → `callbacks.onSubmit()`
- Cancel button → `callbacks.onCancel()`
- Submit button → `callbacks.onSubmit()`
- `requestAnimationFrame(() => textarea.focus())` called after zone insertion

`onSubmit` in CodePane reads `draftText.value` (already synced by the `input` listener above), calls `addComment(pendingLine.value!, draftText.value)`, then sets `pendingLine.value = null` and `draftText.value = ''`. Setting `pendingLine` to `null` triggers `formZoneManager` to remove the form zone. Setting it to `null` also triggers `commentZoneManager`'s `watchEffect` (via store mutation from `addComment`) to add the new comment zone.

`onCancel` sets `pendingLine.value = null` and `draftText.value = ''`.

### Cleanup

`dispose()`:
1. Stops all `watchEffect` instances (via their returned stop handles stored in `init`)
2. Removes all comment zones via `editor.changeViewZones`
3. Removes form zone if present
4. Clears all `deltaDecorations` (hover decoration)
5. Disposes all Monaco event listener `IDisposable` handles

Called from CodePane's `onBeforeUnmount`.

---

## CodePane.vue changes

### Removed
- `+ Comment` header button and `.comment-btn` styles
- Bottom comment panel (`<div class="comment-panel">`) and all related styles
- `commentLineInput` ref and `<input type="number">` in form
- `commentsByLine`, `sortedCommentLines` computed properties
- `commentInputRef`
- `startComment()` function

### Added
- `gutterComments = useGutterComments(comments, pendingLine, draftText, { onGutterClick, onDelete: removeComment, onSubmit: submitComment, onCancel: cancelComment })`
- `onEditorReady(editor, monaco)` → calls `gutterComments.init(editor, monaco)`
- `onBeforeUnmount` → calls `gutterComments.dispose()`

### Updated functions

```ts
function onGutterClick(line: number) {
  if (pendingLine.value === line) {
    cancelComment()       // toggle off if same line clicked again
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
```

### File tab switching

When `activeFileIndex` changes, CodePane must reset `pendingLine.value = null` to close any open form zone. Add a `watch(() => props.activeFileIndex, () => { pendingLine.value = null; draftText.value = '' })`.

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

Zone CSS is injected once into `document.head` by the composable on `init` (a single `<style id="gc-styles">` tag). On `dispose`, the tag is removed. This assumes a single active instance of the composable at a time — which is true for this app's single-pane layout. If multiple instances ever become possible, upgrade to a reference-counted guard (`inject`/`provide` counter or a module-level ref count). Tokens match existing CSS variables: `--bg-elevated`, `--border`, `--accent`, `--text`, `--text-muted`, `--text-faint`, `--danger`, `--danger-dim`, `--font-ui`, `--font-mono`.

The `.gc-glyph-add` class (applied as a glyph margin decoration) uses `content: '+'` in `::before` to render the icon.

---

## Out of scope (first iteration)

- Editing existing comments (update flow exists in `useComments` but no UI)
- Multiple reviewers / avatars
- Comment threading / replies
- Candidate-side comment visibility
