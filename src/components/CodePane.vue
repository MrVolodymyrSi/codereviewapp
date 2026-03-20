<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const { comments, addComment, updateComment, removeComment } = useComments(commentKey)

// ── View zone state ──────────────────────────────────────────────────────
const editorRef = ref<InstanceType<typeof MonacoEditor> | null>(null)
const pendingLine = ref<number | null>(null)
const editingId   = ref<string | null>(null)
const zoneIds     = new Map<string, string>()  // commentId → Monaco zoneId
let   pendingZoneId: string | null = null

function getEditor() { return editorRef.value?.editor?.value ?? null }

// ── View zone builders (plain DOM nodes that close over Vue refs) ─────────

function buildFormNode(line: number): HTMLDivElement {
  const div = document.createElement('div')
  div.style.cssText = 'padding:8px 10px 8px 48px;background:#f0f6ff;border-top:2px solid #0969da;border-bottom:1px solid #c7d7f0;font-family:system-ui,sans-serif;box-sizing:border-box;'

  const ta = document.createElement('textarea')
  ta.placeholder = 'Leave a review comment…'
  ta.style.cssText = 'width:100%;box-sizing:border-box;background:#fff;border:1px solid #0969da;border-radius:6px;font-size:12px;font-family:system-ui,sans-serif;padding:5px 8px;resize:none;height:44px;outline:none;display:block;'
  div.appendChild(ta)

  const row = document.createElement('div')
  row.style.cssText = 'display:flex;gap:6px;margin-top:5px;'

  const save = document.createElement('button')
  save.textContent = 'Add comment'
  save.style.cssText = 'background:#0969da;color:#fff;border:none;border-radius:5px;padding:3px 10px;font-size:11px;font-weight:600;font-family:system-ui;cursor:pointer;'
  save.addEventListener('click', () => {
    const text = ta.value.trim()
    if (text) addComment(line, text)
    pendingLine.value = null
  })

  const cancel = document.createElement('button')
  cancel.textContent = 'Cancel'
  cancel.style.cssText = 'background:transparent;color:#57606a;border:1px solid #d0d7de;border-radius:5px;padding:3px 10px;font-size:11px;font-family:system-ui;cursor:pointer;'
  cancel.addEventListener('click', () => { pendingLine.value = null })

  row.appendChild(save)
  row.appendChild(cancel)
  div.appendChild(row)
  return div
}

function buildCommentNode(comment: { id: string; line: number; text: string }, isEditing: boolean): HTMLDivElement {
  const div = document.createElement('div')

  if (isEditing) {
    div.style.cssText = 'padding:8px 10px 8px 48px;background:#fffbdd;border-top:2px solid #d4a000;border-bottom:1px solid #e3c87a;font-family:system-ui,sans-serif;box-sizing:border-box;'

    const ta = document.createElement('textarea')
    ta.value = comment.text
    ta.style.cssText = 'width:100%;box-sizing:border-box;background:#fff;border:1px solid #d4a000;border-radius:6px;font-size:12px;font-family:system-ui,sans-serif;padding:5px 8px;resize:none;height:44px;outline:none;display:block;'
    div.appendChild(ta)

    const row = document.createElement('div')
    row.style.cssText = 'display:flex;gap:6px;margin-top:5px;'

    const save = document.createElement('button')
    save.textContent = 'Save changes'
    save.style.cssText = 'background:#9a6700;color:#fff;border:none;border-radius:5px;padding:3px 10px;font-size:11px;font-weight:600;font-family:system-ui;cursor:pointer;'
    save.addEventListener('click', () => {
      const text = ta.value.trim()
      if (text) updateComment(comment.id, text)
      editingId.value = null
    })

    const cancel = document.createElement('button')
    cancel.textContent = 'Cancel'
    cancel.style.cssText = 'background:transparent;color:#57606a;border:1px solid #d0d7de;border-radius:5px;padding:3px 10px;font-size:11px;font-family:system-ui;cursor:pointer;'
    cancel.addEventListener('click', () => { editingId.value = null })

    row.appendChild(save)
    row.appendChild(cancel)
    div.appendChild(row)
  } else {
    div.style.cssText = 'padding:6px 8px 6px 48px;background:#f6f8fa;border-top:2px solid #0969da;border-bottom:1px solid #eaeef2;font-family:system-ui,sans-serif;display:flex;align-items:flex-start;gap:8px;box-sizing:border-box;'

    const avatar = document.createElement('div')
    avatar.textContent = 'R'
    avatar.style.cssText = 'width:20px;height:20px;border-radius:4px;background:#0969da;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;'

    const content = document.createElement('div')
    content.style.cssText = 'flex:1;min-width:0;'

    const meta = document.createElement('div')
    meta.textContent = `Reviewer · line ${comment.line}`
    meta.style.cssText = 'font-size:10px;color:#8c959f;margin-bottom:2px;'

    const text = document.createElement('div')
    text.textContent = comment.text
    text.style.cssText = 'font-size:12px;color:#24292f;line-height:1.5;'

    const btns = document.createElement('div')
    btns.style.cssText = 'display:flex;gap:8px;margin-top:4px;'

    const editBtn = document.createElement('button')
    editBtn.textContent = 'Edit'
    editBtn.style.cssText = 'font-size:10px;color:#57606a;background:none;border:none;cursor:pointer;padding:0;font-family:system-ui;'
    editBtn.addEventListener('click', () => { editingId.value = comment.id })

    const delBtn = document.createElement('button')
    delBtn.textContent = 'Delete'
    delBtn.style.cssText = 'font-size:10px;color:#cf222e;background:none;border:none;cursor:pointer;padding:0;font-family:system-ui;'
    delBtn.addEventListener('click', () => removeComment(comment.id))

    btns.appendChild(editBtn)
    btns.appendChild(delBtn)
    content.appendChild(meta)
    content.appendChild(text)
    content.appendChild(btns)
    div.appendChild(avatar)
    div.appendChild(content)
  }

  return div
}

// ── Sync all view zones from current state ────────────────────────────────

function syncViewZones() {
  const ed = getEditor()
  if (!ed) return
  ed.changeViewZones((accessor: any) => {
    zoneIds.forEach((id) => accessor.removeZone(id))
    zoneIds.clear()
    if (pendingZoneId) { accessor.removeZone(pendingZoneId); pendingZoneId = null }

    for (const comment of comments.value) {
      const dom = buildCommentNode(comment, editingId.value === comment.id)
      const id = accessor.addZone({ afterLineNumber: comment.line, heightInPx: 90, domNode: dom })
      zoneIds.set(comment.id, id)
    }

    if (pendingLine.value !== null) {
      const dom = buildFormNode(pendingLine.value)
      pendingZoneId = accessor.addZone({ afterLineNumber: pendingLine.value, heightInPx: 90, domNode: dom })
    }
  })
}

// ── Watchers ──────────────────────────────────────────────────────────────

watch([comments, pendingLine, editingId], syncViewZones)
// Fires once when Monaco finishes async init; .value chain is reactive inside watch getter
watch(() => editorRef.value?.editor?.value, (ed) => { if (ed) syncViewZones() })
// Reset transient UI state on file tab change
watch(commentKey, () => { pendingLine.value = null; editingId.value = null })

// ── Gutter click handler (emitted from MonacoEditor) ─────────────────────

function onGutterClick(line: number) {
  pendingLine.value = line
  editingId.value = null
}

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
        ref="editorRef"
        :code="editorCode"
        :language="activeFile.language"
        :theme="editorTheme"
        @change="setActiveCode"
        @gutterClick="onGutterClick"
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

.file-tab:hover { color: var(--text); }

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

.file-tab.active .file-dot { background: var(--accent); }

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

.run-btn:hover { opacity: 0.85; }

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

.editor-theme-btn:hover { border-color: var(--text-faint); }

.editor-area {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
