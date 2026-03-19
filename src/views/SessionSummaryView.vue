<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import type { SessionRow } from '../types/session'
import { challenges } from '../data'
import { formatSessionDuration } from '../utils/format-duration'
import { generateSummaryMarkdown, type BugWithChecked } from '../utils/summary-markdown'

const props = defineProps<{ session: SessionRow }>()

const challenge = computed(() => challenges.find((c) => c.id === props.session.challenge_id))

const challengeTitle = computed(() => challenge.value?.title ?? props.session.challenge_id)

const bugs = computed<BugWithChecked[]>(() => {
  if (!challenge.value) return []
  return challenge.value.bugs
    .filter((b) => b.variant === props.session.framework)
    .map((b) => ({ ...b, checked: props.session.bugs_checked.includes(b.id) }))
})

const checkedCount = computed(() => bugs.value.filter((b) => b.checked).length)

const duration = computed(() =>
  props.session.ended_at
    ? formatSessionDuration(props.session.started_at, props.session.ended_at)
    : '—',
)

const date = computed(() =>
  new Date(props.session.started_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
)

const renderedNotes = computed(() =>
  props.session.notes ? (marked(props.session.notes) as string) : '',
)

const copyFallback = ref<string | null>(null)
const copied = ref(false)

async function copySummary() {
  const md = generateSummaryMarkdown(props.session, challengeTitle.value, bugs.value)
  try {
    await navigator.clipboard.writeText(md)
    copyFallback.value = null
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    copyFallback.value = md
  }
}
</script>

<template>
  <div class="summary-view">
    <div class="summary-card">
      <div class="summary-header">
        <div class="summary-title-row">
          <h2 class="summary-title">{{ session.candidate_name }}</h2>
          <span class="summary-badge">Interview Complete</span>
        </div>
        <div class="summary-meta">
          <span>{{ date }}</span>
          <span class="meta-sep">·</span>
          <span>Duration: {{ duration }}</span>
          <span class="meta-sep">·</span>
          <span>{{ challengeTitle }} ({{ session.framework }})</span>
        </div>
      </div>

      <div class="score-section">
        <div class="section-label">Bugs found</div>
        <div class="score-value">{{ checkedCount }} / {{ session.total_bugs }}</div>
        <div class="score-bar">
          <div
            class="score-fill"
            :style="{ width: session.total_bugs > 0 ? `${(checkedCount / session.total_bugs) * 100}%` : '0%' }"
          />
        </div>
      </div>

      <div class="bug-list-section">
        <div class="section-label">Bugs</div>
        <div class="bug-list">
          <div
            v-for="bug in bugs"
            :key="bug.id"
            class="bug-row"
            :class="{ checked: bug.checked }"
          >
            <span class="bug-check">{{ bug.checked ? '✓' : '○' }}</span>
            <span class="bug-desc">{{ bug.description }}</span>
            <span class="bug-severity" :class="bug.severity">{{ bug.severity }}</span>
          </div>
          <div v-if="bugs.length === 0" class="bug-empty">No bugs for this variant.</div>
        </div>
      </div>

      <div class="notes-section">
        <div class="section-label">Notes</div>
        <div
          v-if="renderedNotes"
          class="notes-body"
          v-html="renderedNotes"
        />
        <div v-else class="notes-empty">No notes recorded.</div>
      </div>

      <div class="actions-row">
        <button class="copy-btn" @click="copySummary">
          {{ copied ? '✓ Copied' : 'Copy summary' }}
        </button>
      </div>

      <div v-if="copyFallback !== null" class="copy-fallback">
        <div class="fallback-label">Copy manually:</div>
        <textarea
          class="fallback-textarea"
          readonly
          :value="copyFallback"
          @click="($event.target as HTMLTextAreaElement).select()"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-view {
  height: 100%;
  overflow-y: auto;
  background: var(--bg);
  display: flex;
  justify-content: center;
  padding: 2rem 1.5rem;
}

.summary-card {
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem 2.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-bottom: 2rem;
}

.summary-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-title {
  font-family: var(--font-brand);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.02em;
}

.summary-badge {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--success);
  background: var(--success-dim);
  border: 1px solid rgba(26, 127, 55, 0.3);
  border-radius: 20px;
  padding: 3px 10px;
}

.summary-meta {
  font-size: 0.8rem;
  color: var(--text-faint);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.meta-sep {
  color: var(--border);
}

.score-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-faint);
  margin-bottom: 4px;
}

.score-value {
  font-family: var(--font-brand);
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}

.score-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.bug-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bug-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.bug-row.checked {
  border-color: rgba(26, 127, 55, 0.2);
  background: rgba(26, 127, 55, 0.03);
}

.bug-check {
  font-size: 0.75rem;
  color: var(--text-faint);
  flex-shrink: 0;
  width: 14px;
  margin-top: 1px;
}

.bug-row.checked .bug-check {
  color: var(--success);
}

.bug-row:not(.checked) .bug-desc {
  color: var(--text-faint);
  text-decoration: line-through;
}

.bug-desc {
  flex: 1;
  font-size: 0.82rem;
  line-height: 1.5;
}

.bug-row.checked .bug-desc {
  color: var(--text);
}

.bug-severity {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}

.bug-severity.high { color: var(--danger); background: var(--danger-dim); }
.bug-severity.medium { color: var(--warning); background: var(--warning-dim); }
.bug-severity.low { color: var(--text-faint); background: var(--bg-elevated); }

.bug-empty {
  font-size: 0.8rem;
  color: var(--text-faint);
  font-style: italic;
  padding: 8px 0;
}

.notes-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notes-body {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.7;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 1rem 1.25rem;
}

.notes-body :deep(p) { margin: 0 0 0.75em; }
.notes-body :deep(p:last-child) { margin-bottom: 0; }
.notes-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.8em;
  background: var(--bg-elevated);
  padding: 1px 5px;
  border-radius: 3px;
}

.notes-empty {
  font-size: 0.8rem;
  color: var(--text-faint);
  font-style: italic;
}

.actions-row {
  display: flex;
  gap: 10px;
}

.copy-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  font-weight: 500;
  padding: 8px 16px;
  transition: color 0.15s, border-color 0.15s;
}
.copy-btn:hover {
  color: var(--text);
  border-color: var(--text-faint);
}

.copy-fallback {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fallback-label {
  font-size: 0.72rem;
  color: var(--text-faint);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.fallback-textarea {
  width: 100%;
  min-height: 160px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 10px 12px;
  resize: vertical;
  box-sizing: border-box;
}
</style>
