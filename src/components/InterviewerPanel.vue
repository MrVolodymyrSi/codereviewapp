<script setup lang="ts">
import { ref } from 'vue'
import BugChecklist from './BugChecklist.vue'
import NotesPanel from './NotesPanel.vue'

const collapsed = ref(false)
const splitPercent = ref(45) // percent for bug checklist, rest for notes
const isDragging = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)

function onDividerMousedown(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onMousemove(e: MouseEvent) {
  if (!isDragging.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const pct = ((e.clientY - rect.top) / rect.height) * 100
  splitPercent.value = Math.min(75, Math.max(25, pct))
}

function onMouseup() {
  isDragging.value = false
}

import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  window.addEventListener('mousemove', onMousemove)
  window.addEventListener('mouseup', onMouseup)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMousemove)
  window.removeEventListener('mouseup', onMouseup)
})
</script>

<template>
  <div class="interviewer-panel" :class="{ collapsed }">
    <div class="panel-topbar">
      <span class="panel-title">Interviewer</span>
      <button class="collapse-btn" :title="collapsed ? 'Expand' : 'Collapse'" @click="collapsed = !collapsed">
        {{ collapsed ? '◀' : '▶' }}
      </button>
    </div>

    <div v-if="!collapsed" ref="containerRef" class="panel-body">
      <div class="panel-section" :style="{ flex: `0 0 ${splitPercent}%` }">
        <BugChecklist />
      </div>

      <div
        class="panel-divider"
        :class="{ dragging: isDragging }"
        @mousedown="onDividerMousedown"
      />

      <div class="panel-section" style="flex: 1; min-height: 0;">
        <NotesPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.interviewer-panel {
  width: 270px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  transition: width 0.2s;
  overflow: hidden;
}

.interviewer-panel.collapsed {
  width: 36px;
}

.panel-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  height: 38px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-header);
  flex-shrink: 0;
}

.panel-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  overflow: hidden;
}

.collapsed .panel-title {
  display: none;
}

.collapse-btn {
  background: transparent;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  font-size: 0.65rem;
  padding: 4px;
  border-radius: 3px;
  flex-shrink: 0;
  transition: color 0.15s;
}

.collapse-btn:hover {
  color: var(--text);
}

.panel-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.panel-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.panel-divider {
  height: 5px;
  background: var(--border-subtle);
  cursor: row-resize;
  flex-shrink: 0;
  transition: background 0.15s;
}

.panel-divider:hover,
.panel-divider.dragging {
  background: var(--accent);
}
</style>
