---
phase: quick-6
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/CardList.tsx
autonomous: true
requirements: [QUICK-6]
must_haves:
  truths:
    - "User can sort the card list by current price (ascending/descending)"
    - "User can sort the card list by price variation percentage (ascending/descending)"
    - "Sort selection persists in localStorage alongside existing filters"
    - "Default sort is no sort (original order)"
  artifacts:
    - path: "src/components/CardList.tsx"
      provides: "Sort buttons and sorting logic"
  key_links:
    - from: "sort state"
      to: "filtered array"
      via: "useMemo sorting applied after filtering"
      pattern: "filtered\\.sort|sorted"
---

<objective>
Add sort buttons to the dashboard CardList so users can sort cards by current price and by price variation (percentage change from baseline). Sorting toggles between ascending, descending, and off (default order).

Purpose: Users with many monitored cards need to quickly find the cheapest cards or the ones with the biggest price drops/increases.
Output: Updated CardList.tsx with sort controls and persistent sort preference.
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/CardList.tsx
@src/components/CardRow.tsx
@src/components/PriceDisplay.tsx
@src/lib/cardtrader-types.ts
</context>

<interfaces>
<!-- Key types the executor needs -->

From src/lib/cardtrader-types.ts:
```typescript
export type MonitoredCardWithPrice = {
  id: string;
  card_name: string;
  baseline_price_cents: number | null;
  latest_price_cents: number | null;
  // ... other fields
};
```

From src/components/CardList.tsx:
```typescript
export const FILTER_KEY = 'cardtrader-dashboard-filters';
export interface DashboardFilters {
  search: string;
  expansionFilter: string;
  wishlistFilter: string;
}
export function loadFilters(): DashboardFilters;
```

From src/components/PriceDisplay.tsx:
```typescript
// Price variation calculation (same logic to reuse for sorting):
// const pct = ((current - baseline) / baseline) * 100;
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add sort state, sort UI, and sorting logic to CardList</name>
  <files>src/components/CardList.tsx</files>
  <action>
1. Extend DashboardFilters interface to include sort state:
   ```typescript
   export type SortField = 'price' | 'variation' | '';
   export type SortDirection = 'asc' | 'desc';
   ```
   Add to DashboardFilters: `sortField: SortField` and `sortDirection: SortDirection`.
   Update DEFAULT_FILTERS: `sortField: ''`, `sortDirection: 'asc'`.

2. Add sort state in CardList using the same localStorage persistence pattern already used for filters (loadFilters already handles this via spread with DEFAULT_FILTERS).

3. Create a helper function `calcVariation(card)` that computes the percentage change:
   - If latest_price_cents is null or baseline_price_cents is null or 0, return null (sort these to the end).
   - Otherwise: `((latest_price_cents - baseline_price_cents) / baseline_price_cents) * 100`

4. Add sorting logic as a useMemo after the `filtered` array:
   ```typescript
   const sorted = useMemo(() => {
     if (!sortField) return filtered;
     return [...filtered].sort((a, b) => {
       let valA: number | null;
       let valB: number | null;
       if (sortField === 'price') {
         valA = a.latest_price_cents;
         valB = b.latest_price_cents;
       } else {
         valA = calcVariation(a);
         valB = calcVariation(b);
       }
       // Push nulls to the end regardless of direction
       if (valA === null && valB === null) return 0;
       if (valA === null) return 1;
       if (valB === null) return -1;
       return sortDirection === 'asc' ? valA - valB : valB - valA;
     });
   }, [filtered, sortField, sortDirection]);
   ```
   Render `sorted` instead of `filtered` in the JSX.

5. Add a toggle function that cycles: off -> asc -> desc -> off when clicking the same field, or sets asc when clicking a different field:
   ```typescript
   function toggleSort(field: SortField) {
     if (sortField !== field) {
       setSortField(field);
       setSortDirection('asc');
     } else if (sortDirection === 'asc') {
       setSortDirection('desc');
     } else {
       setSortField('');
       setSortDirection('asc');
     }
   }
   ```

6. Add sort buttons in a row below the existing filter bar (inside the same parent div, after the filter flex row). Use a small flex row with two buttons:
   - "Price" button: calls toggleSort('price'). Shows arrow indicator when active (unicode up/down triangle).
   - "Variation" button: calls toggleSort('variation'). Same arrow indicator pattern.
   - Style: `text-xs px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors`. When active: add `text-blue-400 border-blue-500/50` instead of default text/border colors.
   - Arrow indicator: show nothing when inactive, show unicode triangle up when asc, down when desc, appended after button text with a space.

7. Persist sortField and sortDirection to localStorage alongside existing filters (just add them to the JSON object already being stored in the useEffect).

8. Update the "No cards found" empty state to use sorted.length instead of filtered.length. Also update the map to iterate over sorted.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit && npm run build</automated>
  </verify>
  <done>
    - Two sort buttons (Price, Variation) visible below the filter bar
    - Clicking a sort button cycles: ascending -> descending -> off
    - Cards sort by current price (latest_price_cents) or variation percentage
    - Null prices/variations sort to the end
    - Sort preference persists across page refresh via localStorage
    - Existing filter functionality unchanged
  </done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Build succeeds
- Sort buttons appear in the dashboard below filters
- Clicking Price sorts cards by price ascending, click again for descending, click again to clear
- Clicking Variation sorts by percentage change ascending (biggest drops first), descending (biggest rises first)
- Cards with null prices always appear at the end regardless of sort direction
- Changing sort persists after page refresh
- Search and expansion/wishlist filters still work correctly alongside sorting
</verification>

<success_criteria>
Dashboard card list can be sorted by price and by price variation with visual sort direction indicators. Sort preference persists in localStorage.
</success_criteria>

<output>
After completion, create `.planning/quick/6-add-sort-buttons-to-dashboard-for-price-/6-SUMMARY.md`
</output>
