import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Comment } from '../types/comment'

const STORAGE_KEY = 'code-review-comments'

const store = ref<Record<string, Comment[]>>({})

// hydrate from localStorage once
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) store.value = JSON.parse(raw)
} catch {}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store.value))
}

export function useComments(key: ComputedRef<string>) {
  const comments = computed<Comment[]>(() => store.value[key.value] ?? [])

  function addComment(line: number, text: string) {
    const entry = store.value[key.value] ?? []
    store.value = {
      ...store.value,
      [key.value]: [
        ...entry,
        { id: crypto.randomUUID(), line, text, timestamp: Date.now() },
      ],
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

  return { comments, addComment, removeComment }
}
