<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import SplitLayout from '../components/SplitLayout.vue'
import WorkspacePane from '../components/WorkspacePane.vue'
import PreviewPane from '../components/PreviewPane.vue'
import InterviewerPanel from '../components/InterviewerPanel.vue'
import ConsolePanel from '../components/ConsolePanel.vue'
import SessionSummaryView from './SessionSummaryView.vue'
import { useChallenge } from '../composables/useChallenge'
import { useIframeDoc } from '../composables/useIframeDoc'
import { useSession } from '../composables/useSession'
import { useConsole } from '../composables/useConsole'
import { useNotes } from '../composables/useNotes'
import { useBugChecklist } from '../composables/useBugChecklist'
import { useSessionPersistence } from '../composables/useSessionPersistence'
import { useTimer } from '../composables/useTimer'
import type { SessionRow } from '../types/session'

const EDITOR_THEME_KEY = 'codereview:editor-theme'
const editorTheme = ref<'vs-dark' | 'vs'>(
  (localStorage.getItem(EDITOR_THEME_KEY) as 'vs-dark' | 'vs') ?? 'vs-dark'
)
function toggleEditorTheme() {
  editorTheme.value = editorTheme.value === 'vs-dark' ? 'vs' : 'vs-dark'
  localStorage.setItem(EDITOR_THEME_KEY, editorTheme.value)
}

const { commitAndRun, activeChallengeId, activeFramework, activeChallenge } = useChallenge()
const { srcdoc } = useIframeDoc()
const { sessionId } = useSession()
const { setOnPersist: setNotesOnPersist } = useNotes()
const { setOnPersist: setBugsOnPersist } = useBugChecklist(activeChallengeId)
useConsole()

const {
  loadSession,
  saveNotes,
  flushNotes,
  saveBugsChecked,
  flushBugsChecked,
  saveChallengeMeta,
  endSession,
  saveFailed,
  metaSyncFailed,
} = useSessionPersistence()

// ── page state ────────────────────────────────────────────────────────────
type PageState = 'loading' | 'interview' | 'summary' | 'not-found' | 'error'
const pageState = ref<PageState>('loading')
const sessionData = ref<SessionRow | null>(null)

// ── timer ─────────────────────────────────────────────────────────────────
let timerInstance: ReturnType<typeof useTimer> | null = null
const timerDisplay = ref('00:00')

// ── modal ─────────────────────────────────────────────────────────────────
const showModal = ref(false)
const modalError = ref<string | null>(null)
const endingInProgress = ref(false)

// ── mount: load session ───────────────────────────────────────────────────
onMounted(async () => {
  const sid = sessionId.value
  if (!sid) {
    pageState.value = 'not-found'
    return
  }

  const result = await loadSession(sid)

  if ('error' in result) {
    pageState.value = 'error'
    return
  }
  if ('notFound' in result) {
    pageState.value = 'not-found'
    return
  }

  sessionData.value = result.data

  if (result.data.ended_at) {
    pageState.value = 'summary'
    return
  }

  // In-progress session: start interview UI
  pageState.value = 'interview'
  setNotesOnPersist(saveNotes)
  setBugsOnPersist(saveBugsChecked)

  timerInstance = useTimer(new Date(result.data.started_at))
  timerDisplay.value = timerInstance.display.value
  // Keep timerDisplay in sync reactively
  watch(timerInstance.display, (val) => { timerDisplay.value = val })

  commitAndRun()
})

// ── watch challenge / framework changes for meta persistence ──────────────
watch([activeChallengeId, activeFramework], ([challengeId, framework]) => {
  if (pageState.value !== 'interview') return
  const totalBugs = activeChallenge.value.bugs.filter((b) => b.variant === framework).length
  saveChallengeMeta(challengeId, framework, totalBugs)
})

// ── end interview flow ────────────────────────────────────────────────────
function handleEndInterview() {
  showModal.value = true
  modalError.value = null
}

async function confirmEnd() {
  endingInProgress.value = true
  modalError.value = null

  const [r1, r2] = await Promise.all([flushNotes(), flushBugsChecked()])
  if (!r1.ok || !r2.ok) {
    modalError.value = 'Could not save — check your connection.'
    endingInProgress.value = false
    return
  }

  const result = await endSession()
  if (!result.ok) {
    modalError.value = 'Could not end session — check your connection.'
    endingInProgress.value = false
    return
  }

  timerInstance?.stop()
  sessionData.value = result.session
  showModal.value = false
  pageState.value = 'summary'
  endingInProgress.value = false
}

function cancelEnd() {
  showModal.value = false
  modalError.value = null
}

onUnmounted(() => {
  timerInstance?.stop()
  setNotesOnPersist(null)
  setBugsOnPersist(null)
})
</script>

<template>
  <div class="interviewer-view">

    <!-- Loading -->
    <div v-if="pageState === 'loading'" class="full-screen-state">
      <div class="spinner" />
      <span class="state-text">Loading session…</span>
    </div>

    <!-- Not found -->
    <div v-else-if="pageState === 'not-found'" class="full-screen-state">
      <span class="state-text error-text">
        Session not found. This link may be invalid or the session may have expired.
      </span>
    </div>

    <!-- Error -->
    <div v-else-if="pageState === 'error'" class="full-screen-state">
      <span class="state-text error-text">
        Could not connect to session. Please check your connection and refresh.
      </span>
    </div>

    <!-- Summary -->
    <template v-else-if="pageState === 'summary' && sessionData">
      <AppHeader :session-id="sessionId ?? undefined" :editor-theme="editorTheme" @toggle-editor-theme="toggleEditorTheme" />
      <SessionSummaryView :session="sessionData" />
    </template>

    <!-- Interview UI -->
    <template v-else-if="pageState === 'interview'">
      <AppHeader
        :session-id="sessionId ?? undefined"
        :timer-display="timerDisplay"
        :editor-theme="editorTheme"
        @end-interview="handleEndInterview"
        @toggle-editor-theme="toggleEditorTheme"
      />

      <div v-if="saveFailed" class="save-failed-banner">⚠ Save failed — retrying…</div>

      <div class="main-area">
        <div class="workspace-area">
          <SplitLayout>
            <template #left>
              <WorkspacePane :theme="editorTheme" />
            </template>
            <template #right>
              <PreviewPane :srcdoc="srcdoc" />
            </template>
          </SplitLayout>
          <ConsolePanel />
        </div>
        <InterviewerPanel />
      </div>

      <!-- Confirmation modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="cancelEnd">
        <div class="modal-card">
          <h3 class="modal-title">End Interview?</h3>
          <p class="modal-body">
            This will save the session and show the summary. The session cannot be reopened.
          </p>
          <p v-if="metaSyncFailed" class="modal-warning">
            ⚠ Challenge metadata could not be saved — the summary may show incorrect challenge info.
          </p>
          <p v-if="modalError" class="modal-error">{{ modalError }}</p>
          <div class="modal-actions">
            <button class="btn-cancel" :disabled="endingInProgress" @click="cancelEnd">
              Cancel
            </button>
            <button class="btn-confirm" :disabled="endingInProgress" @click="confirmEnd">
              {{ endingInProgress ? 'Saving…' : 'End Interview' }}
            </button>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
.interviewer-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  position: relative;
}

.full-screen-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 2rem;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.state-text {
  font-size: 0.9rem;
  color: var(--text-faint);
  text-align: center;
  max-width: 400px;
  line-height: 1.6;
}

.error-text {
  color: var(--text-muted);
}

.save-failed-banner {
  background: var(--warning-dim);
  border-bottom: 1px solid rgba(154, 103, 0, 0.3);
  color: var(--warning);
  font-size: 0.75rem;
  padding: 6px 20px;
  flex-shrink: 0;
}

.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.workspace-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.workspace-area :deep(.split-layout) {
  flex: 1;
  min-height: 0;
  height: auto;
}

/* Modal */
.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-title {
  font-family: var(--font-brand);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.02em;
}

.modal-body {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.modal-warning {
  margin: 0;
  font-size: 0.78rem;
  color: var(--warning);
  background: var(--warning-dim);
  border: 1px solid rgba(154, 103, 0, 0.3);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}

.modal-error {
  margin: 0;
  font-size: 0.78rem;
  color: var(--danger);
  background: var(--danger-dim);
  border: 1px solid rgba(207, 34, 46, 0.3);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  padding: 7px 14px;
  transition: border-color 0.15s, color 0.15s;
}

.btn-cancel:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--text-faint);
}

.btn-cancel:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-confirm {
  background: var(--danger);
  border: none;
  border-radius: 7px;
  color: #fff;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 7px 14px;
  transition: opacity 0.15s;
}

.btn-confirm:hover:not(:disabled) { opacity: 0.85; }
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
