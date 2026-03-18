<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import { useNotes } from '../composables/useNotes'

const { notes, setNotes, exportNotes } = useNotes()

const mode = ref<'write' | 'preview'>('write')
const copied = ref(false)

// v-html is safe here — notes are interviewer-authored (trusted input, never shown to candidates)
const renderedHtml = computed(() => marked.parse(notes.value) as string)

function handleInput(e: Event) {
  setNotes((e.target as HTMLTextAreaElement).value)
}

function handleExport() {
  exportNotes()
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}
</script>

<template>
  <div class="notes-panel">
    <div class="section-header">
      <div class="mode-tabs">
        <button
          class="mode-tab"
          :class="{ active: mode === 'write' }"
          @click="mode = 'write'"
        >Write</button>
        <button
          class="mode-tab"
          :class="{ active: mode === 'preview' }"
          @click="mode = 'preview'"
        >Preview</button>
      </div>
      <button class="copy-btn" @click="handleExport">
        {{ copied ? 'Copied!' : 'Copy MD' }}
      </button>
    </div>

    <textarea
      v-if="mode === 'write'"
      class="notes-textarea"
      :value="notes"
      placeholder="Interview notes (markdown)…"
      @input="handleInput"
    />

    <div
      v-else
      class="notes-preview"
      v-html="renderedHtml"
    />
  </div>
</template>

<style scoped>
.notes-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.mode-tabs {
  display: flex;
  gap: 2px;
}

.mode-tab {
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-faint);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.7rem;
  padding: 3px 8px;
  transition: background 0.1s, color 0.1s;
}

.mode-tab.active {
  background: var(--bg-elevated);
  color: var(--text);
}

.mode-tab:hover:not(.active) {
  color: var(--text-muted);
}

.copy-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-faint);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.68rem;
  padding: 3px 8px;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.copy-btn:hover {
  color: var(--text);
  border-color: var(--text-faint);
}

.notes-textarea {
  flex: 1;
  background: var(--bg);
  border: none;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.6;
  outline: none;
  padding: 10px 12px;
  resize: none;
  width: 100%;
}

.notes-textarea::placeholder {
  color: var(--text-faint);
}

.notes-preview {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  font-size: 0.8rem;
  line-height: 1.65;
  color: var(--text-muted);
}

/* Markdown preview styles */
.notes-preview :deep(h1),
.notes-preview :deep(h2),
.notes-preview :deep(h3) {
  color: var(--text);
  margin: 1em 0 0.4em;
  font-size: 0.9rem;
  font-weight: 600;
}

.notes-preview :deep(h1) { font-size: 1rem; }

.notes-preview :deep(p) {
  margin: 0 0 0.6em;
}

.notes-preview :deep(code) {
  background: var(--bg-elevated);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 1px 4px;
}

.notes-preview :deep(pre code) {
  background: transparent;
  padding: 0;
}

.notes-preview :deep(pre) {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 5px;
  overflow-x: auto;
  padding: 8px 10px;
}

.notes-preview :deep(ul),
.notes-preview :deep(ol) {
  margin: 0 0 0.6em 1.2em;
  padding: 0;
}

.notes-preview :deep(li) {
  margin-bottom: 0.2em;
}

.notes-preview :deep(strong) {
  color: var(--text);
  font-weight: 600;
}

.notes-preview :deep(blockquote) {
  border-left: 2px solid var(--accent);
  margin: 0 0 0.6em;
  padding: 4px 10px;
  color: var(--text-faint);
}
</style>
