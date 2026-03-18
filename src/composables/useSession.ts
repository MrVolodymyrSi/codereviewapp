import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { SessionRole } from '../types/session'

// Parse URL params once at module load
const params = new URLSearchParams(window.location.search)
const rawSid = params.get('sid')
const rawRole = params.get('role')

const validRole: SessionRole | null =
  rawRole === 'interviewer' || rawRole === 'candidate' ? rawRole : null

const sessionId = ref<string | null>(rawSid || null)
const role = ref<SessionRole | null>(validRole)

export function useSession() {
  const isInterviewer = computed(() => role.value === 'interviewer')
  const isCandidate = computed(() => role.value === 'candidate')
  const hasSession = computed(() => sessionId.value !== null && role.value !== null)

  function createSession(): string {
    const sid = nanoid(8)
    sessionId.value = sid
    role.value = 'interviewer'
    return sid
  }

  return {
    sessionId,
    role,
    isInterviewer,
    isCandidate,
    hasSession,
    createSession,
  }
}
