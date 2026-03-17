<script setup lang="ts">
import type { Framework } from '../types/challenge'

const props = defineProps<{
  active: Framework
}>()

const emit = defineEmits<{
  change: [fw: Framework]
}>()

const tabs: { id: Framework; label: string }[] = [
  { id: 'vue', label: 'Vue 3' },
  { id: 'react', label: 'React' },
  { id: 'vanilla', label: 'Vanilla JS' },
]
</script>

<template>
  <div class="framework-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      :class="['tab', { active: props.active === tab.id }]"
      @click="emit('change', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.framework-tabs {
  display: flex;
  gap: 4px;
}

.tab {
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s;
}

.tab:hover {
  border-color: var(--accent);
  color: var(--text);
}

.tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
