// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import type { Comment } from '../src/types/comment'

// Minimal Monaco editor mock
function createMockEditor() {
  let zoneCounter = 0
  const zones = new Map<string, any>()

  return {
    getContainerDomNode: () => document.createElement('div'),
    getLayoutInfo: vi.fn(() => ({ contentWidth: 800 })),
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
      GUTTER_LINE_NUMBERS: 3,
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

const mockGetLineContent = vi.fn((n: number) => `line ${n} content`)

describe('useGutterComments', () => {
  let editor: ReturnType<typeof createMockEditor>

  beforeEach(() => {
    editor = createMockEditor()
  })

  it('returns init and dispose functions', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    expect(typeof gc.init).toBe('function')
    expect(typeof gc.dispose).toBe('function')
  })

  it('init registers mouse event handlers on the editor', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)
    expect(editor.onMouseMove).toHaveBeenCalledOnce()
    expect(editor.onMouseLeave).toHaveBeenCalledOnce()
    expect(editor.onMouseDown).toHaveBeenCalledOnce()
  })

  it('creates a comment zone when a comment is added after init', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const commentsArr = ref<Comment[]>([])
    const comments = computed(() => commentsArr.value)
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)

    commentsArr.value = [
      { id: 'c1', file: 'App.vue', lineStart: 3, lineEnd: 3, text: 'missing error handling', timestamp: 1 },
    ]
    await Promise.resolve()

    expect(editor.changeViewZones).toHaveBeenCalled()
    expect(editor._zones.size).toBe(1)
  })

  it('removes a comment zone when a comment is deleted', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const commentsArr = ref<Comment[]>([
      { id: 'c1', file: 'App.vue', lineStart: 3, lineEnd: 3, text: 'note', timestamp: 1 },
    ])
    const comments = computed(() => commentsArr.value)
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
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
      { id: 'c1', file: 'App.vue', lineStart: 3, lineEnd: 3, text: 'first', timestamp: 1 },
    ])
    const comments = computed(() => commentsArr.value)
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const changeViewZonesSpy = editor.changeViewZones
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)
    await Promise.resolve()
    const callCountAfterFirst = changeViewZonesSpy.mock.calls.length

    commentsArr.value = [
      { id: 'c1', file: 'App.vue', lineStart: 3, lineEnd: 3, text: 'first', timestamp: 1 },
      { id: 'c2', file: 'App.vue', lineStart: 7, lineEnd: 7, text: 'second', timestamp: 2 },
    ]
    await Promise.resolve()

    expect(editor._zones.size).toBe(2)
    expect(changeViewZonesSpy.mock.calls.length).toBeGreaterThan(callCountAfterFirst)
  })

  it('calls onRangeSelect with the clicked line on line number mousedown', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const onRangeSelect = vi.fn((start: number, end: number) => {
      pendingRange.value = { start, end }
    })
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect,
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)

    // Simulate mousedown on line number column then mouseup
    const mouseDownHandler = editor.onMouseDown.mock.calls[0][0]
    mouseDownHandler({
      target: {
        type: mockMonaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS,
        position: { lineNumber: 5 },
      },
    })

    // Simulate window mouseup to finalise selection
    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(onRangeSelect).toHaveBeenCalledWith(5, 5)
    expect(pendingRange.value).toEqual({ start: 5, end: 5 })
  })

  it('creates a form zone when pendingRange is set', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)
    await Promise.resolve()

    pendingRange.value = { start: 4, end: 4 }
    await Promise.resolve()

    expect(editor._zones.size).toBe(1)
  })

  it('removes the form zone when pendingRange is cleared', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const comments = computed<Comment[]>(() => [])
    const pendingRange = ref<{ start: number; end: number } | null>(null)
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)

    pendingRange.value = { start: 4, end: 4 }
    await Promise.resolve()
    expect(editor._zones.size).toBe(1)

    pendingRange.value = null
    await Promise.resolve()
    expect(editor._zones.size).toBe(0)
  })

  it('dispose cleans up all zones and event listeners', async () => {
    const { useGutterComments } = await import('../src/composables/useGutterComments')
    const commentsArr = ref<Comment[]>([
      { id: 'c1', file: 'App.vue', lineStart: 3, lineEnd: 3, text: 'note', timestamp: 1 },
    ])
    const comments = computed(() => commentsArr.value)
    const pendingRange = ref<{ start: number; end: number } | null>({ start: 4, end: 4 })
    const draftText = ref('')
    const gc = useGutterComments(comments, pendingRange, draftText, {
      onRangeSelect: vi.fn(),
      onDelete: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      onUpdate: vi.fn(),
    }, mockGetLineContent)
    gc.init(editor, mockMonaco)
    await Promise.resolve()
    expect(editor._zones.size).toBeGreaterThan(0)

    gc.dispose()
    expect(editor._zones.size).toBe(0)
  })

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
})
