<script setup lang="ts">
import { onMounted, watch } from 'vue'
import SplitLayout from '../components/SplitLayout.vue'
import WorkspacePane from '../components/WorkspacePane.vue'
import PreviewPane from '../components/PreviewPane.vue'
import ConsolePanel from '../components/ConsolePanel.vue'
import { useChallenge } from '../composables/useChallenge'
import { useIframeDoc } from '../composables/useIframeDoc'
import { useConsole } from '../composables/useConsole'
import { loadComments } from '../composables/useComments'

const { commitAndRun, activeChallengeId, activeFramework } = useChallenge()
const { srcdoc } = useIframeDoc()
useConsole()

onMounted(() => {
  loadComments(activeChallengeId.value, activeFramework.value)
  commitAndRun()
})

watch([activeChallengeId, activeFramework], ([challengeId, framework]) => {
  loadComments(challengeId, framework)
})
</script>

<template>
  <div class="code-review-view">
    <div class="main-area">
      <div class="workspace-area">
        <SplitLayout>
          <template #left>
            <WorkspacePane :read-only="true" />
          </template>
          <template #right>
            <PreviewPane :srcdoc="srcdoc" />
          </template>
        </SplitLayout>
        <ConsolePanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-review-view {
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
