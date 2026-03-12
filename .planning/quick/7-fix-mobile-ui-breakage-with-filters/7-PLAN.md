---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/CardList.tsx
  - src/components/CardRow.tsx
autonomous: true
requirements: [QUICK-7]

must_haves:
  truths:
    - "Filter bar (search, expansion select, wishlist select) does not overflow horizontally on mobile (<640px)"
    - "Sort buttons remain accessible and visible on mobile"
    - "Card rows display all info (name, rule input, price) without overlapping or truncation on mobile"
  artifacts:
    - path: "src/components/CardList.tsx"
      provides: "Responsive filter bar and sort row"
    - path: "src/components/CardRow.tsx"
      provides: "Responsive card row layout"
  key_links:
    - from: "src/components/CardList.tsx"
      to: "src/components/CardRow.tsx"
      via: "CardRow rendered inside CardList"
      pattern: "<CardRow"
---

<objective>
Fix mobile UI breakage in the dashboard filter bar, sort buttons, and card rows.

Purpose: The filter bar with search input + expansion select + wishlist select uses a horizontal flex layout that overflows on mobile screens. Card rows also cram too many inline elements for small viewports.
Output: Responsive layouts that stack/wrap on mobile and display inline on desktop.
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/CardList.tsx
@src/components/CardRow.tsx
@src/components/PriceDisplay.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Make CardList filter bar and sort row responsive</name>
  <files>src/components/CardList.tsx</files>
  <action>
Fix the filter bar (line ~142) and sort row (line ~180) to be mobile-friendly:

**Filter bar (the div wrapping search + selects):**
- Change `flex gap-2` to `flex flex-col sm:flex-row gap-2` so items stack vertically on mobile and go horizontal on sm+.
- The search input already has `flex-1`; on mobile in column layout it will take full width naturally.
- Both select elements should get `w-full sm:w-auto` so they fill width on mobile but auto-size on desktop.

**Sort row:**
- The sort row is fine at small sizes (just two small buttons), but add `flex-wrap` as a safety measure: change `flex gap-2` to `flex flex-wrap gap-2`.

No other changes to logic or state management.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Filter bar stacks vertically on mobile (below sm breakpoint) and displays horizontally on sm+. Sort row wraps if needed.</done>
</task>

<task type="auto">
  <name>Task 2: Make CardRow layout responsive for small screens</name>
  <files>src/components/CardRow.tsx</files>
  <action>
Fix the CardRow component (the outer div at line ~163) for mobile:

**Main row layout:**
- The current layout is `flex items-center gap-3` with: thumbnail (w-10) + name (flex-1) + inline rule input + price column. On narrow screens the name gets crushed.
- Change to a two-row approach on mobile using `flex-wrap`:
  - Outer div: keep `flex` but add `flex-wrap` and change `gap-3` to `gap-2 sm:gap-3`.
  - Thumbnail: keep as-is (`h-14 w-10 flex-shrink-0`).
  - Name div: change `min-w-0 flex-1` to `min-w-0 flex-1` with a min-width basis so it doesn't shrink below useful size: add `basis-[calc(100%-3.5rem)] sm:basis-0` so on mobile the name takes the full row minus thumbnail, pushing rule+price to a second line.
  - Inline rule input container: add `ml-auto sm:ml-0` so it right-aligns on the second row on mobile.
  - Price column: stays `flex-shrink-0 flex-col items-end` -- no change needed; it will flow naturally.

**Alternative simpler approach if the basis trick causes issues:**
- Use a CSS grid approach: on the outer div, use `grid grid-cols-[2.5rem_1fr] sm:flex sm:items-center sm:gap-3` with mobile grid having thumbnail+name on row 1, and rule+price spanning row 2 right-aligned.

Pick whichever approach produces cleaner code. The goal is: on mobile, name+expansion text gets enough space to be readable, and rule input + price don't overlap. On sm+, keep the current single-row layout.

Reduce the inline rule input width from `w-16` to `w-14` to save a bit of space (the numbers are small, 2-3 digits).
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Card rows display readably on mobile -- name/expansion visible without severe truncation, rule input and price don't overlap with name text. Desktop layout unchanged.</done>
</task>

</tasks>

<verification>
- Open the app in a mobile viewport (Chrome DevTools, 375px width)
- Verify filter bar stacks vertically with each control taking full width
- Verify sort buttons remain visible and tappable
- Verify card rows show name clearly with price/rule accessible
- Open at desktop width (1024px+) and verify layout unchanged from current
</verification>

<success_criteria>
- No horizontal overflow or scrollbar on mobile viewport (375px)
- All filter controls (search, expansion, wishlist) are usable on mobile
- Card name text is readable (not crushed to a few characters)
- Desktop layout visually identical to current
</success_criteria>

<output>
After completion, create `.planning/quick/7-fix-mobile-ui-breakage-with-filters/7-SUMMARY.md`
</output>
