---
phase: quick-9
plan: "01"
subsystem: frontend
tags: [ui, chart, ux, cleanup]
dependency_graph:
  requires: []
  provides: [interactive-price-chart-tooltips]
  affects: [CardDetailPage, PriceChart]
tech_stack:
  added: []
  patterns: [svg-hover-tooltip, react-state-for-hover]
key_files:
  created: []
  modified:
    - src/pages/CardDetailPage.tsx
    - src/components/PriceChart.tsx
decisions:
  - Tooltip uses pure SVG + React state — no external tooltip library
  - Invisible r=8 hit targets provide generous hover area without visual clutter
  - Tooltip rendered last in SVG z-order to appear on top of all chart elements
  - Edge detection: position below if cy < PAD_TOP+40; shift left if cx > WIDTH-80
metrics:
  duration: "3 min"
  completed_date: "2026-03-14"
  tasks_completed: 1
  files_modified: 2
---

# Quick Task 9: Hide Price Log and Add Chart Hover Tooltips Summary

**One-liner:** Removed redundant Price Log list from card detail page and added pure-SVG hover tooltips to PriceChart data points showing price and timestamp.

## What Was Done

### Task 1: Remove Price Log section and add chart hover tooltips

Removed the second `{priceHistory.length > 1 && (...)}` block from `CardDetailPage.tsx` that rendered the "Price Log" heading and the scrollable list of date+price entries. The chart now provides the same information interactively.

In `PriceChart.tsx`:
- Added `useState<number | null>(null)` for tracking the hovered data point index
- Split each data point from a single `<circle>` into a `<g>` containing: a visible circle (r=3 normal, r=4 on hover) with `pointerEvents: none`, and an invisible hit-target circle (r=8, `fill="transparent"`) with `onMouseEnter`/`onMouseLeave` handlers
- Added tooltip `<g>` rendered last in the SVG, containing a slate-800 `<rect>` background and two `<text>` elements: formatted price (EUR X.XX, slate-200, fontSize 10) and date+time string (slate-400, fontSize 9)
- Tooltip repositions below the point when near the top edge (`cy < PAD_TOP + 40`), and shifts left when near the right edge (`cx > WIDTH - 80`)

**Commit:** 41b315d

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript compiles without errors (`npx tsc --noEmit` produced no output)
- Price Log block fully deleted from CardDetailPage.tsx
- PriceChart data points now have interactive hover state with SVG tooltips

## Self-Check

- [x] `src/pages/CardDetailPage.tsx` modified — Price Log removed
- [x] `src/components/PriceChart.tsx` modified — tooltips added
- [x] Commit 41b315d exists
- [x] TypeScript compilation passed
