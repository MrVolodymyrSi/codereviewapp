import { ref } from 'vue'
import { getLocalSid } from '../utils/local-session'

function notesKey(): string {
  return `codereview:notes:${getLocalSid()}`
}

const notes = ref<string>((() => {
  try {
    return localStorage.getItem(notesKey()) ?? ''
  } catch {
    return ''
  }
})())

let _debounceTimer: ReturnType<typeof setTimeout> | null = null
let _onPersist: ((text: string) => void) | null = null

export function useNotes() {
  function setNotes(text: string) {
    notes.value = text
    if (_debounceTimer) clearTimeout(_debounceTimer)
    _debounceTimer = setTimeout(() => {
      try {
        localStorage.setItem(notesKey(), text)
      } catch {}
      _onPersist?.(text)
    }, 300)
  }

  function exportNotes() {
    navigator.clipboard.writeText(notes.value).catch(() => {})
  }

  function setOnPersist(cb: (text: string) => void) {
    _onPersist = cb
  }

  return { notes, setNotes, exportNotes, setOnPersist }
}
