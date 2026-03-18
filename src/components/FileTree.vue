<script setup lang="ts">
import type { ChallengeFile } from '../types/challenge'

defineProps<{
  files: ChallengeFile[]
  activeFileIndex: number
}>()

const emit = defineEmits<{
  selectFile: [index: number]
}>()

const FILE_COLORS: Record<string, string> = {
  vue: 'var(--vue)',
  javascript: 'var(--vanilla)',
  tsx: 'var(--react)',
  html: 'var(--text-faint)',
  css: 'var(--accent)',
}

function dotColor(lang: string): string {
  return FILE_COLORS[lang] ?? 'var(--text-faint)'
}
</script>

<template>
  <div class="file-tree">
    <div class="tree-section-label">Explorer</div>

    <!-- Atmosphere nodes (decorative, non-interactive) -->
    <div class="tree-node tree-node--dim">
      <span class="node-icon folder-icon">▶</span>
      <span class="node-name">node_modules</span>
    </div>
    <div class="tree-node tree-node--dim">
      <span class="node-icon file-icon" />
      <span class="node-name">package.json</span>
    </div>
    <div class="tree-node tree-node--dim">
      <span class="node-icon file-icon" />
      <span class="node-name">.gitignore</span>
    </div>

    <div class="tree-divider" />

    <!-- Real clickable files -->
    <button
      v-for="(file, i) in files"
      :key="file.name"
      class="tree-node tree-node--file"
      :class="{ active: i === activeFileIndex }"
      @click="emit('selectFile', i)"
    >
      <span
        class="file-dot"
        :style="{ background: dotColor(file.language) }"
      />
      <span class="node-name">{{ file.name }}</span>
    </button>
  </div>
</template>

<style scoped>
.file-tree {
  width: 180px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 6px 0;
}

.tree-section-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-faint);
  padding: 4px 12px 8px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 12px;
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

.tree-node--dim {
  opacity: 0.3;
  pointer-events: none;
}

.tree-node--file {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: var(--font-ui);
  transition: background 0.1s, color 0.1s;
  border-left: 2px solid transparent;
}

.tree-node--file:hover {
  background: var(--bg-elevated);
  color: var(--text);
}

.tree-node--file.active {
  background: var(--accent-dim);
  color: var(--text);
  border-left-color: var(--accent);
}

.node-icon {
  flex-shrink: 0;
  font-size: 0.6rem;
  color: var(--text-faint);
}

.folder-icon {
  font-size: 0.55rem;
}

.file-icon {
  display: inline-block;
  width: 8px;
  height: 8px;
  border: 1px solid var(--text-faint);
  border-radius: 1px;
  flex-shrink: 0;
}

.file-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 8px;
}
</style>
