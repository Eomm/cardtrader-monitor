---
phase: quick-8
plan: 1
subsystem: frontend
tags: [chart, svg, price-history, visualization]
dependency_graph:
  requires: [src/lib/cardtrader-types.ts, src/components/PriceDisplay.tsx]
  provides: [src/components/PriceChart.tsx]
  affects: [src/pages/CardDetailPage.tsx]
tech_stack:
  added: []
  patterns: [pure-SVG chart, viewBox scaling, rule overlay lines]
key_files:
  created:
    - src/components/PriceChart.tsx
  modified:
    - src/pages/CardDetailPage.tsx
decisions:
  - Used biome-ignore suppression with explicit justification for static array-index keys (y-axis ticks, threshold rule lines) where positional identity is correct
  - Used recorded_at as key for data point circles (stable timestamp identity)
  - biome-ignore on threshold/fixed rule index keys accepted since rules list is user-configured and stable within a render
metrics:
  duration: "2 min"
  completed_date: "2026-03-14"
---

# Quick Task 8: Add Line Chart for Recent Prices with Threshold Lines Summary

**One-liner:** Pure-SVG line chart in CardDetailPage showing price history with amber threshold and purple fixed-price rule overlay lines computed from baseline.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create PriceChart SVG component | eedac1a | src/components/PriceChart.tsx |
| 2 | Integrate PriceChart into CardDetailPage | 45badc6 | src/pages/CardDetailPage.tsx |

## What Was Built

### PriceChart component (`src/components/PriceChart.tsx`)

A pure-SVG line chart with:
- 400x200 viewBox with padding (left 55, right 15, top 15, bottom 30) for axis labels
- Y range auto-computed from all price data, rule lines, and baseline with 10% padding to prevent clipping
- **Price line:** Solid blue-500 polyline with 10% opacity filled area below, blue data point circles (r=3)
- **X-axis:** First and last data point dates (MMM DD format), slate-500 10px text
- **Y-axis:** 4 evenly spaced EUR value labels, right-aligned, slate-500 10px text
- **Baseline line:** Slate-500 dashed (6 4) horizontal line with "Baseline" label
- **Threshold rules:** Amber-500 dashed (4 3) lines for enabled ThresholdRules; direction "both" draws two lines; labels show ±N%
- **Fixed price rules:** Purple-500 dashed (4 3) lines for enabled FixedPriceRules at price_eur*100 cents
- Returns `null` for fewer than 2 data points (no chart rendered)
- Responsive via `w-full` SVG with `max-w-full` wrapper div

### CardDetailPage changes (`src/pages/CardDetailPage.tsx`)

- Snapshot query limit increased 10 → 30 for more meaningful chart data
- "Price History" section added above the price log, renders `<PriceChart>` when 2+ snapshots exist
- Existing text list renamed "Price Log", display capped at 10 most recent entries via `slice(0, 10)`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Biome lint] Fixed noArrayIndexKey violations and import ordering**
- **Found during:** Task 1 verification (`npx biome check`)
- **Issue:** Biome flagged array index keys on y-axis ticks, data circles, threshold lines, and fixed-price lines; also flagged unsorted imports
- **Fix:** Used `recorded_at` timestamp as key for data circles (stable identity). Added `biome-ignore` suppressions with justifications for static positional arrays (ticks, rule lines). Fixed import ordering in both files.
- **Files modified:** src/components/PriceChart.tsx, src/pages/CardDetailPage.tsx
- **Commits:** eedac1a, 45badc6

## Self-Check: PASSED

- src/components/PriceChart.tsx: FOUND
- src/pages/CardDetailPage.tsx: FOUND
- Commit eedac1a: FOUND
- Commit 45badc6: FOUND
