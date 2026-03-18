<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChallenge } from '../composables/useChallenge'

const props = defineProps<{
  srcdoc: string
}>()

const { activeChallenge, activeFramework } = useChallenge()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)

function onLoad() {
  loaded.value = true
}

watch(
  () => props.srcdoc,
  () => { loaded.value = false }
)

const fwColors: Record<string, string> = {
  vue: 'var(--vue)',
  react: 'var(--react)',
  vanilla: 'var(--vanilla)',
}
</script>

<template>
  <div class="preview-pane">
    <div class="pane-header">
      <div class="browser-chrome">
        <div class="traffic-lights">
          <span class="dot dot-red" />
          <span class="dot dot-yellow" />
          <span class="dot dot-green" />
        </div>
        <div class="url-bar">
          <svg class="url-icon" width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.2"/>
            <path d="M3 5c0-1.1.9-2 2-2M5 3v.5M7 5c0 1.1-.9 2-2 2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
          </svg>
          <span class="url-text">localhost:5173 / {{ activeChallenge.title }}</span>
        </div>
      </div>
      <div class="header-right">
        <span
          class="fw-indicator"
          :style="{ color: fwColors[activeFramework], borderColor: fwColors[activeFramework] }"
        >{{ activeFramework }}</span>
        <span class="loading-indicator" :class="{ active: !loaded }">
          <span class="loading-dot" />
        </span>
      </div>
    </div>

    <div class="iframe-wrap">
      <iframe
        ref="iframeRef"
        :srcdoc="props.srcdoc"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
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
  padding: 0 12px;
  height: 38px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-header);
  flex-shrink: 0;
  gap: 10px;
}

.browser-chrome {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.traffic-lights {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background: #ff5f57; }
.dot-yellow { background: #febc2e; }
.dot-green { background: #28c840; }

.url-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: 5px;
  padding: 3px 8px;
  flex: 1;
  min-width: 0;
  max-width: 280px;
}

.url-icon {
  color: var(--text-faint);
  flex-shrink: 0;
}

.url-text {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.fw-indicator {
  font-size: 0.68rem;
  font-weight: 600;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid;
  border-radius: 4px;
  padding: 1px 6px;
  opacity: 0.8;
}

.loading-indicator {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.loading-indicator.active {
  opacity: 1;
}

.loading-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 0.9s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1); }
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
  transition: opacity 0.25s;
  background: #fff;
}

.preview-iframe.visible {
  opacity: 1;
}
</style>
