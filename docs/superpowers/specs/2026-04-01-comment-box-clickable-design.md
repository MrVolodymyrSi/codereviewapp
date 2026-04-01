# Comment Box Clickable — Design Spec

**Date:** 2026-04-01
**Status:** Approved

## Problem

All interactive elements inside gutter comment zones (textarea, Cancel button, Add comment button, delete button) are not clickable. Monaco sets `pointer-events: none` on the view zone layer container, and `.gc-zone` inherits it, blocking all mouse events.

## Fix

Add `pointer-events: auto` to the `.gc-zone` CSS rule in `injectStyles()` inside `src/composables/useGutterComments.ts`.

This is the shared base class for both `.gc-comment` and `.gc-form` zones, so one rule fixes all interactive elements in both zone types.

## Why this is safe

View zones occupy distinct vertical space between code lines — they do not overlay selectable code. Monaco's text selection layer is also separate from the view zone layer. Setting `pointer-events: auto` on `.gc-zone` has no effect on code highlighting or copying.

## File changed

| File | Change |
|---|---|
| `src/composables/useGutterComments.ts` | Add `pointer-events: auto` to `.gc-zone` in `injectStyles()` |

No other files change.
