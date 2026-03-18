import { ref, watch } from 'vue'
import { useChallenge } from './useChallenge'
import type { PanelEntry, ConsoleEntry, NetworkEntry } from '../types/console'

const entries = ref<PanelEntry[]>([])
let listenerAttached = false
const MAX_ENTRIES = 500

function append(entry: PanelEntry) {
  if (entries.value.length >= MAX_ENTRIES) {
    entries.value = entries.value.slice(1)
  }
  entries.value = [...entries.value, entry]
}

function onMessage(event: MessageEvent) {
  const d = event.data
  if (!d || d.source !== '__iframe_bridge__') return

  if (d.type === 'console') {
    const entry: ConsoleEntry = {
      id: crypto.randomUUID(),
      kind: 'console',
      level: d.level ?? 'log',
      args: Array.isArray(d.args) ? d.args : [String(d.args)],
      timestamp: d.timestamp ?? Date.now(),
    }
    append(entry)
  } else if (d.type === 'network') {
    if (d.phase === 'start') {
      const entry: NetworkEntry = {
        id: crypto.randomUUID(),
        kind: 'network',
        requestId: d.requestId,
        method: d.method ?? 'GET',
        url: d.url ?? '',
        status: null,
        duration: null,
        pending: true,
        timestamp: d.timestamp ?? Date.now(),
      }
      append(entry)
    } else {
      // Update existing entry in-place
      const idx = entries.value.findIndex(
        (e) => e.kind === 'network' && (e as NetworkEntry).requestId === d.requestId
      )
      if (idx >= 0) {
        const updated: NetworkEntry = {
          ...(entries.value[idx] as NetworkEntry),
          status: d.status ?? null,
          duration: d.duration ?? null,
          pending: false,
        }
        const copy = [...entries.value]
        copy[idx] = updated
        entries.value = copy
      }
    }
  }
}

export function useConsole() {
  if (!listenerAttached) {
    window.addEventListener('message', onMessage)
    listenerAttached = true
  }

  // Auto-clear when Run is clicked
  const { runTrigger } = useChallenge()
  watch(runTrigger, () => {
    entries.value = []
  })

  function clear() {
    entries.value = []
  }

  return { entries, clear }
}
