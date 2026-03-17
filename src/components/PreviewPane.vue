<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  srcdoc: string
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)

function onLoad() {
  loaded.value = true
}

// When srcdoc changes, reset loaded state
watch(
  () => props.srcdoc,
  () => { loaded.value = false }
)

import { watch } from 'vue'
</script>

<template>
  <div class="preview-pane">
    <div class="pane-header">
      <span class="pane-label">Preview</span>
      <span v-if="!loaded" class="loading-dot" />
    </div>
    <div class="iframe-wrap">
      <iframe
        ref="iframeRef"
        :srcdoc="props.srcdoc"
        sandbox="allow-scripts"
        class="preview-iframe"
        :class="{ visible: loaded }"
        @load="onLoad"
      />
    </div>
  </div>
</template>

<style scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-header);
  flex-shrink: 0;
}

.pane-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.iframe-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  opacity: 0;
  transition: opacity 0.2s;
  background: #fff;
}

.preview-iframe.visible {
  opacity: 1;
}
</style>
