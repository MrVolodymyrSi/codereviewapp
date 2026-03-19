# UI Redesign: Light Theme Design Spec

## Overview

Redesign the CodeReview interview tool from a dark theme to a clean light theme to present a professional, corporate-grade appearance. The redesign covers all four screens with a consistent design system. No mobile support required.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Theme | Light | Professional, credible, easy to screenshot for reports |
| Accent color | Blue (#0969da) | Neutral, maximally professional (GitHub/Linear standard) |
| Editor theme | Dark (VS Dark) default, toggleable | Devs prefer dark editors; toggle respects individual preference |
| Toggle persistence | localStorage | Survives page reload, per-user preference |
| Scope | All four screens | Consistency across the full user experience |
| Mobile | Not supported | Internal tool, desktop-only usage |

---

## Design System

### Color Tokens (replaces current dark palette in `App.vue`)

```css
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
```

Framework colors (Vue, React, Vanilla) remain unchanged — they are used only as small dot indicators and remain legible on light backgrounds.

### Typography Scale (standardised — 4 sizes only)

| Token | Value | Usage |
|-------|-------|-------|
| `--text-xs` | 0.72rem | Uppercase labels, badges, metadata |
| `--text-sm` | 0.8rem | Body text, descriptions, bug text |
| `--text-base` | 0.875rem | Primary UI text, inputs, buttons |
| `--text-lg` | 1.25rem | Section headings (Syne) |
| `--text-xl` | 1.5rem + | Page titles (Syne, Create Session only) |

Fonts unchanged: Syne (headings/brand), Instrument Sans (UI), Fira Code (mono/code).

### Spacing (4px grid — 6 steps)

`4px · 8px · 12px · 16px · 20px · 24px`

All padding and gap values in components must use one of these values. No 3px, 5px, 7px, 10px, 14px, etc.

### Border Radius (4 sizes)

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 3px | Badges, inline chips |
| `--radius-sm` | 6px | Buttons, inputs, small panels |
| `--radius-md` | 8px | Dropdowns, modals |
| `--radius-lg` | 12px | Cards (Create Session, Summary) |

### Button System (3 variants, unified sizing)

All buttons: `height: 32px`, `padding: 0 14px`, `border-radius: var(--radius-sm)`, `font-size: var(--text-base)`, `font-weight: 500`.

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Primary | `--accent` | `#fff` | none |
| Secondary | `--bg-surface` | `--text` | `1px solid --border` |
| Ghost | transparent | `--text-muted` | none |
| Danger | `--danger` | `#fff` | none |

---

## Monaco Editor Theme Toggle

A small toggle button in `AppHeader` switches Monaco between `vs-dark` (default) and `vs` (light).

- **Location:** Right side of header, before the timer
- **Appearance:** Icon-only button — 🌙 when dark, ☀️ when light. Secondary variant styling.
- **Persistence:** `localStorage.getItem('editorTheme')` — key `codereview:editor-theme`, values `'vs-dark'` | `'vs'`
- **Default:** `'vs-dark'` if no preference stored
- **Implementation:** `MonacoEditor.vue` accepts a `theme` prop. `AppHeader` emits `toggle-editor-theme`. `InterviewerView` and `CandidateView` own the state ref and pass it down.
- **Both views:** The toggle appears in both InterviewerView and CandidateView headers so candidates can also switch.

---

## Screen-by-Screen Changes

### 1. Create Session (`CreateSessionView.vue`)

- Card: `--bg-surface` white, `--border`, `--radius-lg` (12px), subtle box-shadow (`0 1px 3px rgba(0,0,0,0.06)`)
- Canvas background: `--bg` (#f6f8fa)
- Brand mark: logo SVG stroke changed from `--accent` gold → `--accent` blue
- Title: Syne, `--text-xl`, `--text` dark
- Input: `--bg-input`, `--border`, `--radius-sm`, focus ring: `0 0 0 3px var(--accent-dim)` + border `--accent`
- Button: Primary variant
- Link rows after creation: Secondary button for Copy; monospace input in `--bg-input`
- Error message: `--danger-dim` background, `--danger` text, `--radius-xs` border

### 2. Interviewer View (`InterviewerView.vue`)

- `AppHeader`: `--bg-header` white, `--border` bottom border, 44px height
- Editor theme toggle button added (see above)
- Description bar: `--bg-surface` white, `--border-subtle` bottom, 10px italic text in `--text-muted`
- Save-failed banner: `--warning-dim` background, `--warning` text, `--border` bottom
- Loading/error/not-found states: centered on `--bg`, spinner border-top `--accent`
- Modal overlay: `rgba(0,0,0,0.4)` (lighter than current 0.55 — fits light theme)
- Modal card: `--bg-surface`, `--border`, `--radius-md`

### 3. Candidate View (`CandidateView.vue`)

- Identical header treatment to InterviewerView (white, `--border`)
- "Candidate View" badge: `--accent-dim` background, `--accent` text, `--accent-border` border, pill shape
- Editor theme toggle present (same as interviewer)
- Connection-lost banner: `--warning-dim` background, `--warning` text
- Full-screen states: centered on `--bg`

### 4. Session Summary (`SessionSummaryView.vue`)

- Full page: `--bg` canvas with centered content card (max-width 680px, `--bg-surface`, `--border`, `--radius-lg`)
- "Interview Complete" badge: `--success-dim` background, `--success` text, pill
- Score bar fill: `--accent` blue
- Checked bug row: `--success` checkmark, normal text
- Missed bug row: `--text-faint` color, strikethrough text
- Notes section: rendered markdown with standard light-theme code block styling (`--bg-elevated` background)
- "Copy summary" button: Secondary variant

### 5. Components (applied to all)

**AppHeader:** White bg, border bottom, 44px. Challenge selector: `--bg-elevated` pill container. Framework tabs: same pill container. Timer: Secondary-style badge with monospace font. End Interview: Danger button.

**FileTree:** `--bg-surface` background, `--border-subtle` right border. Active file: `--accent-dim` background, left border `--accent`. Decorative files: 30% opacity maintained.

**BugChecklist:** `--bg-surface` background. Checkboxes: `--border` unchecked, `--accent` checked fill. Severity badges: same colors, updated to light-theme backgrounds (HIGH: `--danger-dim`/`--danger`, MED: `--warning-dim`/`--warning`, LOW: `--bg-elevated`/`--text-faint`). Checked rows: strikethrough + `--text-faint`.

**NotesPanel:** `--bg-surface` background. Textarea: `--bg-input`, `--border`, `--radius-sm`. Markdown preview: light styling for headings, code blocks, blockquotes.

**PreviewPane:** Header bar: `--bg-elevated` background, `--border-subtle` bottom. Traffic lights unchanged (macOS colors). URL bar: `--bg-input`, `--border`.

**ConsolePanel:** `--bg-surface` background. Tab bar: `--border-subtle` bottom. Log level left borders: unchanged (semantic colors). Entry text: `--text-muted`.

**SplitLayout:** Divider: `--border-subtle` default → `--accent` on hover/drag.

**ChallengeSelector:** `--bg-elevated` background, `--border`. Focus: `--accent` border + `0 0 0 3px var(--accent-dim)`.

**FrameworkTabs:** Pill container: `--bg-elevated` background, `--border`. Active tab: `--bg-surface` white, subtle shadow.

---

## Implementation Approach

**Direct rewrite (Approach 1):**

1. Update CSS variables in `App.vue` — single source of truth
2. Sweep all component `<style scoped>` blocks for hardcoded hex values and replace with tokens
3. Standardise spacing (4px grid) and border-radius (4 sizes) in all components
4. Add editor theme toggle to `AppHeader`, wire through to `MonacoEditor`
5. No new files, no theme-switching infrastructure — straightforward value substitution

**Files changed:**
- `src/App.vue` — token rewrite
- `src/components/AppHeader.vue` — theme toggle button + light styling
- `src/components/MonacoEditor.vue` — accept `theme` prop
- `src/components/CodePane.vue` — light styling
- `src/components/FileTree.vue` — light styling
- `src/components/BugChecklist.vue` — light styling
- `src/components/NotesPanel.vue` — light styling
- `src/components/PreviewPane.vue` — light styling
- `src/components/ConsolePanel.vue` — light styling
- `src/components/SplitLayout.vue` — light styling
- `src/components/ChallengeSelector.vue` — light styling
- `src/components/FrameworkTabs.vue` — light styling
- `src/components/InterviewerPanel.vue` — light styling
- `src/views/CreateSessionView.vue` — light styling
- `src/views/InterviewerView.vue` — editor theme state + light styling
- `src/views/CandidateView.vue` — editor theme state + light styling
- `src/views/SessionSummaryView.vue` — light styling

---

## Out of Scope

- Dark mode toggle for the full app (not requested)
- Mobile/responsive layouts (explicitly excluded)
- Font changes (current fonts are good — Syne, Instrument Sans, Fira Code)
- Layout or feature changes (purely visual)
