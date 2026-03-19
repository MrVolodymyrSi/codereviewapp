import { describe, it, expect } from 'vitest'
import { computed } from 'vue'

describe('useComments module-level functions', () => {
  it('hydrateComments groups comments by compound key', async () => {
    const { hydrateComments, getAllComments } = await import('../src/composables/useComments')
    hydrateComments(
      [
        { id: '1', file: 'App.vue', line: 3, text: 'hello', timestamp: 1000 },
        { id: '2', file: 'App.vue', line: 7, text: 'world', timestamp: 2000 },
        { id: '3', file: 'Child.vue', line: 1, text: 'test', timestamp: 3000 },
      ],
      'list-render',
      'vue',
    )
    const all = getAllComments()
    expect(all).toHaveLength(3)
    expect(all.map((c) => c.id).sort()).toEqual(['1', '2', '3'])
  })

  it('getAllComments returns flat array of all comments', async () => {
    const { hydrateComments, getAllComments } = await import('../src/composables/useComments')
    hydrateComments(
      [
        { id: 'a', file: 'App.vue', line: 1, text: 'A', timestamp: 100 },
        { id: 'b', file: 'Other.vue', line: 2, text: 'B', timestamp: 200 },
      ],
      'fetch-race',
      'react',
    )
    const all = getAllComments()
    expect(all).toHaveLength(2)
  })

  it('hydrateComments replaces the entire store', async () => {
    const { hydrateComments, getAllComments } = await import('../src/composables/useComments')
    hydrateComments(
      [{ id: 'x', file: 'App.vue', line: 5, text: 'old', timestamp: 1 }],
      'challenge-a',
      'vue',
    )
    hydrateComments(
      [{ id: 'y', file: 'App.vue', line: 5, text: 'new', timestamp: 2 }],
      'challenge-b',
      'react',
    )
    const all = getAllComments()
    // After second hydration the old entry is gone
    expect(all.every((c) => c.id !== 'x')).toBe(true)
    expect(all.some((c) => c.id === 'y')).toBe(true)
  })

  it('setOnPersist callback fires on addComment', async () => {
    const { useComments, hydrateComments, setOnPersist } = await import('../src/composables/useComments')
    hydrateComments([], 'test', 'vue')
    const calls: any[][] = []
    setOnPersist((comments) => calls.push(comments))
    const key = computed(() => 'test:vue:App.vue')
    const { addComment } = useComments(key)
    addComment(3, 'note')
    expect(calls).toHaveLength(1)
    expect(calls[0][0].text).toBe('note')
    setOnPersist(null) // cleanup
  })
})
