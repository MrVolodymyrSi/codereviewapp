<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useChallenge } from '../composables/useChallenge'
import { useComments } from '../composables/useComments'
import { useGutterComments } from '../composables/useGutterComments'
import MonacoEditor from './MonacoEditor.vue'
import type { ChallengeFile } from '../types/challenge'

const props = defineProps<{
  files: ChallengeFile[]
  activeFileIndex: number
}>()

const emit = defineEmits<{
  selectFile: [index: number]
}>()

const { activeChallengeId, activeFramework, getActiveCode, setActiveCode, isDirty, commitAndRun } = useChallenge()

const EDITOR_THEME_KEY = 'codereview:editor-theme'
const editorTheme = ref<'vs-dark' | 'vs'>(
  (localStorage.getItem(EDITOR_THEME_KEY) as 'vs-dark' | 'vs') ?? 'vs-dark'
)
function toggleEditorTheme() {
  editorTheme.value = editorTheme.value === 'vs-dark' ? 'vs' : 'vs-dark'
  localStorage.setItem(EDITOR_THEME_KEY, editorTheme.value)
}

const activeFile = computed(() => {
  const idx = Math.min(props.activeFileIndex, props.files.length - 1)
  return props.files[idx]
})

const commentKey = computed(
  () => `${activeChallengeId.value}:${activeFramework.value}:${activeFile.value?.name ?? ''}`
)

const { comments, addComment, removeComment } = useComments(commentKey)

const pendingLine = ref<number | null>(null)
const draftText = ref('')

// Reset form zone when switching files
watch(() => props.activeFileIndex, () => {
  pendingLine.value = null
  draftText.value = ''
})

function onGutterClick(line: number) {
  if (pendingLine.value === line) {
    cancelComment()
  } else {
    pendingLine.value = line
    draftText.value = ''
  }
}

function submitComment() {
  if (pendingLine.value !== null && draftText.value.trim()) {
    addComment(pendingLine.value, draftText.value.trim())
  }
  pendingLine.value = null
  draftText.value = ''
}

function cancelComment() {
  pendingLine.value = null
  draftText.value = ''
}

const gutterComments = useGutterComments(comments, pendingLine, draftText, {
  onGutterClick,
  onDelete: removeComment,
  onSubmit: submitComment,
  onCancel: cancelComment,
})

function onEditorReady(editor: any, monaco: any) {
  gutterComments.init(editor, monaco)
}

onBeforeUnmount(() => gutterComments.dispose())

const editorCode = computed(() => getActiveCode())
</script>

<template>
  <div class="code-pane">
    <div class="pane-header">
      <div class="file-tabs">
        <button
          v-for="(file, i) in files"
          :key="file.name"
          class="file-tab"
          :class="{ active: i === activeFileIndex }"
          @click="emit('selectFile', i)"
        >
          <span class="file-dot" />
          {{ file.name }}
        </button>
      </div>
      <div class="pane-actions">
        <button
          class="editor-theme-btn"
          :title="editorTheme === 'vs-dark' ? 'Switch to light editor' : 'Switch to dark editor'"
          @click="toggleEditorTheme"
        >{{ editorTheme === 'vs-dark' ? '🌙' : '☀️' }}</button>
        <button class="run-btn" @click="commitAndRun()">
          <span v-if="isDirty" class="dirty-dot" />
          &#9654; Run
        </button>
      </div>
    </div>

    <div class="editor-area">
      <MonacoEditor
        v-if="activeFile"
        :code="editorCode"
        :language="activeFile.language"
        :theme="editorTheme"
        :read-only="true"
        @ready="onEditorReady"
        @change="setActiveCode"
      />
    </div>
  </div>
</template>

<style scoped>
.code-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

.pane-header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--bg-header);
  flex-shrink: 0;
  min-height: 38px;
}

.file-tabs {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
}

.file-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-family: var(--font-ui);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}

.file-tab:hover {
  color: var(--text);
}

.file-tab.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}

.file-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-faint);
  flex-shrink: 0;
  transition: background 0.15s;
}

.file-tab.active .file-dot {
  background: var(--accent);
}

.pane-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
}

.run-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 13px;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.run-btn:hover {
  opacity: 0.85;
}

.dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  opacity: 0.7;
  flex-shrink: 0;
}

.editor-theme-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  height: 28px;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: border-color 0.15s;
}

.editor-theme-btn:hover {
  border-color: var(--text-faint);
}

.editor-area {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

</style>
