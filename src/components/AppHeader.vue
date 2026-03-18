<script setup lang="ts">
import ChallengeSelector from './ChallengeSelector.vue'
import FrameworkTabs from './FrameworkTabs.vue'
import { useChallenge } from '../composables/useChallenge'

const { challenges, activeChallengeId, activeFramework, activeChallenge, setChallenge, setFramework } =
  useChallenge()
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
        <ChallengeSelector
          :challenges="challenges"
          :active-id="activeChallengeId"
          @change="setChallenge"
        />
        <div class="separator" />
        <FrameworkTabs :active="activeFramework" @change="setFramework" />
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
  height: 52px;
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

.description-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 20px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg);
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
