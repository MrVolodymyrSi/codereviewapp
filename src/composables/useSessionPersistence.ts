import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { SessionRow } from '../types/session'

type SaveResult = { ok: true } | { ok: false; error: Error }
type EndResult = { ok: true; session: SessionRow } | { ok: false; error: Error }
type LoadResult =
  | { data: SessionRow }
  | { data: null; notFound: true }
  | { data: null; error: Error }

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

// --- module-level shared state ---
const saveFailed = ref(false)
const metaSyncFailed = ref(false)

// --- notes debounce state ---
let notesDebounceTimer: ReturnType<typeof setTimeout> | null = null
let notesLatestValue = ''
let notesRetryGen = 0

// --- bugs debounce state ---
let bugsDebounceTimer: ReturnType<typeof setTimeout> | null = null
let bugsLatestValue: string[] = []
let bugsRetryGen = 0

// Session ID set when createSessionRow or loadSession resolves
let activeSessionId: string | null = null

export function useSessionPersistence() {
  // ── createSessionRow ─────────────────────────────────────────────────────
  async function createSessionRow(params: {
    id: string
    candidateName: string
    challengeId: string
    framework: string
    totalBugs: number
  }): Promise<SaveResult> {
    const { error } = await supabase.from('sessions').insert({
      id: params.id,
      candidate_name: params.candidateName,
      challenge_id: params.challengeId,
      framework: params.framework,
      total_bugs: params.totalBugs,
    })
    if (error) return { ok: false, error: new Error(error.message) }
    activeSessionId = params.id
    return { ok: true }
  }

  // ── loadSession ──────────────────────────────────────────────────────────
  async function loadSession(id: string): Promise<LoadResult> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) return { data: null, error: new Error(error.message) }
    if (!data) return { data: null, notFound: true }
    activeSessionId = id
    // Initialise latest values so flush doesn't overwrite with empty strings
    notesLatestValue = (data as SessionRow).notes
    bugsLatestValue = (data as SessionRow).bugs_checked
    return { data: data as SessionRow }
  }

  // ── saveNotes (debounced 1s) ─────────────────────────────────────────────
  async function doWriteNotes(notes: string, gen: number): Promise<void> {
    const sid = activeSessionId
    if (!sid) return
    for (let attempt = 0; attempt < 3; attempt++) {
      if (notesRetryGen !== gen) return // cancelled by newer call
      const { error } = await supabase
        .from('sessions')
        .update({ notes })
        .eq('id', sid)
      if (!error) {
        saveFailed.value = false
        return
      }
      if (attempt < 2) await wait(1000)
    }
    if (notesRetryGen === gen) saveFailed.value = true
  }

  function saveNotes(notes: string): void {
    notesLatestValue = notes
    if (notesDebounceTimer) clearTimeout(notesDebounceTimer)
    notesDebounceTimer = setTimeout(() => {
      notesDebounceTimer = null
      const gen = ++notesRetryGen
      doWriteNotes(notes, gen)
    }, 1000)
  }

  async function flushNotes(): Promise<SaveResult> {
    if (notesDebounceTimer) {
      clearTimeout(notesDebounceTimer)
      notesDebounceTimer = null
    }
    // Increment gen to abort any in-flight retry
    const gen = ++notesRetryGen
    const sid = activeSessionId
    if (!sid) return { ok: true }
    const { error } = await supabase
      .from('sessions')
      .update({ notes: notesLatestValue })
      .eq('id', sid)
    if (error && notesRetryGen === gen) return { ok: false, error: new Error(error.message) }
    return { ok: true }
  }

  // ── saveBugsChecked (debounced 1s) ───────────────────────────────────────
  async function doWriteBugs(bugIds: string[], gen: number): Promise<void> {
    const sid = activeSessionId
    if (!sid) return
    for (let attempt = 0; attempt < 3; attempt++) {
      if (bugsRetryGen !== gen) return
      const { error } = await supabase
        .from('sessions')
        .update({ bugs_checked: bugIds })
        .eq('id', sid)
      if (!error) {
        saveFailed.value = false
        return
      }
      if (attempt < 2) await wait(1000)
    }
    if (bugsRetryGen === gen) saveFailed.value = true
  }

  function saveBugsChecked(bugIds: string[]): void {
    bugsLatestValue = bugIds
    if (bugsDebounceTimer) clearTimeout(bugsDebounceTimer)
    bugsDebounceTimer = setTimeout(() => {
      bugsDebounceTimer = null
      const gen = ++bugsRetryGen
      doWriteBugs(bugIds, gen)
    }, 1000)
  }

  async function flushBugsChecked(): Promise<SaveResult> {
    if (bugsDebounceTimer) {
      clearTimeout(bugsDebounceTimer)
      bugsDebounceTimer = null
    }
    const gen = ++bugsRetryGen
    const sid = activeSessionId
    if (!sid) return { ok: true }
    const { error } = await supabase
      .from('sessions')
      .update({ bugs_checked: bugsLatestValue })
      .eq('id', sid)
    if (error && bugsRetryGen === gen) return { ok: false, error: new Error(error.message) }
    return { ok: true }
  }

  // ── saveChallengeMeta (immediate, retry ×3 at 500ms) ────────────────────
  async function saveChallengeMeta(
    challengeId: string,
    framework: string,
    totalBugs: number,
  ): Promise<void> {
    const sid = activeSessionId
    if (!sid) return
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase
        .from('sessions')
        .update({ challenge_id: challengeId, framework, total_bugs: totalBugs })
        .eq('id', sid)
      if (!error) {
        saveFailed.value = false
        metaSyncFailed.value = false
        return
      }
      if (attempt < 2) await wait(500)
    }
    saveFailed.value = true
    metaSyncFailed.value = true
  }

  // ── endSession ───────────────────────────────────────────────────────────
  async function endSession(): Promise<EndResult> {
    const sid = activeSessionId
    if (!sid) return { ok: false, error: new Error('No active session') }
    const { error } = await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sid)
    if (error) return { ok: false, error: new Error(error.message) }
    // Re-fetch the full row so InterviewerView has fresh state
    const { data, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sid)
      .single()
    if (fetchError || !data) {
      return { ok: false, error: new Error(fetchError?.message ?? 'Could not re-fetch session') }
    }
    return { ok: true, session: data as SessionRow }
  }

  return {
    createSessionRow,
    loadSession,
    saveNotes,
    flushNotes,
    saveBugsChecked,
    flushBugsChecked,
    saveChallengeMeta,
    endSession,
    saveFailed,
    metaSyncFailed,
  }
}
