# UI Redesign: Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark "vibecoded" palette with a clean light theme (GitHub/Linear aesthetic) across all four screens and add a Monaco editor dark/light toggle.

**Architecture:** Single source of truth — CSS custom properties in `App.vue :root`. Most components already use these tokens, so swapping values in Task 1 handles the majority. Subsequent tasks fix the few hardcoded values that don't auto-update, add the editor toggle, and apply semantic color corrections.

**Tech Stack:** Vue 3 + TypeScript, Monaco via `@monaco-editor/loader` (already installed), CSS custom properties, localStorage.

---

## Auto-Update Analysis

The following already use tokens and need **no manual changes** after Task 1:
- `FileTree.vue` — active file: `var(--accent-dim)` bg + `var(--accent)` left border ✓
- `SplitLayout.vue` — divider hover: `var(--accent)` ✓
- `ChallengeSelector.vue` — focus ring: `var(--accent)` + `var(--accent-dim)` ✓
- `NotesPanel.vue` — code blocks `var(--bg-elevated)`, blockquote `var(--accent)` ✓
- `PreviewPane.vue` — url bar `var(--bg-input)` + `var(--border-subtle)` ✓
- `ConsolePanel.vue` — tab active `var(--accent)`, entry text `var(--text-muted)` ✓
- `InterviewerPanel.vue` — all tokens ✓
- `WorkspacePane.vue` — layout only ✓
- `AppHeader.vue` logo SVG — uses `stroke="currentColor"` inheriting `color: var(--accent)` ✓
- `BugChecklist.vue` checkbox — `accent-color: var(--accent)` ✓

---

## File Map

| File | Change |
|------|--------|
| `src/App.vue` | Replace `:root` token block |
| `src/components/MonacoEditor.vue` | Add `theme` prop |
| `src/components/CodePane.vue` | Add `theme` prop threading; fix `.run-btn`/`.btn-save`/`.comment-avatar` text `#000→#fff`; fix hover danger colors |
| `src/components/WorkspacePane.vue` | Add `theme` prop threading to CodePane |
| `src/components/AppHeader.vue` | Add editor theme toggle button; add `editorTheme` prop; fix height 52px→44px; add timer badge styling; update candidate badge to pill |
| `src/views/InterviewerView.vue` | Add `editorTheme` ref + localStorage + toggle; pass to WorkspacePane + AppHeader; fix banner/modal colors |
| `src/views/CandidateView.vue` | Add `editorTheme` ref + localStorage + toggle; pass to WorkspacePane + AppHeader; fix connection-lost banner |
| `src/components/BugChecklist.vue` | Update `SEVERITY_COLORS` script object: medium→`--warning`; add background colors |
| `src/components/FrameworkTabs.vue` | Fix active tab shadow + background |
| `src/views/CreateSessionView.vue` | Fix `.create-btn` `color #000→#fff`; fix `.error-msg` to use `--danger`/`--danger-dim` tokens; fix card radius |
| `src/views/SessionSummaryView.vue` | Update `.summary-badge` to success colors; update `.summary-card` to surface/border/shadow; update checked/unchecked bug rows; update severity badge colors |

---

## Task 1: Replace CSS design tokens in App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Replace the `:root` block**

In `src/App.vue`, find the `<style>` section. Replace the current `:root { ... }` block with:

```css
:root {
  --bg: #f6f8fa;
  --bg-surface: #ffffff;
  --bg-header: #ffffff;
  --bg-elevated: #eaeef2;
  --bg-input: #f6f8fa;
  --border: #d0d7de;
  --border-subtle: #eaeef2;
  --text: #24292f;
  --text-muted: #57606a;
  --text-faint: #8c959f;
  --accent: #0969da;
  --accent-dim: #ddf4ff;
  --accent-border: rgba(84, 174, 255, 0.4);
  --danger: #cf222e;
  --danger-dim: #ffebe9;
  --success: #1a7f37;
  --success-dim: #dafbe1;
  --warning: #9a6700;
  --warning-dim: #fff8c5;
  --vue: #42d392;
  --react: #61dafb;
  --vanilla: #f0d050;
  --text-xs: 0.72rem;
  --text-sm: 0.8rem;
  --text-base: 0.875rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --radius-xs: 3px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --font-ui: 'Instrument Sans', system-ui, sans-serif;
  --font-brand: 'Syne', system-ui, sans-serif;
  --font-mono: 'Fira Code', 'Cascadia Code', Consolas, monospace;
}
```

- [ ] **Step 2: Run dev server to verify light background**

```bash
cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview && npm run dev
```

Open http://localhost:5173 — the Create Session screen should show a white/light grey background instead of dark navy.

- [ ] **Step 3: Commit**

```bash
cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview
git add src/App.vue
git commit -m "feat: replace dark CSS tokens with light theme design system"
```

---

## Task 2: Monaco editor theme toggle

**Files:**
- Modify: `src/components/MonacoEditor.vue`
- Modify: `src/components/CodePane.vue`
- Modify: `src/components/WorkspacePane.vue`
- Modify: `src/components/AppHeader.vue`
- Modify: `src/views/InterviewerView.vue`
- Modify: `src/views/CandidateView.vue`

### 2a. MonacoEditor.vue — accept theme prop

- [ ] **Step 1: Add `theme` prop to MonacoEditor**

In `src/components/MonacoEditor.vue`, the current `defineProps` is:
```ts
const props = defineProps<{ code: string; language: string }>()
```

Change to:
```ts
const props = defineProps<{ code: string; language: string; theme?: string }>()
```

In `onMounted`, find `monacoInstance.editor.create(container.value!, { ... })` and add `theme: props.theme ?? 'vs-dark'` to the options object.

After the `watch(() => props.language, ...)` block, add a new watch:
```ts
watch(() => props.theme, (t) => {
  if (monacoInstance) monacoInstance.editor.setTheme(t ?? 'vs-dark')
})
```

### 2b. CodePane.vue — thread theme prop to MonacoEditor

- [ ] **Step 2: Add `theme` to CodePane props and pass to MonacoEditor**

In `src/components/CodePane.vue`, find `defineProps`. Add `theme?: string` to the props type.

Find the `<MonacoEditor` element in the template (currently renders with `:code` and `:language` props). Add `:theme="props.theme"` to it.

### 2c. WorkspacePane.vue — thread theme prop to CodePane

- [ ] **Step 3: Add `theme` to WorkspacePane and pass to CodePane**

In `src/components/WorkspacePane.vue`:

In `<script setup>`, add:
```ts
const props = defineProps<{ theme?: string }>()
```

In the `<template>`, find `<CodePane ...>` and add `:theme="props.theme"` to it.

### 2d. AppHeader.vue — add toggle button

- [ ] **Step 4: Add `editorTheme` prop and `toggle-editor-theme` emit**

In `src/components/AppHeader.vue`, the current props:
```ts
const props = defineProps<{
  candidateMode?: boolean
  sessionId?: string
  timerDisplay?: string
}>()
const emit = defineEmits<{ endInterview: [] }>()
```

Change to:
```ts
const props = defineProps<{
  candidateMode?: boolean
  sessionId?: string
  timerDisplay?: string
  editorTheme?: string
}>()
const emit = defineEmits<{
  endInterview: []
  'toggle-editor-theme': []
}>()
```

- [ ] **Step 5: Add toggle button in AppHeader template**

In the template, find the `.header-right` div:
```html
<div class="header-right">
  <span v-if="timerDisplay && !candidateMode" class="timer-display">{{ timerDisplay }}</span>
  <button v-if="!candidateMode && timerDisplay" class="end-btn" @click="emit('endInterview')">
    End Interview
  </button>
  <button v-if="sessionId" class="sid-badge" ...>
```

Add the editor theme toggle BEFORE the timer span:
```html
<button
  v-if="editorTheme !== undefined"
  class="editor-theme-btn"
  :title="editorTheme === 'vs-dark' ? 'Switch to light editor' : 'Switch to dark editor'"
  @click="emit('toggle-editor-theme')"
>{{ editorTheme === 'vs-dark' ? '🌙' : '☀️' }}</button>
```

- [ ] **Step 6: Add AppHeader CSS changes**

In `<style scoped>`, make these changes:

**a) Change `.top-bar` height from 52px to 44px:**
```css
.top-bar {
  height: 44px;
}
```

**b) Change `.description-bar` background from `var(--bg)` to `var(--bg-surface)`:**
```css
.description-bar {
  background: var(--bg-surface);
}
```

**c) Update `.timer-display` to show as a Secondary-style badge:**
```css
.timer-display {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  min-width: 48px;
  text-align: right;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
}
```

**d) Update `.candidate-badge` from plain italic text to a pill badge:**
```css
.candidate-badge {
  font-size: 0.72rem;
  font-weight: 500;
  font-style: normal;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: 20px;
  padding: 2px 10px;
}
```

**e) Add `.editor-theme-btn` CSS:**
```css
.editor-theme-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
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
```

### 2e. InterviewerView.vue — wire editorTheme state

- [ ] **Step 7: Add editorTheme state to InterviewerView**

In `src/views/InterviewerView.vue`, at the top of `<script setup>` after the existing imports, add:
```ts
const EDITOR_THEME_KEY = 'codereview:editor-theme'
const editorTheme = ref<string>(
  localStorage.getItem(EDITOR_THEME_KEY) ?? 'vs-dark'
)
function toggleEditorTheme() {
  editorTheme.value = editorTheme.value === 'vs-dark' ? 'vs' : 'vs-dark'
  localStorage.setItem(EDITOR_THEME_KEY, editorTheme.value)
}
```

- [ ] **Step 8: Pass editorTheme to AppHeader and WorkspacePane in InterviewerView template**

Find `<AppHeader` in the interview-UI section of the template (the `v-else-if="pageState === 'interview'"` block). Add:
```html
:editor-theme="editorTheme"
@toggle-editor-theme="toggleEditorTheme"
```

Find `<WorkspacePane />` in the same block. Change to:
```html
<WorkspacePane :theme="editorTheme" />
```

Also find `<AppHeader` in the summary section (`v-else-if="pageState === 'summary'"`) and add `:editor-theme="editorTheme" @toggle-editor-theme="toggleEditorTheme"` there too, since the header is also shown on summary.

### 2f. CandidateView.vue — same as InterviewerView

- [ ] **Step 9: Add editorTheme state to CandidateView**

Repeat the same steps as 2e for `src/views/CandidateView.vue` — add `editorTheme` ref, `toggleEditorTheme` function, and pass both to `<AppHeader>` and `<WorkspacePane>`.

- [ ] **Step 10: Run dev server and test the toggle**

```bash
npm run dev
```

Open the interviewer view. Verify:
- Editor loads with dark theme (vs-dark)
- 🌙 toggle button appears in header
- Click it → editor switches to light (vs)
- Reload → preference is remembered (☀️ shown)
- Click ☀️ → switches back to dark

- [ ] **Step 11: Commit**

```bash
cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview
git add src/components/MonacoEditor.vue src/components/CodePane.vue src/components/WorkspacePane.vue src/components/AppHeader.vue src/views/InterviewerView.vue src/views/CandidateView.vue
git commit -m "feat: add Monaco editor dark/light theme toggle with localStorage persistence"
```

---

## Task 3: Fix hardcoded colors broken by light theme swap

**Files:**
- Modify: `src/components/CodePane.vue`
- Modify: `src/components/FrameworkTabs.vue`
- Modify: `src/views/CreateSessionView.vue`
- Modify: `src/views/InterviewerView.vue`
- Modify: `src/views/CandidateView.vue`

### 3a. CodePane.vue

- [ ] **Step 1: Fix primary button text and danger hover colors**

In `src/components/CodePane.vue` `<style scoped>`, make these exact changes:

**`.run-btn`** — change `color: #000` to `color: #fff`:
```css
.run-btn {
  color: #fff;
}
```

**`.dirty-dot`** — change `background: #000` to `background: #fff`:
```css
.dirty-dot {
  background: #fff;
  opacity: 0.7;
}
```

**`.btn-save`** — change `color: #000` to `color: #fff`:
```css
.btn-save {
  color: #fff;
}
```

**`.comment-avatar`** — change `color: #000` to `color: #fff`:
```css
.comment-avatar {
  color: #fff;
}
```

**`.tab-close:hover`** — replace `background: rgba(248, 113, 113, 0.15)` with token:
```css
.tab-close:hover {
  background: var(--danger-dim);
  color: var(--danger);
}
```

**`.comment-textarea:focus`** — was using `var(--react)` (cyan); change to accent:
```css
.comment-textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
```

**`.remove-btn:hover`** — replace `rgba(248, 113, 113, 0.1)` with token:
```css
.remove-btn:hover {
  color: var(--danger);
  background: var(--danger-dim);
}
```

### 3b. FrameworkTabs.vue

- [ ] **Step 2: Fix active tab background and shadow**

In `src/components/FrameworkTabs.vue` `<style scoped>`:

**`.tab.active`** — change background to `--bg-surface` (white) and lighten shadow:
```css
.tab.active {
  background: var(--bg-surface);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
```

### 3c. CreateSessionView.vue

- [ ] **Step 3: Fix button color, error message, and card radius**

In `src/views/CreateSessionView.vue` `<style scoped>`:

**`.create-btn`** — change `color: #000` to `color: #fff`:
```css
.create-btn {
  color: #fff;
}
```

**`.error-msg`** — replace hardcoded rgba with tokens:
```css
.error-msg {
  font-size: 0.78rem;
  color: var(--danger);
  background: var(--danger-dim);
  border: 1px solid rgba(207, 34, 46, 0.3);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}
```

**`.card`** — update border-radius to `--radius-lg` and add subtle shadow:
```css
.card {
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
```
(Keep all other `.card` properties as-is — only add/change `border-radius` and `box-shadow`.)

### 3d. InterviewerView.vue — fix banners and modal

- [ ] **Step 4: Fix orange hardcoded colors in InterviewerView**

In `src/views/InterviewerView.vue` `<style scoped>`:

**`.save-failed-banner`** — replace hardcoded orange with warning tokens:
```css
.save-failed-banner {
  background: var(--warning-dim);
  border-bottom: 1px solid rgba(154, 103, 0, 0.3);
  color: var(--warning);
  font-size: 0.75rem;
  padding: 6px 20px;
  flex-shrink: 0;
}
```

**`.modal-warning`** — replace hardcoded orange:
```css
.modal-warning {
  margin: 0;
  font-size: 0.78rem;
  color: var(--warning);
  background: var(--warning-dim);
  border: 1px solid rgba(154, 103, 0, 0.3);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}
```

**`.modal-error`** — replace hardcoded red rgba:
```css
.modal-error {
  margin: 0;
  font-size: 0.78rem;
  color: var(--danger);
  background: var(--danger-dim);
  border: 1px solid rgba(207, 34, 46, 0.3);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}
```

**`.modal-overlay`** — lighten overlay opacity from 0.55 to 0.4:
```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.4);
}
```

**`.modal-card`** — change to `--radius-md`:
```css
.modal-card {
  border-radius: var(--radius-md);
}
```

### 3e. CandidateView.vue — fix connection-lost banner

- [ ] **Step 5: Fix orange hardcoded color in CandidateView**

In `src/views/CandidateView.vue` `<style scoped>`:

**`.connection-lost-banner`** — replace hardcoded orange:
```css
.connection-lost-banner {
  background: var(--warning-dim);
  border-bottom: 1px solid rgba(154, 103, 0, 0.3);
  color: var(--warning);
  font-size: 0.75rem;
  padding: 6px 20px;
  flex-shrink: 0;
  text-align: center;
}
```

- [ ] **Step 6: Run dev server and do visual sweep**

```bash
npm run dev
```

Check:
- Create Session: white card, blue button with white text
- Interviewer view: warning banners show gold/amber (not orange)
- Modal overlay is noticeably lighter

- [ ] **Step 7: Commit**

```bash
cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview
git add src/components/CodePane.vue src/components/FrameworkTabs.vue src/views/CreateSessionView.vue src/views/InterviewerView.vue src/views/CandidateView.vue
git commit -m "fix: replace hardcoded colors with semantic tokens for light theme"
```

---

## Task 4: BugChecklist severity colors

**Files:**
- Modify: `src/components/BugChecklist.vue`

The severity badge colors are applied via an inline `:style` binding in the template using the `SEVERITY_COLORS` object in `<script setup>`. Currently:

```ts
const SEVERITY_COLORS: Record<string, string> = {
  high: 'var(--danger)',
  medium: 'var(--accent)',   // ← wrong: should be --warning per spec
  low: 'var(--text-faint)',
}
```

The inline style binding is:
```html
:style="{ color: SEVERITY_COLORS[bug.severity], borderColor: SEVERITY_COLORS[bug.severity] }"
```

This sets only `color` and `borderColor` — no background. Per spec, badges need light-tinted backgrounds too.

- [ ] **Step 1: Replace SEVERITY_COLORS and update inline style**

In `src/components/BugChecklist.vue` `<script setup>`, replace the `SEVERITY_COLORS` constant with:

```ts
const SEVERITY_STYLES: Record<string, { color: string; background: string; borderColor: string }> = {
  high:   { color: 'var(--danger)',      background: 'var(--danger-dim)',  borderColor: 'rgba(207, 34, 46, 0.3)' },
  medium: { color: 'var(--warning)',     background: 'var(--warning-dim)', borderColor: 'rgba(154, 103, 0, 0.3)' },
  low:    { color: 'var(--text-faint)',  background: 'var(--bg-elevated)', borderColor: 'var(--border)' },
}
```

In the `<template>`, find the severity badge element:
```html
<span
  class="severity-badge"
  :style="{ color: SEVERITY_COLORS[bug.severity], borderColor: SEVERITY_COLORS[bug.severity] }"
>{{ bug.severity }}</span>
```

Change to:
```html
<span
  class="severity-badge"
  :style="SEVERITY_STYLES[bug.severity] ?? SEVERITY_STYLES.low"
>{{ bug.severity }}</span>
```

- [ ] **Step 2: Run dev server and verify severity badges**

Open the Interviewer view with a challenge loaded. The bug checklist should show:
- HIGH badges: red text on light-red background
- MED badges: amber/gold text on light-yellow background
- LOW badges: grey text on light-grey background

- [ ] **Step 3: Commit**

```bash
cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview
git add src/components/BugChecklist.vue
git commit -m "fix: update BugChecklist severity badge colors to light-theme semantic values"
```

---

## Task 5: SessionSummaryView light-theme styling

**Files:**
- Modify: `src/views/SessionSummaryView.vue`

The template structure already has `.summary-card` as the content wrapper inside `.summary-view`. No HTML changes needed — only CSS updates.

- [ ] **Step 1: Update SessionSummaryView CSS**

In `src/views/SessionSummaryView.vue` `<style scoped>`, make the following changes:

**`.summary-card`** — add surface background, border, shadow:
```css
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
```

**`.summary-badge`** — change from accent to success green pill:
```css
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
```

**`.bug-row.checked`** — change from react-color rgba to success:
```css
.bug-row.checked {
  border-color: rgba(26, 127, 55, 0.2);
  background: rgba(26, 127, 55, 0.03);
}
```

**`.bug-row.checked .bug-check`** — change from `--accent` to `--success`:
```css
.bug-row.checked .bug-check {
  color: var(--success);
}
```

**Add unchecked (missed) bug row styling** — per spec, missed bugs get strikethrough + faint text:
```css
.bug-row:not(.checked) .bug-desc {
  color: var(--text-faint);
  text-decoration: line-through;
}
```

**`.bug-severity.high`** — update to light-theme danger:
```css
.bug-severity.high { color: var(--danger); background: var(--danger-dim); }
```

**`.bug-severity.medium`** — update to warning:
```css
.bug-severity.medium { color: var(--warning); background: var(--warning-dim); }
```

**`.bug-severity.low`** — update to faint:
```css
.bug-severity.low { color: var(--text-faint); background: var(--bg-elevated); }
```

**`.copy-btn`** — update to Secondary variant (surface bg, border, text color):
```css
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
```

- [ ] **Step 2: Run dev server and verify Session Summary**

After ending an interview (or using direct URL with a session that has `ended_at`):
- Page shows white content card centered on light grey background
- "Interview Complete" badge is green on light green background
- Checked bugs show green ✓ and normal text
- Unchecked bugs show grey strikethrough text
- Severity badges match light-theme colors
- "Copy summary" button looks like a secondary button (white bg, grey border)

- [ ] **Step 3: Commit**

```bash
cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview
git add src/views/SessionSummaryView.vue
git commit -m "feat: update Session Summary view for light theme with success/severity colors"
```

---

## Task 6: Build verification

- [ ] **Step 1: Run TypeScript build**

```bash
cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview && npm run build
```

Expected: Build completes with no TypeScript errors.

If there are type errors related to the new `theme?: string` props (e.g., "Property 'theme' does not exist"), ensure `defineProps` in each component was updated correctly.

- [ ] **Step 2: Final visual check across all four screens**

Open http://localhost:5173 and verify each screen:

**Create Session:**
- [ ] Light grey canvas (`#f6f8fa`), white card with subtle shadow
- [ ] Blue "Create Session" button with white text
- [ ] Input focus shows blue ring

**Interviewer View:**
- [ ] White header 44px height
- [ ] 🌙 toggle button visible in header
- [ ] Challenge selector shows on light background
- [ ] Monaco editor loads dark by default
- [ ] Severity badges in Bug Checklist show correct light-theme colors
- [ ] Warning banners show amber/gold (not orange)

**Candidate View:**
- [ ] "Candidate View" pill badge in accent blue
- [ ] Same editor toggle present

**Session Summary:**
- [ ] White content card on grey page background
- [ ] "Interview Complete" green badge
- [ ] Blue score bar fill
- [ ] Checked bugs: green checkmark, normal text
- [ ] Unchecked bugs: grey strikethrough text

- [ ] **Step 3: Deploy (push to remote)**

```bash
cd /Users/volodymyrsinievych/1010s/claude-code-repo/codereview
git push
```

---

## Verification Checklist

- [ ] All four screens use light (`#f6f8fa`) background canvas
- [ ] All primary buttons (Create Session, Run, Save) show white text on blue background
- [ ] Monaco editor starts dark; toggle switches to light; preference persists on reload
- [ ] Editor toggle appears in both Interviewer and Candidate view headers
- [ ] BugChecklist: HIGH=red, MED=amber, LOW=grey on light-tinted backgrounds
- [ ] Session Summary: green "Interview Complete" badge; green checkmarks; grey strikethrough for unchecked
- [ ] Warning banners use gold/yellow (`--warning-dim`/`--warning`)
- [ ] Modal overlay is lighter (rgba 0.4 vs old 0.55)
- [ ] `npm run build` completes without errors
