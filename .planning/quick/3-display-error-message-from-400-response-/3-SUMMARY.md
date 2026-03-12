---
phase: quick-3
plan: 01
subsystem: ui
tags: [react, supabase, error-handling, edge-functions]

requires: []
provides:
  - "Verbose error messages from Edge Function 400 responses surfaced to user in ImportWishlistForm"
affects: [import-wishlist, ImportWishlistForm]

tech-stack:
  added: []
  patterns:
    - "Duck-type fnError.context.json() to extract actual error body from FunctionsHttpError without importing internal class"

key-files:
  created: []
  modified:
    - src/components/ImportWishlistForm.tsx

key-decisions:
  - "Duck-type check on fnError.context.json to avoid coupling to FunctionsHttpError class hierarchy"
  - "Three-level fallback: parsed body.error -> fnError.message -> generic string"

patterns-established:
  - "Supabase FunctionsHttpError body parsing: await fnError.context.json() for actual payload"

requirements-completed: [QUICK-3]

duration: 3min
completed: 2026-03-12
---

# Quick Task 3: Display Error Message from 400 Response Summary

**Edge Function 400 error bodies now parsed via fnError.context.json() and displayed verbatim instead of the generic Supabase error string**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T17:10:00Z
- **Completed:** 2026-03-12T17:13:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- ImportWishlistForm now extracts the actual error message from the Edge Function response body when a 400 is returned
- Three-level fallback ensures graceful degradation for non-JSON errors and network failures
- No new dependencies introduced; duck-typing avoids coupling to Supabase internals

## Task Commits

1. **Task 1: Extract error message from Edge Function HTTP error responses** - `91f4b88` (feat)

**Plan metadata:** (included in task commit)

## Files Created/Modified
- `src/components/ImportWishlistForm.tsx` - Updated `handleImport` to parse `fnError.context.json()` and show the actual error string from the 400 payload

## Decisions Made
- Used duck-type check (`typeof fnError.context.json === 'function'`) instead of importing `FunctionsHttpError` to avoid coupling to Supabase internal class hierarchy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Change is self-contained; no follow-up needed
