<script setup lang="ts">
import { useSession } from './composables/useSession'
import CreateSessionView from './views/CreateSessionView.vue'
import InterviewerView from './views/InterviewerView.vue'
import CandidateView from './views/CandidateView.vue'

const { hasSession, isInterviewer } = useSession()
</script>

<template>
  <div class="app">
    <CreateSessionView v-if="!hasSession" />
    <InterviewerView v-else-if="isInterviewer" />
    <CandidateView v-else />
  </div>
</template>

<style>
:root {
  --bg: #f6f8fa;
  --bg-surface: #ffffff;
  --bg-header: #ffffff;
  --bg-elevated: #eaeef2;
  --bg-input: #f6f8fa;
  --border: #d0d7de;
  --border-subtle: #eaeef2;
  --text: #24292f;
  --text-muted: #57606a;
  --text-faint: #8c959f;
  --accent: #0969da;
  --accent-dim: #ddf4ff;
  --accent-border: rgba(84, 174, 255, 0.4);
  --danger: #cf222e;
  --danger-dim: #ffebe9;
  --success: #1a7f37;
  --success-dim: #dafbe1;
  --warning: #9a6700;
  --warning-dim: #fff8c5;
  --vue: #42d392;
  --react: #61dafb;
  --vanilla: #f0d050;
  --text-xs: 0.72rem;
  --text-sm: 0.8rem;
  --text-base: 0.875rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --radius-xs: 3px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
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
  height: 100%;
}
</style>
