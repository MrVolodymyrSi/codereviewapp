<script setup lang="ts">
import FileTree from './FileTree.vue'
import CodePane from './CodePane.vue'
import { useChallenge } from '../composables/useChallenge'

const { activeVariant, activeFileIndex, setFileIndex } = useChallenge()
</script>

<template>
  <div class="workspace-pane">
    <FileTree
      :files="activeVariant.files"
      :active-file-index="activeFileIndex"
      @select-file="setFileIndex"
    />
    <div class="code-wrap">
      <CodePane
        :files="activeVariant.files"
        :active-file-index="activeFileIndex"
        @select-file="setFileIndex"
      />
    </div>
  </div>
</template>

<style scoped>
.workspace-pane {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.code-wrap {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  height: 100%;
}
</style>
