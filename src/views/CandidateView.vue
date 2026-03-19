<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import SplitLayout from '../components/SplitLayout.vue'
import WorkspacePane from '../components/WorkspacePane.vue'
import PreviewPane from '../components/PreviewPane.vue'
import ConsolePanel from '../components/ConsolePanel.vue'
import { useChallenge } from '../composables/useChallenge'
import { useIframeDoc } from '../composables/useIframeDoc'
import { useSession } from '../composables/useSession'
import { useConsole } from '../composables/useConsole'
import { useSessionPersistence } from '../composables/useSessionPersistence'

const { commitAndRun } = useChallenge()
const { srcdoc } = useIframeDoc()
const { sessionId } = useSession()
useConsole()

const { loadSession } = useSessionPersistence()

type PageState = 'loading' | 'interview' | 'ended' | 'not-found' | 'error'
const pageState = ref<PageState>('loading')
const connectionLostBanner = ref(false)

let pollInterval: ReturnType<typeof setInterval> | null = null
let consecutiveErrors = 0

async function poll() {
  const sid = sessionId.value
  if (!sid) return
  const result = await loadSession(sid)
  if ('error' in result) {
    consecutiveErrors++
    if (consecutiveErrors >= 5) {
      connectionLostBanner.value = true
      stopPolling()
    }
    return
  }
  consecutiveErrors = 0
  if ('notFound' in result) {
    pageState.value = 'ended'
    stopPolling()
    return
  }
  if (result.data.ended_at) {
    pageState.value = 'ended'
    stopPolling()
  }
}

function stopPolling() {
  if (pollInterval !== null) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

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
  if (result.data.ended_at) {
    pageState.value = 'ended'
    return
  }

  pageState.value = 'interview'
  commitAndRun()

  // Start polling only after successful in-progress load
  pollInterval = setInterval(poll, 10_000)
})

onUnmounted(stopPolling)
</script>

<template>
  <div class="candidate-view">

    <!-- Loading -->
    <div v-if="pageState === 'loading'" class="full-screen-state">
      <div class="spinner" />
      <span class="state-text">Loading session…</span>
    </div>

    <!-- Not found -->
    <div v-else-if="pageState === 'not-found'" class="full-screen-state">
      <span class="state-text">This session link is invalid or has expired.</span>
    </div>

    <!-- Error -->
    <div v-else-if="pageState === 'error'" class="full-screen-state">
      <span class="state-text">Could not connect — please refresh.</span>
    </div>

    <!-- Session ended -->
    <div v-else-if="pageState === 'ended'" class="full-screen-state">
      <span class="state-text ended-text">This session has ended. Thank you for your time.</span>
    </div>

    <!-- Interview UI -->
    <template v-else-if="pageState === 'interview'">
      <AppHeader :candidate-mode="true" :session-id="sessionId ?? undefined" />

      <div v-if="connectionLostBanner" class="connection-lost-banner">
        Connection lost — your session may still be active.
      </div>

      <div class="main-area">
        <SplitLayout>
          <template #left>
            <WorkspacePane />
          </template>
          <template #right>
            <PreviewPane :srcdoc="srcdoc" />
          </template>
        </SplitLayout>
        <ConsolePanel />
      </div>
    </template>

  </div>
</template>

<style scoped>
.candidate-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  color: var(--text);
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

.ended-text {
  font-size: 1rem;
  color: var(--text-muted);
}

.connection-lost-banner {
  background: var(--warning-dim);
  border-bottom: 1px solid rgba(154, 103, 0, 0.3);
  color: var(--warning);
  font-size: 0.75rem;
  padding: 6px 20px;
  flex-shrink: 0;
  text-align: center;
}

.main-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.main-area :deep(.split-layout) {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
