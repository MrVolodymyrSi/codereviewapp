<script setup lang="ts">
import ChallengeSelector from './ChallengeSelector.vue'
import FrameworkTabs from './FrameworkTabs.vue'
import { useChallenge } from '../composables/useChallenge'

const { challenges, activeChallengeId, activeFramework, activeChallenge, setChallenge, setFramework } =
  useChallenge()
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <span class="brand-icon">&#9881;</span>
      <span class="brand-name">Code Review</span>
    </div>

    <div class="controls">
      <ChallengeSelector
        :challenges="challenges"
        :active-id="activeChallengeId"
        @change="setChallenge"
      />
      <FrameworkTabs :active="activeFramework" @change="setFramework" />
    </div>

    <div class="description">
      {{ activeChallenge.description }}
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 20px;
  height: 56px;
  background: var(--bg-header);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 1rem;
  color: var(--text);
  flex-shrink: 0;
}

.brand-icon {
  font-size: 1.2rem;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.description {
  font-size: 0.8rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
</style>
