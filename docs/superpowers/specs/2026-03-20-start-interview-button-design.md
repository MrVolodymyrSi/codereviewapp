# Start Interview Button — Design Spec

## Goal

Add a "Start Interview" button to the post-creation section of `CreateSessionView` so the interviewer can navigate directly to the interview view without manually copying and pasting their link.

## Interaction Flow

1. Interviewer fills in candidate name and clicks **Create Session**.
2. The post-creation section appears showing the interviewer link, candidate link, and copy buttons (unchanged).
3. A **Start Interview** button appears below the link rows, above the session hint.
4. Interviewer copies the candidate link (to share with the candidate), then clicks **Start Interview**.
5. The current tab navigates to `?role=interviewer&sid={sessionId}`, loading `InterviewerView`.

## What Changes

**File:** `src/views/CreateSessionView.vue` only.

### New function

```ts
function startInterview() {
  window.location.href = buildUrl('interviewer')
}
```

`buildUrl` already exists in the file and returns `${origin}${pathname}?role={role}&sid={sessionId}`.

### Template change

Inside the `v-else` block (post-creation section), the button is added **between** the `.links-section` div and the `.session-hint` paragraph:

```html
<div class="links-section">
  <!-- existing link rows unchanged -->
</div>

<button class="start-btn" @click="startInterview">Start Interview →</button>

<p class="session-hint">
  Session ID: <code class="sid-code">{{ sid }}</code>
</p>
```

The second line of `.session-hint` ("Open your interviewer link to begin.") is removed — the Start button makes it redundant.

### New style

```css
.start-btn {
  width: 100%;
  margin-top: 16px;
  padding: 12px 24px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: var(--font-ui);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.start-btn:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}
```

Style mirrors `.create-btn` exactly (same radius, padding, hover pattern, font).

## Out of Scope

- Opening in a new tab.
- Auto-redirecting on a timer.
- Hiding or removing the interviewer link copy button.
- Any changes to `CandidateView`, `InterviewerView`, or routing logic.
