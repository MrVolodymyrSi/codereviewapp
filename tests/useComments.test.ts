import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'

// localStorage mock — Vitest runs in node; stub the global
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string): string | null => storage[key] ?? null,
  setItem: (key: string, value: string): void => { storage[key] = value },
  removeItem: (key: string): void => { delete storage[key] },
  clear: (): void => { Object.keys(storage).forEach((k) => delete storage[k]) },
}

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock)
  localStorageMock.clear()
})

describe('loadComments', () => {
  it('returns empty comments when localStorage has no entry', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    loadComments('video-feed', 'vue')
    const key = computed(() => 'video-feed:vue:App.vue')
    const { comments } = useComments(key)
    expect(comments.value).toEqual([])
  })

  it('loads comments from localStorage on challenge/framework change', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    const stored = [
      { id: '1', file: 'App.vue', lineStart: 3, lineEnd: 3, text: 'missing null check', timestamp: 1000 },
    ]
    localStorage.setItem('codereview:comments:video-feed:vue', JSON.stringify(stored))

    loadComments('video-feed', 'vue')

    const key = computed(() => 'video-feed:vue:App.vue')
    const { comments } = useComments(key)
    expect(comments.value).toHaveLength(1)
    expect(comments.value[0].text).toBe('missing null check')
  })

  it('resets to empty when localStorage value is corrupt JSON', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    localStorage.setItem('codereview:comments:fetch-race:react', 'not-valid-json{{')

    loadComments('fetch-race', 'react')

    const key = computed(() => 'fetch-race:react:App.tsx')
    const { comments } = useComments(key)
    expect(comments.value).toEqual([])
  })
})

describe('useComments mutations persist to localStorage', () => {
  it('addComment writes comment to localStorage', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    loadComments('fetch-race', 'vue')

    const key = computed(() => 'fetch-race:vue:App.vue')
    const { addComment, comments } = useComments(key)
    addComment(5, 5, 'side effect missing')

    expect(comments.value).toHaveLength(1)
    expect(comments.value[0].text).toBe('side effect missing')

    const raw = localStorage.getItem('codereview:comments:fetch-race:vue')
    const persisted = JSON.parse(raw!)
    expect(persisted).toHaveLength(1)
    expect(persisted[0].text).toBe('side effect missing')
  })

  it('updateComment updates text and persists to localStorage', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    loadComments('list-render', 'vue')

    const key = computed(() => 'list-render:vue:App.vue')
    const { addComment, updateComment, comments } = useComments(key)
    addComment(2, 2, 'original')

    const id = comments.value[0].id
    updateComment(id, 'updated')

    expect(comments.value[0].text).toBe('updated')
    expect(comments.value[0].updatedAt).toBeDefined()

    const raw = localStorage.getItem('codereview:comments:list-render:vue')
    const persisted = JSON.parse(raw!)
    expect(persisted[0].text).toBe('updated')
  })

  it('removeComment removes comment and persists to localStorage', async () => {
    const { loadComments, useComments } = await import('../src/composables/useComments')
    loadComments('list-render', 'react')

    const key = computed(() => 'list-render:react:App.tsx')
    const { addComment, removeComment, comments } = useComments(key)
    addComment(10, 12, 'to remove')

    const id = comments.value[0].id
    removeComment(id)

    expect(comments.value).toHaveLength(0)

    const raw = localStorage.getItem('codereview:comments:list-render:react')
    const persisted = JSON.parse(raw!)
    expect(persisted).toHaveLength(0)
  })
})
