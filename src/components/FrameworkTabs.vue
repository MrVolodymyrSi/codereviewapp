<script setup lang="ts">
import type { Framework } from '../types/challenge'

const props = defineProps<{
  active: Framework
}>()

const emit = defineEmits<{
  change: [fw: Framework]
}>()

const tabs: { id: Framework; label: string; color: string }[] = [
  { id: 'vue', label: 'Vue 3', color: 'var(--vue)' },
  { id: 'react', label: 'React', color: 'var(--react)' },
  { id: 'vanilla', label: 'JS', color: 'var(--vanilla)' },
]
</script>

<template>
  <div class="framework-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      :class="['tab', { active: props.active === tab.id }]"
      :style="props.active === tab.id ? { '--fw-color': tab.color } : { '--fw-color': 'transparent' }"
      @click="emit('change', tab.id)"
    >
      <span
        class="fw-dot"
        :style="{ background: tab.color }"
      />
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.framework-tabs {
  display: flex;
  gap: 3px;
  background: var(--bg-input);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.15s;
  white-space: nowrap;
}

.tab:hover {
  background: var(--bg-elevated);
  color: var(--text);
}

.tab.active {
  background: var(--bg-elevated);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.fw-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.tab.active .fw-dot,
.tab:hover .fw-dot {
  opacity: 1;
}
</style>
