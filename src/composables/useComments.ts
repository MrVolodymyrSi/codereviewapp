import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Comment } from '../types/comment'

const store = ref<Record<string, Comment[]>>({})
let _challengeId = ''
let _framework = ''

export function loadComments(challengeId: string, framework: string): void {
  _challengeId = challengeId
  _framework = framework
  const key = `codereview:comments:${challengeId}:${framework}`
  try {
    const raw = localStorage.getItem(key)
    const flat: Comment[] = raw ? JSON.parse(raw) : []
    const grouped: Record<string, Comment[]> = {}
    for (const c of flat) {
      const storeKey = `${challengeId}:${framework}:${c.file}`
      if (!grouped[storeKey]) grouped[storeKey] = []
      grouped[storeKey].push(c)
    }
    store.value = grouped
  } catch {
    store.value = {}
  }
}

function persist(): void {
  if (!_challengeId) return
  const key = `codereview:comments:${_challengeId}:${_framework}`
  const all = Object.values(store.value).flat()
  localStorage.setItem(key, JSON.stringify(all))
}

export function useComments(key: ComputedRef<string>) {
  const comments = computed<Comment[]>(() => store.value[key.value] ?? [])

  function addComment(lineStart: number, lineEnd: number, text: string) {
    const file = key.value.split(':').slice(2).join(':')
    store.value = {
      ...store.value,
      [key.value]: [
        ...(store.value[key.value] ?? []),
        { id: crypto.randomUUID(), file, lineStart, lineEnd, text, timestamp: Date.now() },
      ],
    }
    persist()
  }

  function updateComment(id: string, text: string) {
    const entry = store.value[key.value] ?? []
    store.value = {
      ...store.value,
      [key.value]: entry.map((c) =>
        c.id === id ? { ...c, text, updatedAt: Date.now() } : c,
      ),
    }
    persist()
  }

  function removeComment(id: string) {
    store.value = {
      ...store.value,
      [key.value]: (store.value[key.value] ?? []).filter((c) => c.id !== id),
    }
    persist()
  }

  return { comments, addComment, updateComment, removeComment }
}
