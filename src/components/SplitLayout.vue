<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const splitPercent = ref(50)
const isDragging = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)
const iframeRef = ref<HTMLDivElement | null>(null)

function onDividerMousedown(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true
  if (iframeRef.value) iframeRef.value.style.pointerEvents = 'none'
}

function onMousemove(e: MouseEvent) {
  if (!isDragging.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const pct = ((e.clientX - rect.left) / rect.width) * 100
  splitPercent.value = Math.min(80, Math.max(20, pct))
}

function onMouseup() {
  isDragging.value = false
  if (iframeRef.value) iframeRef.value.style.pointerEvents = ''
}

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
  <div
    ref="containerRef"
    class="split-layout"
    :style="{ '--split': splitPercent + '%' }"
  >
    <div class="pane left-pane">
      <slot name="left" />
    </div>

    <div
      class="divider"
      :class="{ dragging: isDragging }"
      @mousedown="onDividerMousedown"
    >
      <div class="divider-handle">
        <span class="grip" />
        <span class="grip" />
        <span class="grip" />
      </div>
    </div>

    <div ref="iframeRef" class="pane right-pane">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.split-layout {
  display: grid;
  grid-template-columns: var(--split) 6px 1fr;
  height: 100%;
  overflow: hidden;
}

.pane {
  overflow: hidden;
  min-width: 0;
}

.divider {
  background: var(--border-subtle);
  cursor: col-resize;
  transition: background 0.2s;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.divider::before {
  content: '';
  position: absolute;
  inset: 0 -5px;
}

.divider-handle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  opacity: 0;
  transition: opacity 0.2s;
}

.grip {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--text-faint);
}

.divider:hover .divider-handle,
.divider.dragging .divider-handle {
  opacity: 1;
}

.divider:hover,
.divider.dragging {
  background: var(--accent);
}
</style>
