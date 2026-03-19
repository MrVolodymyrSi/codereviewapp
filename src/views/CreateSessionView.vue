<script setup lang="ts">
import { ref } from 'vue'
import { nanoid } from 'nanoid'
import { useChallenge } from '../composables/useChallenge'
import { useSessionPersistence } from '../composables/useSessionPersistence'

const { activeChallengeId, activeFramework, activeChallenge } = useChallenge()
const { createSessionRow } = useSessionPersistence()

const candidateName = ref('')
const sid = ref<string | null>(null)
const loading = ref(false)
const createError = ref<string | null>(null)
const interviewerCopied = ref(false)
const candidateCopied = ref(false)

async function handleCreate() {
  if (!candidateName.value.trim()) return
  loading.value = true
  createError.value = null

  // Generate ID first — do NOT set module state yet or App.vue will
  // immediately unmount this view and mount InterviewerView before the
  // DB row exists, causing loadSession to return notFound.
  const newSid = nanoid(8)
  const totalBugs = activeChallenge.value.bugs.filter(
    (b) => b.variant === activeFramework.value,
  ).length

  const result = await createSessionRow({
    id: newSid,
    candidateName: candidateName.value.trim(),
    challengeId: activeChallengeId.value,
    framework: activeFramework.value,
    totalBugs,
  })

  loading.value = false

  if (!result.ok) {
    createError.value = 'Could not start session — check your connection.'
    return
  }

  // Show the links — the interviewer navigates via their link (which sets URL
  // params on load), so no in-app session transition is needed here.
  sid.value = newSid
}

function buildUrl(role: 'interviewer' | 'candidate'): string {
  const base = window.location.origin + window.location.pathname
  return `${base}?role=${role}&sid=${sid.value}`
}

async function copyUrl(role: 'interviewer' | 'candidate') {
  await navigator.clipboard.writeText(buildUrl(role))
  if (role === 'interviewer') {
    interviewerCopied.value = true
    setTimeout(() => { interviewerCopied.value = false }, 1500)
  } else {
    candidateCopied.value = true
    setTimeout(() => { candidateCopied.value = false }, 1500)
  }
}
</script>

<template>
  <div class="create-session-screen">
    <div class="card">
      <div class="card-brand">
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
          <path d="M6 4L2 9L6 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 4L16 9L12 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="9" cy="9" r="1.5" fill="currentColor" opacity="0.6"/>
        </svg>
        <span class="brand-label">codereview</span>
      </div>

      <h1 class="card-title">Start Interview Session</h1>
      <p class="card-desc">
        Enter the candidate's name, then generate session links. Share the candidate URL — they'll see a clean editor without hints.
      </p>

      <template v-if="!sid">
        <div class="field-group">
          <label class="field-label" for="candidate-name">Candidate name</label>
          <input
            id="candidate-name"
            v-model="candidateName"
            type="text"
            class="name-input"
            placeholder="e.g. Alex Johnson"
            :disabled="loading"
            @keydown.enter="handleCreate"
          />
        </div>

        <div v-if="createError" class="error-msg">{{ createError }}</div>

        <button
          class="create-btn"
          :disabled="!candidateName.trim() || loading"
          @click="handleCreate"
        >
          {{ loading ? 'Creating…' : 'Create Session' }}
        </button>
      </template>

      <template v-else>
        <div class="links-section">
          <div class="link-row">
            <span class="link-label">Your link (Interviewer)</span>
            <div class="link-input-wrap">
              <input :value="buildUrl('interviewer')" readonly class="link-input" />
              <button class="copy-btn" @click="copyUrl('interviewer')">
                {{ interviewerCopied ? '✓ Copied' : 'Copy' }}
              </button>
            </div>
          </div>

          <div class="link-row">
            <span class="link-label">Candidate link</span>
            <div class="link-input-wrap">
              <input :value="buildUrl('candidate')" readonly class="link-input" />
              <button class="copy-btn" @click="copyUrl('candidate')">
                {{ candidateCopied ? '✓ Copied' : 'Copy' }}
              </button>
            </div>
          </div>
        </div>

        <p class="session-hint">
          Session ID: <code class="sid-code">{{ sid }}</code><br>
          Open your interviewer link to begin.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.create-session-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 2rem;
}

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2.25rem;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.card-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent);
}

.brand-label {
  font-family: var(--font-brand);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

.card-title {
  font-family: var(--font-brand);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.02em;
}

.card-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.name-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 0.9rem;
  padding: 9px 12px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.name-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.name-input:disabled {
  opacity: 0.5;
}

.error-msg {
  font-size: 0.78rem;
  color: var(--danger);
  background: var(--danger-dim);
  border: 1px solid rgba(207, 34, 46, 0.3);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}

.create-btn {
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 12px 24px;
  transition: opacity 0.15s, transform 0.1s;
  align-self: flex-start;
}

.create-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.create-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.links-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.link-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.link-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.link-input-wrap {
  display: flex;
  gap: 6px;
}

.link-input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 7px 10px;
  outline: none;
  min-width: 0;
}

.copy-btn {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  padding: 6px 12px;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.copy-btn:hover {
  color: var(--text);
  border-color: var(--text-faint);
}

.session-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-faint);
  line-height: 1.65;
  border-top: 1px solid var(--border-subtle);
  padding-top: 1rem;
}

.sid-code {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--accent);
  background: var(--accent-dim);
  border-radius: 4px;
  padding: 1px 6px;
}
</style>
