<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import SplitLayout from '../components/SplitLayout.vue'
import WorkspacePane from '../components/WorkspacePane.vue'
import PreviewPane from '../components/PreviewPane.vue'
import ConsolePanel from '../components/ConsolePanel.vue'
import { useChallenge } from '../composables/useChallenge'
import { useIframeDoc } from '../composables/useIframeDoc'
import { useSession } from '../composables/useSession'
import { useConsole } from '../composables/useConsole'

const { commitAndRun } = useChallenge()
const { srcdoc } = useIframeDoc()
const { sessionId } = useSession()

// Initialise console listener
useConsole()

onMounted(() => {
  commitAndRun()
})
</script>

<template>
  <div class="candidate-view">
    <AppHeader :candidate-mode="true" :session-id="sessionId ?? undefined" />
    <div class="main-area">
      <SplitLayout>
        <template #left>
          <WorkspacePane />
        </template>
        <template #right>
          <PreviewPane :srcdoc="srcdoc" />
        </template>
      </SplitLayout>
      <ConsolePanel />
    </div>
  </div>
</template>

<style scoped>
.candidate-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  color: var(--text);
}

.main-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
