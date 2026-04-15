# Cmd+Enter Comment Submission Design

**Date:** 2026-04-15
**Status:** Approved

## Overview

Add Cmd+Enter (Mac) / Ctrl+Enter (Windows/Linux) as a keyboard shortcut to submit a comment. Applies to both the new-comment form and the edit-comment form in the gutter comment UI.

## Scope

Single file: `src/composables/useGutterComments.ts`

Two targeted edits:

### 1. New comment form (`buildFormNode`)

Extend the existing `keydown` handler on the draft textarea (currently handles Cmd/Ctrl+S) to also fire on Enter:

```ts
textarea.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'Enter')) {
    e.preventDefault(); onSubmit()
  }
})
```

### 2. Edit comment form (inline edit inside `buildCommentNode`)

Add a new keydown listener on `editArea` that mirrors the Save button's logic:

```ts
editArea.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    const newText = editArea.value.trim()
    if (newText) { textNode.textContent = newText; onUpdate(comment.id, newText) }
    body.innerHTML = ''
    body.appendChild(textNode)
  }
})
```

## Behaviour

- Cmd+S (existing) continues to work on the new-comment form — not removed
- Cmd+Enter is added as an alias on the new-comment form
- Cmd+Enter is added as the only keyboard shortcut on the edit form
- Empty text: shortcut does nothing (same as clicking Save/Submit with empty input)
- `e.preventDefault()` prevents newline insertion in the textarea

## Testing

Update `tests/useGutterComments.test.ts` to verify:
- Cmd+Enter on the new-comment textarea calls `onSubmit`
- Ctrl+Enter on the new-comment textarea calls `onSubmit`
- Cmd+Enter on the edit textarea calls `onUpdate` with the trimmed text
- Cmd+Enter with empty text does not call `onSubmit` / `onUpdate`
