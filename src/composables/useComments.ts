import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Comment } from '../types/comment'

const store = ref<Record<string, Comment[]>>({})

let _onPersist: ((comments: Comment[]) => void) | null = null

export function hydrateComments(
  comments: any[],
  challengeId: string,
  framework: string,
): void {
  // Normalise legacy comments that have `line` but not `lineStart`/`lineEnd`
  const normalised: Comment[] = comments.map(c => ({
    ...c,
    lineStart: c.lineStart ?? c.line,
    lineEnd:   c.lineEnd   ?? c.line,
  }))
  const grouped: Record<string, Comment[]> = {}
  for (const c of normalised) {
    const key = `${challengeId}:${framework}:${c.file}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(c)
  }
  store.value = grouped
}

export function getAllComments(): Comment[] {
  return Object.values(store.value).flat()
}

export function setOnPersist(cb: ((comments: Comment[]) => void) | null): void {
  _onPersist = cb
}

export function useComments(key: ComputedRef<string>) {
  const comments = computed<Comment[]>(() => store.value[key.value] ?? [])

  function addComment(lineStart: number, lineEnd: number, text: string) {
    const file = key.value.split(':')[2]
    store.value = {
      ...store.value,
      [key.value]: [
        ...(store.value[key.value] ?? []),
        { id: crypto.randomUUID(), file, lineStart, lineEnd, text, timestamp: Date.now() },
      ],
    }
    _onPersist?.(getAllComments())
  }

  function updateComment(id: string, text: string) {
    const entry = store.value[key.value] ?? []
    store.value = {
      ...store.value,
      [key.value]: entry.map((c) =>
        c.id === id ? { ...c, text, updatedAt: Date.now() } : c,
      ),
    }
    _onPersist?.(getAllComments())
  }

  function removeComment(id: string) {
    store.value = {
      ...store.value,
      [key.value]: (store.value[key.value] ?? []).filter((c) => c.id !== id),
    }
    _onPersist?.(getAllComments())
  }

  return { comments, addComment, updateComment, removeComment }
}
