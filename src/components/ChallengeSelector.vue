<script setup lang="ts">
import type { Challenge } from '../types/challenge'

const props = defineProps<{
  challenges: Challenge[]
  activeId: string
}>()

const emit = defineEmits<{
  change: [id: string]
}>()
</script>

<template>
  <div class="selector-wrap">
    <select
      :value="props.activeId"
      class="challenge-select"
      @change="emit('change', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="c in props.challenges" :key="c.id" :value="c.id">
        {{ c.title }}
      </option>
    </select>
    <span class="chevron">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  </div>
</template>

<style scoped>
.selector-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.challenge-select {
  appearance: none;
  -webkit-appearance: none;
  padding: 5px 28px 5px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg-elevated);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  min-width: 160px;
  transition: border-color 0.15s, background 0.15s;
  outline: none;
}

.challenge-select:hover {
  border-color: var(--text-faint);
  background: var(--bg-surface);
}

.challenge-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.challenge-select option {
  background: var(--bg-elevated);
  color: var(--text);
}

.chevron {
  position: absolute;
  right: 8px;
  color: var(--text-muted);
  pointer-events: none;
  display: flex;
  align-items: center;
}
</style>
