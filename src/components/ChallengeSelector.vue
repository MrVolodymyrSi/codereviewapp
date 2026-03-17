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
  <select
    :value="props.activeId"
    class="challenge-select"
    @change="emit('change', ($event.target as HTMLSelectElement).value)"
  >
    <option v-for="c in props.challenges" :key="c.id" :value="c.id">
      {{ c.title }}
    </option>
  </select>
</template>

<style scoped>
.challenge-select {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text);
  font-size: 0.9rem;
  cursor: pointer;
  min-width: 180px;
}
</style>
