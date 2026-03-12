---
phase: quick
plan: 2
subsystem: dashboard-ui
tags: [cardrow, cardlist, wishlist, subtitle, display]
dependency_graph:
  requires: []
  provides: [wishlist-name-in-card-subtitle]
  affects: [src/components/CardRow.tsx, src/components/CardList.tsx]
tech_stack:
  added: []
  patterns: [useMemo Map lookup, optional prop with graceful degradation]
key_files:
  created: []
  modified:
    - src/components/CardRow.tsx
    - src/components/CardList.tsx
decisions:
  - "Wishlist name shown on every card unconditionally (not only when multiple wishlists exist) per plan requirement"
  - "Map<string, string> built with useMemo in CardList to avoid recomputation on filter changes"
  - "Unknown wishlist_id resolves to undefined so subtitle degrades without crash or empty separator"
metrics:
  duration: "1 min"
  completed_date: "2026-03-12"
---

# Quick Task 2: Dashboard Must Show Wishlist Name in Card Row Summary

**One-liner:** Wishlist name rendered in CardRow subtitle after expansion name using a `useMemo` id-to-name map built in CardList.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add wishlistName prop to CardRow and display in subtitle | f5add77 | src/components/CardRow.tsx |
| 2 | Build wishlist name lookup in CardList and pass to CardRow | d3d6a12 | src/components/CardList.tsx |

## What Was Built

Each card row on the dashboard now shows both the expansion name and the wishlist name in the subtitle area, separated by ` · ` (e.g., "Lorwyn · My Wishlist"). This allows users to identify which wishlist a card belongs to at a glance without using the filter dropdown.

### Changes

**CardRow.tsx:**
- Added `wishlistName?: string` to `CardRowProps`
- Destructured `wishlistName` in `CardRow` function signature
- Updated subtitle `<p>` to append ` · {wishlistName}` when the prop is provided; unchanged when omitted

**CardList.tsx:**
- Added `wishlistMap` memo (`Map<string, string>`) derived from the `wishlists` prop, mapping `id -> name`
- Passed `wishlistName={wishlistMap.get(card.wishlist_id)}` to each `CardRow` in the filtered list

## Verification

- `npx tsc --noEmit` passed with no errors after each task
- TypeScript confirms type safety: `wishlistName` is `string | undefined` matching the optional prop

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- src/components/CardRow.tsx: exists and contains wishlistName prop
- src/components/CardList.tsx: exists and contains wishlistMap useMemo
- Commits f5add77 and d3d6a12: verified in git log
