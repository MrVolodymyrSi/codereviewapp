<script setup lang="ts">
import { computed } from 'vue'
import { useChallenge } from '../composables/useChallenge'
import { useBugChecklist } from '../composables/useBugChecklist'

const { activeChallenge, activeChallengeId, activeFramework } = useChallenge()
const { isChecked, toggle, resetAll } = useBugChecklist(activeChallengeId)

const visibleBugs = computed(() =>
  activeChallenge.value.bugs.filter(
    (b) => b.variant === undefined || b.variant === activeFramework.value
  )
)

const foundCount = computed(
  () => visibleBugs.value.filter((b) => isChecked(b.id)).length
)

const SEVERITY_COLORS: Record<string, string> = {
  high: 'var(--danger)',
  medium: 'var(--accent)',
  low: 'var(--text-faint)',
}
</script>

<template>
  <div class="bug-checklist">
    <div class="section-header">
      <span class="section-title">
        Bug Checklist
        <span class="count-badge">{{ foundCount }}/{{ visibleBugs.length }}</span>
      </span>
      <button v-if="foundCount > 0" class="reset-btn" @click="resetAll">Reset</button>
    </div>

    <div v-if="visibleBugs.length === 0" class="empty-state">
      No bugs defined for this challenge yet.
    </div>

    <div v-else class="bug-list">
      <label
        v-for="bug in visibleBugs"
        :key="bug.id"
        class="bug-row"
        :class="{ checked: isChecked(bug.id) }"
      >
        <input
          type="checkbox"
          :checked="isChecked(bug.id)"
          class="bug-checkbox"
          @change="toggle(bug.id)"
        />
        <div class="bug-body">
          <div class="bug-top">
            <span
              class="severity-badge"
              :style="{ color: SEVERITY_COLORS[bug.severity], borderColor: SEVERITY_COLORS[bug.severity] }"
            >{{ bug.severity }}</span>
            <span class="bug-location">{{ bug.file }}:{{ bug.line }}</span>
          </div>
          <p class="bug-description" :class="{ 'bug-description--found': isChecked(bug.id) }">
            {{ bug.description }}
          </p>
        </div>
      </label>
    </div>
  </div>
</template>

<style scoped>
.bug-checklist {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.section-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.count-badge {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0;
}

.reset-btn {
  background: transparent;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  font-size: 0.7rem;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: var(--font-ui);
  transition: color 0.15s;
}

.reset-btn:hover {
  color: var(--danger);
}

.empty-state {
  padding: 16px 12px;
  font-size: 0.78rem;
  color: var(--text-faint);
  font-style: italic;
}

.bug-list {
  overflow-y: auto;
  flex: 1;
}

.bug-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 0.1s;
}

.bug-row:hover {
  background: var(--bg-elevated);
}

.bug-checkbox {
  margin-top: 3px;
  flex-shrink: 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.bug-body {
  flex: 1;
  min-width: 0;
}

.bug-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.severity-badge {
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid;
  border-radius: 3px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.bug-location {
  font-size: 0.68rem;
  color: var(--text-faint);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bug-description {
  margin: 0;
  font-size: 0.76rem;
  color: var(--text-muted);
  line-height: 1.5;
  word-break: break-word;
  transition: opacity 0.2s;
}

.bug-description--found {
  text-decoration: line-through;
  opacity: 0.45;
}
</style>
