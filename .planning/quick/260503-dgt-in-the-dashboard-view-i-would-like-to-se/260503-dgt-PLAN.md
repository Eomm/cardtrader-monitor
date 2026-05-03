---
phase: quick-260503-dgt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/DashboardPage.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Dashboard shows total number of monitored cards"
    - "Dashboard shows total market value (sum of latest prices) for all cards"
    - "Stats are only shown when cards exist (not in empty state)"
  artifacts:
    - path: "src/pages/DashboardPage.tsx"
      provides: "Stats bar with card count and total amount"
  key_links:
    - from: "src/pages/DashboardPage.tsx"
      to: "cards state"
      via: "cards.length and reduce over latest_price_cents"
      pattern: "cards\\.reduce"
---

<objective>
Add a summary stats bar to the dashboard view showing:
1. Total number of monitored cards
2. Total market value (sum of all latest_price_cents, formatted as EUR)

Purpose: Give users a quick at-a-glance overview of their monitored collection without having to count cards or mentally sum prices.
Output: Two stat chips rendered above the CardList in DashboardPage, visible only when cards exist.
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<!-- Key interfaces needed -->
<!-- From src/lib/cardtrader-types.ts: MonitoredCardWithPrice has latest_price_cents: number | null -->
<!-- From src/components/PriceDisplay.tsx: formatEur(cents: number): string — returns "EUR X.XX" -->
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add stats bar to DashboardPage</name>
  <files>src/pages/DashboardPage.tsx</files>
  <action>
    In the "Cards exist" render branch (the return at line 215), add a stats bar between the ImportWishlistForm and the CardList.

    Compute two values from the `cards` state array:
    - `totalCards`: `cards.length`
    - `totalValueCents`: sum of `latest_price_cents` across all cards that have a non-null price (cards with null price are excluded from total). Use `cards.reduce((acc, c) => acc + (c.latest_price_cents ?? 0), 0)`.

    Import `formatEur` from `../components/PriceDisplay`.

    Render a stat bar between the compact import form div and the CardList:

    ```tsx
    <div className="mb-4 flex flex-wrap gap-4">
      <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-4 py-2">
        <span className="text-sm text-slate-400">Cards</span>
        <span className="text-sm font-semibold text-slate-100">{totalCards}</span>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-4 py-2">
        <span className="text-sm text-slate-400">Total value</span>
        <span className="text-sm font-semibold text-slate-100">{formatEur(totalValueCents)}</span>
      </div>
    </div>
    ```

    Place these computations inside the render function (no useMemo needed — cards array comes from state and is already computed).

    Do NOT show this bar in the empty state or loading/error states.

    Style follows the existing dark-only palette: slate-700 border, slate-800 background, slate-400/slate-100 text hierarchy (matching existing patterns in DashboardPage and CardList).
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Build completes with no TypeScript errors
    - Stats bar renders above card list when cards exist
    - "Cards" chip shows count (e.g. "42")
    - "Total value" chip shows sum of all non-null latest prices formatted as "EUR X.XX"
    - Stats bar is absent from empty state and loading state
  </done>
</task>

</tasks>

<verification>
`npm run build` passes with no errors.
Open dashboard with cards loaded — two stat chips (Cards + Total value) appear above the card grid.
</verification>

<success_criteria>
- Dashboard displays total card count and total market value above the card list
- Values are computed from the cards already in state (no new API calls)
- Styling is consistent with the existing dark UI
</success_criteria>

<output>
After completion, create `.planning/quick/260503-dgt-in-the-dashboard-view-i-would-like-to-se/260503-dgt-SUMMARY.md`
</output>
