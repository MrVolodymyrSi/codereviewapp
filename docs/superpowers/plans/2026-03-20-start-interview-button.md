# Start Interview Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Start Interview" button to the post-creation section of `CreateSessionView` so the interviewer can navigate to the interview in one click instead of copying their link.

**Architecture:** Single-file change to `src/views/CreateSessionView.vue`. Add a `startInterview()` function that assigns `window.location.href = buildUrl('interviewer')`. Add the button between `.links-section` and `.session-hint` in the template. Remove the now-redundant "Open your interviewer link to begin." sentence from the hint.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), TypeScript.

---

## File Map

| File | Change |
|------|--------|
| `src/views/CreateSessionView.vue` | Add `startInterview()`, add button to template, update hint text, add `.start-btn` style |

---

## Task 1: Add Start Interview button to `CreateSessionView.vue`

**Files:**
- Modify: `src/views/CreateSessionView.vue`

This project has no component test infrastructure (all existing tests cover utils/composables). The change is verified by TypeScript compilation and manual browser check.

- [ ] **Step 1: Add `startInterview` function to `<script setup>`**

  After `copyUrl()` (around line 64), add:

  ```ts
  function startInterview() {
    window.location.href = buildUrl('interviewer')
  }
  ```

  Also update the comment above `sid.value = newSid` (currently line 47) — change:
  ```ts
  // Show the links — the interviewer navigates via their link (which sets URL
  // params on load), so no in-app session transition is needed here.
  ```
  To:
  ```ts
  // Show the links. Interviewer clicks Start Interview to begin; candidate link
  // is shared separately.
  ```

- [ ] **Step 2: Add the button to the template**

  In the `v-else` block (post-creation section), the current structure is:
  ```html
  <div class="links-section">
    ...
  </div>

  <p class="session-hint">
    Session ID: <code class="sid-code">{{ sid }}</code><br>
    Open your interviewer link to begin.
  </p>
  ```

  Change it to:
  ```html
  <div class="links-section">
    ...
  </div>

  <button class="start-btn" @click="startInterview">Start Interview →</button>

  <p class="session-hint">
    Session ID: <code class="sid-code">{{ sid }}</code>
  </p>
  ```

  Two changes: button added after `.links-section`, and the `<br>Open your interviewer link to begin.` line removed from the hint.

- [ ] **Step 3: Add `.start-btn` style**

  In the `<style scoped>` block, after `.links-section { ... }` (find the existing `.links-section` rule as an anchor), add:

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

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Run tests**

  ```bash
  npm test -- --run
  ```

  Expected: all 61 tests pass (no new tests — no component test infrastructure exists in this project).

- [ ] **Step 6: Commit**

  ```bash
  git add src/views/CreateSessionView.vue
  git commit -m "feat: add Start Interview button to post-creation view"
  ```

---

## Manual Verification

After implementation, verify in the browser (`npm run dev`):

1. Open the app with no session params — see `CreateSessionView`.
2. Enter a candidate name and click **Create Session**.
3. The post-creation section appears with both link rows and a **Start Interview →** button below them.
4. The session hint shows only the session ID (no "Open your interviewer link" text).
5. Click the candidate link **Copy** button — it copies successfully.
6. Click **Start Interview →** — the current tab navigates to `?role=interviewer&sid={id}` and the interview view loads.
