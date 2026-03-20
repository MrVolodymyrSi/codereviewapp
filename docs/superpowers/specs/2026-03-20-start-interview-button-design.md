# Start Interview Button — Design Spec

## Goal

Add a "Start Interview" button to the post-creation section of `CreateSessionView` so the interviewer can navigate directly to the interview view without manually copying and pasting their link.

## Interaction Flow

1. Interviewer fills in candidate name and clicks **Create Session**.
2. The post-creation section appears showing the interviewer link, candidate link, and copy buttons (unchanged).
3. A **Start Interview** button appears below the candidate link row.
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

### New button in template

Added below the candidate link row, inside the existing post-creation section (the block that renders when `sessionId` is truthy):

```html
<button class="start-btn" @click="startInterview">Start Interview →</button>
```

### New style

```css
.start-btn {
  width: 100%;
  margin-top: 16px;
  padding: 10px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.start-btn:hover {
  opacity: 0.9;
}
```

## Out of Scope

- Opening in a new tab.
- Auto-redirecting on a timer.
- Hiding or removing the interviewer link copy button.
- Any changes to `CandidateView`, `InterviewerView`, or routing logic.
