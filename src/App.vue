<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from './components/AppHeader.vue'
import SplitLayout from './components/SplitLayout.vue'
import CodePane from './components/CodePane.vue'
import PreviewPane from './components/PreviewPane.vue'
import { useChallenge } from './composables/useChallenge'
import { useIframeDoc } from './composables/useIframeDoc'

const { activeVariant, activeFileIndex, setFileIndex, commitAndRun } = useChallenge()
const { srcdoc } = useIframeDoc()

onMounted(() => {
  commitAndRun()
})
</script>

<template>
  <div class="app">
    <AppHeader />
    <main class="main">
      <SplitLayout>
        <template #left>
          <CodePane
            :files="activeVariant.files"
            :active-file-index="activeFileIndex"
            @select-file="setFileIndex"
          />
        </template>
        <template #right>
          <PreviewPane :srcdoc="srcdoc" />
        </template>
      </SplitLayout>
    </main>
  </div>
</template>

<style>
:root {
  --bg: #0a0e14;
  --bg-surface: #0f1520;
  --bg-header: #0c1018;
  --bg-elevated: #141c28;
  --bg-input: #080c12;
  --border: #1e2a3a;
  --border-subtle: #151e2c;
  --text: #dde6f0;
  --text-muted: #6b7d96;
  --text-faint: #3d5068;
  --accent: #e8a44a;
  --accent-dim: rgba(232, 164, 74, 0.12);
  --accent-glow: rgba(232, 164, 74, 0.06);
  --vue: #42d392;
  --react: #61dafb;
  --vanilla: #f0d050;
  --danger: #f87171;
  --success: #4ade80;
  --font-ui: 'Instrument Sans', system-ui, sans-serif;
  --font-brand: 'Syne', system-ui, sans-serif;
  --font-mono: 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-faint);
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  color: var(--text);
}

.main {
  flex: 1;
  overflow: hidden;
}
</style>
