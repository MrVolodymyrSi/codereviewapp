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
    <CodePane
      :files="activeVariant.files"
      :active-file-index="activeFileIndex"
      @select-file="setFileIndex"
    />
  </div>
</template>

<style scoped>
.workspace-pane {
  display: flex;
  height: 100%;
  overflow: hidden;
}
</style>
