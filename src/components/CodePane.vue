<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useChallenge } from '../composables/useChallenge'
import { useComments } from '../composables/useComments'
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
const commentInputRef = ref<HTMLTextAreaElement | null>(null)
const commentLineInput = ref<number>(1)

watch(pendingLine, async (val) => {
  if (val !== null) {
    await nextTick()
    commentInputRef.value?.focus()
  }
})

function startComment() {
  pendingLine.value = commentLineInput.value
  draftText.value = ''
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

const commentsByLine = computed(() => {
  const map = new Map<number, typeof comments.value>()
  for (const c of comments.value) {
    if (!map.has(c.line)) map.set(c.line, [])
    map.get(c.line)!.push(c)
  }
  return map
})

const sortedCommentLines = computed(() =>
  Array.from(commentsByLine.value.keys()).sort((a, b) => a - b)
)

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
        <button class="comment-btn" @click="startComment()">+ Comment</button>
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
        @change="setActiveCode"
      />
    </div>

    <div v-if="pendingLine !== null" class="comment-form-row">
      <div class="comment-avatar form-avatar">R</div>
      <div class="comment-form-inner">
        <div class="comment-line-select">
          <label>Line: <input type="number" v-model.number="commentLineInput" min="1" class="line-input" /></label>
        </div>
        <textarea
          ref="commentInputRef"
          v-model="draftText"
          class="comment-textarea"
          placeholder="Leave a review comment…"
          @keydown="(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); submitComment() } }"
        />
        <div class="comment-form-actions">
          <span class="shortcut-hint">&#8984;S to save</span>
          <button class="btn-cancel" @click="cancelComment()">Cancel</button>
          <button class="btn-save" @click="submitComment()">Add comment</button>
        </div>
      </div>
    </div>

    <div v-if="comments.length > 0" class="comment-panel">
      <div class="comment-panel-header">
        <span>Comments ({{ comments.length }})</span>
      </div>
      <div class="comment-panel-body">
        <template v-for="line in sortedCommentLines" :key="line">
          <div
            v-for="comment in commentsByLine.get(line)"
            :key="comment.id"
            class="comment-row"
          >
            <div class="comment-avatar">R</div>
            <div class="comment-body">
              <div class="comment-meta">
                <span class="comment-author">Reviewer</span>
                <span class="comment-line-ref">line {{ line }}</span>
              </div>
              <p class="comment-text">{{ comment.text }}</p>
            </div>
            <button class="remove-btn" :aria-label="'Delete comment'" @click="removeComment(comment.id)">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </template>
      </div>
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

.comment-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  padding: 5px 11px;
  transition: border-color 0.15s, color 0.15s;
}

.comment-btn:hover {
  color: var(--text);
  border-color: var(--text-faint);
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

/* Comment form */
.comment-form-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 1rem;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-subtle);
  border-left: 2px solid var(--react);
  flex-shrink: 0;
}

.comment-avatar {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-brand);
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.form-avatar {
  background: var(--bg-surface);
  color: var(--text-muted);
  border: 1px solid var(--border);
  margin-top: 2px;
}

.comment-form-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.comment-line-select {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.line-input {
  width: 60px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 0.75rem;
  padding: 2px 6px;
}

.comment-textarea {
  width: 100%;
  min-height: 60px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 0.8rem;
  padding: 8px 10px;
  resize: vertical;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.comment-textarea::placeholder {
  color: var(--text-faint);
}

.comment-textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.comment-form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-hint {
  font-size: 0.7rem;
  color: var(--text-faint);
  font-family: var(--font-mono);
  flex: 1;
}

.btn-save {
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 5px 13px;
  transition: opacity 0.15s;
}

.btn-save:hover { opacity: 0.85; }

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  padding: 5px 11px;
  transition: border-color 0.15s, color 0.15s;
}

.btn-cancel:hover { color: var(--text); border-color: var(--text-faint); }

/* Comment panel */
.comment-panel {
  flex-shrink: 0;
  max-height: 220px;
  overflow-y: auto;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}

.comment-panel-header {
  padding: 6px 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--border-subtle);
}

.comment-panel-body {
  padding: 4px 0;
}

.comment-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 1rem;
  border-bottom: 1px solid var(--border-subtle);
  border-left: 2px solid var(--accent);
  position: relative;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}

.comment-author {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
}

.comment-line-ref {
  font-size: 0.7rem;
  color: var(--text-faint);
  font-family: var(--font-mono);
}

.comment-text {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}

.remove-btn:hover {
  color: var(--danger);
  background: var(--danger-dim);
}
</style>
