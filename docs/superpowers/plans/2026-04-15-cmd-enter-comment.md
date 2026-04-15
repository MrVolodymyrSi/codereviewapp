# Cmd+Enter Comment Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cmd+Enter (Mac) / Ctrl+Enter (Windows/Linux) as a keyboard shortcut to submit a comment from both the new-comment and edit-comment textareas.

**Architecture:** Two targeted edits inside `src/composables/useGutterComments.ts`. The new-comment textarea's existing `keydown` handler (currently handles Cmd/Ctrl+S) gets `'Enter'` added to its condition. The edit-comment textarea gets a new `keydown` listener that mirrors the Save button logic. Tests added to `tests/useGutterComments.test.ts`.

**Tech Stack:** TypeScript, Vitest (jsdom), vanilla DOM `KeyboardEvent`.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/composables/useGutterComments.ts` — two edits |
| Modify | `tests/useGutterComments.test.ts` — add 4 tests |

---

## Task 1: Add Cmd+Enter keyboard shortcuts to both comment forms

**Files:**
- Modify: `src/composables/useGutterComments.ts`
- Modify: `tests/useGutterComments.test.ts`

- [ ] **Step 1: Add failing tests**

Append these 4 `it(...)` blocks inside the `describe('useGutterComments', ...)` block in `tests/useGutterComments.test.ts`, just before the final closing `})`:

```ts
  it('Cmd+Enter on the new-comment textarea calls onSubmit', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const onSubmit = vi.fn()
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit,
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)

    pendingRange.value = { start: 3, end: 3 }
    await Promise.resolve()

    const zone = [...editor._zones.values()][0]
    const textarea = zone.domNode.querySelector('textarea') as HTMLTextAreaElement
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('Ctrl+Enter on the new-comment textarea calls onSubmit', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const onSubmit = vi.fn()
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit,
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)

    pendingRange.value = { start: 3, end: 3 }
    await Promise.resolve()

    const zone = [...editor._zones.values()][0]
    const textarea = zone.domNode.querySelector('textarea') as HTMLTextAreaElement
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('Cmd+Enter on the edit-comment textarea calls onUpdate with trimmed text', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const commentsArr = ref<Comment[]>([
      { id: 'c1', file: 'App.vue', lineStart: 3, lineEnd: 3, text: 'original', timestamp: 1 },
    ])
    const comments = computed(() => commentsArr.value)
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const onUpdate = vi.fn()
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate,
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)
    await Promise.resolve()

    const zone = [...editor._zones.values()][0]
    const menuBtn = zone.domNode.querySelector('.gc-menu-btn') as HTMLButtonElement
    menuBtn.click()
    const editItem = zone.domNode.querySelector('.gc-menu-edit') as HTMLButtonElement
    editItem.click()

    const editArea = zone.domNode.querySelector('.gc-body textarea') as HTMLTextAreaElement
    editArea.value = '  updated text  '
    editArea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }))

    expect(onUpdate).toHaveBeenCalledWith('c1', 'updated text')
  })

  it('Cmd+Enter on the edit-comment textarea with empty text does not call onUpdate', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const commentsArr = ref<Comment[]>([
      { id: 'c1', file: 'App.vue', lineStart: 3, lineEnd: 3, text: 'original', timestamp: 1 },
    ])
    const comments = computed(() => commentsArr.value)
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const onUpdate = vi.fn()
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate,
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)
    await Promise.resolve()

    const zone = [...editor._zones.values()][0]
    const menuBtn = zone.domNode.querySelector('.gc-menu-btn') as HTMLButtonElement
    menuBtn.click()
    const editItem = zone.domNode.querySelector('.gc-menu-edit') as HTMLButtonElement
    editItem.click()

    const editArea = zone.domNode.querySelector('.gc-body textarea') as HTMLTextAreaElement
    editArea.value = '   '
    editArea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }))

    expect(onUpdate).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run tests — verify the 4 new tests fail**

```bash
npm test -- tests/useGutterComments.test.ts
```

Expected: 9 existing tests PASS, 4 new tests FAIL (keydown on textarea does nothing yet).

- [ ] **Step 3: Implement — new-comment textarea**

In `src/composables/useGutterComments.ts`, find this block (around line 428):

```ts
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); onSubmit() }
  })
```

Replace it with:

```ts
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'Enter')) { e.preventDefault(); onSubmit() }
  })
```

- [ ] **Step 4: Implement — edit-comment textarea**

In `src/composables/useGutterComments.ts`, find this block (around line 383):

```ts
    requestAnimationFrame(() => editArea.focus())

    cancelBtn.addEventListener('click', () => {
```

Add the keydown listener between those two lines:

```ts
    requestAnimationFrame(() => editArea.focus())

    editArea.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        const newText = editArea.value.trim()
        if (newText) {
          textNode.textContent = newText
          onUpdate(comment.id, newText)
        }
        body.innerHTML = ''
        body.appendChild(textNode)
      }
    })

    cancelBtn.addEventListener('click', () => {
```

- [ ] **Step 5: Run tests — verify all 13 pass**

```bash
npm test -- tests/useGutterComments.test.ts
```

Expected: all 13 tests PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all 51 tests PASS (now 55 with the 4 new ones).

- [ ] **Step 7: Commit**

```bash
git add src/composables/useGutterComments.ts tests/useGutterComments.test.ts
git commit -m "feat: add Cmd+Enter shortcut to submit and save comments"
```
