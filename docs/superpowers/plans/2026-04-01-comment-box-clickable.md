# Comment Box Clickable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Monaco view zone comment boxes so all interactive elements (textarea, buttons) receive mouse events.

**Architecture:** Add `pointer-events: auto` to the `.gc-zone` CSS rule inside `injectStyles()` in the gutter comments composable. Monaco sets `pointer-events: none` on the view zone layer container; this one rule overrides it for both comment and form zones.

**Tech Stack:** TypeScript, Vue 3, Monaco Editor

---

### Task 1: Fix pointer-events on .gc-zone

**Files:**
- Modify: `src/composables/useGutterComments.ts`

- [ ] **Step 1: Open the file and locate the `.gc-zone` rule**

In `src/composables/useGutterComments.ts`, find the `.gc-zone` block inside `injectStyles()` (around line 29):

```css
.gc-zone {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  background: var(--bg-elevated, #161b22);
  border-left: 3px solid #1f6feb;
  box-sizing: border-box;
  width: 100%;
}
```

- [ ] **Step 2: Add pointer-events: auto**

Replace the `.gc-zone` block with:

```css
.gc-zone {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  background: var(--bg-elevated, #161b22);
  border-left: 3px solid #1f6feb;
  box-sizing: border-box;
  width: 100%;
  pointer-events: auto;
}
```

- [ ] **Step 3: Verify the app works manually**

Run the dev server:
```bash
npm run dev
```

1. Open the interviewer view with a code challenge loaded
2. Hover the glyph margin — the `+` icon should appear
3. Click the `+` icon on a line — the comment form zone should appear
4. Click inside the textarea — it should receive focus and accept text input
5. Click the Cancel button — the form should close
6. Open the form again, type a comment, click Add comment — the comment zone should appear
7. Click the delete (×) button on a comment — the comment should be removed

- [ ] **Step 4: Commit**

```bash
git add src/composables/useGutterComments.ts
git commit -m "fix: add pointer-events auto to gc-zone so comment buttons and textarea are clickable"
```
