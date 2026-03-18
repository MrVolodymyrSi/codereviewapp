import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { getLocalSid } from '../utils/local-session'

const store = ref<Record<string, string[]>>({})

function storageKey(challengeId: string): string {
  return `codereview:bugs:${getLocalSid()}:${challengeId}`
}

function load(challengeId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(challengeId))
    if (raw) return JSON.parse(raw) as string[]
  } catch {}
  return []
}

function persist(challengeId: string) {
  localStorage.setItem(storageKey(challengeId), JSON.stringify(store.value[challengeId] ?? []))
}

export function useBugChecklist(challengeId: Ref<string>) {
  const checkedIds = computed<string[]>(() => {
    const id = challengeId.value
    if (!(id in store.value)) {
      store.value[id] = load(id)
    }
    return store.value[id]
  })

  function isChecked(bugId: string): boolean {
    return checkedIds.value.includes(bugId)
  }

  function toggle(bugId: string) {
    const id = challengeId.value
    if (!(id in store.value)) store.value[id] = load(id)
    const list = store.value[id]
    const idx = list.indexOf(bugId)
    store.value[id] = idx >= 0 ? list.filter((b) => b !== bugId) : [...list, bugId]
    persist(id)
  }

  function resetAll() {
    const id = challengeId.value
    store.value[id] = []
    persist(id)
  }

  return { checkedIds, isChecked, toggle, resetAll }
}
