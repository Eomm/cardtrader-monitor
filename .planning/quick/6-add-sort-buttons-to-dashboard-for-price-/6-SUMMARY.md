---
phase: quick-6
plan: 1
subsystem: frontend
tags: [sorting, dashboard, localStorage, ux]
dependency_graph:
  requires: []
  provides: [sort-by-price, sort-by-variation]
  affects: [CardList, DashboardFilters]
tech_stack:
  added: []
  patterns: [useMemo-sort-after-filter, localStorage-persistence]
key_files:
  created: []
  modified:
    - src/components/CardList.tsx
decisions:
  - "SortField type uses empty string '' to represent 'no sort' for clean default/off state"
  - "calcVariation defined as module-level function (outside component) to avoid re-creation on each render"
  - "sort buttons always visible (not conditional) for consistent UX regardless of filter state"
metrics:
  duration: 5 min
  completed: 2026-03-12T19:06:34Z
---

# Quick Task 6: Add Sort Buttons to Dashboard Summary

**One-liner:** Price and variation sort buttons added to CardList with toggle cycling (off/asc/desc) and localStorage persistence.

## What Was Built

Extended `CardList.tsx` to support sorting by current price or price variation percentage. The sort state is integrated into the existing `DashboardFilters` interface so it persists automatically alongside search and filter preferences.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add sort state, sort UI, and sorting logic to CardList | 9711b6f | src/components/CardList.tsx |

## Key Changes

**Types added:**
- `SortField = 'price' | 'variation' | ''`
- `SortDirection = 'asc' | 'desc'`
- Both added as fields to `DashboardFilters` interface with defaults `''` and `'asc'`

**Logic added:**
- `calcVariation(card)` helper: computes `((latest - baseline) / baseline) * 100`, returns null when either price is null or baseline is 0
- `sorted` useMemo: applied after `filtered`, copies array before sorting, pushes nulls to end regardless of direction
- `toggleSort(field)` function: cycles off->asc->desc->off for same field; resets to asc when switching fields

**UI added:**
- Sort row below filter bar with "Sort:" label and two buttons: "Price" and "Variation"
- Active button shows `border-blue-500/50 text-blue-400` styling
- Arrow indicators: ▲ for ascending, ▼ for descending, none when inactive

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles without errors: passed
- Build succeeds: passed (459KB JS bundle, 972ms)

## Self-Check: PASSED

- src/components/CardList.tsx: FOUND
- commit 9711b6f: FOUND
