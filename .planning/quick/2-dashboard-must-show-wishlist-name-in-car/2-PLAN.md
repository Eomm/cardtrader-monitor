---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/CardRow.tsx
  - src/components/CardList.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Each card row shows the wishlist name it belongs to"
    - "Wishlist name is visible alongside expansion name in the card subtitle area"
    - "When only one wishlist exists, the label is still shown (no conditional hiding)"
  artifacts:
    - path: "src/components/CardRow.tsx"
      provides: "Accepts optional wishlistName prop, renders it in card subtitle"
    - path: "src/components/CardList.tsx"
      provides: "Builds wishlist name lookup map and passes wishlistName to each CardRow"
  key_links:
    - from: "src/components/CardList.tsx"
      to: "src/components/CardRow.tsx"
      via: "wishlistName prop derived from wishlists array"
      pattern: "wishlists.*find.*wishlist_id"
---

<objective>
Show the wishlist name inside each card row on the dashboard, so users can identify which wishlist each card comes from at a glance.

Purpose: When a user monitors cards from multiple wishlists, the current card row only shows expansion name — there is no way to know which wishlist a card belongs to without using the filter dropdown.
Output: Each CardRow displays the wishlist name in the card subtitle area (below the card name), alongside the expansion name.
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@src/components/CardRow.tsx
@src/components/CardList.tsx
@src/lib/cardtrader-types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add wishlistName prop to CardRow and display it in subtitle</name>
  <files>src/components/CardRow.tsx</files>
  <action>
    Add an optional `wishlistName?: string` field to `CardRowProps`.

    In the card subtitle section (currently the `<p>` that shows `card.ct_expansions?.name ?? '---'`), update it to show both expansion name and wishlist name, separated by a bullet or slash:

    ```tsx
    <p className="truncate text-sm text-slate-400">
      {card.ct_expansions?.name ?? '---'}
      {wishlistName ? ` · ${wishlistName}` : ''}
    </p>
    ```

    Pass `wishlistName` down from `CardRowProps` to the JSX. No other changes needed in this file.
  </action>
  <verify>
    TypeScript compiles without errors: `npx tsc --noEmit`
  </verify>
  <done>CardRow accepts `wishlistName?: string` and renders it in the subtitle after the expansion name, separated by ` · `. When not provided, subtitle remains unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Build wishlist name lookup in CardList and pass to CardRow</name>
  <files>src/components/CardList.tsx</files>
  <action>
    In `CardList`, build a `Map<string, string>` from `wishlists` (id → name) using `useMemo`:

    ```tsx
    const wishlistMap = useMemo(() => {
      const map = new Map<string, string>();
      for (const w of (wishlists ?? [])) {
        map.set(w.id, w.name);
      }
      return map;
    }, [wishlists]);
    ```

    Then in the `filtered.map` render, pass `wishlistName` to each `CardRow`:

    ```tsx
    <CardRow
      key={card.id}
      card={card}
      wishlistName={wishlistMap.get(card.wishlist_id)}
      onRuleSaved={onRuleSaved}
    />
    ```

    No other changes needed.
  </action>
  <verify>
    TypeScript compiles without errors: `npx tsc --noEmit`
    Manual: run `npm run dev`, open dashboard — each card row subtitle shows both expansion and wishlist name (e.g. "Lorwyn · My Wishlist").
  </verify>
  <done>Each CardRow in the filtered list receives the resolved wishlist name string derived from the wishlists prop. If a card's wishlist_id has no match in the map (edge case), wishlistName is undefined and the subtitle degrades gracefully.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- Dashboard card rows display: `{expansion name} · {wishlist name}` in the subtitle
- Cards with no wishlist match (edge case) degrade gracefully (no crash, no empty ` · `)
</verification>

<success_criteria>
Every monitored card in the dashboard list shows its wishlist name in the subtitle area, allowing users to identify which wishlist a card belongs to without needing to use the filter dropdown.
</success_criteria>

<output>
After completion, create `.planning/quick/2-dashboard-must-show-wishlist-name-in-car/2-SUMMARY.md`
</output>
