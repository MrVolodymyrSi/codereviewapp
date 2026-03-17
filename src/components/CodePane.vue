<script setup lang="ts">
import { computed } from 'vue'
import { useHighlighter } from '../composables/useHighlighter'

const props = defineProps<{
  code: string
  language: string
}>()

const { highlight, isReady } = useHighlighter()

const highlighted = computed(() => highlight(props.code, props.language))
</script>

<template>
  <div class="code-pane">
    <div class="pane-header">
      <span class="pane-label">Code</span>
      <span class="lang-badge">{{ props.language }}</span>
    </div>
    <div v-if="!isReady" class="skeleton">
      <div v-for="i in 12" :key="i" class="skeleton-line" :style="{ width: (40 + Math.random() * 50) + '%' }" />
    </div>
    <div v-else class="code-wrap" v-html="highlighted" />
  </div>
</template>

<style scoped>
.code-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #0d1117;
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #30363d;
  background: #161b22;
  flex-shrink: 0;
}

.pane-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lang-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #8b949e;
}

.code-wrap {
  overflow: auto;
  flex: 1;
}

.code-wrap :deep(pre) {
  margin: 0;
  padding: 1.25rem 1.5rem;
  font-size: 0.875rem;
  line-height: 1.6;
  min-height: 100%;
  tab-size: 2;
}

.skeleton {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  height: 14px;
  background: #21262d;
  border-radius: 4px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
