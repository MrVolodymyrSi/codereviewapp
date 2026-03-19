<script setup lang="ts">
import ChallengeSelector from './ChallengeSelector.vue'
import FrameworkTabs from './FrameworkTabs.vue'
import { useChallenge } from '../composables/useChallenge'

const props = defineProps<{
  candidateMode?: boolean
  sessionId?: string
  timerDisplay?: string
}>()

const emit = defineEmits<{
  endInterview: []
}>()

const { challenges, activeChallengeId, activeFramework, activeChallenge, setChallenge, setFramework } =
  useChallenge()

function copySessionId() {
  if (props.sessionId) navigator.clipboard.writeText(props.sessionId)
}
</script>

<template>
  <header class="app-header">
    <div class="top-bar">
      <div class="brand">
        <div class="brand-mark">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 4L2 9L6 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 4L16 9L12 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="9" cy="9" r="1.5" fill="currentColor" opacity="0.6"/>
          </svg>
        </div>
        <span class="brand-name">codereview</span>
      </div>

      <div class="controls">
        <template v-if="!candidateMode">
          <ChallengeSelector
            :challenges="challenges"
            :active-id="activeChallengeId"
            @change="setChallenge"
          />
          <div class="separator" />
          <FrameworkTabs :active="activeFramework" @change="setFramework" />
        </template>
        <template v-else>
          <span class="candidate-badge">Candidate View</span>
        </template>
      </div>

      <div class="header-right">
        <span v-if="timerDisplay && !candidateMode" class="timer-display">{{ timerDisplay }}</span>

        <button
          v-if="!candidateMode && timerDisplay"
          class="end-btn"
          @click="emit('endInterview')"
        >
          End Interview
        </button>

        <button v-if="sessionId" class="sid-badge" :title="'Session: ' + sessionId" @click="copySessionId">
          SID: <code>{{ sessionId }}</code>
        </button>
      </div>
    </div>

    <div class="description-bar">
      <span class="description-icon">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/>
          <path d="M6 5.5V8.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="6" cy="3.5" r="0.7" fill="currentColor"/>
        </svg>
      </span>
      <span class="description-text">{{ activeChallenge.description }}</span>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--bg-header);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 20px;
  height: 44px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
}

.brand-mark {
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-family: var(--font-brand);
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
  color: var(--text);
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.separator {
  width: 1px;
  height: 20px;
  background: var(--border);
  flex-shrink: 0;
}

.candidate-badge {
  font-size: 0.72rem;
  font-weight: 500;
  font-style: normal;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: 20px;
  padding: 2px 10px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.timer-display {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  min-width: 48px;
  text-align: right;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
}

.end-btn {
  background: var(--danger, #f87171);
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 5px 12px;
  transition: opacity 0.15s;
}

.end-btn:hover {
  opacity: 0.85;
}

.sid-badge {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text-faint);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.7rem;
  padding: 3px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s, border-color 0.15s;
}

.sid-badge:hover {
  color: var(--text-muted);
  border-color: var(--text-faint);
}

.sid-badge code {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--accent);
}

.description-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 20px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.description-icon {
  color: var(--text-faint);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.description-text {
  font-size: 0.78rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}

</style>
