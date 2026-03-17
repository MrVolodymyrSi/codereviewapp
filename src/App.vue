<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import SplitLayout from './components/SplitLayout.vue'
import CodePane from './components/CodePane.vue'
import PreviewPane from './components/PreviewPane.vue'
import { useChallenge } from './composables/useChallenge'
import { useIframeDoc } from './composables/useIframeDoc'

const { activeVariant } = useChallenge()
const { srcdoc } = useIframeDoc()
</script>

<template>
  <div class="app">
    <AppHeader />
    <main class="main">
      <SplitLayout>
        <template #left>
          <CodePane :code="activeVariant.code" :language="activeVariant.language" />
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
  --bg: #0d1117;
  --bg-surface: #ffffff;
  --bg-header: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #8b949e;
  --accent: #2f81f7;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: system-ui, -apple-system, sans-serif;
}

#app {
  height: 100%;
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
