<script setup lang="ts">
import { ref } from 'vue'
import { useSession } from '../composables/useSession'

const { createSession } = useSession()

const sid = ref<string | null>(null)
const interviewerCopied = ref(false)
const candidateCopied = ref(false)

function handleCreate() {
  sid.value = createSession()
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
        Generate a unique session link. Share the candidate URL with your interviewee — they'll see a clean editor without any hints.
      </p>

      <template v-if="!sid">
        <button class="create-btn" @click="handleCreate">Create Session</button>
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
          Open your interviewer link to begin. Candidate notes and bug checklist will be scoped to this session.
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
  border-radius: 14px;
  padding: 2.5rem 2.25rem;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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

.create-btn {
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: #000;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 12px 24px;
  transition: opacity 0.15s, transform 0.1s;
  align-self: flex-start;
}

.create-btn:hover {
  opacity: 0.88;
  transform: translateY(-1px);
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
  cursor: text;
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
