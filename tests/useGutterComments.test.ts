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
