<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import SplitLayout from '../components/SplitLayout.vue'
import WorkspacePane from '../components/WorkspacePane.vue'
import PreviewPane from '../components/PreviewPane.vue'
import InterviewerPanel from '../components/InterviewerPanel.vue'
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
  <div class="interviewer-view">
    <AppHeader :session-id="sessionId ?? undefined" />
    <div class="main-area">
      <div class="workspace-area">
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
      <InterviewerPanel />
    </div>
  </div>
</template>

<style scoped>
.interviewer-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  color: var(--text);
}

.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.workspace-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.workspace-area :deep(.split-layout) {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
